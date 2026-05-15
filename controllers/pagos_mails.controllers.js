'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

async function sendPago(req, res){
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
        const pago = await db.sequelize.models.pagos.findByPk(id, {paranoid: false });
        if(pago == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        if(pago.id_cfdi == null){
            return res.status(400).send({ status: false, msg: "La aplicación de ingreso no es necesaria enviarla al cliente" });
        }
        const worker = new Worker('./controllers_hilos/pagos_mails.controller.hilo.js', {
            workerData: { idPago: id, usuarioPago: req.usuario, listEmailsPago:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error: result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Pago enviado" });
            }
        });
    
        worker.on('error', (err) => {
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailPago(idPago, usuario, listEmails = []){
    const worker = new Worker('./controllers_hilos/pagos_mails.controller.hilo.js', {
        workerData: { idPago: idPago, usuarioPago: usuario, listEmailsPago:listEmails }
    });
}

async function sendMailPagoLocal(idPago, usuario, listEmails = []){
	const pago = await db.sequelize.models.pagos.findByPk(idPago, { include:['marca','cfdi'],paranoid: false });
    var tpl = undefined
    tpl = await getMailTpl('email_rep.html')
    var htmlContent = undefined
    
    htmlContent = await remplaceDataPago(tpl)
    const nameDoc = pago.id_cfdi === null ? 'APLICACIÓN DE INGRESO' : 'Recibo Electrónico de Pagos'
    const asunto = 'Envío de ' + nameDoc + ' Folio: ' + pago.folio;
    
    const emails = []
    if(usuario.envio_automatico && isAutoemisor){
        emails.push(usuario.email)
    }else{
        const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social:pago.id_razon_social}});
        const oficinaRazonSocial = await db.sequelize.models.oficinas_razones_sociales.findOne({where:{id_razon_social:pago.id_razon_social},paranoid: false })
        const contactosMails = await getListEmails(clienteRazonSocial.id_cliente,oficinaRazonSocial.id_oficina)
        for(const mail of contactosMails){
            emails.push(mail)
        }
    }
    for(const emailList of listEmails){
        emails.push(emailList)
    }
    const attachments = []
    const { genPdfLocal } = require('./pagos_pdf.controller')
    const pdfPago = await genPdfLocal(idPago);
    if(pdfPago.status === false){
        return pdfPago
    }
    const timestamp = moment().tz('America/Mexico_City').unix();
    attachments.push({
        filename: pago.folio + '_' + timestamp + '.pdf',
        content: pdfPago,
        contentType: 'application/pdf'
    })
    if(pago.id_cfdi !== null){
        attachments.push({
            filename: pago.folio + '_comprobante.xml',
            content: pago.cfdi.xml,
            contentType: 'application/xml'
        })
    }
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,pago.id_marca,mailOptions, null, false, true)
	await mainSender.sendMail()
    return true
    
}

async function getListEmails(idCliente,idOficina){
    const emails = []
	const parametrosRelacionesMarcaAgentesCliente = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	const findRelacionesMarcaAgentesCliente = new Relaciones(parametrosRelacionesMarcaAgentesCliente,parametrosRelacionesMarcaAgentesCliente,db.sequelize.models)
	const relacionesMarcaAgentesCliente = await findRelacionesMarcaAgentesCliente.getRelaciones()
    const marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_marca:1, id_cliente:idCliente}});
    if(marcaAgentesClienteAux !== null){
        const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findByPk(marcaAgentesClienteAux.id, { include:relacionesMarcaAgentesCliente,paranoid: false });
        if(marcaAgentesCliente !== null){
            emails.push(marcaAgentesCliente.agente_operativo.email)
        }
    }
    const contactos = await db.sequelize.models.contactos.findAll({where:{id_oficina:idOficina}}, {paranoid: false });

    for(const contacto of contactos){
        if(contacto.enviar_factura){
            emails.push(contacto.email)
        }
    }
    return emails;

}

async function remplaceDataPago(tpl){
    tpl = tpl.replace(/\{\{\$correoRep\}\}/g, 'aclaraciones_cyc@linkbgroup.com');
    
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendMailPago,
    sendMailPagoLocal,
    sendPago
}
