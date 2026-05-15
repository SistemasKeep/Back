'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function nuevaTarifa(dataMail, actualizada = false){
    try {
        var tpl = undefined
        tpl = await getMailTpl(actualizada ? 'actualizacion_tarifa.html' : 'nueva_tarifa.html')
        var htmlContent = undefined
        htmlContent = await remplaceData(dataMail,tpl,actualizada)
        const asunto = `${actualizada ? '' : 'Nueva'} Tarifa${actualizada ? ' Actualizada' : ''} - ${dataMail.nombreServicio} - ${dataMail.nombreMarcaCliente}`
        const emails = [dataMail.email]

        let mailOptions = {
            to: emails,
            subject: asunto,
            html: htmlContent,
        };
        const mainSender = new MailController(dataMail.idUsuario,dataMail.idMarca,mailOptions, null)
        await mainSender.sendMail()
        return true
    } catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
    }
}


async function remplaceData(data,tpl,actualizada){
    if(actualizada == false){
        tpl = tpl.replace(/\{\{\$nombreServicio\}\}/g, data.nombreServicio);
        tpl = tpl.replace(/\{\{\$nombreOficina\}\}/g, data.nombreOficina);
        tpl = tpl.replace(/\{\{\$nombreCliente\}\}/g, data.nombreCliente);
        tpl = tpl.replace(/\{\{\$nombreProveedor\}\}/g, data.nombreProveedor);
        tpl = tpl.replace(/\{\{\$tarifaClienteFinal\}\}/g, data.tarifaClienteFinal);
        tpl = tpl.replace(/\{\{\$minimoVenta\}\}/g, data.minimoVenta);
    
        tpl = tpl.replace(/\{\{\$showBeneficiario\}\}/g, data.nombreBeneficiario != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showCommodity\}\}/g, data.nombreCommodity != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showPaisOrigen\}\}/g, data.nombrePaisOrigen != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showPaisDestino\}\}/g, data.nombrePaisDestino != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showLimiteSuperior\}\}/g, data.limiteSuperior != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showLimiteInferior\}\}/g, data.limiteInferior != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showUsoLimitado\}\}/g, data.usoLimitado != '' ? 'block' : 'none');
        tpl = tpl.replace(/\{\{\$showFechaVencimiento\}\}/g, data.fechaVencimiento != '' ? 'block' : 'none');
    
        tpl = tpl.replace(/\{\{\$nombreBeneficiario\}\}/g, data.nombreBeneficiario);
        tpl = tpl.replace(/\{\{\$nombreCommodity\}\}/g, data.nombreCommodity);
        tpl = tpl.replace(/\{\{\$nombrePaisOrigen\}\}/g, data.nombrePaisOrigen);
        tpl = tpl.replace(/\{\{\$nombrePaisDestino\}\}/g, data.nombrePaisDestino);
        tpl = tpl.replace(/\{\{\$limiteSuperior\}\}/g, data.limiteSuperior);
        tpl = tpl.replace(/\{\{\$limiteInferior\}\}/g, data.limiteInferior);
        tpl = tpl.replace(/\{\{\$usoLimitado\}\}/g, data.usoLimitado);
        tpl = tpl.replace(/\{\{\$fechaVencimiento\}\}/g, data.fechaVencimiento);
    }else{
        for(const key in data){
            tpl = tpl.replace(new RegExp(`\\{\\{\\$${key}\\}\\}`, 'g'), data[key]);
        }
		
    }
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	nuevaTarifa
}
