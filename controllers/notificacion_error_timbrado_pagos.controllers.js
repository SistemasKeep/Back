'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function sendMailErrorTimbradoPago(idPago, errorFinkok){
    try {
        const emails = []
        const pago = await db.sequelize.models.pagos.findByPk(idPago, {paranoid: false });
        const factura = await db.sequelize.models.facturas.findByPk(idPago, {paranoid: false });
        const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({ where:{id_razon_social:pago.id_razon_social},paranoid: false });
        const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente, {paranoid: false });
        const clienteDetalle = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente, { include:['agente_credito_cobranza'],paranoid: false });
        if(clienteDetalle != null){
            if(clienteDetalle.agente_credito_cobranza != null){
                emails.push(clienteDetalle.agente_credito_cobranza.email)
            }
        }
    
        let marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:cliente.id, id_marca: pago.id_marca}, include:['agente_operativo'],paranoid: false})
        if(marcaAgenteCliente == null){
            marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:cliente.id, id_marca: 3}, include:['agente_operativo'],paranoid: false})
        }
        if(marcaAgenteCliente != null){
            if(marcaAgenteCliente.agente_operativo != null){
                emails.push(marcaAgenteCliente.agente_operativo.email)
            }
        }
        const dataMail = {
            folioPago: pago.folio,
        }
        try {
            if(errorFinkok !== null && errorFinkok !== undefined){
                dataMail.errorSat = errorFinkok
            }else{
                dataMail.errorSat = "Error no identificado"
            }
        } catch (error) {
            dataMail.errorSat = "Error no identificado"
        }
        
    
        var tpl = undefined
        tpl = await getMailTpl('pago_no_timbrado.html')
        var htmlContent = undefined
        
        htmlContent = await remplaceData(dataMail,tpl)
        const asunto = `Error de timbrado: pago - ${pago.folio}`
       
        let mailOptions = {
            to: emails,
            subject: asunto,
            html: htmlContent,
        };
        const mainSender = new MailController(null,pago.id_marca,mailOptions, null)
        await mainSender.sendMail()
        return true
    } catch (error) {
        return false
    }
    
}

async function remplaceData(data,tpl){
    tpl = tpl.replace(/\{\{\$folioPago\}\}/g, data.folioPago);
    tpl = tpl.replace(/\{\{\$errorSat\}\}/g, data.errorSat);
    
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
    sendMailErrorTimbradoPago
}
