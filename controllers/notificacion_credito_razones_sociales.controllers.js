'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function creditoActualizado(dataMail){
    try {
        var tpl = undefined
        tpl = await getMailTpl('actualizacion_credito.html')
        var htmlContent = undefined
        htmlContent = await remplaceData(dataMail,tpl)
        const asunto = `Crédito Actualizado`
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
	creditoActualizado
}
