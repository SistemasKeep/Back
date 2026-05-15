'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { onTrack } = require('../middlewares/getImg');

async function sendServiciosMonitoreo(req, res){
	const parametros = req.body;
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    const listEmails = []
    if(parametros.emails != undefined){
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
    }
    try {
        const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(id, { paranoid: false });
        if(servicioMonitoreo == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const worker = new Worker('./controllers_hilos/servicios_ontrack_mails.controller.hilo.js', {
            workerData: { idServiciosMonitoreo: id, usuarioMonitoreo: req.usuario, listEmailsMonitoreo:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error: result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Servicio Monitoreo enviada" });
            }
        });
    
        worker.on('error', (err) => {
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
    
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailServiciosMonitoreo(idServiciosMonitoreo, usuario, listEmails = []){
    const worker = new Worker('./controllers_hilos/servicios_ontrack_mails.controller.hilo.js', {
        workerData: { idServiciosMonitoreo: idServiciosMonitoreo, usuarioMonitoreo: usuario, listEmailsMonitoreo:listEmails }
    });
    worker.on('message', (result) => {
        if (result.error) {
            
        } else {
        }
    });

    worker.on('error', (err) => {
        
    });

    worker.on('exit', (code) => {
        if (code !== 0){
            
        }
    });
}

async function sendMailServiciosMonitoreoLocal(idServiciosMonitoreo, usuario, listEmails = []){
    const rels = ['certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina', 'oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack']
    const findRelaciones = new Relaciones(rels, rels, db.sequelize.models)
    const relaciones = await findRelaciones.getRelaciones()
    const serviciosMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(idServiciosMonitoreo, { include: relaciones, paranoid: false });
    const idMarca = serviciosMonitoreo.id_marca
    const mac = await db.sequelize.models.marca_agentes_clientes.findOne({
		where: {
			id_cliente: serviciosMonitoreo.id_cliente,
			id_marca: idMarca,
			deletedAt: null
		},
		include: ['agente_operativo' ]
	});
    const perfilesValidosDetalles = [ 'producto' ]
    const findRelacionesDetalles = new Relaciones(perfilesValidosDetalles,perfilesValidosDetalles,db.sequelize.models)
    const relacionesDetalles = await findRelacionesDetalles.getRelaciones()
    const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: serviciosMonitoreo.id},include: relacionesDetalles,})
    let tpl = undefined
    tpl = await getMailTpl('email_servicio_monitoreo.html')
    let htmlContent = undefined
    const noOperacion = serviciosMonitoreo.no_operacion
    
    htmlContent = await remplaceData({
        nombreCliente: serviciosMonitoreo.cliente.nombre, 
        nombreServicio: detalles[0].producto.descripcion, 
        noOperacion: noOperacion,
        logo: onTrack()
    },tpl)


    const asunto = `ON TRACK / NUEVA SOLICITUD${serviciosMonitoreo.certificado != null ? `/${serviciosMonitoreo.certificado.no_operacion}` : `/${noOperacion}` }`
    const emails = []
    emails.push(usuario.email)
    if(mac !== "" && mac !== null && mac !== undefined){
        if(mac.agente_operativo !== "" && mac.agente_operativo !== null && mac.agente_operativo !== undefined){
            if(mac.agente_operativo.email !== "" && mac.agente_operativo.email !== null && mac.agente_operativo.email !== undefined){
                emails.push(mac.agente_operativo.email)
            }
        }
    }
    for(const emailList of listEmails){
        emails.push(emailList)
    }

    const attachments = []
    const { genPdfLocal } = require('./servicios_ontrack_pdf.controller')
    const pdfServicioMonitoreo = await genPdfLocal(idServiciosMonitoreo);
    if(pdfServicioMonitoreo.status === false){
        return pdfServicioMonitoreo
    }
    attachments.push({
        filename: noOperacion + '.pdf',
        content: pdfServicioMonitoreo,
        contentType: 'application/pdf'
    })
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
    
	const mainSender = new MailController(usuario.id,idMarca,mailOptions, null)
	await mainSender.sendMail()
    return true
    
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

async function remplaceData(data,tpl){
    for(const key in data){
        tpl = tpl.replace(new RegExp(`\\{\\{\\$${key}\\}\\}`, 'g'), data[key]);
    }
    return tpl
}

module.exports = {
	sendMailServiciosMonitoreo,
    sendServiciosMonitoreo,
    sendMailServiciosMonitoreoLocal,
}
