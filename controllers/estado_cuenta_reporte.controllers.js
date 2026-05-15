'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { MailController } = require('./email.controller')
const fs = require('fs');
const path = require('path');

async function sendEstadoCuenta(){
    try {
		const relaciones = [{
			model: db.sequelize.models.oficinas_razones_sociales,
			as: 'oficinas_razones_sociales',
			attributes: ['id_oficina'],
		},{
			model: db.sequelize.models.clientes_razones_sociales,
			as: 'clientes_razones_sociales',
			attributes: ['id_cliente'],
            include: [
                {
                    model: db.sequelize.models.clientes, 
                    as: 'cliente', 
                    include: [
                        {
                            model: db.sequelize.models.cliente_detalles, 
                            as: 'detalles_cliente', 
                            include: [
                                {
                                    model: db.sequelize.models.usuarios, 
                                    as: 'agente_credito_cobranza', 
                                    attributes: ['nombre'],
                                }
                            ]
                        }
                    ]
                }
            ]
		}]
        
        const razonesSociales = await db.sequelize.models.razones_sociales.findAll({ include: relaciones });
        const data = []
        for(const razonSocial of razonesSociales){
            const element = razonSocial.toJSON()
            const oficinas = []
            for(const oficina of razonSocial.oficinas_razones_sociales){
                const contactos = await db.sequelize.models.contactos.findAll({where: {id_oficina: oficina.id_oficina},order: [['createdAt', 'ASC']]});
                let data_envio = undefined
                let dataEnvio = false
                const correos = []
                for(const contacto of contactos){
                    if(!dataEnvio){
                        dataEnvio = contacto.enviar_estado_cuenta == true
                        if(dataEnvio == true){
                            data_envio = {
                                manera_enviar: contacto.manera_enviar,
                                dia_envio: contacto.dia_envio
                            }
                            correos.push(contacto.email)
                        }
                    }else{
                        if(contacto.enviar_estado_cuenta == true){
                            correos.push(contacto.email)
                        }
                    }
                }
                if(dataEnvio){
                    oficinas.push({
                        idOficina: oficina.id_oficina,
                        dataEnvio: data_envio,
                        correosEnvio: correos
                    })
                }
            }
            element.oficinas = oficinas
            element.oficinas_razones_sociales = undefined
            razonSocial.clientes_razones_sociales[0].id_cliente = undefined
            element.cliente = razonSocial.clientes_razones_sociales[0].cliente
            element.clientes_razones_sociales = undefined
            element.reporte = []
            const dataReporte = await antiguedadSaldosCxC(razonSocial.id, element.cliente)
            if(dataReporte.success === undefined){
                for(const reporte of dataReporte){
                    element.reporte.push(reporte)
                }
                data.push(element)
            }
        }
        for(const razonSocial of data){
            for(const oficina of razonSocial.oficinas){
                let enviar = false
                if(oficina.dataEnvio.manera_enviar.toUpperCase() == 'S'){
                    const fecha = moment().tz('America/Mexico_City'); 
                    const diaSemana = fecha.day();
                    enviar = oficina.dataEnvio.dia_envio == diaSemana
                } else if(oficina.dataEnvio.manera_enviar.toUpperCase() == 'Q'){
                    const fecha = moment().tz('America/Mexico_City'); 
                    const diaMes = fecha.date();
                    const mes = fecha.month();
                    let diaMes2 = diaMes + 15;
                    if(mes == 1){
                        const anioActual = moment().year();
                        const esBisiesto = moment([anioActual, 1, 29]).isValid();
                        diaMes2 = esBisiesto ? 29 : 28
                    }
                    enviar = oficina.dataEnvio.dia_envio == diaMes || oficina.dataEnvio.dia_envio == diaMes2
                } else if(oficina.dataEnvio.manera_enviar.toUpperCase() == 'M'){
                    const fecha = moment().tz('America/Mexico_City'); 
                    const diaMes = fecha.date();
                    enviar = oficina.dataEnvio.dia_envio == diaMes
                }
                if(enviar){
                    if(razonSocial.reporte.length){
                        await sendMailEstadoCuenta(razonSocial.reporte,razonSocial.reporte[0].idMarca,oficina.correosEnvio,razonSocial.cliente.nombre)
                    }
                }
            }
        }
    } catch (error) {
    }
}


