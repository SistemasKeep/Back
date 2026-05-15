'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { timbrarLocal } = require('./cfdis.controller');
const { sendMailFactura } = require('./facturas_mails.controllers')
const { Filtros } = require('../middlewares/filtros');
const { Relaciones } = require('../middlewares/relaciones');
const { ReportesXLSX } = require('../middlewares/reportesXlsx')
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { genPdfLocal } = require('../controllers/facturacion_pdf.controller')
const JSZip = require('jszip');


async function index(req, res) {
  const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
  var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.facturas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['marca','razon_social','moneda','cfdi','oficina','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito',
				],
                razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                moneda: [ 
                    'moneda'
                ],
                cfdi: [ 
                    'cfdi.uso_cfdi',
                    'cfdi.metodo_pago',
                    'cfdi.forma_pago',
                    'cfdi.motivo_cancelacion'
                ],
                oficina: [ 
                    'oficina'
                ],
                all: [ 
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal', 
                    'marca.dato_facturacion.pais.continente', 
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'moneda',
                    'cfdi.uso_cfdi',
                    'cfdi.metodo_pago',
                    'cfdi.forma_pago',
                    'cfdi.motivo_cancelacion',
                    'oficina'
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.facturas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.facturas.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/facturas`;
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
				element.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.id}, include:relacionesFacDet})
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
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.id}})
                element.cxc = null
                element.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.cxc = cxc
                    element.factura_pagada = parseFloat(cxc.saldo) == 0
                }
                const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
                const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
                const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.id_razon_social}, include:relaciones})
                let fechaVencimiento = null
                let diferenciaFechas = null
                if(element.cxc != null){
                    fechaVencimiento = moment(element.cxc.fecha_vencimiento).tz('America/Mexico_City');
                    let now = moment().tz('America/Mexico_City');
                    now.hours(0).minutes(0).seconds(0).milliseconds(0);
                    diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
                }
                var subtotalFactura = 0
                var impuestoFactura = 0
                var descuentoFactura = 0
                for(const detalle of element.factura_detalles){
                    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
                    var impuestoCertificado
                    var subtotal
                    var descuento
                    if(pedidoFactura != null){
                        const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
                        if(certificado != null){
                            subtotal = certificado.detalle_certificado[0].subtotal
                            descuento = certificado.detalle_certificado[0].descuento_monto
                            impuestoCertificado = certificado.detalle_certificado[0].monto_iva
                        }else{
                            console.log(pedidoFactura.id)
                        }
                    }
                    const valorUnitario = parseFloat(detalle.precio_unitario ?? subtotal)
                    const descuentoGeneral = parseFloat(detalle.descuento ?? descuento)
                    const impuesto = parseFloat(detalle.impuesto ?? impuestoCertificado)
                    const subtotalData = parseFloat(detalle.subtotal ?? impuestoCertificado)
                    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                    subtotalFactura = subtotalFactura + subtotalData
                    descuentoFactura = descuentoFactura + descuentoGeneral
                    impuestoFactura = impuestoFactura + impuesto
                }
                const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
                //Se obtiene el tipo de cambio del dia
                let fechaString = moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
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
                if(element.cxc != null){
                    for(const pago of element.cxc.pagos){
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
                const getRelaciones =  [ 'agente_operativo','agente_venta_1', 'agente_venta_2' ]
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
                element.cliente = cliente
                element.tipo_cambio = tipoCambio
                element.folio_ingreso = folioPago != '' ? folioPago : null
                element.fecha_pago = fechaPago != '' ? fechaPago : null
                element.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
                element.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
                element.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
                element.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
                element.agente_venta_2 = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_2 : null
                element.notas_credito = await db.sequelize.models.notas_credito.findAll({where:{id_factura:element.id}}),
                element.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
                element.saldo_saldado = parseFloat((totalFactura - (element.cxc != null ? element.cxc.saldo : 0)).toFixed(2)) 
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

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['marca','razon_social','moneda','cfdi','oficina','factura_detalles','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito',
				],
                razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                moneda: [ 
                    'moneda'
                ],
                cfdi: [ 
                    'cfdi.uso_cfdi',
                    'cfdi.metodo_pago',
                    'cfdi.forma_pago',
                    'cfdi.motivo_cancelacion'
                ],
                oficina: [ 
                    'oficina'
                ],
                all: [ 
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal', 
                    'marca.dato_facturacion.pais.continente', 
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'moneda',
                    'cfdi.uso_cfdi',
                    'cfdi.metodo_pago',
                    'cfdi.forma_pago',
                    'cfdi.motivo_cancelacion',
                    'oficina'
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.facturas.findByPk(id, {include:relaciones,paranoid: false});
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
				element.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.id}, include:relacionesFacDet})
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
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.id}})
                element.cxc = null
                element.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.cxc = cxc
                    element.factura_pagada = parseFloat(cxc.saldo) == 0
                }
                const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
                const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
                const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.id_razon_social}, include:relaciones})
                let fechaVencimiento = null
                let diferenciaFechas = null
                if(element.cxc != null){
                    fechaVencimiento = moment(element.cxc.fecha_vencimiento).tz('America/Mexico_City');
                    let now = moment().tz('America/Mexico_City');
                    now.hours(0).minutes(0).seconds(0).milliseconds(0);
                    diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
                }
                var subtotalFactura = 0
                var impuestoFactura = 0
                var descuentoFactura = 0
                for(const detalle of element.factura_detalles){
                    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
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
                    const subtotalData = parseFloat(detalle.subtotal ?? impuestoCertificado)
                    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                    subtotalFactura = subtotalFactura + subtotalData
                    descuentoFactura = descuentoFactura + descuentoGeneral
                    impuestoFactura = impuestoFactura + impuesto
                }
                const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
                //Se obtiene el tipo de cambio del dia
                let fechaString = moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
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
                if(element.cxc != null){
                    for(const pago of element.cxc.pagos){
                        const fechaFormateada =moment(pago.pago.fecha_pago).tz('America/Mexico_City')
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
                const getRelaciones =  [ 'agente_operativo','agente_venta_1', 'agente_venta_2' ]
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
                element.cliente = cliente
                element.tipo_cambio = tipoCambio
                element.folio_ingreso = folioPago != '' ? folioPago : null
                element.fecha_pago = fechaPago != '' ? fechaPago : null
                element.fecha_aplicacion_ingreso = fechaAplicacion != '' ? fechaAplicacion : null
                element.agente_credito_cobranza = clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza: null
                element.agente_operativo = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo : null
                element.agente_venta = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 : null
                element.agente_venta_2 = agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_2 : null
                element.notas_credito = await db.sequelize.models.notas_credito.findAll({where:{id_factura:element.id}}),
                element.total_factura = parseFloat(parseFloat(totalFactura).toFixed(2))
                element.saldo_saldado = parseFloat((totalFactura - (element.cxc != null ? parseFloat(parseFloat(element.cxc.saldo).toFixed(2)) : 0)).toFixed(2)) 
			}
			return res.status(200).send({ status: true, data: element});
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

		const registroEncontrado = await db.sequelize.models.facturas.findByPk(id, {include:['cfdi'],paranoid: false});
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

async function facturar(idCertificado,idCliente,usuario,facturar = undefined){
    const certificado = await db.sequelize.models.certificados.findByPk(idCertificado, { include:['estado_origen','estado_destino','tipo_cambio_futuro','oficina_razon_social','detalle_certificado'],paranoid: false });
    if(certificado != null && certificado.draft_certificado === true){
        const cliente = await db.sequelize.models.clientes.findByPk(idCliente, { include:['detalles_cliente'],paranoid: false });
        const facturaAutomatica = facturar === null || facturar === undefined ? cliente.detalles_cliente.fecha_factura != null : facturar === true 
        const registro = {
            id_certificado: idCertificado,
            estatus:'P',
            id_usuario_registro: usuario.id,
            createdAt: moment().tz('America/Mexico_City')
        }
        const pedidoFactura = await db.sequelize.models.pedidos_factura.create(registro);
        const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca, { include:['pais'],paranoid: false });
        if(facturaAutomatica && marca.allow_facturacion !== false){
            const moneda = await db.sequelize.models.monedas.findByPk(certificado.id_moneda);
            const beneficiario = await db.sequelize.models.beneficiarios.findByPk(certificado.id_beneficiario);
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
                id_usuario_registro: usuario.id,
                createdAt: moment().tz('America/Mexico_City')
            }
            const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_cliente:certificado.id_cliente,id_oficina:certificado.oficina_razon_social.id_oficina}});
            let marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: 1}})
            const oficina = await db.sequelize.models.oficinas.findByPk(certificado.oficina_razon_social.id_oficina,{include: ['razones_sociales']});
            //const referencia = await genReferencia(marcaAgenteOficina.clave,certificado.oficina_razon_social.id_razon_social,oficina)
            registroFactura.referencia = certificado.no_operacion
            const factura = await db.sequelize.models.facturas.create(registroFactura);
            const clienteDetallesUpdate = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente)
            await clienteDetallesUpdate.update({fecha_ultima_factura: moment().tz('America/Mexico_City')}, { where: { id: clienteDetallesUpdate.id } });
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
            const minimoInfo = moneda.id == 1 ? `${(parseFloat(certificado.detalle_certificado[0].minimo_venta)).toLocaleString('es-US', { style: 'currency', currency: "USD" })} USD * TC (${tipoCambio}) = ${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el monto resultante de multiplicar el Valor Asegurado por la Tarifa es menor al mínimo de venta acordado, se facturará este último en la moneda correspondiente.` : `${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el monto resultante de multiplicar el Valor Asegurado por la Tarifa es menor al mínimo de venta acordado, se facturará este último en la moneda correspondiente.`
            const registroFacturaDetalles = {
                id_factura: factura.id,
                id_pedido_factura: pedidoFactura.id,
                id_moneda: certificado.id_moneda,
                id_usuario_registro: usuario.id,
                id_producto: producto.id,
                cantidad: 1,
                precio_unitario: subtotal,
                subtotal: subtotal,
                impuesto: impuestoCertificado,
                descuento: descuento,
                comentarios: `Referencia interna:${certificado.no_operacion}<br> 
                              Referencia del Cliente: ${(certificado.referencias !== null && certificado.referencias !== '' && certificado.referencias !== undefined ? certificado.referencias : '')}<br> 
                              Tipo de seguro:  ${certificado.tipo_cobertura}<br> 
                              Suma asegurada:  ${parseFloat(certificado.suma_asegurada).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> 
                              Beneficiario:  ${beneficiario.nombre}<br> 
                              Pais origen:  ${paisOrigen.descripcion}<br> 
                              Pais destino:  ${paisDestino.descripcion}<br> 
                              Tarifa final del cliente:  ${certificado.detalle_certificado[0].tarifa_final_cliente == null ? 0.0 : certificado.detalle_certificado[0].tarifa_final_cliente}%<br> 
                              Mínimo de venta: ${minimoInfo} `,
                createdAt: moment().tz('America/Mexico_City')
            }
            const facturaDetalles = await db.sequelize.models.factura_detalles.create(registroFacturaDetalles);
            const registroCertificadoUpdate = {
                estatus: 'F',
                updatedAt: moment().tz('America/Mexico_City')
            }
            await certificado.update(registroCertificadoUpdate, { where: { id: idCertificado } });
            if(marca.pais.clave == "MX"){
                const cfid = await timbrarLocal(factura.id,usuario)
            } else{
                const registroPedidoFacturaUpdate = {
                    estatus: 'F',
                    updatedAt: moment().tz('America/Mexico_City')
                }
                await pedidoFactura.update(registroPedidoFacturaUpdate, { where: { id: pedidoFactura.id } });
                const detalleC = await db.sequelize.models.cliente_detalles.findOne({where:{id_cliente:certificado.id_cliente}, include: ['agente_credito_cobranza']});
                const emailAgenteCXC = detalleC.agente_credito_cobranza.email;
                if(detalleC == null){
                    await sendMailFactura(factura.id, usuario);
                }else{
                    await sendMailFactura(factura.id, usuario, [emailAgenteCXC]);
                }

            }
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
            let fechaVencimiento = moment().tz('America/Mexico_City');
            fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
            const registroCXC = {
                id_factura: factura.id,
                saldo: parseFloat((parseFloat(certificado.detalle_certificado[0].total)).toFixed(2)),
                fecha_vencimiento: fechaVencimiento,
                id_usuario_registro: usuario.id,
                createdAt: moment().tz('America/Mexico_City')
            }
            await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
        }
    }
}

async function genReferencia(claveMarcaAgenteOficina,idRazonSocial,oficina){
	var claveRazonSocial = undefined
	await oficina.razones_sociales.forEach((oficinaRazonSocial,index) => {
		if(oficinaRazonSocial.id_razon_social == idRazonSocial){
			claveRazonSocial = (index +1)
		}
	});
	var noOperacion = claveMarcaAgenteOficina + "-" + claveRazonSocial

	var whereFind = {
		where: {
			referencia: {[db.Sequelize.Op.like]: `%${noOperacion}%`}
		},paranoid: false
	}
	const registrosEncontrados = await db.sequelize.models.facturas.findAll(whereFind);
	var countOperaciones = 0;
	for(const registro of registrosEncontrados){
    countOperaciones = countOperaciones +1
	}
	noOperacion = noOperacion + "-" + (countOperaciones +1)
	return noOperacion
}

async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.facturas.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {
		req.query.perfil = 'all'
        const perfilesValidos = ['all']
        var relaciones = []
        if(perfilesValidos.includes(req.query.perfil)){
            const parametrosRelaciones = {
                all: [ 
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal', 
                    'marca.dato_facturacion.pais.continente', 
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'moneda',
                    'cfdi.uso_cfdi',
                    'cfdi.metodo_pago',
                    'cfdi.forma_pago',
                    'cfdi.motivo_cancelacion',
                    'oficina'
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
            relaciones = await findRelaciones.getRelaciones()
        }

        const docs = await db.sequelize.models.facturas.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        })

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
                element.factura_detalles = await db.sequelize.models.factura_detalles.findAll({where:{id_factura: element.id}, include:relacionesFacDet})
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
				 ]
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
                const cxcAux = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:element.id}})
                element.cxc = null
                element.factura_pagada = false
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxcAux.id,{ include:relacionesPagos})
                    element.cxc = cxc
                    element.factura_pagada = parseFloat(cxc.saldo) == 0
                }
            }
            data.push(element)
        }
        const elementos = []
        let idMarca = 1
        for(const element of data){
            const relClientes = [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','razon_social.pais.continente', 'razon_social.uso_cfdi','razon_social.metodo_pago','razon_social.forma_pago','razon_social.razon_bloqueo','razon_social.regimen_fiscal','razon_social.moneda_credito' ]
			const findRelaciones = new Relaciones(relClientes,relClientes,db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
            const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.id_razon_social}, include:relaciones})
			let fechaVencimiento 
            if(element.cxc != null){
                fechaVencimiento = moment(element.cxc.fecha_vencimiento).tz('America/Mexico_City');
            }
			let now = moment().tz('America/Mexico_City');
			now.hours(0).minutes(0).seconds(0).milliseconds(0);
			const diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
            var subtotalFactura = 0
            var impuestoFactura = 0
            var descuentoFactura = 0
            for(const detalle of element.factura_detalles){
                const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
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
                const subtotalData = parseFloat(detalle.subtotal ?? impuestoCertificado)
                const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
                subtotalFactura = subtotalFactura + subtotalData
                descuentoFactura = descuentoFactura + descuentoGeneral
                impuestoFactura = impuestoFactura + impuesto
            }
            const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2)
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
            let folioPago = ''
            let fechaFolio = ''
            let fechaPago = ''
            let fechaAplicacion = ''
            if(element.cxc != null){
                for(const pago of element.cxc.pagos){
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
            const getRelaciones =  [ 'agente_operativo','agente_venta_1', 'agente_venta_2' ]
            const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
            const relacionesAgente = await findRelacionesAgentes.getRelaciones()
            let agentesCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:clienteRazonSocial.cliente.id, id_marca: idMarca}, include:relacionesAgente,paranoid: false})
            const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(clienteRazonSocial.cliente.id_detalle_cliente,{include:['agente_credito_cobranza']})
            elementos.push({
                'Folio': element.folio,
                'UUID': element.cfdi !== null && element.cfdi !== undefined ? element.cfdi.folio_fiscal : '',
                'Referencia': element.referencia,
                'Fecha': moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
                'Factura Pagada': element.factura_pagada ?? false ? 'Si' : 'No',
                'Cliente': clienteRazonSocial.cliente.nombre,
                'Razón Social': element.razon_social.razon_social,
                'Marca': element.marca.nombre,
                'Días de vencimiento': element.cxc != null ?  diferenciaFechas+"" : "-",
                'Subtotal': ManipuladorCadenas.formatMoney(subtotalFactura.toFixed(2)),
                'IVA': ManipuladorCadenas.formatMoney(impuestoFactura.toFixed(2)),
                'Importe': ManipuladorCadenas.formatMoney(totalFactura),
                'Saldo Factura': ManipuladorCadenas.formatMoney(element.cxc == null ? 0 : element.cxc.saldo),
                'Moneda': element.moneda.clave,
                'Tipo de Cambio': tipoCambio,
                'Folio Ingreso': folioPago,
                'Fecha de Pago': fechaPago,
                'Fecha Aplicación Ingreso': fechaAplicacion,
                'Saldado': ManipuladorCadenas.formatMoney(totalFactura - (element.cxc == null ? 0 : element.cxc.saldo)),
                'Agente de CyC': clienteDetalles == null ? '' : clienteDetalles.agente_credito_cobranza !== null && clienteDetalles.agente_credito_cobranza !== undefined ? clienteDetalles.agente_credito_cobranza.nombre: '',
                'Agente de Operaciones': agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_operativo != null? agentesCliente.agente_operativo.nombre : '' : '',
                'Agente Ventas': agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_1 != null ? agentesCliente.agente_venta_1.nombre : '' : '',
                'Agente Ventas 2': agentesCliente !== null && agentesCliente !== undefined ? agentesCliente.agente_venta_2 != null ? agentesCliente.agente_venta_2.nombre : '' : '',
            })
        }
        if(elementos.length < 1 ){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

        const nombreReporte = `facturas_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.facturas.name]
        const reporteCertificados = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        })

        return await reporteCertificados.gerReporteOneSheet(res,req,false)
    } catch (error) {
        return res.status(500).json({ success: false, msg: 'Error interno del servidor', error: error.toString() });
    }
      
}

async function getFiltroExportacion(parametros){
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

async function getZip(req, res) {
    const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    
	try {
		const registroEncontrado = await db.sequelize.models.facturas.findByPk(id, {include:['cfdi'],paranoid: false});
		if(registroEncontrado != null){
			if(registroEncontrado.id_cfdi !== null){
				const xml = registroEncontrado.cfdi.xml;
                const pdf = await genPdfLocal(id);
                if(pdf.status === false){
                    return res.status(400).send({ status: false, msg: "Hubo un error al obtener pdf" });
                }
                var zip = new JSZip();

                zip.file(`factura_${registroEncontrado.referencia}.pdf`, pdf);
                zip.file(`factura_${registroEncontrado.referencia}.xml`, xml);
        
                // Generar el ZIP 
                const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        
                res.setHeader('Content-Disposition', `attachment; filename="${registroEncontrado.referencia}.zip"`);
                res.setHeader('Content-Type', 'application/zip');
                return res.send(zipContent);
			}
			return res.status(400).send({ status: false, msg: "El registro no cuenta con cfdi" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

module.exports = {
  index,
  show,
  facturar,
  getXML,
  exportacion,
  getZip

}
