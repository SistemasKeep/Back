'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { timbrarNotaCredito, cancelarNotaCredito } = require('./cfdis.controller')
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { MailController } = require('./email.controller')
const { genPdfLocal } = require('../controllers/notas_credito_pdf.controller');
const fs = require('fs');
const path = require('path');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.notas_credito.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cfdi','factura','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				factura: [ 
					'factura.marca.domicilio.estado.pais.continente',
					'factura.marca.pais.continente',
					'factura.marca.archivo',
					'factura.marca.dato_facturacion.regimen_fiscal', 
					'factura.marca.dato_facturacion.pais.continente', 
					'factura.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura.razon_social.pais.continente', 
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
					'factura.oficina'
				 ],
				 cfdi: [ 
					 'cfdi.uso_cfdi',
					 'cfdi.metodo_pago',
					 'cfdi.forma_pago',
					 'cfdi.motivo_cancelacion',
				  ],
				 all: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'factura.marca.domicilio.estado.pais.continente',
					'factura.marca.pais.continente',
					'factura.marca.archivo',
					'factura.marca.dato_facturacion.regimen_fiscal', 
					'factura.marca.dato_facturacion.pais.continente', 
					'factura.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura.razon_social.pais.continente', 
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
					'factura.oficina'
				 ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.notas_credito.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.notas_credito.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/notasCredito`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [
                    'pedido_factura.certificado',
                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				element.factura.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.factura.id}, include:relacionesFacDet})
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
					'pagos.pago.razon_social.moneda_credito',
				]
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura.id}})
                element.factura.cxc = null
                element.factura.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.factura.cxc = cxc
                    element.factura.factura_pagada = parseFloat(cxc.saldo) == 0
                }
                const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
                const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
                const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura.id_razon_social}, include:relaciones})
                let fechaVencimiento = null
                let diferenciaFechas = null
                if(element.factura.cxc != null){
                    fechaVencimiento = moment(element.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
                    let now = moment().tz('America/Mexico_City');
                    now.hours(0).minutes(0).seconds(0).milliseconds(0);
                    diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
                }
                var subtotalFactura = 0
                var impuestoFactura = 0
                var descuentoFactura = 0
				element.primer_documento = null
                for(const detalle of element.factura.factura_detalles){
                    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
					if(pedidoFactura != null){
						if(pedidoFactura.id_certificado !== null){
							element.primer_documento = "Certificado"
						}else if(pedidoFactura.id_servicio_ontrack !== null){
							element.primer_documento = "Servicio Monitoreo"
						}
                    } else{
						element.primer_documento = "Factura Manual"
					}
                    const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
                    const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
                    const impuesto = parseFloat(detalle.impuesto ?? 0)
                    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                    subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
                    descuentoFactura = descuentoFactura + descuentoGeneral
                    impuestoFactura = impuestoFactura + impuesto
                }
                const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
                //Se obtiene el tipo de cambio del dia
                let fechaString = moment(element.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
                let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
            
                let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
                if(doit !== true){
                    return doit
                }
                const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
                let tipoCambio = null
                if(tipoCambioSelected != undefined){
                    tipoCambio = tipoCambioSelected.tipo_cambio 
                }
                let folioPago = ''
                let fechaFolio = ''
                let fechaPago = ''
                let fechaAplicacion = ''
                if(element.factura.cxc != null){
                    for(const pago of element.factura.cxc.pagos){
                        const fechaFormateada = moment(pago.pago.fecha_pago).tz('America/Mexico_City')
                        if(fechaFolio === ''){
                            fechaFolio = moment(pago.pago.createdAt).tz('America/Mexico_City')
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = fechaFormateada.format('YYYY-MM-DD')
                        }
                        const fechaAux = moment(pago.pago.createdAt).tz('America/Mexico_City')
                        if(fechaAux > fechaFolio){
                            fechaFolio = fechaAux
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = moment(fechaFormateada).tz('America/Mexico_City').format('YYYY-MM-DD')
                        }
                    }
                }
                const getRelaciones =  [ 'agente_operativo','agente_venta_1' ]
                const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
                const relacionesAgente = await findRelacionesAgentes.getRelaciones()
				let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id}, include:relacionesAgente,paranoid: false})
                const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(clienteRazonSocial.cliente.id_detalle_cliente,{include:['agente_credito_cobranza']})
                const relsCliente = [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
                const findRelacionesClient = new Relaciones(relsCliente,relsCliente,db.sequelize.models)
                const relacionesCliente = await findRelacionesClient.getRelaciones()
                const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.cliente.id,{include:relacionesCliente})
                element.factura.cliente = cliente
                element.factura.tipo_cambio = tipoCambio
                element.factura.folio_ingreso = folioPago != '' ? folioPago : null
                element.factura.fecha_pago = fechaPago != '' ? fechaPago : null
                element.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
                element.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
                element.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
                element.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
                element.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
                element.factura.saldo_saldado = parseFloat((totalFactura - (element.factura.cxc != null ? element.factura.cxc.saldo : 0)).toFixed(2)) 
			}
			data.push(element)
		}
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltro(parametros){
	var filtro
	try {
		filtro = JSON.parse(parametros.filter)
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
	return await Filter.get()
}

async function store(req, res){
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		parametros.tipo = parametros.tipo.toUpperCase()
		let obligatorios = [{campo:'idCuentaPorCobrar', tipo:'model', model:db.sequelize.models.cuentas_por_cobrar},
							{campo:'tipo', tipo:'enum', largo:1, textoCase:"up", enum: ['B', 'C']},
        ]
		if(parametros.tipo != 'C'){
			obligatorios.push({campo:'total', tipo:'number'})
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'comentarios', tipo:'string',largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(parametros.idCuentaPorCobrar);
		const factura = await db.sequelize.models.facturas.findByPk(cXc.id_factura, { include:['factura_detalles','marca'],paranoid: false });
		registro.id_factura = factura.id
		var subtotalFactura = 0
		var impuestoFactura = 0
		var descuentoFactura = 0
		for(const detalle of factura.factura_detalles){
			subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0)
			impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0)
			descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0)
		}
		const totalFactura = (subtotalFactura + impuestoFactura) - descuentoFactura
		if(impuestoFactura > 0){
			subtotalFactura = parseFloat((totalFactura / 1.16).toFixed(6))
			impuestoFactura = parseFloat((subtotalFactura * 0.16).toFixed(6))
		}else{
			subtotalFactura = parseFloat((totalFactura).toFixed(6))
			impuestoFactura = parseFloat((impuestoFactura).toFixed(6))
		}
		const findRelaciones = new Relaciones(['factura.marca'],['factura.marca'],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const count = await db.sequelize.models.notas_credito.count({
			include:relaciones,
			where: {
				'$factura.id_marca$': factura.id_marca
			},
			paranoid: false
		});
		var subtotalNotasCredito = 0
		const saldoCxC = cXc != null ? parseFloat(cXc.saldo) : 0.0
		if(saldoCxC <= 0){
			return res.status(400).send({ status: false, msg: "Ya no se puede generar más notas de credito. El saldo de la cuenta por cobrar ya es $0.0"});
		}
		var nuevoSaldoCxC = 0
		if(registro.tipo == "C"){
			registro.folio = "NC" + factura.marca.clave + "-" + (count +1)
			registro.subtotal = subtotalFactura
			registro.impuesto = impuestoFactura
			subtotalNotasCredito = subtotalNotasCredito + (subtotalFactura + impuestoFactura)
		}else{
			registro.folio = "NC" + factura.marca.clave + "-" + (count +1)
			registro.subtotal = parseFloat((registro.total / 1.16).toFixed(6))
			registro.impuesto = parseFloat((registro.subtotal * 0.16).toFixed(6))
			subtotalNotasCredito = subtotalNotasCredito + parseFloat((registro.subtotal + registro.impuesto).toFixed(2))
		}
		nuevoSaldoCxC = (saldoCxC - parseFloat(parseFloat(subtotalNotasCredito).toFixed(2))).toFixed(6)
		if(parseFloat(nuevoSaldoCxC) < 0){
			return res.status(400).send({ status: false, msg: "Ya no se puede generar más notas de credito"});
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.notas_credito.create(registro);
		const dataNotaCredito = {
			idFactura: factura.id,
			subtotal: registro.subtotal,
			impuesto: registro.impuesto,
			notaCredito: nuevoRegistro
		}
		const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais'],paranoid: false });
		if(nuevoSaldoCxC < 0){
			nuevoSaldoCxC = 0
		}
		const datosUpdateCxC = {
			saldo: parseFloat((parseFloat(nuevoSaldoCxC)).toFixed(2)),
			updatedAt: moment().tz('America/Mexico_City')
		}
		await cXc.update(datosUpdateCxC, { where: { id: cXc.id } });
		if(parseFloat(nuevoSaldoCxC) == 0 && parametros.tipo == 'C'){
			for(const facturaDetalle of factura.factura_detalles){
				const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
				if(pedidoFactura != null){
					if(pedidoFactura.id_certificado !== null){
						const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { paranoid: false });
						const datosUpdateDetalle = {
							estatus: "P",
							updatedAt: moment().tz('America/Mexico_City')
						}
						const datosUpdateCertificado = {
							estatus: "N",
							updatedAt: moment().tz('America/Mexico_City')
						}
						await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
						await certificado.update(datosUpdateCertificado, { where: { id: certificado.id } });
					} else if(pedidoFactura.id_servicio_ontrack !== null){
						const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
						const datosUpdateDetalle = {
							estatus: "P",
							updatedAt: moment().tz('America/Mexico_City')
						}
						const datosUpdateServicioMonitoreo = {
							estatus: "N",
							updatedAt: moment().tz('America/Mexico_City')
						}
						await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
						await servicioMonitoreo.update(datosUpdateServicioMonitoreo, { where: { id: servicioMonitoreo.id } });
					}
				}
			}
		}
		if(marca.pais.clave.toLowerCase() == "mx"){
			const dataTimbradoNotaCredito = await timbrarNotaCredito(dataNotaCredito,req.usuario)
			if(dataTimbradoNotaCredito.validado != true){
				return res.status(400).send(dataTimbradoNotaCredito);
			}
		}
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function reTimbrarNotaCredito(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	const registroEncontrado = await db.sequelize.models.notas_credito.findByPk(id, {paranoid: false});
	if(registroEncontrado == null){
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	}
    if(registroEncontrado.id_cfdi != null){
        return res.status(400).send({ validado: false, msg: "La nota de credito ya fue timbrada" });
    }
	const factura = await db.sequelize.models.facturas.findByPk(registroEncontrado.id_factura, { include:['factura_detalles','marca'],paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais'],paranoid: false });
	if(marca.pais.clave.toLowerCase() == "mx"){
		const dataNotaCredito = {
			idFactura: factura.id,
			subtotal: parseFloat(registroEncontrado.subtotal),
			impuesto: parseFloat(registroEncontrado.impuesto),
			notaCredito: registroEncontrado
		}
		const dataTimbradoNotaCredito = await timbrarNotaCredito(dataNotaCredito,req.usuario)
		if(dataTimbradoNotaCredito.validado != true){
			return res.status(400).send(dataTimbradoNotaCredito);
		}
        return res.status(200).send({ validado: true, msg: "Nota de credito timbrada" });
	} else{
        return res.status(400).send({ validado: false, msg: "La nota de credito no requeire timbrado" });
	}
}


async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['cfdi','factura','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				factura: [ 
					'factura.marca.domicilio.estado.pais.continente',
					'factura.marca.pais.continente',
					'factura.marca.archivo',
					'factura.marca.dato_facturacion.regimen_fiscal', 
					'factura.marca.dato_facturacion.pais.continente', 
					'factura.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura.razon_social.pais.continente', 
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
					'factura.factura_detalles.pedido_factura.certificado',
					'factura.factura_detalles.producto.moneda_compra',
					'factura.factura_detalles.producto.moneda_venta',
					'factura.factura_detalles.producto.pais.continente',
					'factura.factura_detalles.producto.tipo_cobertura',
					'factura.factura_detalles.producto.archivo'
				 ],
				 cfdi: [ 
					 'cfdi.uso_cfdi',
					 'cfdi.metodo_pago',
					 'cfdi.forma_pago',
					 'cfdi.motivo_cancelacion',
				  ],
				 all: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'factura.marca.domicilio.estado.pais.continente',
				   'factura.marca.pais.continente',
				   'factura.marca.archivo',
				   'factura.marca.dato_facturacion.regimen_fiscal', 
				   'factura.marca.dato_facturacion.pais.continente', 
				   'factura.marca.dato_facturacion.nacionalidad_timbrado.continente',
				   'factura.razon_social.pais.continente', 
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
				   'factura.oficina'
				 ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.notas_credito.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [
                    'pedido_factura.certificado',
                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				element.factura.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.factura.id}, include:relacionesFacDet})
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
					'pagos.pago.razon_social.moneda_credito',
				]
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura.id}})
                element.factura.cxc = null
                element.factura.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.factura.cxc = cxc
                    element.factura.factura_pagada = parseFloat(cxc.saldo) == 0
                }
                const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
                const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
                const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura.id_razon_social}, include:relaciones})
                let fechaVencimiento = null
                let diferenciaFechas = null
                if(element.factura.cxc != null){
                    fechaVencimiento = moment(element.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
                    let now = moment().tz('America/Mexico_City');
                    now.hours(0).minutes(0).seconds(0).milliseconds(0);
                    diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
                }
                var subtotalFactura = 0
                var impuestoFactura = 0
                var descuentoFactura = 0
				element.primer_documento = null
                for(const detalle of element.factura.factura_detalles){
                    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
					if(pedidoFactura != null){
						if(pedidoFactura.id_certificado !== null){
							element.primer_documento = "Certificado"
						}else if(pedidoFactura.id_servicio_ontrack !== null){
							element.primer_documento = "Servicio Monitoreo"
						}
                    } else{
						element.primer_documento = "Factura Manual"
					}
                    const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
                    const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
                    const impuesto = parseFloat(detalle.impuesto ?? 0)
                    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                    subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
                    descuentoFactura = descuentoFactura + descuentoGeneral
                    impuestoFactura = impuestoFactura + impuesto
                }
                const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
                //Se obtiene el tipo de cambio del dia
                let fechaString = moment(element.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
                let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
            
                let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
                if(doit !== true){
                    return doit
                }
                const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
                let tipoCambio = null
                if(tipoCambioSelected != undefined){
                    tipoCambio = tipoCambioSelected.tipo_cambio 
                }
                let folioPago = ''
                let fechaFolio = ''
                let fechaPago = ''
                let fechaAplicacion = ''
                if(element.factura.cxc != null){
                    for(const pago of element.factura.cxc.pagos){
                        const fechaFormateada = moment(pago.pago.fecha_pago).tz('America/Mexico_City')
                        if(fechaFolio === ''){
                            fechaFolio = moment(pago.pago.createdAt).tz('America/Mexico_City')
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = fechaFormateada.format('YYYY-MM-DD')
                        }
                        const fechaAux = moment(pago.pago.createdAt).tz('America/Mexico_City')
                        if(fechaAux > fechaFolio){
                            fechaFolio = fechaAux
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = moment(fechaFormateada).tz('America/Mexico_City').format('YYYY-MM-DD')
                        }
                    }
                }
                const getRelaciones =  [ 'agente_operativo','agente_venta_1' ]
                const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
                const relacionesAgente = await findRelacionesAgentes.getRelaciones()
				let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id}, include:relacionesAgente,paranoid: false})
                const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(clienteRazonSocial.cliente.id_detalle_cliente,{include:['agente_credito_cobranza']})
                const relsCliente = [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
                const findRelacionesClient = new Relaciones(relsCliente,relsCliente,db.sequelize.models)
                const relacionesCliente = await findRelacionesClient.getRelaciones()
                const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.cliente.id,{include:relacionesCliente})
                element.factura.cliente = cliente
                element.factura.tipo_cambio = tipoCambio
                element.factura.folio_ingreso = folioPago != '' ? folioPago : null
                element.factura.fecha_pago = fechaPago != '' ? fechaPago : null
                element.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
                element.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
                element.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
                element.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
                element.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
                element.factura.saldo_saldado = parseFloat((totalFactura - (element.factura.cxc != null ? element.factura.cxc.saldo : 0)).toFixed(2)) 
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		return res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.notas_credito.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.notas_credito.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name)){
								canDelete = false
								modelosUtilizados.push(modelo.name)
							}
						}
					}
				}
			}
			if(!canDelete){
				return res.status(400).send({ status: false, msg: `No se pudo eliminar. El elemento actualmente está siendo referenciado en los modelos [${modelosUtilizados}].` });
			}
			if(registroAEliminar.deletedAt != null){
				return res.status(400).send({ status: false, msg: "La nota de credito ya fue cancelada" });
			}
			const factura = await db.sequelize.models.facturas.findByPk(registroAEliminar.id_factura, { include:['factura_detalles','marca'],paranoid: false });
			for(const facturaDetalle of factura.factura_detalles){
				const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
				if(pedidoFactura != null){
					if(pedidoFactura.id_certificado !== null){
						const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { paranoid: false });
						if((pedidoFactura.estatus === "F" || certificado.estatus === "F") && registroAEliminar.tipo == "C"){
							return res.status(400).send({ status: false, msg: `No se pudo cancelar. Algún pedido de factura o certificado ligado a la nota de credito se refacturo nuevamente.` });
						}
					}else if(pedidoFactura.id_servicio_ontrack !== null){
						const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
						if((pedidoFactura.estatus === "F" || servicioMonitoreo.estatus === "F") && registroAEliminar.tipo == "C"){
							return res.status(400).send({ status: false, msg: `No se pudo cancelar. Algún pedido de factura o servicio monitoreo ligado a la nota de credito se refacturo nuevamente.` });
						}
					}
				}
			}
			const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais'],paranoid: false });
			if(marca.pais.clave.toLowerCase() == "mx"){
				const cancelarNota = await cancelarNotaCredito(id)
				if(cancelarNota.status != true){
					return res.status(400).send(cancelarNota);
				}
			} 
			await registroAEliminar.destroy({ where: { id: registroAEliminar.id } });
			const cXc = await db.sequelize.models.cuentas_por_cobrar.findOne({ where:{id_factura:registroAEliminar.id_factura}});
			const saldoAnterior = parseFloat(cXc.saldo)
			const nuevoSaldoCxC = parseFloat(cXc.saldo) + parseFloat((parseFloat(registroAEliminar.subtotal) + parseFloat(registroAEliminar.impuesto)).toFixed(2))
			const datosUpdateCxC = {
				saldo: parseFloat((parseFloat(nuevoSaldoCxC)).toFixed(2)),
				updatedAt: moment().tz('America/Mexico_City')
			}
			await cXc.update(datosUpdateCxC, { where: { id: cXc.id } });
			if(saldoAnterior <= 0){
				for(const facturaDetalle of factura.factura_detalles){
					const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
					if(pedidoFactura != null){
						if(pedidoFactura.id_certificado !== null){
							const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { paranoid: false });
							const datosUpdateDetalle = {
								estatus: "F",
								updatedAt: moment().tz('America/Mexico_City')
							}
							const datosUpdateCertificado = {
								estatus: "F",
								updatedAt: moment().tz('America/Mexico_City')
							}
							await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
							await certificado.update(datosUpdateCertificado, { where: { id: certificado.id } });
						} else if(pedidoFactura.id_servicio_ontrack !== null){
							const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
							const datosUpdateDetalle = {
								estatus: "F",
								updatedAt: moment().tz('America/Mexico_City')
							}
							const datosUpdateServicioMonitoreo = {
								estatus: "F",
								updatedAt: moment().tz('America/Mexico_City')
							}
							await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
							await servicioMonitoreo.update(datosUpdateServicioMonitoreo, { where: { id: servicioMonitoreo.id } });
						}
					}
				}
			}

			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function getXML(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {

		const registroEncontrado = await db.sequelize.models.notas_credito.findByPk(id, {include:['cfdi'],paranoid: false});
		if(registroEncontrado != null){
			if(registroEncontrado.id_cfdi !== null){
				return res.status(200).send({ status: true, data: registroEncontrado.cfdi.xml});
			}
			return res.status(400).send({ status: false, msg: "El registro no cuenta con cfdi" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.notas_credito.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['all'];
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				 all: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'factura.marca.domicilio.estado.pais.continente',
					'factura.marca.pais.continente',
					'factura.marca.archivo',
					'factura.marca.dato_facturacion.regimen_fiscal', 
					'factura.marca.dato_facturacion.pais.continente', 
					'factura.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura.razon_social.pais.continente', 
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
					'factura.oficina'
				 ]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const docs = await db.sequelize.models.notas_credito.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		});

		const data = [];
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [
                    'pedido_factura.certificado',
                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				element.factura.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.factura.id}, include:relacionesFacDet})
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
					'pagos.pago.razon_social.moneda_credito',
				]
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura.id}})
                element.factura.cxc = null
                element.factura.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.factura.cxc = cxc
                    element.factura.factura_pagada = parseFloat(cxc.saldo) == 0
                }
                const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
                const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
                const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura.id_razon_social}, include:relaciones})
                let fechaVencimiento = null
                let diferenciaFechas = null
                if(element.factura.cxc != null){
                    fechaVencimiento = moment(element.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
                    let now = moment().tz('America/Mexico_City');
                    now.hours(0).minutes(0).seconds(0).milliseconds(0);
                    diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
                }
                var subtotalFactura = 0
                var impuestoFactura = 0
                var descuentoFactura = 0
				element.primer_documento = null
                for(const detalle of element.factura.factura_detalles){
                    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
					if(pedidoFactura != null){
						if(pedidoFactura.id_certificado !== null){
							element.primer_documento = "Certificado"
						}else if(pedidoFactura.id_servicio_ontrack !== null){
							element.primer_documento = "Servicio Monitoreo"
						}
                    } else{
						element.primer_documento = "Factura Manual"
					}
					const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
					const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
					const impuesto = parseFloat(detalle.impuesto ?? 0)
                    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                    subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
                    descuentoFactura = descuentoFactura + descuentoGeneral
                    impuestoFactura = impuestoFactura + impuesto
                }
                const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
                //Se obtiene el tipo de cambio del dia
                let fechaString = moment(element.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
                let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
            
                let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
                if(doit !== true){
                    return doit
                }
                const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
                let tipoCambio = null
                if(tipoCambioSelected != undefined){
                    tipoCambio = tipoCambioSelected.tipo_cambio 
                }
                let folioPago = ''
                let fechaFolio = ''
                let fechaPago = ''
                let fechaAplicacion = ''
                if(element.factura.cxc != null){
                    for(const pago of element.factura.cxc.pagos){
                        const fechaFormateada = moment(pago.pago.fecha_pago).tz('America/Mexico_City')
                        if(fechaFolio === ''){
                            fechaFolio = moment(pago.pago.createdAt).tz('America/Mexico_City')
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = fechaFormateada.format('YYYY-MM-DD')
                        }
                        const fechaAux = moment(pago.pago.createdAt).tz('America/Mexico_City')
                        if(fechaAux > fechaFolio){
                            fechaFolio = fechaAux
                            fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
                            folioPago = pago.pago.folio
                            fechaPago = moment(fechaFormateada).tz('America/Mexico_City').format('YYYY-MM-DD')
                        }
                    }
                }
                const getRelaciones =  [ 'agente_operativo','agente_venta_1' ]
                const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
                const relacionesAgente = await findRelacionesAgentes.getRelaciones()
				let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id}, include:relacionesAgente,paranoid: false})
                const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(clienteRazonSocial.cliente.id_detalle_cliente,{include:['agente_credito_cobranza']})
                const relsCliente = [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
                const findRelacionesClient = new Relaciones(relsCliente,relsCliente,db.sequelize.models)
                const relacionesCliente = await findRelacionesClient.getRelaciones()
                const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.cliente.id,{include:relacionesCliente})
                element.factura.cliente = cliente
                element.factura.tipo_cambio = tipoCambio
                element.factura.folio_ingreso = folioPago != '' ? folioPago : null
                element.factura.fecha_pago = fechaPago != '' ? fechaPago : null
                element.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
                element.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
                element.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
                element.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
                element.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
                element.factura.saldo_saldado = parseFloat((totalFactura - (element.factura.cxc != null ? element.factura.cxc.saldo : 0)).toFixed(2))
				element.fecha_emision = element.createdAt.toISOString().slice(0, 19).replace('T', ' ');
                const tc = await db.sequelize.models.tipos_cambio_futuro.findByPk(element.factura.factura_detalles[0].pedido_factura?.certificado?.id_tipo_cambio_futuro);
                element.tipo_cambio = tc != null ? tc.tipo_cambio : '';
                const nombreCliente = await db.sequelize.models.clientes.findByPk(element.factura.factura_detalles[0].pedido_factura === element.factura.factura_detalles[0].pedido_factura || element.factura.factura_detalles[0].pedido_factura === null ? element.factura.cliente.id : element.factura.factura_detalles[0].pedido_factura.certificado.id_cliente);
                element.cliente = nombreCliente != null ? nombreCliente.nombre : '';
			}
			data.push(element)
		}
		
		const dataExcel = [];
		let aux;
		console.log(data.length)
		for (let i = 0; i < data.length; i++) {
			console.log(i)
			let elemento = data[i];
			aux = {
				'Folio': elemento.folio,
				'Tipo': elemento.tipo,
				'Fecha de emisión': elemento.fecha_emision,
				'Cliente': elemento.cliente,
				'Razón social': elemento.factura.razon_social.razon_social,
				'Marca': elemento.factura.marca.nombre,
				'Subtotal': elemento.subtotal,
				'Impuesto': elemento.impuesto,
				'Total': parseFloat(parseFloat(elemento.subtotal).toFixed(2)) +  parseFloat(parseFloat(elemento.impuesto).toFixed(2)),
				'Moneda': elemento.factura.moneda.descripcion,
				'Tipo de cambio': elemento.tipo_cambio,
				'Saldado': elemento.factura.factura_pagada == true ? 'Si' : 'No'
			};
			dataExcel.push(aux);
		}
		console.log(dataExcel.length)

		const nombreReporte = 'Notas de credito';
		const namesSheets = [db.sequelize.models.notas_credito.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteOneSheet(res,req);
	} catch (error) {
		console.log(error)
	}
	
}

async function enviarNotaCredito(req, res) {
	const { id } = req.params;
	const destinatarios = req.body.correos;
	
	if(!Number.isInteger(parseInt(id))){
		return res.status(400).send({status: false , msg: `El parametro id debe ser int.`});
	}

	const notaCredito = await db.sequelize.models.notas_credito.findByPk(id, {include:['cfdi'], paranoid: true});
	if(notaCredito == null){
		return res.status(400).send({status: false , msg: `La nota de crédito no existe o se encuentra eliminada.`});
	}
	const folio = notaCredito.folio;

	const attachments = [];
	try {
		//genera cuerpo del correo
		const htmlContent = await getCuerpoCorreo('email_generico_cxp.html');
		const pdf = await genPdfLocal(id);

		//agrega pdf de la nota de crédito
		attachments.push({
			filename: `nota_credito_${folio}.pdf`,
			content: pdf,
			contentType: 'application/pdf'
		});

		//si tiene cfdi, lo agrega
		if(notaCredito.cfdi != null){
			attachments.push({
				filename: `${folio}_comprobante.xml`,
				content: notaCredito.cfdi.xml,
				contentType: 'application/xml'
			});
		}

		let mailOptions = {
			to: destinatarios,
			subject: `Nota de crédito | ${folio}`,
			html: htmlContent,
			attachments: attachments
		};
		
		const mainSender = new MailController(null, null, mailOptions, true);
		await mainSender.sendMail();
		return res.status(200).send({ cosa: 'La nota de crédito se ha envíado por correo'});
	} catch (error) {
		return res.status(400).send({status: false , msg: `Error interno del servidor`});
	}
}

async function getCuerpoCorreo(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido;
}

module.exports = {
	index,
	store,
	show,
	destroy,
	getXML,
	exportar,
	reTimbrarNotaCredito,
	enviarNotaCredito
}
