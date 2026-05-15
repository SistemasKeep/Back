'use strict'
const {db} = require('../models');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');


async function nuevoTC(dataMail, actualizada = false){
    try {
        var tpl = undefined
        tpl = await getMailTpl('notificacion_registro_tc.html')
        var htmlContent = undefined
        htmlContent = await remplaceData(dataMail,tpl,actualizada)
        const asunto = `Registro tipo de cambio del día ${dataMail.fechaTC}`
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
	nuevoTC
}
