'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function sendNotificacion(dataMail){
    try {
        var tpl = undefined
        tpl = await getMailTpl('correo_asignacion_cliente.html')
        var htmlContent = undefined
        dataMail.lavelTitle = dataMail.asignado == true ? 'Asignación' : 'Reasignación'
        htmlContent = await remplaceData(dataMail,tpl)
        const asunto = `${dataMail.lavelTitle} de Cliente`
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


async function remplaceData(data,tpl){
    if(data.asignado == true){
        tpl = tpl.replace(/\{\{\$asignadoRe\}\}/g, 'asignado');
    }else{
        tpl = tpl.replace(/\{\{\$asignadoRe\}\}/g, 'reasignado');
    }
    if(data.ejecutivo !== undefined){
        tpl = tpl.replace(/\{\{\$rolAgente\}\}/g, data.ejecutivo);
    }else{
        tpl = tpl.replace(/\{\{\$rolAgente\}\}/g, 'Ejecutivo de Ventas');
    }
    tpl = tpl.replace(/\{\{\$lavelTitle\}\}/g, data.lavelTitle);
    tpl = tpl.replace(/\{\{\$nombreAgente\}\}/g, data.nombreAgente);
    tpl = tpl.replace(/\{\{\$nombreCliente\}\}/g, data.nombreCliente);
    tpl = tpl.replace(/\{\{\$claveCliente\}\}/g, data.claveCliente);
    tpl = tpl.replace(/\{\{\$fechaAsignacion\}\}/g, data.fechaAsignacion);
    tpl = tpl.replace(/\{\{\$nombreUsuarioRegistro\}\}/g, data.nombreUsuarioRegistro);
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendNotificacion
}
