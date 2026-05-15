'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

async function sendFactura(req, res){
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
        const factura = await db.sequelize.models.facturas.findByPk(id, { paranoid: false });
        if(factura == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const worker = new Worker('./controllers_hilos/facturas_mails.controller.hilo.js', {
            workerData: { idFactura: id, usuarioFactura: req.usuario, listEmailsFactura:listEmails }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error interno del servidor", error: result.error.toString()});
            } else {
                if(result.status === false){
                    return res.status(400).send(result);
                }
                return res.status(200).send({ status: true, msg: "Factura enviada" });
            }
        });
        worker.on('error', (err) => {
            return res.status(500).send({ status: false, msg: "Error interno del servidor", error: err.toString()});
        });
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function sendMailFactura(idFactura, usuario, listEmails = []){
    const worker = new Worker('./controllers_hilos/facturas_mails.controller.hilo.js', {
        workerData: { idFactura: idFactura, usuarioFactura: usuario, listEmailsFactura:listEmails }
    });
}

async function sendMailFacturaLocal(idFactura, usuario, listEmails = []){
	const factura = await db.sequelize.models.facturas.findByPk(idFactura, { include:['factura_detalles','marca','cfdi'],paranoid: false });
    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(factura.factura_detalles[0].id_pedido_factura, { paranoid: false });
    var nombreCliente
    var noOperacion
    var referencia = ''
    var idCliente
    var certificado
    var idOficina
    if(pedidoFactura != null){
        certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['cliente','detalle_certificado'],paranoid: false });
        const cliente = certificado.cliente
        nombreCliente = cliente.nombre
        idCliente = cliente.id
        noOperacion = certificado.no_operacion
        referencia = (certificado.referencias !== null && certificado.referencias !== '' && certificado.referencias !== undefined ? " // " + certificado.referencias : '')
    }else{
        idOficina = factura.id_oficina
        const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:idOficina}})
        const cliente = await db.sequelize.models.clientes.findByPk(oficinaCliente.id_cliente, { paranoid: false });
        nombreCliente = cliente.nombre
        idCliente = cliente.id
        try {
            const referenciaTxt = factura.factura_detalles[0].comentarios.substring(factura.factura_detalles[0].comentarios.indexOf('Referencia'),factura.factura_detalles[0].comentarios.indexOf('Referencia del Cliente')).split(":")[1].split("<br>")[0].trim()
            const referenciaCliente = factura.factura_detalles[0].comentarios.substring(factura.factura_detalles[0].comentarios.indexOf('Referencia del Cliente'),factura.factura_detalles[0].comentarios.indexOf('Folio del certificado')).split(":")[1].split("<br>")[0].trim()
            noOperacion = referenciaCliente
            referencia  = referencia + (referenciaTxt != null && referenciaTxt !== '' && referenciaTxt !== undefined ? " // " + referenciaTxt : '')
        } catch (error) {
            noOperacion = factura.factura_detalles[0].comentarios
            referencia = ''
        }
    }

    const isAutoemisor = !usuario.es_colaborador && usuario.es_autoemisor
    var tpl = undefined
    tpl = await getMailTpl('email_factura.html')
    var htmlContent = undefined
    
    var tablaReferencia = ''
    var mensajeOperacion  = 'la operación solicitada'
    var mensajeSL = ''
    const idMarca = factura.id_marca
    const marca = await db.sequelize.models.marcas.findByPk(idMarca, { include:['pais'],paranoid: false });
    if(factura.factura_detalles.length > 1){
        noOperacion = factura.folio
        mensajeOperacion  = 'las operaciones solicitadas'
        for(const facturaDetalle of factura.factura_detalles){
            let pedidoFacturaData = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
            if(pedidoFacturaData != null){
                let certificadoData = await db.sequelize.models.certificados.findByPk(pedidoFacturaData.id_certificado, { paranoid: false });
        
                tablaReferencia = tablaReferencia + 
                `<tr>
                    <td>${certificadoData.no_operacion}</td>
                    <td>${certificadoData.referencias}</td>
                </tr>`
            }else{
                try {
                    const referencia = facturaDetalle.comentarios.substring(facturaDetalle.comentarios.indexOf('Referencia'),facturaDetalle.comentarios.indexOf('Referencia del Cliente')).split(":")[1].split("<br>")[0].trim()
                    const referenciaCliente = facturaDetalle.comentarios.substring(facturaDetalle.comentarios.indexOf('Referencia del Cliente'),facturaDetalle.comentarios.indexOf('Folio del certificado')).split(":")[1].split("<br>")[0].trim()
                    tablaReferencia = tablaReferencia + 
                    `<tr>
                        <td>${referencia !== null && referencia !== undefined && referencia != '' ? referencia : ''}</td>
                        <td>${referenciaCliente}</td>
                    </tr>`
                } catch (error) { }
            }
        }
        if(tablaReferencia != ''){
            tablaReferencia = 
            `<br><table width="100%" style="font-size: 12px;">
            <tr class="small-text text-left">
                <th style="padding:1px 5px">N.º de Operación</th>
                <th style="padding:1px 5px">Referencia</th>
            </tr>
            ${tablaReferencia}
            </table><br>`
        }
    }
    htmlContent = await remplaceDataCertificado({nombreCliente:nombreCliente,mensajeOperacion:mensajeOperacion,tablaReferencia:tablaReferencia,mensajeSL:mensajeSL},tpl)
    const asunto = `Envío de Factura electrónica // ${noOperacion}${referencia}`
    const emails = []
    if(usuario.envio_automatico && isAutoemisor){
        emails.push(usuario.email)
    }
    const contactosMails = await getListEmails(idCliente,certificado,idOficina,factura.id_marca)
    for(const mail of contactosMails){
        emails.push(mail)
    }
    for(const emailList of listEmails){
        emails.push(emailList)
    }
    const attachments = []
    const { genPdfLocal } = require('./facturacion_pdf.controller')
    const pdfCertificado = await genPdfLocal(idFactura);
    if(pdfCertificado.status === false){
        return pdfCertificado
    }
    const timestamp = moment().tz('America/Mexico_City').unix();
    attachments.push({
        filename: noOperacion + '_' + timestamp + '.pdf',
        content: pdfCertificado,
        contentType: 'application/pdf'
    })
    if(marca.pais.clave.toLowerCase() == "mx"){
        attachments.push({
            filename: noOperacion + '_comprobante.xml',
            content: factura.cfdi.xml,
            contentType: 'application/xml'
        })
    }
	let mailOptions = {
		to: emails,
		subject: asunto,
		html: htmlContent,
        attachments: attachments
	};
	const mainSender = new MailController(usuario.id,idMarca,mailOptions, null, false, true)
	await mainSender.sendMail()
    return true
    
}

