'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const { genPdfBuffer, genPdfBufferTerminosYCondiciones } = require('./gen_pdf.controller')
const { Worker } = require('worker_threads');


async function sendCertificado(req, res){
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
        const certificado = await db.sequelize.models.certificados.findByPk(id, { paranoid: false });
        if(certificado == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const isAutoemisor = !req.usuario.es_colaborador && req.usuario.es_autoemisor
        const idsProveedoresNoPermitidos = [6,7,8]
        if(idsProveedoresNoPermitidos.includes(certificado.id_proveedor) && isAutoemisor){
			return res.status(400).send({ status: false, msg: "Contacte a su operativo para solicitar este certificado" });
        }
        const worker = new Worker('./controllers_hilos/certificados_mails.controller.hilo.js', {
            workerData: { idCertificado: id, usuarioCertificado: req.usuario, listEmailsCertificado:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error:result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Operación enviada" });
            }
        });
        worker.on('error', (err) => {
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailCertificado(idCertificado, usuario, listEmails = []){
    const worker = new Worker('./controllers_hilos/certificados_mails.controller.hilo.js', {
        workerData: { idCertificado: idCertificado, usuarioCertificado: usuario, listEmailsCertificado:listEmails }
    });
}

async function sendMailCertificadoLocal(idCertificado, usuario, listEmails = []){
    const relaciones = await getRelacionesCertificado();
    const certificado = await db.sequelize.models.certificados.findByPk(idCertificado, { include:relaciones,paranoid: false });
    const isAutoemisor = !usuario.es_colaborador && usuario.es_autoemisor
    const isCertificado = certificado.draft_certificado
    var tpl = undefined
    var htmlContent = undefined
    var asunto = ""
    if(isCertificado){
        if(isAutoemisor){
            tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_certificado_autoemisor']});
            if(tpl == null){
                return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
            }
            tpl = tpl.correo_certificado_autoemisor
            if(tpl == null){
                tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_certificado']});
                tpl = tpl.correo_certificado
            }
        }else{
            tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_certificado']});
            if(tpl == null){
                return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
            }
            tpl = tpl.correo_certificado
        }
        const dataBuffer = Buffer.from(tpl, 'base64');
        const originalString = dataBuffer.toString('utf-8');
        htmlContent = originalString;
        htmlContent = await remplaceData(certificado,htmlContent)
        asunto = 'Envío de Certificado // ' + certificado.no_operacion + (certificado.referencias !== null && certificado.referencias !== '' && certificado.referencias !== undefined ? " // " + certificado.referencias : '')
    }else{
        if(isAutoemisor){
            tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_draft_autoemisor']});
            if(tpl == null){
                return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
            }
            tpl = tpl.correo_draft_autoemisor
            if(tpl == null){
                tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_draft']});
                if(tpl == null){
                    return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
                }
                tpl = tpl.correo_draft
            }
        }else{
            tpl = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['correo_draft']});
            if(tpl == null){
                return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
            }
            tpl = tpl.correo_draft
        }
        const dataBuffer = Buffer.from(tpl, 'base64');
        const originalString = dataBuffer.toString('utf-8');
        htmlContent = originalString;
        htmlContent = await remplaceData(certificado,htmlContent)
        asunto = 'Envío de Draft // ' + certificado.no_operacion
    }
    const emails = []

    if(usuario.envio_automatico && isAutoemisor && certificado.id_proveedor != 6){
        emails.push(usuario.email)
    }
    let contactosMails = []
    if(isCertificado){
        contactosMails = await getListEmails(certificado)
    }else{
        if(!emails.includes(usuario.email)){
            emails.push(usuario.email)
        }
        contactosMails = await getListEmailsDraft(certificado)
    }
    for(const mail of contactosMails){
        emails.push(mail)
    }
    for(const emailList of listEmails){
        emails.push(emailList)
    }
    const attachments = []
    const pdfCertificado = await genPdfBuffer(idCertificado);
    if(pdfCertificado.status === false){
        return pdfCertificado
    }
    attachments.push({
        filename: certificado.no_operacion + '.pdf',
        content: pdfCertificado,
        contentType: 'application/pdf'
    })
    if(isCertificado && certificado.id_proveedor != 6){
        const pdfTyC = await genPdfBufferTerminosYCondiciones(idCertificado);
        const aux = await db.sequelize.models.tpls.findByPk(certificado.poliza_detalle.id_tpl,{attributes: ['nombre_terminos_condiciones']});
        const nombreTerminosCondiciones = aux.nombre_terminos_condiciones
        attachments.push({
            filename: nombreTerminosCondiciones + '.pdf',
            content: pdfTyC,
            contentType: 'application/pdf'
        })
    }
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,certificado.id_marca,mailOptions, null,false,true)
	await mainSender.sendMail()
    return true
    
}
async function getRelacionesCertificado(){
    const parametrosRelaciones = [ 'detalle_certificado', 'beneficiario', 'buque', 'cliente', 'tipo_contenedor', 'commoditie', 'estado_origen.pais', 'estado_destino.pais', 'estado_destino_redondo.pais', 'marca', 'modalidad_transporte', 'moneda', 'oficina_razon_social', 'poliza_detalle', 'poliza', 'proveedor', 'puerto_aeropuerto_origen', 'puerto_aeropuerto_destino', 'tipo_bien', 'tipo_cambio_futuro','ubicacion_bienes'  ]
    const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
    return await findRelaciones.getRelaciones()
}


async function getListEmails(certificado){
    const emails = []
	const parametrosRelacionesMarcaAgentesCliente = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	const findRelacionesMarcaAgentesCliente = new Relaciones(parametrosRelacionesMarcaAgentesCliente,parametrosRelacionesMarcaAgentesCliente,db.sequelize.models)
	const relacionesMarcaAgentesCliente = await findRelacionesMarcaAgentesCliente.getRelaciones()
    let marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:certificado.id_cliente, id_marca: 1}})
    const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findByPk(marcaAgentesClienteAux.id, { include:relacionesMarcaAgentesCliente,paranoid: false });
    if(marcaAgentesCliente != null){
        if(marcaAgentesCliente.agente_operativo != null){
            emails.push(marcaAgentesCliente.agente_operativo.email)
        }
    }const idsProveedoresNoPermitidos = [6,7,8]
    if(idsProveedoresNoPermitidos.includes(certificado.id_proveedor)){
        return emails
    }
    const auxTipoCobertura = certificado.tipo_cobertura.toLowerCase().split(" ")
    const isRc = auxTipoCobertura.includes('rc')
    var atributo = undefined
    if(isRc && certificado.detalle_certificado[0].id_atributo_keepro == null){
        const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
        const findRelacionesRC = new Relaciones(rel,rel,db.sequelize.models)
        const relacionesRc = await findRelacionesRC.getRelaciones()
        let whereFind = {
            where:{
                [db.Sequelize.Op.or]: {
                    id_certificado:certificado.id,
                    id_certificado_rc:certificado.id
                },
            },
            include: relacionesRc
        }
        let certificadosRc = await db.sequelize.models.certificados_rc.findOne(whereFind);
        atributo = await db.sequelize.models.atributos_keepro.findByPk(certificadosRc.certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
    }else{
        atributo = await db.sequelize.models.atributos_keepro.findByPk(certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
    }
    if(atributo != null){
        try {
            const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributo.id_oficina_producto, {paranoid: false });
            const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.id_marca_agente_oficina, { paranoid: false });
            const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente, {paranoid: false });
            const contactos = await db.sequelize.models.contactos.findAll({where:{id_oficina:oficinaCliente.id_oficina}}, {paranoid: false });

            for(const contacto of contactos){
                if(contacto.enviar_correo && contacto.enviar_certificado){
                    emails.push(contacto.email)
                }
            }
        } catch (error) {
            
        }
        
    }
    return emails;

}

