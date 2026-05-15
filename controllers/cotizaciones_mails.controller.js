'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Worker } = require('worker_threads');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');

async function sendCotizacion(req, res){
	const parametros = req.body;
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    const listEmails = []
    
    if(!Array.isArray(parametros.emails)){
        return res.status(400).send({ status: false, msg: "El parametro emails debe ser una lista" });
    }
    for(const emailList of parametros.emails){
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailIsValid = emailRegex.test(emailList)
        if(emailIsValid){
            listEmails.push(emailList)
        }
    }
    try {
        const cotizacion = await db.sequelize.models.cotizaciones.findByPk(id, {paranoid: false });
        if(cotizacion == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const worker = new Worker('./controllers_hilos/cotizaciones_mails.controller.hilo.js', {
            workerData: { idCotizacion: id, usuarioCotizacion: req.usuario, listEmailsCotizacion:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error:result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Cotización enviada" });
            }
        });
        worker.on('error', (err) => { 
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
        return res.status(200).send({ status: true, msg: "Cotización enviada" });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailCotizacion(idCotizacion, usuario, listEmails){
	const cotizacion = await db.sequelize.models.cotizaciones.findByPk(idCotizacion, {paranoid: false });
    var tpl = undefined
    tpl = await getMailTpl('email_generico_cxp.html')
    var htmlContent = undefined
    
    htmlContent = tpl
    const nameDoc = 'Propuesta Comercial'
    const asunto = 'Envío de ' + nameDoc + ' Folio: ' + cotizacion.folio;
    
    const emails = []
    for(const emailList of listEmails){
        emails.push(emailList)
    }
    const attachments = []
    const { genPdfLocal } = require('./cotizaciones_pdf.controller')
    const pdfCotizacion = await genPdfLocal(idCotizacion);
    if(pdfCotizacion.status === false){
        return pdfCotizacion
    }
    const timestamp = moment().tz('America/Mexico_City').unix();
    attachments.push({
        filename: cotizacion.folio + '_' + timestamp + '.pdf',
        content: pdfCotizacion,
        contentType: 'application/pdf'
    })
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,cotizacion.id_marca,mailOptions, null)
	await mainSender.sendMail()
    return true
    
}


async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendMailCotizacion,
    sendCotizacion
}