async function antiguedadSaldosCxC(idRazonSocial, cliente) {
	const filtro = await getFiltroAntiguedadSaldosCxC(idRazonSocial);
	if(filtro.success !== undefined){
		return filtro
	}
	try {

		var relaciones = [];
		const parametrosRelaciones = [ 
			'factura.marca.domicilio.estado.pais',
			'factura.marca.pais',
			'factura.marca.dato_facturacion.regimen_fiscal', 
			'factura.marca.dato_facturacion.pais', 
			'factura.marca.dato_facturacion.nacionalidad_timbrado',
			'factura.razon_social.pais', 
			'factura.razon_social.uso_cfdi',
			'factura.razon_social.metodo_pago',
			'factura.razon_social.forma_pago',
			'factura.razon_social.razon_bloqueo',
			'factura.razon_social.regimen_fiscal',
			'factura.razon_social.moneda_credito',
			'factura.moneda',
			'factura.cfdi.uso_cfdi',
			'factura.cfdi.metodo_pago',
			'factura.cfdi.forma_pago',
			'factura.cfdi.motivo_cancelacion',
			'factura.oficina',
		]
		const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models);
		relaciones = await findRelaciones.getRelaciones();

		const docs = await db.sequelize.models.cuentas_por_cobrar.findAll({
			paranoid: false,
			include: relaciones,
			order: [['createdAt', 'ASC']],
			where: filtro
		});
		
		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			if(element.factura != null){
				const listRel = [ 
					'factura_detalles.pedido_factura.certificado',
					'factura_detalles.producto.moneda_compra',
					'factura_detalles.producto.moneda_venta',
					'factura_detalles.producto.pais',
					'factura_detalles.producto.tipo_cobertura',
				];
				const findRelacionesFacturas = new Relaciones(listRel,listRel,db.sequelize.models);
				const relacionesFacturas =  await findRelacionesFacturas.getRelaciones();
	
				const factura = await db.sequelize.models.facturas.findByPk(element.id_factura,{ include:relacionesFacturas});
				element.factura.factura_detalles = factura.factura_detalles;
	
				const listRelPagos = [ 
					'pagos.pago.cfdi',
					'pagos.pago.cuenta_bancaria_interna.moneda',
					'pagos.pago.cuenta_bancaria_interna.entidad_bancaria',
					'pagos.pago.cuenta_bancaria_interna.dato_facturacion',
					'pagos.pago.moneda',
					'pagos.pago.metodo_pago',
					'pagos.pago.razon_social.pais', 
					'pagos.pago.razon_social.uso_cfdi',
					'pagos.pago.razon_social.metodo_pago',
					'pagos.pago.razon_social.forma_pago',
					'pagos.pago.razon_social.razon_bloqueo',
					'pagos.pago.razon_social.regimen_fiscal',
					'pagos.pago.razon_social.moneda_credito' 
				];
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models);
				const relacionesPagos =  await findRelacionesPagos.getRelaciones();
				const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(element.id_factura,{ include:relacionesPagos});
				element.pagos = cxc != null ? cxc.pagos : null;
				element.fecha_emision = moment(element.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:SS')
				element.cliente = '';
				element.agenteCxc = '';
				element.saldoVencido = 0;
				element.referenciaCliente = '';
	
				element.montoOriginal = 0
                if( element.factura.factura_detalles.length > 0){
                    for(const detalle of element.factura.factura_detalles){
                        const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
                        const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
                        const impuesto = parseFloat(detalle.impuesto ?? 0)
                        const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                        let subtotalFactura = (valorUnitario * cantidad )
                        let descuentoFactura = descuentoGeneral
                        let impuestoFactura = impuesto
                        element.montoOriginal = parseFloat(element.montoOriginal) + (parseFloat(subtotalFactura) + parseFloat(impuestoFactura) - parseFloat(descuentoFactura))
                    }
                }
				element.montoOriginal = parseFloat(element.montoOriginal).toFixed(2)
				
                element.cliente = cliente.nombre;
                element.idCliente = cliente.id;
                element.agenteCxc = cliente.detalles_cliente.agente_credito_cobranza != null ? cliente.detalles_cliente.agente_credito_cobranza.nombre : '';
				
				let fechaVencimiento = moment(element.fecha_vencimiento).tz('America/Mexico_City'); 
				let now = moment().tz('America/Mexico_City');
				now.hours(0).minutes(0).seconds(0).milliseconds(0);
				const diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
				if(diferenciaFechas < 0){
					element.saldoVencido = element.saldo;
					element.saldo = 0;
				}
				element.diasVencimiento = diferenciaFechas;
				const ultimafacturaDetalles = element.factura.factura_detalles.length-1;
				const pedidoFactura = element.factura.factura_detalles[ultimafacturaDetalles].pedido_factura;
				if(pedidoFactura != null && pedidoFactura != undefined){
					element.referenciaCliente = pedidoFactura.certificado.referencias != null ? pedidoFactura.certificado.referencias : '';
				}
				data.push(element);
			}
		}
        const hoja1 = [];
        for(const element of data){
            hoja1.push({
                'idMarca': element.factura.marca.id,
                'agente': element.agenteCxc,
                'oficina': element.factura.oficina.nombre,
                'folio': element.factura.folio,
                'cliente': "(" + element.factura.marca.clave + "-" +element.idCliente + ") " + element.cliente,
                'marca': element.factura.marca.nombre,
                'razonSocial': element.factura.razon_social.razon_social,
                'montoOriginal': parseFloat(element.montoOriginal),
                'monedaFactura': element.factura.moneda.clave,
                'saldoFactura': parseFloat(element.saldo),
                'saldoVencido': parseFloat(element.saldoVencido),
                'diasCredito': element.factura.razon_social.dias_credito,
                'fechaEmision': element.fecha_emision,
                'fechaVencimiento': element.fecha_vencimiento,
                'diasVencimiento': element.diasVencimiento,
                'referenciaInterna': element.factura.referencia,
                'referenciaCliente': element.referenciaCliente,
                'metodoPago': element.factura.cfdi != null ? element.factura.cfdi.metodo_pago.descripcion : 'N/A',
                'formaPago': element.factura.cfdi != null ? element.factura.cfdi.forma_pago.descripcion : 'N/A'
            });
        }
        return hoja1
	} catch (error) {
		return { success: false, error: 'Error interno del servidor', error: error.toString() };
	}
	
}
async function getFiltroAntiguedadSaldosCxC(idRazonSocial){
    var filtroFacturas = {deletedAt: null, id_razon_social: idRazonSocial};
    const facturas = await db.sequelize.models.facturas.findAll({where: filtroFacturas})
    if(facturas.length < 1){
        return { success: false, error: 'Sin registros' };
    }
    let facturasId = []
    for(const factura of facturas){
        facturasId.push(factura.id)
    }
    if(facturasId.length == 0){
        facturasId = [-1]
    }
    return  {deletedAt: null, id_factura: { [db.Sequelize.Op.or]: facturasId }, saldo: { [db.Sequelize.Op.gt]: 0 } };
}

