'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { timbrarLocal } = require('./cfdis.controller');
const { sendMailFactura } = require('./facturas_mails.controllers')



async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.pedidos_factura.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'certificado.marca', 'certificado.cliente', 'certificado.oficina_razon_social']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.pedidos_factura.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.pedidos_factura.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/pedidosFactura`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil  == 'all'){
				if(element.id_certificado){
					const parametrosDetalles = [ 'atributo' ]
					const findRelaciones = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
					const relaciones = await findRelaciones.getRelaciones()
					let det_cer = await db.sequelize.models.detalle_certificados.findAll({
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:element.certificado.id,
							},
						},
						include: relaciones
					})
					if(det_cer != null){
						element.certificado.detalle_certificado = det_cer
					}
				}

				const listRel = [
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

                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				const facturaDetalle = await db.sequelize.models.factura_detalles.findOne({where:{id_pedido_factura: element.id}, include:relacionesFacDet})
				if(facturaDetalle != null){
					element.factura_detalles = facturaDetalle.toJSON()
					if(element.factura_detalles.factura != null){
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
						const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura_detalles.id_factura}})
						element.factura_detalles.factura.cxc = null
						element.factura_detalles.factura.factura_pagada = false
						if(cxcAux !== null){
							const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
							element.factura_detalles.factura.cxc = cxc
							element.factura_detalles.factura.factura_pagada = parseFloat(cxc.saldo) == 0
						}
						const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
						const findRelCliente = new Relaciones(relClientes,relClientes,db.sequelize.models)
						const relacionescliente = await findRelCliente.getRelaciones()
						const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura_detalles.factura.id_razon_social}, include:relacionescliente})
						let fechaVencimiento = null
						let diferenciaFechas = null
						if(element.factura_detalles.factura.cxc != null){
							fechaVencimiento = moment(element.factura_detalles.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
							let now = moment().tz('America/Mexico_City');
							now.hours(0).minutes(0).seconds(0).milliseconds(0);
							diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
						}
						var subtotalFactura = 0
						var impuestoFactura = 0
						var descuentoFactura = 0
						const detalle = element.factura_detalles
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, {paranoid: false });
						var impuestoCertificado
						var subtotal
						var descuento
						if(pedidoFactura != null){
							const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
							subtotal = certificado.detalle_certificado[0].subtotal
							descuento = certificado.detalle_certificado[0].descuento_monto
							impuestoCertificado = certificado.detalle_certificado[0].monto_iva
						}
						const valorUnitario = parseFloat(detalle.precio_unitario ?? subtotal)
						const descuentoGeneral = parseFloat(detalle.descuento ?? descuento)
						const impuesto = parseFloat(detalle.impuesto ?? impuestoCertificado)
						const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
						subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
						descuentoFactura = descuentoFactura + descuentoGeneral
						impuestoFactura = impuestoFactura + impuesto
						element.impuestoPedido = parseFloat((impuestoFactura).toFixed(2))
						element.descuentoPedido = parseFloat((descuentoFactura).toFixed(2))
						element.subtotalPedido = parseFloat((subtotalFactura).toFixed(2))
						element.importePedido = parseFloat((subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2))
						const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)

						//Se obtiene el tipo de cambio del dia
						let fechaString = moment(element.factura_detalles.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
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
						if(element.factura_detalles.factura.cxc != null){
							for(const pago of element.factura_detalles.factura.cxc.pagos){
								const fechaFormateada = moment.utc(pago.pago.fecha_pago).format('YYYY-MM-DD')
								if(fechaFolio === ''){
									fechaFolio = moment(pago.pago.createdAt).tz('America/Mexico_City')
									fechaAplicacion = fechaFolio.format('YYYY-MM-DD')
									folioPago = pago.pago.folio
									fechaPago = moment(fechaFormateada).tz('America/Mexico_City').format('YYYY-MM-DD')
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
						const idMarca = 1
						let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id, id_marca: idMarca}, include:relacionesAgente,paranoid: false})
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
						element.factura_detalles.factura.cliente = cliente
						element.factura_detalles.factura.tipo_cambio = tipoCambio
						element.factura_detalles.factura.folio_ingreso = folioPago != '' ? folioPago : null
						element.factura_detalles.factura.fecha_pago = fechaPago != '' ? fechaPago : null
						element.factura_detalles.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
						element.factura_detalles.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
						element.factura_detalles.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
						element.factura_detalles.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
						element.factura_detalles.factura.notas_credito = await db.sequelize.models.notas_credito.findAll({where:{id_factura:element.factura_detalles.factura.id}}),
						element.factura_detalles.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
						element.factura_detalles.factura.saldo_saldado = parseFloat((totalFactura - (element.factura_detalles.factura.cxc != null ? element.factura_detalles.factura.cxc.saldo : 0)).toFixed(2)) 
					}
				} else{
					const certificado = await db.sequelize.models.certificados.findByPk(element.id_certificado, { include:['detalle_certificado'], paranoid: false });
					let subtotal = certificado != null ? certificado.detalle_certificado[0].subtotal : 0
					let descuento = certificado != null ? certificado.detalle_certificado[0].descuento_monto : 0
					let impuestoCertificado = certificado != null ? certificado.detalle_certificado[0].monto_iva : 0
					let subtotalFactura = parseFloat(subtotal) * 1
					let descuentoFactura = parseFloat(descuento)
					let impuestoFactura = parseFloat(impuestoCertificado)
					element.impuestoPedido = parseFloat((impuestoFactura).toFixed(2))
					element.descuentoPedido = parseFloat((descuentoFactura).toFixed(2))
					element.subtotalPedido = parseFloat((subtotalFactura).toFixed(2))
					element.importePedido = parseFloat((subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2))
					element.factura_detalles = null
				}
				element.marca = element.certificado != null ? element.certificado.marca : null;
				element.moneda = null
				if(element.certificado != null ){
					const moneda = await db.sequelize.models.monedas.findByPk(element.certificado.id_moneda);
					element.moneda = moneda != null ? moneda : null;
				}
				if(element.certificado != null){
					if(element.certificado.oficina_razon_social != null){
						const razonSocial = await db.sequelize.models.razones_sociales.findByPk(element.certificado.oficina_razon_social.id_razon_social);
						element.razon_social = razonSocial != null ? razonSocial : null;
					}else{
						element.razon_social = null;
					}
				}


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
		console.log(error)
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


async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'certificado.marca', 'certificado.cliente' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.pedidos_factura.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil  == 'all'){
				const parametrosDetalles = [ 'atributo' ]
				const findRelaciones = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				let det_cer = await db.sequelize.models.detalle_certificados.findAll({
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:element.certificado.id,
						},
					},
					include: relaciones
				})
				if(det_cer != null){
					element.certificado.detalle_certificado = det_cer
				}

				const listRel = [
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
                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				const facturaDetalle = await db.sequelize.models.factura_detalles.findOne({where:{id_pedido_factura: element.id}, include:relacionesFacDet})
				if(facturaDetalle != null){
					element.factura_detalles = facturaDetalle.toJSON()
					if(element.factura_detalles.factura != null){
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
						const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura_detalles.id_factura}})
						element.factura_detalles.factura.cxc = null
						element.factura_detalles.factura.factura_pagada = false
						if(cxcAux !== null){
							const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
							element.factura_detalles.factura.cxc = cxc
							element.factura_detalles.factura.factura_pagada = parseFloat(cxc.saldo) == 0
						}
						const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
						const findRelCliente = new Relaciones(relClientes,relClientes,db.sequelize.models)
						const relacionescliente = await findRelCliente.getRelaciones()
						const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura_detalles.factura.id_razon_social}, include:relacionescliente})
						let fechaVencimiento = null
						let diferenciaFechas = null
						if(element.factura_detalles.factura.cxc != null){
							fechaVencimiento = moment(element.factura_detalles.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
							let now = moment().tz('America/Mexico_City');
							now.hours(0).minutes(0).seconds(0).milliseconds(0);
							diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
						}
						var subtotalFactura = 0
						var impuestoFactura = 0
						var descuentoFactura = 0
						const detalle = element.factura_detalles
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, {paranoid: false });
						var impuestoCertificado
						var subtotal
						var descuento
						if(pedidoFactura != null){
							const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
							subtotal = certificado.detalle_certificado[0].subtotal
							descuento = certificado.detalle_certificado[0].descuento_monto
							impuestoCertificado = certificado.detalle_certificado[0].monto_iva
						}
						const valorUnitario = parseFloat(detalle.precio_unitario ?? subtotal)
						const descuentoGeneral = parseFloat(detalle.descuento ?? descuento)
						const impuesto = parseFloat(detalle.impuesto ?? impuestoCertificado)
						const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
						subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
						descuentoFactura = descuentoFactura + descuentoGeneral
						impuestoFactura = impuestoFactura + impuesto
						element.impuestoPedido = parseFloat((impuestoFactura).toFixed(2))
						element.descuentoPedido = parseFloat((descuentoFactura).toFixed(2))
						element.subtotalPedido = parseFloat((subtotalFactura).toFixed(2))
						element.importePedido = parseFloat((subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2))
						const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
						//Se obtiene el tipo de cambio del dia
						let fechaString = moment(element.factura_detalles.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
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
						if(element.factura_detalles.factura.cxc != null){
							for(const pago of element.factura_detalles.factura.cxc.pagos){
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
						const idMarca = 1
						let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id, id_marca: idMarca}, include:relacionesAgente,paranoid: false})
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
						element.factura_detalles.factura.cliente = cliente
						element.factura_detalles.factura.tipo_cambio = tipoCambio
						element.factura_detalles.factura.folio_ingreso = folioPago != '' ? folioPago : null
						element.factura_detalles.factura.fecha_pago = fechaPago != '' ? fechaPago : null
						element.factura_detalles.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
						element.factura_detalles.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
						element.factura_detalles.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
						element.factura_detalles.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
						element.factura_detalles.factura.notas_credito = await db.sequelize.models.notas_credito.findAll({where:{id_factura:element.factura_detalles.factura.id}}),
						element.factura_detalles.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
						element.factura_detalles.factura.saldo_saldado = parseFloat((totalFactura - (element.factura_detalles.factura.cxc != null ? element.factura_detalles.factura.cxc.saldo : 0)).toFixed(2)) 
					}
				} else{
					const certificado = await db.sequelize.models.certificados.findByPk(element.id_certificado, { include:['detalle_certificado'], paranoid: false });
					let subtotal = certificado != null ? certificado.detalle_certificado[0].subtotal : 0
					let descuento = certificado != null ? certificado.detalle_certificado[0].descuento_monto : 0
					let impuestoCertificado = certificado != null ? certificado.detalle_certificado[0].monto_iva : 0
					let subtotalFactura = parseFloat(subtotal) * 1
					let descuentoFactura = parseFloat(descuento)
					let impuestoFactura = parseFloat(impuestoCertificado)
					element.impuestoPedido = parseFloat((impuestoFactura).toFixed(2))
					element.descuentoPedido = parseFloat((descuentoFactura).toFixed(2))
					element.subtotalPedido = parseFloat((subtotalFactura).toFixed(2))
					element.importePedido = parseFloat((subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2))
					element.factura_detalles = null
				}
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}


async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.pedidos_factura.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {
		req.query.perfil = 'all';
        const perfilesValidos = ['all'];
        var relaciones = [];
        if(perfilesValidos.includes(req.query.perfil)){
            const parametrosRelaciones = {
                all: [ 
					'certificado.marca', 
					'certificado.cliente',
					'certificado.oficina_razon_social'
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
            relaciones = await findRelaciones.getRelaciones();
        }
		
        const docs = await db.sequelize.models.pedidos_factura.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        });
		if(docs.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		if(docs.length > 500){
			var sendHeader = false;
			res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
        }

		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil  == 'all'){
				const parametrosDetalles = [ 'atributo' ]
				const findRelaciones = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				let det_cer = await db.sequelize.models.detalle_certificados.findAll({
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:element.certificado.id,
						},
					},
					include: relaciones
				})
				if(det_cer != null){
					element.certificado.detalle_certificado = det_cer
				}

				const listRel = [
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
                    'producto.moneda_compra',
                    'producto.moneda_venta',
                    'producto.pais.continente',
                    'producto.tipo_cobertura',
                    'producto.archivo'
                ]
				const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacDet =  await findRelacionesFacDet.getRelaciones()
				const facturaDetalle = await db.sequelize.models.factura_detalles.findOne({where:{id_pedido_factura: element.id}, include:relacionesFacDet})
				if(facturaDetalle != null){
					element.factura_detalles = facturaDetalle.toJSON()
					if(element.factura_detalles.factura != null){
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
						const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.factura_detalles.id_factura}})
						element.factura_detalles.factura.cxc = null
						element.factura_detalles.factura.factura_pagada = false
						if(cxcAux !== null){
							const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos});
							element.factura_detalles.factura.cxc = cxc;
							element.factura_detalles.factura.factura_pagada = parseFloat(cxc.saldo) == 0;
						}
						const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
						const findRelCliente = new Relaciones(relClientes,relClientes,db.sequelize.models);
						const relacionescliente = await findRelCliente.getRelaciones();
						const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.factura_detalles.factura.id_razon_social}, include:relacionescliente});
						let fechaVencimiento = null;
						let diferenciaFechas = null;
						if(element.factura_detalles.factura.cxc != null){
							fechaVencimiento = moment(element.factura_detalles.factura.cxc.fecha_vencimiento).tz('America/Mexico_City');
							let now = moment().tz('America/Mexico_City');
							now.hours(0).minutes(0).seconds(0).milliseconds(0);
							diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24);
						}
						var subtotalFactura = 0;
						var impuestoFactura = 0;
						var descuentoFactura = 0;
						const detalle = element.factura_detalles;
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, {paranoid: false });
						var impuestoCertificado;
						var subtotal;
						var descuento;
						if(pedidoFactura != null){
							const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
							subtotal = certificado.detalle_certificado[0].subtotal
							descuento = certificado.detalle_certificado[0].descuento_monto
							impuestoCertificado = certificado.detalle_certificado[0].monto_iva
						}
						const valorUnitario = parseFloat(detalle.precio_unitario ?? subtotal)
						const descuentoGeneral = parseFloat(detalle.descuento ?? descuento)
						const impuesto = parseFloat(detalle.impuesto ?? impuestoCertificado)
						const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
						subtotalFactura = subtotalFactura + (valorUnitario * cantidad )
						descuentoFactura = descuentoFactura + descuentoGeneral
						impuestoFactura = impuestoFactura + impuesto
						const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
						//Se obtiene el tipo de cambio del dia
						let fechaString = moment(element.factura_detalles.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
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
						if(element.factura_detalles.factura.cxc != null){
							for(const pago of element.factura_detalles.factura.cxc.pagos){
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
						const idMarca = 1
						let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id, id_marca: idMarca}, include:relacionesAgente,paranoid: false})
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
						];
						const findRelacionesClient = new Relaciones(relsCliente,relsCliente,db.sequelize.models);
						const relacionesCliente = await findRelacionesClient.getRelaciones();
						const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.cliente.id,{include:relacionesCliente});
						element.factura_detalles.factura.cliente = cliente;
						element.factura_detalles.factura.tipo_cambio = tipoCambio;
						element.factura_detalles.factura.folio_ingreso = folioPago != '' ? folioPago : null;
						element.factura_detalles.factura.fecha_pago = fechaPago != '' ? fechaPago : null;
						element.factura_detalles.factura.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null;
						element.factura_detalles.factura.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null;
						element.factura_detalles.factura.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null;
						element.factura_detalles.factura.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null;
						element.factura_detalles.factura.notas_credito = await db.sequelize.models.notas_credito.findAll({where:{id_factura:element.factura_detalles.factura.id}});
						element.factura_detalles.factura.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2));
						element.factura_detalles.factura.saldo_saldado = parseFloat((totalFactura - (element.factura_detalles.factura.cxc != null ? element.factura_detalles.factura.cxc.saldo : 0)).toFixed(2)); 
					}
				} else{
					element.factura_detalles = null;
				}
			}
			data.push(element)
		}

        let idMarca = null;
		const elementos = [];
        for(const element of data){
			//validaciones para omitir datos faltantes en la exportación
			if(element.factura_detalles == null) continue;
			if(element.factura_detalles.factura == null) continue;

			const cliente = await db.sequelize.models.clientes.findByPk(element.certificado.id_cliente);
			const marca = element.certificado != null ?  await db.sequelize.models.marcas.findByPk(element.certificado.id_marca) : null;
			const moneda = element.certificado != null ?await db.sequelize.models.monedas.findByPk(element.certificado.id_moneda) : null;

			var subtotalFactura = 0;
            var impuestoFactura = 0;
            var descuentoFactura = 0;
			var impuestoCertificado;
			var subtotal;
			var descuento;
			if(element != null){
				const certificado = await db.sequelize.models.certificados.findByPk(element.id_certificado, { include:['detalle_certificado'], paranoid: false });
				subtotal = certificado != null ? certificado.detalle_certificado[0].subtotal : 0
				descuento = certificado != null ? certificado.detalle_certificado[0].descuento_monto : 0
				impuestoCertificado = certificado != null ? certificado.detalle_certificado[0].monto_iva : 0
			}
			
			const valorUnitario = parseFloat( element.factura_detalles == null ? subtotal : (element.factura_detalles.precio_unitario ?? descuento));
			const descuentoGeneral = parseFloat(element.factura_detalles == null ? descuento : (element.factura_detalles.descuento ?? descuento));
			const impuesto = parseFloat(element.factura_detalles == null ? impuestoCertificado :  (element.factura_detalles.impuesto ?? impuestoCertificado));
			const cantidad = parseInt(element.factura_detalles == null ? 1 : (element.factura_detalles.cantidad != null ? element.factura_detalles.cantidad : 1));
			
			subtotalFactura = subtotalFactura + (valorUnitario * cantidad );
			descuentoFactura = descuentoFactura + descuentoGeneral;
			impuestoFactura = impuestoFactura + impuesto;
			
			const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2);

			//Se obtiene el tipo de cambio del dia
			let fechaString = moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
			let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
		
			let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
			if(doit !== true){
				return doit
			}
			const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
			let tipoCambio = ''
			if(tipoCambioSelected != undefined){
				tipoCambio = ManipuladorCadenas.formatMoney(tipoCambioSelected.tipo_cambio) 
			}

			const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente,{include:['agente_credito_cobranza']})

			
			elementos.push({
				'Folio': element.factura_detalles == null ? "N/A" : element.factura_detalles.factura.referencia,
				'Referencia':element.factura_detalles == null ? "N/A" : element.factura_detalles.factura.folio,
				'Fecha': moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
				'Facturado':element.factura_detalles != null ? "Si" : "No",
                'Factura pagada': element.factura_detalles == null ? "N/A" : (element.factura_detalles.factura.factura_pagada ? 'Si' : 'No'),
                'Día de Facturación': element.factura_detalles == null ? "N/A" : moment(element.factura_detalles.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
                'Cliente': cliente.nombre,
                'Persona que Solicita': element.usuario_registro.nombre,
				'Marca': marca.nombre,
				'Impuesto': impuesto,
				'Importe': ManipuladorCadenas.formatMoney(totalFactura),
				'Moneda': moneda.clave,
				'Tipo de Cambio': tipoCambio,
				'Saldado': element.factura_detalles == null ? "N/A" : (element.factura_detalles.factura.factura_pagada ? 'Si' : 'No'),
				'Ejecutivo de Cobranza':clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza.nombre: '',

            });
        }
        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        const nombreReporte = `pedidos_factura_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.pedidos_factura.name];
        const reportePedidosFactura = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        });
        return await reportePedidosFactura.gerReporteOneSheet(res,req);
    } catch (error) {
		if(sendHeader == true){
			return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
		}else{
			console.log(error);
			return;
		}

    }
      
}

