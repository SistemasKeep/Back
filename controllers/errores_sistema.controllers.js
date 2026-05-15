'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');

async function sendMailReporteError(req, res){
	const parametros = req.body;
    let registro = {}
    let obligatorios = [
        {campo:'keepro', tipo:'number'},
        {campo:'errorHeader', tipo:'string', textoCase:"up", largo:255},
        {campo:'errorBody', tipo:'string', textoCase:"up", largo:60000}
    ]
    //Se validan los paramtros obligatorios
    registro = await Validaciones.validParametros(req, res,obligatorios,registro);
    if(!registro){
        return '';
    }
    try {
        const data = {
            plataforma: parseInt(parametros.keepro),
            message: parametros.errorHeader,
            stack: parametros.errorBody,
            usuarioError: req.usuario.nombre,
            idUsuario: req.usuario.id,
            correoUsuario: req.usuario.email
        }
        const respuesta = await sendMailError(data, ['kpsoft80@gmail.com'])
        if(respuesta.status === false){
            return res.status(400).send(respuesta);
        }
        return res.status(200).send({ status: true, msg: "Reporte bug enviado" });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailError(data, listEmails){
    var tpl = undefined
    tpl = await getMailTpl('email_error_backend.html')
    var htmlContent = undefined
    
    htmlContent = tpl
    htmlContent = await remplaceData(data,tpl)
    const asunto = 'Se encontro error en el sistema'
    
    const emails = []
    for(const emailList of listEmails){
        emails.push(emailList)
    }
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent
	};
	const mainSender = new MailController(null,null,mailOptions, null, true,true)
	await mainSender.sendMail()
    return true
    
}

async function remplaceData(data,tpl){
    tpl = tpl.replace(/\{\{\$usuarioError\}\}/g, data.usuarioError !==  undefined ? ('Error reportado por: ' + data.usuarioError + ' <br>id:' + data.idUsuario + '<br>correo:' + data.correoUsuario + '<br>') : '');
    tpl = tpl.replace(/\{\{\$plataforma\}\}/g, data.plataforma ===  0 ? 'Error reportado desde: Operaciones' : data.plataforma ===  1 ? 'Error reportado desde: Autoemisor Web' : data.plataforma ===  2 ? 'Error reportado desde: Autoemisor App' : '');
    tpl = tpl.replace(/\{\{\$message\}\}/g, data.message);
    tpl = tpl.replace(/\{\{\$stack\}\}/g, data.stack);
    
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendMailError,
    sendMailReporteError

}