async function getListEmails(idCliente,certificado,idOficina,idMarca){
    idMarca = 1
    const emails = []
	const parametrosRelacionesMarcaAgentesCliente = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	const findRelacionesMarcaAgentesCliente = new Relaciones(parametrosRelacionesMarcaAgentesCliente,parametrosRelacionesMarcaAgentesCliente,db.sequelize.models)
	const relacionesMarcaAgentesCliente = await findRelacionesMarcaAgentesCliente.getRelaciones()
    
    let marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:idCliente, id_marca: idMarca}})
    if(marcaAgentesClienteAux !== null){
        const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findByPk(marcaAgentesClienteAux.id, { include:relacionesMarcaAgentesCliente,paranoid: false });
        if(marcaAgentesCliente !== null){
            if(marcaAgentesCliente.agente_operativo !== null){
                emails.push(marcaAgentesCliente.agente_operativo.email)
            }
        }
    }
    if(certificado !== undefined){
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
                    if(contacto.enviar_correo && contacto.enviar_factura){
                        emails.push(contacto.email)
                    }
                }
            } catch (error) {
            }
        }
    } else if(idOficina !== undefined){
        const contactos = await db.sequelize.models.contactos.findAll({where:{id_oficina:idOficina}}, {paranoid: false });

        for(const contacto of contactos){
            if(contacto.enviar_correo && contacto.enviar_factura){
                emails.push(contacto.email)
            }
        }
    }
    return emails;

}

async function remplaceDataCertificado(data,tpl){
    tpl = tpl.replace(/\{\{\$nombreCliente\}\}/g, data.nombreCliente);
    tpl = tpl.replace(/\{\{\$mensajeOperacion\}\}/g, data.mensajeOperacion);
    tpl = tpl.replace(/\{\{\$tablaReferencia\}\}/g, data.tablaReferencia);
    tpl = tpl.replace(/\{\{\$mensajeSL\}\}/g, data.mensajeSL);
    
    return tpl
}

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendMailFactura,
    sendFactura,
    sendMailFacturaLocal
}