async function getFiltroExportacion(parametros){
    var filtro;
    try {
        filtro = JSON.parse(parametros.filter);
    } catch (error) {
        filtro = undefined;
    }
    var eliminados = parametros.eliminados;
    const Filter = new Filtros({filtros:filtro,eliminados:eliminados});
    return await Filter.get();
}

async function store(req, res){
	const { idCertificado } = req.params;
	if(!Number.isInteger(parseInt(idCertificado))){
		res.status(400).send({status:false , msg: `El parametro idCertificado debe ser int.` });
		return false
	} 
	
	try {
		const certificado = await db.sequelize.models.certificados.findByPk(idCertificado, { include:['estado_origen','estado_destino','tipo_cambio_futuro','oficina_razon_social','detalle_certificado'],paranoid: false });
		const pedidosFactura = await db.sequelize.models.pedidos_factura.findAll({ where:{id_certificado: idCertificado} });
		if(pedidosFactura.length > 0){
			return res.status(400).send({ status: false, msg: "El certificado ya cuenta con pedidos de factura" });
		}
		if(certificado == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(certificado.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if(certificado.draft_certificado === true){
			const cliente = await db.sequelize.models.clientes.findByPk(certificado.id_cliente, { include:['detalles_cliente'],paranoid: false });
			const facturaAutomatica = cliente.detalles_cliente.fecha_factura != null
			const registro = {
				id_certificado: idCertificado,
				estatus:'P',
				id_usuario_registro: req.usuario.id,
				createdAt: moment().tz('America/Mexico_City')
			}
			const pedidoFactura = await db.sequelize.models.pedidos_factura.create(registro);
			if(facturaAutomatica){
				const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca, { include:['pais'],paranoid: false });
				const moneda = await db.sequelize.models.monedas.findByPk(certificado.id_moneda);
				const paisOrigen = await db.sequelize.models.paises.findByPk(certificado.estado_origen.id_pais);
				const paisDestino = await db.sequelize.models.paises.findByPk(certificado.estado_destino.id_pais);
				const tipoCambio = parseFloat(certificado.tipo_cambio_futuro.tipo_cambio)
				const facturas = await db.sequelize.models.facturas.findAll({
					paranoid: false,
					where: {
						folio: {[db.Sequelize.Op.like]:`%${marca.clave}%`}
					}
				});
				const totalCount = facturas.length
				const folio = `${marca.clave}-${(totalCount+1)}`
				const registroFactura = {
					id_razon_social: certificado.oficina_razon_social.id_razon_social,
					id_oficina: certificado.oficina_razon_social.id_oficina,
					id_marca: certificado.id_marca,
					id_moneda: certificado.id_moneda,
					folio: folio,
					id_usuario_registro: req.usuario.id,
					createdAt: moment().tz('America/Mexico_City')
				}
				const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_cliente:certificado.id_cliente,id_oficina:certificado.oficina_razon_social.id_oficina}});
				let marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: certificado.id_marca}})
				if(marcaAgenteOficina == null){
					marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: 3}})
					if(marcaAgenteOficina == null){
						return res.status(400).send({ status: false, msg: "Error al encontrar la oficina marca"});
					}
				}
				
				const oficina = await db.sequelize.models.oficinas.findByPk(certificado.oficina_razon_social.id_oficina,{include: ['razones_sociales']});
				//const referencia = await genReferencia(marcaAgenteOficina.clave,certificado.oficina_razon_social.id_razon_social,oficina)
				registroFactura.referencia = certificado.no_operacion
				const factura = await db.sequelize.models.facturas.create(registroFactura);
				const clienteDetallesUpdate = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente)
				await clienteDetallesUpdate.update({fecha_ultima_factura: moment().tz('America/Mexico_City')}, { where: { id: clienteDetallesUpdate.id } });
				const seguimientos = await db.sequelize.models.seguimientos.findAll({where:{id_cliente:certificado.id_cliente},include: ['categoria_seguimiento']});
				const categoria = await db.sequelize.models.categorias_seguimientos.findOne({where: {[db.Sequelize.Op.or]: [
					{ descripcion: { [db.Sequelize.Op.like]: '%Cuentas por cobrar%' } },
					{ descripcion: { [db.Sequelize.Op.like]: '%CXC%' } }
				]}});
				const expedienteSeguimiento = await db.sequelize.models.seguimientos_documentos_generales.findAll({where: {id_categoria_seguimiento:categoria.id}});
	
				var minimoVenta = parseFloat(certificado.detalle_certificado[0].minimo_venta)
				if(moneda.id == 1){
					minimoVenta = minimoVenta * tipoCambio
				}
				const nameTipoCobertura = certificado.tipo_cobertura.toLowerCase().split(" ")
				const isRC = nameTipoCobertura.includes('rc')
				let producto
				if(isRC && certificado.detalle_certificado[0].id_atributo_keepro == null){
					producto = await db.sequelize.models.productos.findOne({ where:{descripcion: { [db.Sequelize.Op.like]: `%rc%` }}, include:['producto_unidad_medida'],paranoid: false });
				}else{
					const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
					const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: ['producto']});
					producto = await db.sequelize.models.productos.findByPk(oficinaProducto.producto.id,{ include:['producto_unidad_medida'],paranoid: false });
				}
				let subtotal = certificado.detalle_certificado[0].subtotal
				let descuento = certificado.detalle_certificado[0].descuento_monto
				let impuestoCertificado = certificado.detalle_certificado[0].monto_iva
				const minimoInfo = moneda.id == 1 ? `${(parseFloat(certificado.detalle_certificado[0].minimo_venta)).toLocaleString('es-US', { style: 'currency', currency: "USD" })} USD * TC (${tipoCambio}) = ${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el valor a facturar (Valor asegurado x Tarifa) es menor al mínimo de venta acordado, se facturará el mínimo de venta.` : `${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el valor a facturar (Valor asegurado x Tarifa) es menor al mínimo de venta acordado, se facturará el mínimo de venta.`
				const registroFacturaDetalles = {
					id_factura: factura.id,
					id_pedido_factura: pedidoFactura.id,
					id_moneda: certificado.id_moneda,
					id_usuario_registro: req.usuario.id,
					id_producto: producto.id,
					cantidad: 1,
					precio_unitario: subtotal,
					subtotal: subtotal,
					impuesto: impuestoCertificado,
					descuento: descuento,
					comentarios: `Referencia ${marca.nombre}:${certificado.no_operacion}<br> 
								  Referencia del Cliente: ${(certificado.referencias !== null && certificado.referencias !== '' && certificado.referencias !== undefined ? certificado.referencias : '')}<br> 
								  Folio del certificado:  ${certificado.no_seguridad}<br> 
								  Tipo de Cobertura:  ${certificado.tipo_cobertura}<br> 
								  Valor Asegurado:  ${parseFloat(certificado.suma_asegurada).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> 
								  Origen:  ${paisOrigen.descripcion}<br> 
								  Destino:  ${paisDestino.descripcion}<br> 
								  Tarifa:  ${certificado.detalle_certificado[0].tarifa_final_cliente == null ? 0.0 : certificado.detalle_certificado[0].tarifa_final_cliente}%<br> 
								  Mínimo de Venta:  ${minimoInfo} `,
					createdAt: moment().tz('America/Mexico_City')
				}
				const facturaDetalles = await db.sequelize.models.factura_detalles.create(registroFacturaDetalles);
				if(marca.pais.clave == "MX"){
					const cfid = await timbrarLocal(factura.id,req.usuario)
				} else{
					const registroCertificadoUpdate = {
						estatus: 'F',
						updatedAt: moment().tz('America/Mexico_City')
					}
					await certificado.update(registroCertificadoUpdate, { where: { id: idCertificado } });
					const registroPedidoFacturaUpdate = {
						estatus: 'F',
						updatedAt: moment().tz('America/Mexico_City')
					}
					await pedidoFactura.update(registroPedidoFacturaUpdate, { where: { id: pedidoFactura.id } });
					await sendMailFactura(factura.id, req.usuario)
				}
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
				let fechaVencimiento = moment().tz('America/Mexico_City');
				fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
				const registroCXC = {
					id_factura: factura.id,
					saldo: parseFloat((parseFloat(certificado.detalle_certificado[0].total)).toFixed(2)),
					fecha_vencimiento: fechaVencimiento,
					id_usuario_registro: req.usuario.id,
					createdAt: moment().tz('America/Mexico_City')
				}
				await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
	
				if(seguimientos !== undefined || seguimientos !== null ){
					let create = true;
					seguimientos.forEach(seguimiento => {
						if(seguimiento.categoria_seguimiento.descripcion.includes("Cuentas por cobrar".toUpperCase()) || seguimiento.categoria_seguimiento.descripcion.includes("Cxc".toUpperCase())){
							create = false;
						}
					});
					if(create){
						var datos = {
							id_cliente: certificado.id_cliente,
							id_categoria_seguimiento: categoria.id,
							fecha_vencimiento: fechaVencimiento
						}
						const seguimientoCreado =  await db.sequelize.models.seguimientos.create(datos);
						var expediente = {
							id_seguimiento: seguimientoCreado.id,
						};
						await expedienteSeguimiento.forEach(doc => {
							expediente.id_documento_general = doc.id;
							expediente.descripcion = doc.descripcion;
							return db.sequelize.models.seguimientos_expediente.create(expediente);
						});
					}
				}
				return res.status(200).send({ status: true, msg: "Factura generada", data: {pedido_factura:pedidoFactura.id,factura:factura.id}});
			}
			return res.status(200).send({ status: true, msg: "Pedido factura generada", data: {pedido_factura:pedidoFactura.id}});
		}
		return res.status(400).send({ status: false, msg: "No se puede generar pedidos de factura a un Draft" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function uploadDatos(req,res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.factura_detalles.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		
		const docs = await db.sequelize.models.factura_detalles.findAll({
			paranoid: false,
			page: page || 1,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where:{subtotal:null},
			offset,
			limit
		})
		const data = []
		for(const doc of docs){
			var datosUpdate = {}
			const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(doc.id_pedido_factura, { paranoid: false });
			if(pedidoFactura != null){
				const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'],paranoid: false });
				const nameTipoCobertura = certificado.tipo_cobertura.toLowerCase().split(" ")
				const isRC = nameTipoCobertura.includes('rc')
				let producto
				if(isRC && certificado.detalle_certificado[0].id_atributo_keepro == null){
					producto = await db.sequelize.models.productos.findOne({ where:{descripcion: { [db.Sequelize.Op.like]: `%rc%` }}, include:['producto_unidad_medida'],paranoid: false });
				}else{
					const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
					const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: ['producto']});
					producto = await db.sequelize.models.productos.findByPk(oficinaProducto.producto.id,{ include:['producto_unidad_medida'],paranoid: false });
				}
				let subtotal = certificado.detalle_certificado[0].subtotal
				let descuento = certificado.detalle_certificado[0].descuento_monto
				let impuestoCertificado = certificado.detalle_certificado[0].monto_iva
				datosUpdate.id_producto = producto.id
				datosUpdate.cantidad = 1
				datosUpdate.precio_unitario = subtotal
				datosUpdate.subtotal = subtotal
				datosUpdate.impuesto = impuestoCertificado
				datosUpdate.descuento = descuento
				await doc.update(datosUpdate, { where: { id: doc.id } });
				data.push(doc)
			}else{
				console.log(doc.id)
			}
		}


		return res.status(200).send({
			success: true,
			currentPage: page,
			total: data.length,
			data: data
		});

	} catch (error) {
		console.log(error)
	}
	
}

module.exports = {
	index,
	show,
	exportacion,
	store,
	uploadDatos
}
