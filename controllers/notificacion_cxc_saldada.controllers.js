'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function sendMailCxcSaldada(datosMail){
    try {
        const emails = datosMail.emails
        datosMail.emails = undefined
        var tpl = undefined
        tpl = await getMailTpl('factura_saldada.html')
        var htmlContent = undefined
        
        htmlContent = await remplaceData(datosMail,tpl)
        const asunto = `Confirmación de Saldado de Factura ${datosMail.folioFactura}`
       
        let mailOptions = {
            to: emails,
            subject: asunto,
            html: htmlContent,
        };
        const mainSender = new MailController(null,datosMail.marca,mailOptions, null)
        await mainSender.sendMail()
        return true
    } catch (error) {
        return false
    }
    
}

async function remplaceData(data,tpl){
    for(const key in data){
        tpl = tpl.replace(new RegExp(`\\{\\{\\$${key}\\}\\}`, 'g'), data[key]);
    }
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
    sendMailCxcSaldada
}
