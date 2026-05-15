'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

async function sendPagoProveedor(req, res){
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
        const pagoProveedor = await db.sequelize.models.pagos_proveedor.findByPk(id, {paranoid: false });
        if(pagoProveedor == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const worker = new Worker('./controllers_hilos/pagos_proveedor_mails.controller.hilo.js', {
            workerData: { idPagoProveedor: id, usuarioPagoProveedor: req.usuario, listEmailsPagoProveedor:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error: result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Pago proveedor enviado" });
            }
        });
    
        worker.on('error', (err) => {
            
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
    
        worker.on('exit', (code) => {
            if (code !== 0){
                
                //return res.status(500).send({ status: false, msg: "Error interno del servidor"});
            }
        });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMainPagoProveedor(idPagoProveedor, usuario, listEmails){
	const pagoProveedor = await db.sequelize.models.pagos_proveedor.findByPk(idPagoProveedor, { paranoid: false });
    var tpl = undefined
    tpl = await getMailTpl('email_generico_cxp.html')
    var htmlContent = undefined
    
    htmlContent = tpl
    const nameDoc = 'APLICACIÓN DE EGRESO'
    const asunto = 'Envío de ' + nameDoc + ' Folio: ' + pagoProveedor.folio;
    
    const emails = []
    for(const emailList of listEmails){
        emails.push(emailList)
    }
    const attachments = []
    const { genPdfLocal } = require('./pagos_proveedor_pdf.controller')
    const pdfPagoProveedor = await genPdfLocal(idPagoProveedor);
    if(pdfPagoProveedor.status === false){
        return pdfPagoProveedor
    }
    const timestamp = moment().tz('America/Mexico_City').unix();
    attachments.push({
        filename: pagoProveedor.folio + '_' + timestamp + '.pdf',
        content: pdfPagoProveedor,
        contentType: 'application/pdf'
    })
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,pagoProveedor.id_marca,mailOptions, null)
	await mainSender.sendMail()
    return true
    
}


async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendMainPagoProveedor,
    sendPagoProveedor
}
