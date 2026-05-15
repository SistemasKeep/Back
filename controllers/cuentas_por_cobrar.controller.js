'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { xmlToJSON } = require('./facturacion_pdf.controller')
const { sendMailCxcSaldada } = require('./notificacion_cxc_saldada.controllers')


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_por_cobrar.rawAttributes);
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
				all: [ 
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
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.cuentas_por_cobrar.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cuentas_por_cobrar.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		})

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cuentasPorCobrar`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 
					'factura_detalles.pedido_factura.certificado',
					'factura_detalles.producto.moneda_compra',
					'factura_detalles.producto.moneda_venta',
					'factura_detalles.producto.pais',
					'factura_detalles.producto.tipo_cobertura',
				 ]
				const findRelacionesFacturas = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesFacturas =  await findRelacionesFacturas.getRelaciones()
				if(element.factura != null){
					const factura = await db.sequelize.models.facturas.findByPk(element.id_factura,{ include:relacionesFacturas})
					element.factura.factura_detalles = factura.factura_detalles
				}

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
				const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(element.id,{ include:relacionesPagos})
				element.pagos = cxc != null ? cxc.pagos : null
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
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
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
					'factura.factura_detalles.pedido_factura.certificado',
					'factura.factura_detalles.producto.moneda_compra',
					'factura.factura_detalles.producto.moneda_venta',
					'factura.factura_detalles.producto.pais',
					'factura.factura_detalles.producto.tipo_cobertura',
					'pagos.pago.cfdi',
					'pagos.pago.cuenta_bancaria_interna.moneda',
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
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.cuentas_por_cobrar.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
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
	const camposModelo = Object.keys(db.sequelize.models.cuentas_por_cobrar.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
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
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.cuentas_por_cobrar.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro
		});
		
		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			if(req.query.perfil == 'all'){
				const listRel = [ 
					'factura_detalles.pedido_factura.certificado',
					'factura_detalles.pedido_factura.servicios_ontrack',
					'factura_detalles.producto.moneda_compra',
					'factura_detalles.producto.moneda_venta',
					'factura_detalles.producto.pais',
					'factura_detalles.producto.tipo_cobertura',
				];
				const findRelacionesFacturas = new Relaciones(listRel,listRel,db.sequelize.models);
				const relacionesFacturas =  await findRelacionesFacturas.getRelaciones();
				if(element.factura != null){
					const factura = await db.sequelize.models.facturas.findByPk(element.id_factura,{ include:relacionesFacturas});
					element.factura.factura_detalles = factura.factura_detalles;
				}

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
				const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(element.id,{ include:relacionesPagos});
				element.pagos = cxc != null ? cxc.pagos : null;

				element.fecha_emision = element.factura.createdAt.toISOString().slice(0, 19).replace('T', ' ');
				element.cliente = '';
				element.agenteCxc = '';
				element.saldoVencido = '';
				element.referenciaCliente = '';

				let saldoOriginal = 0
				for(const detalle of element.factura.factura_detalles){
					saldoOriginal = saldoOriginal + (parseFloat(detalle.subtotal || 0) + parseFloat(detalle.impuesto || 0) - parseFloat(detalle.descuento || 0));
				}
				element.montoOriginal = saldoOriginal

				if (!element.factura || !element.factura.razon_social) {
					continue; // Saltar este elemento y continuar con el siguiente
				}

				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({
					where: {
						id_razon_social: element.factura.razon_social.id
					}
				});
				if(clienteRazonSocial != null){
					const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente);
					if(cliente != null){
						element.cliente = cliente.nombre;
						const clienteDetalle = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente);
						if(clienteDetalle != null){
							const agenteCxc = await db.sequelize.models.usuarios.findByPk(clienteDetalle.id_agente_credito_cobranza);
							element.agenteCxc = agenteCxc != null ? agenteCxc.nombre : '';
						}
					}
				}
				const fechaVencimiento = moment(element.fecha_vencimiento).tz('America/Mexico_City');
				const fechaActual = moment().tz('America/Mexico_City');
				if(fechaActual >= fechaVencimiento){
					element.saldoVencido = element.saldo;
					element.saldo = '';
				}
				const diasVencimiento = fechaActual.diff(fechaVencimiento, 'days');
				element.diasVencimiento = diasVencimiento+1;

				if (element.factura && element.factura.factura_detalles && element.factura.factura_detalles.length > 0) {
					const ultimafacturaDetalles = element.factura.factura_detalles.length - 1;
					const detalleFactura = element.factura.factura_detalles[ultimafacturaDetalles];
					if (detalleFactura && detalleFactura.pedido_factura) {
						const pedidoFactura = detalleFactura.pedido_factura;
						if (pedidoFactura.certificado !== null) {
							element.referenciaCliente = pedidoFactura.certificado.referencias ?? "";
						} else if (pedidoFactura.servicios_ontrack !== null) {
							element.referenciaCliente = pedidoFactura.servicios_ontrack.comentarios ?? "";
						} else {
							element.referenciaCliente = '';
						}
					} else {
						if (element.factura.id_marca == 2) {
							element.referenciaCliente = element.factura.comentarios != null ? element.factura.comentarios : ""
						} else {
							element.referenciaCliente = '';
						}
					}
				} else {
					// Si no existen `factura_detalles` o está vacío, asignar un valor predeterminado
					if (element.factura.id_marca == 1) {
						element.referenciaCliente = element.factura.comentarios != null ? element.factura.comentarios : ""
					} else {
						element.referenciaCliente = '';
					}
				}
				element.metodo_pago = element.factura.cfdi != null ? element.factura.cfdi.metodo_pago.descripcion : 'N/A';
				element.forma_pago = element.factura.cfdi != null ? element.factura.cfdi.forma_pago.descripcion : 'N/A';

			}
			data.push(element);
		}
		
		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			aux = {
				'Agente CxC': elemento.agenteCxc,
				'Oficina': elemento.factura.oficina.nombre,
				'Folio': elemento.factura.folio,
				'Cliente': elemento.cliente,
				'Marca': elemento.factura.marca.nombre,
				'Razón Social': elemento.factura.razon_social.razon_social,
				'Monto original': elemento.montoOriginal,
				'Moneda factura': elemento.factura.moneda.clave,
				'Saldo factura': elemento.saldo,
				'Saldo vencido': elemento.saldoVencido,
				'Días crédito': elemento.factura.razon_social.dias_credito,
				'Fecha de emisión': elemento.fecha_emision,
				'Fehca de vencimiento': elemento.fecha_vencimiento,
				'Días de vencimiento': elemento.diasVencimiento,
				'Referencia interna': elemento.factura.referencia,
				'Referencia del cliente': elemento.referenciaCliente,
				'Método de pago': elemento.metodo_pago,
				'Forma de pago': elemento.forma_pago
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros'});
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Cuentas por cobrar';
		const namesSheets = [db.sequelize.models.cuentas_por_cobrar.name];
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

async function antiguedadSaldosCxC(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	const filtro = await getFiltroAntiguedadSaldosCxC(req);
	if(filtro.status !== undefined){
		return res.status(400).send(filtro)
	}
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
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
			order: [['createdAt', orden]],
			where: filtro
		});
		
		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			if(element.factura != null){
				const listRel = [ 
					'factura_detalles.pedido_factura.certificado',
					'factura_detalles.pedido_factura.servicios_ontrack',
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
				const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(element.id,{ include:relacionesPagos});
				element.pagos = cxc != null ? cxc.pagos : null;
				element.fecha_emision = moment(element.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:SS')
				element.cliente = '';
				element.agenteCxc = '';
				element.saldoVencido = 0;
				element.referenciaCliente = '';
	
				element.montoOriginal = 0
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
				element.montoOriginal = parseFloat(element.montoOriginal).toFixed(2)
				
				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({
					where: {
						id_razon_social: element.factura.razon_social.id
					}
				});
				if(clienteRazonSocial != null){
					const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente);
					if(cliente != null){
						element.cliente = cliente.nombre;
						element.idCliente = cliente.id;
						const clienteDetalle = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente);
						if(clienteDetalle != null){
							const agenteCxc = await db.sequelize.models.usuarios.findByPk(clienteDetalle.id_agente_credito_cobranza);
							element.agenteCxc = agenteCxc != null ? agenteCxc.nombre : '';
						}
					}
				}
				let fechaVencimiento = moment(element.fecha_vencimiento).tz('America/Mexico_City'); 
				let now = moment().tz('America/Mexico_City');
				now.hours(0).minutes(0).seconds(0).milliseconds(0);
				const diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)
				if(diferenciaFechas < 0){
					element.saldoVencido = element.saldo;
				}
				element.diasVencimiento = diferenciaFechas;
				const ultimafacturaDetalles = element.factura.factura_detalles.length-1;


				try {
					const pedidoFactura = element.factura.factura_detalles[ultimafacturaDetalles].pedido_factura;
					if (pedidoFactura.certificado !== null) {
						element.referenciaCliente = pedidoFactura.certificado.referencias ?? "";
					} else if (pedidoFactura.servicios_ontrack !== null) {
						element.referenciaCliente = pedidoFactura.servicios_ontrack.comentarios ?? "";
					} else {
						element.referenciaCliente = ''; 
					}
				} catch (error) {
					if (element.factura.id_marca == 2) {
						element.referenciaCliente = element.factura.comentarios != null ? element.factura.comentarios : ""
					} else {
						element.referenciaCliente = '';
					}
				}
				data.push(element);
			}
		}
		if(req.query.keepro === undefined || req.query.keepro === '0'){
			const hoja1 = [];
			const hoja2 = [];
			const hoja3 = [];
			for(const element of data){
				let metodoPago = 'N/A';
				let formaPago = 'N/A';
				let uuid = 'N/A';

				if(element.factura.id_cfdi != null){
					const cfdi = await db.sequelize.models.cfdis.findByPk(element.factura.id_cfdi, { attributes:['xml','folio_fiscal']});
					const xml = await xmlToJSON(cfdi.xml)
					uuid = cfdi.folio_fiscal
					if (cfdi && cfdi.xml && xml && xml["cfdi:Comprobante"] && xml["cfdi:Comprobante"]["$"]) {
					metodoPago = await db.sequelize.models.metodos_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['MetodoPago']},paranoid: false });
					metodoPago = `(${metodoPago.clave}) ${metodoPago.descripcion}`
					formaPago = await db.sequelize.models.formas_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['FormaPago']},paranoid: false });
					formaPago = `(${formaPago.clave}) ${formaPago.descripcion}`
				}
				}
				hoja1.push({
					'Agente CxC': element.agenteCxc,
					'Oficina': element.factura.oficina == null ? '' : element.factura.oficina.nombre,
					'Folio': element.factura.folio,
					'UUID': uuid,
					'Cliente': "(" + element.factura.marca.clave + "-" +element.idCliente + ") " + element.cliente,
					'Marca': element.factura.marca.nombre,
					'Razón Social': element.factura.razon_social.razon_social,
					'Monto original': parseFloat(element.montoOriginal),
					'Moneda factura': element.factura.moneda.clave,
					'Saldo factura': parseFloat(element.saldo),
					'Saldo vencido': parseFloat(element.saldoVencido),
					'Días crédito': element.factura.razon_social.dias_credito,
					'Fecha de emisión': element.fecha_emision,
					'Fecha de vencimiento': element.fecha_vencimiento,
					'Días de vencimiento': (element.diasVencimiento * -1),
					'Referencia interna': element.factura.referencia,
					'Referencia del cliente': element.referenciaCliente,
					'Método de pago': metodoPago,
					'Forma de pago': formaPago
				});
				if(hoja2.length == 0){
					hoja2.push({
						'Marca': element.factura.marca.nombre,
						'Agente CxC': element.agenteCxc,
						'Clave': element.factura.marca.clave + "-" +element.idCliente,
						'Cliente': element.cliente,
						'En tiempo (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : 0,
						'Bajo (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Medio (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Alto (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Crítico (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento < -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Total MXN': element.factura.moneda.clave.toLowerCase() == 'mxn' ? (element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : parseFloat(parseFloat(element.saldoVencido).toFixed(2))) : 0,
		
						'En tiempo (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && element.diasVencimiento >= 0 ? parseFloat(element.saldo) : 0,
						'Bajo (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(element.saldoVencido) : 0,
						'Medio (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(element.saldoVencido) : 0,
						'Alto (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(element.saldoVencido) : 0,
						'Crítico (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento < -50) ? parseFloat(element.saldoVencido) : 0,
						'Total USD': element.factura.moneda.clave.toLowerCase() == 'usd' ? (element.diasVencimiento >= 0 ? parseFloat(element.saldo) : parseFloat(element.saldoVencido)) : 0,
					});
				} else{
					let elementI = -1
					for (let index = 0; index < hoja2.length; index++) {
						const dato = hoja2[index];
						if(dato['Clave'] ==  element.factura.marca.clave + "-" +element.idCliente){
							elementI = index
						}
					}
					if(elementI > -1){
						hoja2[elementI]['En tiempo (MXN)'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' && element.diasVencimiento >= 0 ?  parseFloat((parseFloat(hoja2[elementI]['En tiempo (MXN)']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['En tiempo (MXN)']).toFixed(2))
						hoja2[elementI]['Bajo (MXN)'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ?  parseFloat((parseFloat(hoja2[elementI]['Bajo (MXN)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Bajo (MXN)']).toFixed(2))
						hoja2[elementI]['Medio (MXN)'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ?  parseFloat((parseFloat(hoja2[elementI]['Medio (MXN)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Medio (MXN)']).toFixed(2))
						hoja2[elementI]['Alto (MXN)'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ?  parseFloat((parseFloat(hoja2[elementI]['Alto (MXN)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Alto (MXN)']).toFixed(2))
						hoja2[elementI]['Crítico (MXN)'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento < -50) ?  parseFloat(( parseFloat(hoja2[elementI]['Crítico (MXN)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Crítico (MXN)']).toFixed(2))
						hoja2[elementI]['Total MXN'] =  element.factura.moneda.clave.toLowerCase() == 'mxn' ? (element.diasVencimiento >= 0 ?  parseFloat(( parseFloat(hoja2[elementI]['Total MXN']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(( parseFloat(hoja2[elementI]['Total MXN']) + parseFloat(element.saldoVencido)).toFixed(2))) : parseFloat(parseFloat(hoja2[elementI]['Total MXN']).toFixed(2))
	
						hoja2[elementI]['En tiempo (USD)'] =  element.factura.moneda.clave.toLowerCase() == 'usd' && element.diasVencimiento >= 0 ?  parseFloat((parseFloat(hoja2[elementI]['En tiempo (USD)']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['En tiempo (USD)']).toFixed(2))
						hoja2[elementI]['Bajo (USD)'] =  element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ?  parseFloat((parseFloat(hoja2[elementI]['Bajo (USD)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Bajo (USD)']).toFixed(2))
						hoja2[elementI]['Medio (USD)'] =  element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ?  parseFloat((parseFloat(hoja2[elementI]['Medio (USD)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Medio (USD)']).toFixed(2))
						hoja2[elementI]['Alto (USD)'] =  element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ?  parseFloat((parseFloat(hoja2[elementI]['Alto (USD)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Alto (USD)']).toFixed(2))
						hoja2[elementI]['Crítico (USD)'] =  element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento < -50) ?  parseFloat(( parseFloat(hoja2[elementI]['Crítico (USD)']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja2[elementI]['Crítico (USD)']).toFixed(2))
						hoja2[elementI]['Total USD'] =  element.factura.moneda.clave.toLowerCase() == 'usd' ? (element.diasVencimiento >= 0 ?  parseFloat(( parseFloat(hoja2[elementI]['Total USD']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(( parseFloat(hoja2[elementI]['Total USD']) + parseFloat(element.saldoVencido)).toFixed(2))) : parseFloat(parseFloat(hoja2[elementI]['Total USD']).toFixed(2))
					}else{
						hoja2.push({
							'Marca': element.factura.marca.nombre,
							'Agente CxC': element.agenteCxc,
							'Clave': element.factura.marca.clave + "-" +element.idCliente,
							'Cliente': element.cliente,
							'En tiempo (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : 0,
							'Bajo (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Medio (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Alto (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Crítico (MXN)': element.factura.moneda.clave.toLowerCase() == 'mxn' && (element.diasVencimiento < -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Total MXN': element.factura.moneda.clave.toLowerCase() == 'mxn' ? (element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : parseFloat(parseFloat(element.saldoVencido).toFixed(2))) : 0,
			
							'En tiempo (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && element.diasVencimiento >= 0 ? parseFloat(element.saldo) : 0,
							'Bajo (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(element.saldoVencido) : 0,
							'Medio (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(element.saldoVencido) : 0,
							'Alto (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(element.saldoVencido) : 0,
							'Crítico (USD)': element.factura.moneda.clave.toLowerCase() == 'usd' && (element.diasVencimiento < -50) ? parseFloat(element.saldoVencido) : 0,
							'Total USD': element.factura.moneda.clave.toLowerCase() == 'usd' ? (element.diasVencimiento >= 0 ? parseFloat(element.saldo) : parseFloat(element.saldoVencido)) : 0,
						});
					}
				}
				if(element.factura.moneda.clave.toLowerCase() == 'mxn'){
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
						element.saldo = parseFloat(parseFloat(parseFloat(element.saldo)/tipoCambio).toFixed(2))
						element.saldoVencido = parseFloat(parseFloat(parseFloat(element.saldoVencido)/tipoCambio).toFixed(2))
					}
				}
				if(hoja3.length == 0){
					hoja3.push({
						'Marca': element.factura.marca.nombre,
						'Agente CxC': element.agenteCxc,
						'Clave': element.factura.marca.clave + "-" +element.idCliente,
						'Cliente': element.cliente,
						'En tiempo': element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : 0,
						'Bajo': (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Medio': (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Alto': (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Crítico': (element.diasVencimiento < -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
						'Total': (element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : parseFloat(parseFloat(element.saldoVencido).toFixed(2))),
					});
				} else{
					let elementI = -1
					for (let index = 0; index < hoja3.length; index++) {
						const dato = hoja3[index];
						if(dato['Clave'] ==  element.factura.marca.clave + "-" +element.idCliente){
							elementI = index
						}
					}
					if(elementI > -1){
						hoja3[elementI]['En tiempo'] = element.diasVencimiento >= 0 ?  parseFloat((parseFloat(hoja3[elementI]['En tiempo']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(parseFloat(hoja3[elementI]['En tiempo']).toFixed(2))
						hoja3[elementI]['Bajo'] = (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ?  parseFloat((parseFloat(hoja3[elementI]['Bajo']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja3[elementI]['Bajo']).toFixed(2))
						hoja3[elementI]['Medio'] = (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ?  parseFloat((parseFloat(hoja3[elementI]['Medio']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja3[elementI]['Medio']).toFixed(2))
						hoja3[elementI]['Alto'] = (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ?  parseFloat((parseFloat(hoja3[elementI]['Alto']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja3[elementI]['Alto']).toFixed(2))
						hoja3[elementI]['Crítico'] = (element.diasVencimiento < -50) ?  parseFloat(( parseFloat(hoja3[elementI]['Crítico']) + parseFloat(element.saldoVencido)).toFixed(2)) : parseFloat(parseFloat(hoja3[elementI]['Crítico']).toFixed(2))
						hoja3[elementI]['Total'] = (element.diasVencimiento >= 0 ?  parseFloat(( parseFloat(hoja3[elementI]['Total']) + parseFloat(element.saldo)).toFixed(2)) : parseFloat(( parseFloat(hoja3[elementI]['Total']) + parseFloat(element.saldoVencido)).toFixed(2)))
					}else{
						hoja3.push({
							'Marca': element.factura.marca.nombre,
							'Agente CxC': element.agenteCxc,
							'Clave': element.factura.marca.clave + "-" +element.idCliente,
							'Cliente': element.cliente,
							'En tiempo': element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : 0,
							'Bajo': (element.diasVencimiento <= -1 && element.diasVencimiento >= -15) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Medio': (element.diasVencimiento <= -16 && element.diasVencimiento >= -30) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Alto': (element.diasVencimiento <= -31 && element.diasVencimiento >= -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Crítico': (element.diasVencimiento < -50) ? parseFloat(parseFloat(element.saldoVencido).toFixed(2)) : 0,
							'Total': (element.diasVencimiento >= 0 ? parseFloat(parseFloat(element.saldo).toFixed(2)) : parseFloat(parseFloat(element.saldoVencido).toFixed(2))),
						});
					}
				}
			}
			if(hoja1.length < 0 || hoja2.length < 0 || hoja3.length < 0){
				return res.status(400).json({ success: false, error: 'Sin registros' });
			}
			res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

			const dataExcel = [hoja1,hoja2,hoja3];
			const nombreReporte = 'estado_cuenta_cxc';
			const namesSheets = ['Antigüedad Saldos','Resumen Saldos','Resumen Saldos USD'];
			const reporte = new ReportesXLSX({
				nombreReporte: nombreReporte,
				elementos: dataExcel,
				namesSheets: namesSheets, 
				idMarca: null
			});
			
			return await reporte.gerReporteNSheet(res,req);
		}else{
			const hoja1 = [];
			for(const element of data){
				let metodoPago = 'N/A';
				let formaPago = 'N/A';
				let uuid = 'N/A';

				if(element.factura.id_cfdi != null){
					const cfdi = await db.sequelize.models.cfdis.findByPk(element.factura.id_cfdi, { attributes:['xml','folio_fiscal']});
					const xml = await xmlToJSON(cfdi.xml)
					uuid = cfdi.folio_fiscal
					if (cfdi && cfdi.xml && xml && xml["cfdi:Comprobante"] && xml["cfdi:Comprobante"]["$"]) {
						metodoPago = await db.sequelize.models.metodos_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['MetodoPago']},paranoid: false });
						metodoPago = `(${metodoPago.clave}) ${metodoPago.descripcion}`
						formaPago = await db.sequelize.models.formas_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['FormaPago']},paranoid: false });
						formaPago = `(${formaPago.clave}) ${formaPago.descripcion}`
					}
				}

				hoja1.push({
					'Marca': element.factura.marca.nombre,
					'Monto original': parseFloat(element.montoOriginal),
					'Moneda factura': element.factura.moneda.clave,
					'Saldo factura': parseFloat(element.saldo),
					'Saldo vencido': parseFloat(element.saldoVencido),
					'Días crédito': element.factura.razon_social.dias_credito,
					'Fecha de emisión': element.fecha_emision,
					'Fecha de vencimiento': element.fecha_vencimiento,
					'Días de vencimiento': (element.diasVencimiento * -1),
					'Referencia interna': element.factura.referencia,
					'Referencia del cliente': element.referenciaCliente,
					'Método de pago': metodoPago,
					'Forma de pago': formaPago
				});
			}

			if(hoja1.length < 0){
				return res.status(400).json({ success: false, error: 'Sin registros' });
			}
			res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
			
			const nombreReporte = 'estado_cuenta';
			const namesSheets = ['Estado de cuenta'];
			const reporte = new ReportesXLSX({
				nombreReporte: nombreReporte,
				elementos: hoja1,
				namesSheets: namesSheets, 
				idMarca: null
			});
			
			return await reporte.gerReporteOneSheet(res,req);
		}
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}
async function getFiltroAntiguedadSaldosCxC(req){
	const isAutoemisor = !req.usuario.es_colaborador && req.usuario.es_autoemisor;
	const isMediador = req.usuario.es_mediador_mercantil === true ;
	if(isAutoemisor == true || isMediador == true){
		if(!Number.isInteger(parseInt(req.query.idCliente))){
			return {status:false , msg: `El parametro idCliente debe ser int.` }
		} 
		const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,);
		if(cliente == null){
			return { status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no existe` }
		}
		const oficinasClientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:req.query.idCliente},})
		let oficinas = []
		if(oficinasClientes.length < 1){
			return { success: false, error: 'Sin registros' };
		}
		for(const oficinaCliente of oficinasClientes){
			oficinas.push(oficinaCliente.id_oficina)
		}
		if(oficinas.length == 0){
			oficinas = [-1]
		}
		var filtroOF = {deletedAt: null, id_oficina: {[db.Sequelize.Op.or]: oficinas}};
		const oficinasRazonesSociales = await db.sequelize.models.oficinas_razones_sociales.findAll({where: filtroOF})
		let razonesSocialesIDs = []
		if(oficinasRazonesSociales.length < 1){
			return { success: false, error: 'Sin registros' };
		}
		for(const oficinaRazonSociale of oficinasRazonesSociales){
			razonesSocialesIDs.push(oficinaRazonSociale.id_razon_social)
		}
		if(razonesSocialesIDs.length == 0){
			razonesSocialesIDs = [-1]
		}
		var filtroFacturas = {deletedAt: null, id_razon_social: {[db.Sequelize.Op.or]: razonesSocialesIDs}};
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
		req.query.keepro = 1
		return  {deletedAt: null, id_factura: { [db.Sequelize.Op.or]: facturasId }, saldo: { [db.Sequelize.Op.gt]: 0 } };
	}else{
		const filtroReturn = { deletedAt: null, saldo: { [db.Sequelize.Op.gt]: 0 } }
		if(req.query.idCliente !== undefined){
			const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,);
			if(cliente == null){
				return { status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no existe` }
			}
			const oficinasClientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:req.query.idCliente},})
			let oficinas = []
			if(oficinasClientes.length < 1){
				return { success: false, error: 'Sin registros' };
			}
			for(const oficinaCliente of oficinasClientes){
				oficinas.push(oficinaCliente.id_oficina)
			}
			if(oficinas.length == 0){
				oficinas = [-1]
			}
			var filtroOF = {deletedAt: null, id_oficina: {[db.Sequelize.Op.or]: oficinas}};
			const oficinasRazonesSociales = await db.sequelize.models.oficinas_razones_sociales.findAll({where: filtroOF})
			let razonesSocialesIDs = []
			if(oficinasRazonesSociales.length < 1){
				return { success: false, error: 'Sin registros' };
			}
			for(const oficinaRazonSociale of oficinasRazonesSociales){
				razonesSocialesIDs.push(oficinaRazonSociale.id_razon_social)
			}
			if(razonesSocialesIDs.length == 0){
				razonesSocialesIDs = [-1]
			}
			var filtroFacturas = {deletedAt: null, id_razon_social: {[db.Sequelize.Op.or]: razonesSocialesIDs}};
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
			filtroReturn.id_factura = { [db.Sequelize.Op.or]: facturasId }
		}
		if(req.query.idMarca !== undefined){
			const marca = await db.sequelize.models.marcas.findByPk(req.query.idMarca,);
			if(marca == null){
				return { status: false, msg: `Registro con id: idMarca = ${req.query.idMarca} no existe` }
			}
			filtroReturn['$factura.id_marca$'] = req.query.idMarca
		}
		
		return filtroReturn

	}
}


async function saldoCero(req, res){
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		const parametrosRelaciones = [ 
			'factura.razon_social.clientes_razones_sociales.cliente',
			'factura.moneda',
		 ]
		const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const registroAEditar = await db.sequelize.models.cuentas_por_cobrar.findByPk(id,{include: relaciones,});
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if(parseFloat(registroAEditar.saldo) <= 0){
			return res.status(400).send({ status: false, msg: "El saldo de la cuenta por cobrar ya es 0" });
		}
		const datosUpdate = {
			saldo: 0,
			updatedAt: moment().tz('America/Mexico_City')
		}
		const datosMail = {
			folioFactura: registroAEditar.factura.folio,
			referenciaFactura: registroAEditar.factura.referencia,
			razonSocial: registroAEditar.factura.razon_social.razon_social,
			saldadoPor: req.usuario.nombre,
			saldoCXC: parseFloat(registroAEditar.saldo).toLocaleString('es-US', { style: 'currency', currency: "USD" }),
			monedaFactura: registroAEditar.factura.moneda.clave,
			emails: [req.usuario.email],
			marca: registroAEditar.factura.id_marca
		}
		try {
			datosMail.nombreCliente = registroAEditar.factura.razon_social.clientes_razones_sociales[0].cliente.nombre
		} catch (error) {
			datosMail.nombreCliente = ''
		}

		const usuariosSupervisorCxC = await db.sequelize.models.usuarios.findAll({
			include: [{
				model: db.sequelize.models.roles,
				as: 'listRoles',
				through: {
					attributes: []
				},
				where: {
					id: 24
				},
				required: true
			}],
		});
		for(const usr of usuariosSupervisorCxC){
			if(!datosMail.emails.includes(usr.email)){
				datosMail.emails.push(usr.email)
			}
		}

		const mailSend = await sendMailCxcSaldada(datosMail)
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}


module.exports = {
	index,
	show,
	exportar,
	antiguedadSaldosCxC,
	saldoCero
}