async function sendMailEstadoCuenta(reporte, idMarca, listEmails = [], cliente){
    try {
        const dataMail = {
            nombreCliente: cliente,
            cxcs: await getDataReporte(reporte),
        }
        var tpl = undefined
        tpl = await getMailTpl('email_estado_cuenta.html')
        var htmlContent = undefined
        
        htmlContent = await remplaceData(dataMail,tpl)
        const asunto = `Estado de Cuenta`
        const emails = []
        for(const emailList of listEmails){
            emails.push(emailList)
        }
        let mailOptions = {
            to: emails,
            subject: asunto,
            html: htmlContent,
        };
        const mainSender = new MailController(null,idMarca,mailOptions, null)
        await mainSender.sendMail()
        return true
    } catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
    }
}


async function remplaceData(data,tpl){
    tpl = tpl.replace(/\{\{\$nombreCliente\}\}/g, data.nombreCliente);
    tpl = tpl.replace(/\{\{\$cxcs\}\}/g, data.cxcs);
    
    return tpl
}


async function getDataReporte(reportes){
    let detallesReporte = ''
    for(const reporte of reportes){
        detallesReporte = detallesReporte + 
        `<tr>
                            <td>${reporte.oficina}</td>
                            <td>${reporte.folio}</td>
                            <td>${reporte.cliente}</td>
                            <td>${reporte.marca}</td>
                            <td>${reporte.razonSocial}</td>
                            <td>${reporte.montoOriginal}</td>
                            <td>${reporte.monedaFactura}</td>
                            <td>${reporte.saldoFactura}</td>
                            <td>${reporte.saldoVencido}</td>
                            <td>${reporte.diasCredito}</td>
                            <td>${reporte.fechaEmision}</td>
                            <td>${reporte.fechaVencimiento}</td>
                            <td>${reporte.diasVencimiento}</td>
                            <td>${reporte.referenciaInterna}</td>
                            <td>${reporte.referenciaCliente}</td>
                            <td>${reporte.metodoPago}</td>
                            <td>${reporte.formaPago}</td>
                        </tr>`
    }
    return detallesReporte
  }

async function getMailTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

module.exports = {
	sendEstadoCuenta,
    sendMailEstadoCuenta
}