async function sendMailDraft(idDraft, usuario){
    const relaciones = await getRelacionesCertificado();
    const draft = await db.sequelize.models.certificados.findByPk(idDraft, { include:relaciones,paranoid: false });
    const asunto = 'Envío de Draft // ' + draft.no_operacion
    let tpl = await db.sequelize.models.tpls.findByPk(draft.poliza_detalle.id_tpl,{attributes: ['correo_draft']});
    if(tpl == null){
        return { status: false, msg: "PDF no disponible. Contacte a su operativo para solicitarlo."};
    }
    tpl = tpl.correo_draft
    const dataBuffer = Buffer.from(tpl, 'base64');
    const originalString = dataBuffer.toString('utf-8');
    let htmlContent = originalString;
    htmlContent = await remplaceData(draft,htmlContent)
    const emails = [usuario.email]
    const contactosMails = await getListEmailsDraft(draft)
    for(const mail of contactosMails){
        emails.push(mail)
    }
 
    const attachments = []
    const pdfCertificado = await genPdfBuffer(draft.id);
    if(pdfCertificado.status === false){
        return pdfCertificado
    }
    attachments.push({
        filename: draft.no_operacion + '.pdf',
        content: pdfCertificado,
        contentType: 'application/pdf'
    })
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,draft.id_marca,mailOptions, null)
	await mainSender.sendMail()
    return true
    
}

async function remplaceData(draft,tpl){
    const razonSocial = await db.sequelize.models.razones_sociales.findByPk(draft.oficina_razon_social.id_razon_social);
    const fechaInicio = moment(draft.fecha_inicio_cobertura).tz('America/Mexico_City').format('DD-MM-YYYY');
    const plataformasKeepro = {
        0: 'al departamento de operaciones',
        1: 'mediante su cuenta de Keepro Web ',
        2: 'mediante su cuenta de Keepro App',
        3: 'mediante su cuenta de API'
    }

    tpl = tpl.replace(/\{\{\$razon_social_cliente\}\}/g, razonSocial.razon_social);
    tpl = tpl.replace(/\{\{\$importe_encabezado\}\}/g, parseFloat(draft.detalle_certificado[0].subtotal).toLocaleString('es-US', { style: 'currency', currency: "USD" }));
    tpl = tpl.replace(/\{\{\$moneda\}\}/g, draft.moneda.clave);
    tpl = tpl.replace(/\{\{\$fecha_salida\}\}/g, fechaInicio);
    tpl = tpl.replace(/\{\{\$plataformaKeepro\}\}/g, plataformasKeepro[draft.Keepro] ?? '');
    return tpl
}

async function getListEmailsDraft(draft){
    const emails = []
	const parametrosRelacionesMarcaAgentesCliente = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	const findRelacionesMarcaAgentesCliente = new Relaciones(parametrosRelacionesMarcaAgentesCliente,parametrosRelacionesMarcaAgentesCliente,db.sequelize.models)
	const relacionesMarcaAgentesCliente = await findRelacionesMarcaAgentesCliente.getRelaciones()
    let marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:draft.id_cliente, id_marca: 1}})
    const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findByPk(marcaAgentesClienteAux.id, { include:relacionesMarcaAgentesCliente,paranoid: false });
    if(marcaAgentesCliente != null){
        if(marcaAgentesCliente.agente_operativo != null){
            emails.push(marcaAgentesCliente.agente_operativo.email)
        }
    }
    return emails;

}



module.exports = {
	sendMailCertificado,
    sendCertificado,
    sendMailDraft,
    sendMailCertificadoLocal
}
