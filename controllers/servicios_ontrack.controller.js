'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { storeServicioMonitoreoDetalles } = require('./servicios_ontrack_detalles.controller')
//const { sendMailServiciosMonitoreo } = require('./servicios_ontrack_mails.controllers')
const { onlyValid, storeContactoTransportista } = require('./contactos_transportistas.controller')
//const { sendNotificacion } = require('./asignacion_marca_agente_cliente_tracking.controllers')
const { ReportesXLSX } = require('../middlewares/reportesXlsx')
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.servicios_ontrack.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query,db.sequelize.models.servicios_ontrack);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ "certificado", "cliente", "oficina_razon_social", "marca", "tipo_cambio", "proveedor", "estado_origen", "estado_destino", "contacto", "estatus_ontrack", 'tablero', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				certificado: [ 'certificado' ],
				cliente: [ 'cliente.detalles_cliente' ],
				oficina_razon_social: [ 'oficina_razon_social.oficina','oficina_razon_social.razon_social' ],
				marca: [ 'marca' ],
				tipo_cambio: [ 'tipo_cambio_futuro' ],
				proveedor: [ 'proveedor' ],
				estado_origen: [ 'estado_origen.pais' ],
				estado_destino: [ 'estado_destino.pais' ],
				contacto: [ 'contacto' ],
				estatus_ontrack: [ 'estatus_ontrack' ],
				moneda: ['moneda'],
				moneda_compra: ['moneda_compra'],
				tablero: [ 'certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina','oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack', 'moneda', 'moneda_compra' ],
				all: [ 'certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina','oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack', 'moneda', 'moneda_compra' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const docs = await db.sequelize.models.servicios_ontrack.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.servicios_ontrack.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/serviciosOnTrack`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			let element = doc.toJSON()
			const fechaFull = moment(element.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
			element.fecha_solicitud = fechaFull.split(" ")[0]
			element.hora_solicitud = fechaFull.split(" ")[1]
			if(req.query.perfil == "all" || req.query.perfil == "tablero"){
				const _filtro = { id_servicio_ontrack: element.id }
				const contactosTransportistas = await db.sequelize.models.contactos_transportistas.findAll({
					where: _filtro
				})
				element.contactosTransportistas = contactosTransportistas
				const perfilesValidos = [ 'estatus_ontrack' ]
				const findRelaciones = new Relaciones(perfilesValidos,perfilesValidos,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				const seguimiento_estatus = await db.sequelize.models.seguimiento_estatus_ontrack.findAll({
					where: _filtro,
					include: relaciones,
					order: [['createdAt', 'DESC']],
				})
				element.seguimiento_estatus = []
				for(const seguimientoEstatus of seguimiento_estatus){
					element.seguimiento_estatus.push(seguimientoEstatus.estatus_ontrack)
				}
				const perfilesValidosDetalles = [ 'producto','atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta']
				const findRelacionesDetalles = new Relaciones(perfilesValidosDetalles,perfilesValidosDetalles,db.sequelize.models)
				const relacionesDetalles = await findRelacionesDetalles.getRelaciones()
				const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: element.id},include: relacionesDetalles,})
				element.servicios_ontrack_detalles = detalles
				if(element.id_certificado !== null && element.id_certificado !== undefined && element.id_certificado !== ""){
					const parametrosDetalles = [ 'atributo.oficina_producto','atributo.proveedor' ]
					const findRelacionesDetCert = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
					const relacionesDetCert = await findRelacionesDetCert.getRelaciones()
					let det_cer = await db.sequelize.models.detalle_certificados.findOne({
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:element.id_certificado,
							},
						},
						include: relacionesDetCert
					})
					element.certificado.detalle = det_cer
				}
				element.pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({
					where: {
						id_servicio_ontrack: element.id
					}
				})
				element.factura = null
				element.ordenCompra = null
				element.facturaProveedor = null
				if(element.pedidoFactura.estatus == "F"){
					const facturaDetalles = await db.sequelize.models.factura_detalles.findOne({
						where: {
							id_pedido_factura: element.pedidoFactura.id
						}
					})
					const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
					const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
					element.factura = await db.sequelize.models.facturas.findByPk(facturaDetalles.id_factura, { include:relacionesFacturas})
					const ocFactura = await db.sequelize.models.oc_facturas.findOne({
						where: {
							id_factura: element.factura.id
						}
					})
					if(ocFactura !== null){
						const listRelOC = [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
						const findRelacionesOC = new Relaciones(listRelOC,listRelOC,db.sequelize.models)
						const relacionesOC = await findRelacionesOC.getRelaciones()
						element.ordenCompra = await db.sequelize.models.ordenes_compra.findByPk(ocFactura.id_orden_compra, { include:relacionesOC})
						console.log("asdfasddfasdf")
						const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'factura_proveedor.usuario_registro', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
						const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
						const relDetalles = await findRelaciones.getRelaciones()
						const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.ordenCompra.id},include: relDetalles})
						element.ordenCompra = element.ordenCompra.toJSON()
						element.ordenCompra.detalles = []
						for(const detalle of detalles){
							const det = detalle.toJSON()
							if(element.facturaProveedor === null){
								element.facturaProveedor = det.factura_proveedor
							}
							det.factura_proveedor = undefined
							element.ordenCompra.detalles.push(det)
						}
					}
				}
			} 
			if(req.query.perfil == "tablero"){
				element = await getInfoTablero(element,"index")
			} else if(req.query.perfil == "all"){
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(element.oficina_razon_social.id_razon_social);
				if(razonSocial != null){
					const razonSocialValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial.id, id_marca: element.id_marca}})
					let razonValidada = true
					if(razonSocialValidacion == null){
						try {
							const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
							const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
							if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
								razonValidada = false
							}
						} catch (error) {
							razonValidada = false
						}
					} else{
						if((razonSocialValidacion.id_marca != 2 && razonSocialValidacion.id_marca != 2) ){
							razonValidada = false
						} else{
							if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
								const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
								const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
								if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
									razonValidada = false
								}
							}else{
								razonValidada = true
							}
						}
					}
					if(razonValidada === true){
						element.oficina_razon_social.razon_social.validada = true
					}else{
						element.oficina_razon_social.razon_social.validada = false
					}
				}
			}
			data.push(element)
		}
		return res.status(200).send({
			status: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data
		});
		
	} catch (error) {
		return res.status(500).json({ status: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltro(parametros,modelo){
	var filtro
	try {
		filtro = JSON.parse(parametros.filter)
	} catch (error) {
		filtro = {or:[], and:[]}
	}
	const showCancelados = parametros.cancelados == "true" ? true : false;
	const showCanceladosOnly = parametros.cancelados == "only" ? true : false;
	if(showCanceladosOnly){
		if(filtro.and === undefined){
			filtro.and = {}
		}
		filtro.and.push( { property: 'estatus', value: "C", operator: '==' })
	}else if(!showCancelados){
		if(filtro.and === undefined){
			filtro.and = {}
		}
		filtro.and.push( { property: 'estatus', value: "C", operator: '!=' })
	}
	const Filter = new Filtros({filtros:filtro,modelo:modelo})
	return await Filter.get()
}

async function store(req, res){
	const parametros = req.body;
	parametros.estatus = "N"
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		const fechaStringAux = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		const fechaBusqueda = moment(fechaStringAux).tz('America/Mexico_City')
	
		const doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
		if(doit !== true){
			return doit
		}
		const tipoCambioSelectedAux = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaStringAux}});
		if(tipoCambioSelectedAux == null){
			return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
		}
		parametros.idTipoCambioFuturo = tipoCambioSelectedAux.id
		try {
			const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
			if(razonSocialAux != null){
				parametros.idMarca = razonSocialAux.id_nacionalidad_timbrado == 96 ? 2 : 2
			}else{
				parametros.idMarca = undefined
			}
		} catch (error) {
			parametros.idMarca = undefined
		}
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['marca_agente_oficina','producto']});
		if(oficinaProducto === null){
			return res.status(400).send({ status: false, msg: `Registro con ID ${parametros.idOficinaProducto} (${db.sequelize.models.oficinas_productos.name}) no encontrado` });
		}
		const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.marca_agente_oficina.id);
		const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente);
		const oficina = await db.sequelize.models.oficinas.findByPk(oficinaCliente.id_oficina, {include: ['razones_sociales']})
		parametros.idEstatusOntrack = 1
		const obligatorios = [
			{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
			{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
			{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados},
			{campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados},
			{campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}}},
			{campo:'idTipoCambioFuturo', tipo:'model', model:db.sequelize.models.tipos_cambio_futuro},
			{campo:'idContacto', tipo:'model', model:db.sequelize.models.contactos},
			{campo:'idEstatusOntrack', tipo:'model', model:db.sequelize.models.estatus_ontrack},
			{campo:'ciudadOrigen', tipo:'string', textoCase:"up", largo:255},
			{campo:'ciudadDestino', tipo:'string', textoCase:"up", largo:255},
			{campo:'fechaSalida', tipo:'stringDateTime'},
			{campo:'fechaLlegada', tipo:'stringDateTime'},
            {campo:'estatus', tipo:'enum', largo:1, textoCase:"up", enum: ['N','F','C']},
			{campo:'keepro', tipo:'number'},
			{campo:'haveNotificaciones', tipo:'boolean'},
		];
		if(parametros.haveNotificaciones !== true){
			parametros.temporalidad = ""
		}else{
			obligatorios.push({campo:'temporalidad', tipo:'string', textoCase:"up", largo:500})
		}
		const validosOpcionales = [
			{campo:'idCertificado', tipo:'model', model:db.sequelize.models.certificados},
			{campo:'numConocimiento', tipo:'string', textoCase:"up", largo:255},
			{campo:'numContenedor', tipo:'string', textoCase:"up", largo:255},
			{campo:'nombreTransportista', tipo:'string', textoCase:"up", largo:255},
			{campo:'correoTransportista', tipo:'correo',largo:100,textoCase:"up"},
			{campo:'comentarios', tipo:'string', textoCase:"up", largo:255},
			{campo:'telefonoTransportista', tipo:'string', textoCase:"up", largo:255, canNull: true},
			{campo:'correos', tipo:'string', textoCase:"up", largo:500, canNull: true},
			{campo:'referenciaInterna', tipo:'string', textoCase:"up", largo:255, canNull: true}
		]
		if(parametros.keepro === 0){
			validosOpcionales.push({campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores})
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		if(parametros.idCertificado !== null && parametros.idCertificado !== undefined && parametros.idCertificado !== ""){
			try {
				const certificado = await db.sequelize.models.certificados.findByPk(parametros.idCertificado);
				if(certificado.id_cliente != parametros.idCliente){
					return res.status(400).send({ status: false, msg: "El cliente de la operación debe ser el mismo que el cliente ligado al certificado." });
				}
				const proveedor = await db.sequelize.models.proveedores.findByPk(certificado.id_proveedor);
				const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca);
				const canDoIt = proveedor.id_nacionalidad == 96 && marca.id_pais == 96
				if(canDoIt === false){
					return res.status(400).send({ status: false, msg: "Tanto la marca como el proveedor del certificado deben tener nacionalidad mexicana." });
				}
			} catch (error) {
				return res.status(500).send({ status: false, msg: "Error al validar la operación con id: " + parametros.idCertificado });
			}
		}
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		parametros.detalles = parametros.detalles ?? []
		if(!Array.isArray(parametros.detalles)){
			return res.status(400).send({ status: false, msg: "Parametro detalles inválido. Debe ser una lista de los detalles del servicio monitoreo a registrar." });
		}
		if(parametros.detalles.length == 0){
			return res.status(400).send({ status: false, msg: "Se debe enviar mínimo un detalle del servicio de monitoreo a registrar." });
		}
		for(const detalles of parametros.detalles){
			const isValid = await validDetalles(detalles, res)
			if(isValid === null){
				return null
			}
		}
		if(parametros.contactosTransportistas !== null && parametros.contactosTransportistas !== undefined && parametros.contactosTransportistas !== ""){
			parametros.contactosTransportistas = parametros.contactosTransportistas ?? []
			if(!Array.isArray(parametros.contactosTransportistas)){
				return res.status(400).send({ status: false, msg: "Parametro contactosTransportistas inválido. Debe ser una lista de los contactos transportistas del servicio monitoreo a registrar." });
			}
			for(const contactoTransportista of parametros.contactosTransportistas){
				const isValid = await onlyValid(contactoTransportista, res)
				if(isValid === null){
					return null
				}
			}
		}
		if(parametros.keepro < 0 || parametros.keepro > 4){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
		}
		if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
			return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
		}
		const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente, {include: ['detalles_cliente']});
		if(cliente.detalles_cliente.autoemisor != true && parametros.keepro != 0){
			return res.status(400).send({ status: false, msg: "El cliente no tiene acceso al autoemisor"});
		}

		
		const registrosEncontrados = await db.sequelize.models.servicios_ontrack.findAll({
			where: {
                [db.Sequelize.Op.and]: {
                    id_certificado: parametros.idCertificado,
					id_certificado: {
						[db.Sequelize.Op.ne]: null, 
					},
					estatus:{
						[db.Sequelize.Op.ne]: "C", 
					},
                    deletedAt: null
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				if(registro.id_certificado == parametros.idCertificado){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "No se puede ligar más de una solicitud de monitoreo a un certificado."});
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
		if(razonSocialAux == null){
			return res.status(400).send({ status: false, msg: `La razón social no existe.`});
		}
		if(razonSocialAux.bloqueado == true){
			return res.status(400).send({ status: false, msg: `La razón social ${razonSocialAux.razon_social} está actualmente bloqueada. Por favor, contacta al departamento de Crédito y Cobranza para resolverlo a la brevedad.` });
		}
		const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:parametros.idRazonSocial,id_marca:parametros.idMarca}})
		let razonValidada = true
		if(razonesSocialesValidaciones == null){
			const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
			const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
			if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
				razonValidada = false
			}
		} else{
			if((razonesSocialesValidaciones.id_marca != 2 && razonesSocialesValidaciones.id_marca != 2) ){
				razonValidada = false
			} else{
				if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
					const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
					const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
					if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
						razonValidada = false
					}
					const fechaCreacionRSV = moment(razonesSocialesValidaciones.createdAt).tz('America/Mexico_City')
					const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
					if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
						razonValidada = true
					}
				}else{
					razonValidada = true
				}
			}
		}
		if(!razonValidada){
            const marcaNoValidada = await db.sequelize.models.marcas.findByPk(parametros.idMarca)
			return res.status(400).send({ status: false, msg: `La marca ${ManipuladorCadenas.toTitle(marcaNoValidada.nombre)} no se encuentra validada para la razon social seleccionada.`});
		}
		const fechaSalida = moment(parametros.fechaSalida).tz('America/Mexico_City');

		const fechaLlegada = moment(parametros.fechaLlegada).tz('America/Mexico_City');
		if (fechaLlegada < fechaSalida) {
			return res.status(400).send({
				status: false,
				msg: "La fecha de salida no puede ser mayor que a la fecha de llegada"
			});
		}
		const oficinaRazonSocial = await db.sequelize.models.oficinas_razones_sociales.findOne({where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}})
		registro.id_oficina_razon_social = oficinaRazonSocial.id
		registro.id_usuario_registro = req.usuario.id;
		const noOperacion = await genNoOperacion(marcaAgenteOficina.clave,parametros.idRazonSocial, oficina, registro.id_marca);
		const isFirstOp = await esPrimeraOperacion(marcaAgenteOficina.clave,parametros.idRazonSocial, oficina, registro.id_marca);
		registro.no_operacion = noOperacion
		const nuevoRegistro = await db.sequelize.models.servicios_ontrack.create(registro);
		for(const detalles of parametros.detalles){
			detalles.idServicioOntrack = nuevoRegistro.id
			const detalle = await storeServicioMonitoreoDetalles(detalles, req.usuario, res)
			if(detalle === null){
				const detallesSaved = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: nuevoRegistro.id}})
				for(const detalleSaved of detallesSaved){
					await detalleSaved.destroy({ where: { id: detalleSaved.id } });
				}
				await nuevoRegistro.destroy({ where: { id: nuevoRegistro.id } });
				return null
			} else if(detalle.status === false){
				const detallesSaved = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: nuevoRegistro.id}})
				for(const detalleSaved of detallesSaved){
					await detalleSaved.destroy({ where: { id: detalleSaved.id } });
				}
				await nuevoRegistro.destroy({ where: { id: nuevoRegistro.id } });
				return res.status(500).send(detalle)
			}
		}
		if(parametros.contactosTransportistas !== null && parametros.contactosTransportistas !== undefined && parametros.contactosTransportistas !== ""){
			for(const contactoTransportista of parametros.contactosTransportistas){
				contactoTransportista.idServicioOntrack = nuevoRegistro.id
				const isValid = await storeContactoTransportista(contactoTransportista, req.usuario, res)
				if(isValid === null){
					return null
				} else if(isValid.status === false){
					const contactosTransportistasSaved = await db.sequelize.models.contactos_transportistas.findAll({where:{id_servicio_ontrack: nuevoRegistro.id}})
					for(const contactoTransportistaSaved of contactosTransportistasSaved){
						await contactoTransportistaSaved.destroy({ where: { id: contactoTransportistaSaved.id } });
					}
					const detallesSaved = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: nuevoRegistro.id}})
					for(const detalleSaved of detallesSaved){
						await detalleSaved.destroy({ where: { id: detalleSaved.id } });
					}
					await nuevoRegistro.destroy({ where: { id: nuevoRegistro.id } });
					return res.status(500).send(isValid)
				}
			}
		}
		const pedidoFactura = {
            id_servicio_ontrack: nuevoRegistro.id,
            estatus:'P',
            id_usuario_registro: req.usuario.id,
            createdAt: moment().tz('America/Mexico_City')
        }
		await db.sequelize.models.pedidos_factura.create(pedidoFactura);
		//sendMailServiciosMonitoreo(nuevoRegistro.id, req.usuario, [])
		const registroSEM = {
			id_servicio_ontrack: nuevoRegistro.id,
			id_estatus_ontrack: nuevoRegistro.id_estatus_ontrack,
            id_usuario_registro: req.usuario.id,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		const marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({
			where:{
				id_cliente: cliente.id,
				id_marca: 2
			}
		});
		if(isFirstOp && marcaAgenteCliente == null){
			const marcaAgenteClienteKeePro = await db.sequelize.models.marca_agentes_clientes.findOne({
				where:{
					id_cliente: cliente.id,
					id_marca: 1
				}
			});
			const newMarcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.create({
				id_cliente: cliente.id,
				id_marca: 2,
				id_agente_operativo: await getAgenteOperativo(),
				id_agente_venta_1:marcaAgenteClienteKeePro.id_agente_venta_1,
				id_agente_venta_2:marcaAgenteClienteKeePro.id_agente_venta_2,
				id_usuario_registro: req.usuario.id,
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			});
			//envioNotificacionNuevoAgente(newMarcaAgenteCliente)
		}
		await db.sequelize.models.seguimiento_estatus_ontrack.create(registroSEM);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = [ "certificado", "cliente", "oficina_razon_social", "marca", "tipo_cambio", "proveedor", "estado_origen", "estado_destino", "contacto", "estatus_ontrack", 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				certificado: [ 'certificado' ],
				cliente: [ 'cliente.detalles_cliente' ],
				oficina_razon_social: [ 'oficina_razon_social.oficina','oficina_razon_social.razon_social' ],
				marca: [ 'marca' ],
				tipo_cambio: [ 'tipo_cambio_futuro' ],
				proveedor: [ 'proveedor' ],
				estado_origen: [ 'estado_origen.pais' ],
				estado_destino: [ 'estado_destino.pais' ],
				contacto: [ 'contacto' ],
				estatus_ontrack: [ 'estatus_ontrack' ],
				moneda: ['moneda'],
				moneda_compra: ['moneda_compra'],
				all: [ 'certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina','oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack', 'moneda', 'moneda_compra' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.servicios_ontrack.findByPk(id,{paranoid: false, include: relaciones});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			const fechaFull = moment(element.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
			element.fecha_solicitud = fechaFull.split(" ")[0]
			element.hora_solicitud = fechaFull.split(" ")[1]
			if(req.query.perfil == "all"){
				const _filtro = { id_servicio_ontrack: element.id }
				const contactosTransportistas = await db.sequelize.models.contactos_transportistas.findAll({
					where: _filtro
				})
				element.contactosTransportistas = contactosTransportistas
				const perfilesValidos = [ 'estatus_ontrack' ]
				const findRelaciones = new Relaciones(perfilesValidos,perfilesValidos,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				const seguimiento_estatus = await db.sequelize.models.seguimiento_estatus_ontrack.findAll({
					where: _filtro,
					include: relaciones,
					order: [['createdAt', 'DESC']],
				})
				element.seguimiento_estatus = []
				for(const seguimientoEstatus of seguimiento_estatus){
					element.seguimiento_estatus.push(seguimientoEstatus.estatus_ontrack)
				}
				const perfilesValidosDetalles = [ 'producto','atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta']
				const findRelacionesDetalles = new Relaciones(perfilesValidosDetalles,perfilesValidosDetalles,db.sequelize.models)
				const relacionesDetalles = await findRelacionesDetalles.getRelaciones()
				const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: element.id},include: relacionesDetalles,})
				element.servicios_ontrack_detalles = detalles
				if(element.id_certificado !== null && element.id_certificado !== undefined && element.id_certificado !== ""){
					const parametrosDetalles = [ 'atributo.oficina_producto','atributo.proveedor' ]
					const findRelacionesDetCert = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
					const relacionesDetCert = await findRelacionesDetCert.getRelaciones()
					let det_cer = await db.sequelize.models.detalle_certificados.findOne({
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:element.id_certificado,
							},
						},
						include: relacionesDetCert
					})
					element.certificado.detalle = det_cer
				}
				element.pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({
					where: {
						id_servicio_ontrack: element.id
					}
				})
				element.factura = null
				element.ordenCompra = null
				element.facturaProveedor = null
				if(element.pedidoFactura.estatus == "F"){
					const facturaDetalles = await db.sequelize.models.factura_detalles.findOne({
						where: {
							id_pedido_factura: element.pedidoFactura.id
						}
					})
					const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
					const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
					element.factura = await db.sequelize.models.facturas.findByPk(facturaDetalles.id_factura, { include:relacionesFacturas})
					const ocFactura = await db.sequelize.models.oc_facturas.findOne({
						where: {
							id_factura: element.factura.id
						}
					})
					if(ocFactura !== null){
						const listRelOC = [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
						const findRelacionesOC = new Relaciones(listRelOC,listRelOC,db.sequelize.models)
						const relacionesOC = await findRelacionesOC.getRelaciones()
						element.ordenCompra = await db.sequelize.models.ordenes_compra.findByPk(ocFactura.id_orden_compra, { include:relacionesOC})
						const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'factura_proveedor.usuario_registro', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
						const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
						const relDetalles = await findRelaciones.getRelaciones()
						const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.ordenCompra.id},include: relDetalles})
						element.ordenCompra = element.ordenCompra.toJSON()
						element.ordenCompra.detalles = []
						for(const detalle of detalles){
							const det = detalle.toJSON()
							if(element.facturaProveedor === null){
								element.facturaProveedor = det.factura_proveedor
							}
							det.factura_proveedor = undefined
							element.ordenCompra.detalles.push(det)
						}
					}
				}
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(element.oficina_razon_social.id_razon_social);
				if(razonSocial != null){
					const razonSocialValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial.id, id_marca: element.id_marca}})
					let razonValidada = true
					if(razonSocialValidacion == null){
						try {
							const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
							const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
							if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
								razonValidada = false
							}
						} catch (error) {
							razonValidada = false
						}
					} else{
						if((razonSocialValidacion.id_marca != 17 && razonSocialValidacion.id_marca != 26) ){
							razonValidada = false
						} else{
							if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
								const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
								const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
								if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
									razonValidada = false
								}
							}else{
								razonValidada = true
							}
						}
					}
					if(razonValidada === true){
						element.oficina_razon_social.razon_social.validada = true
					}else{
						element.oficina_razon_social.razon_social.validada = false
					}
				}
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	}  
}

async function update(req, res){
	const parametros = req.body;
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		const registroAEditar = await db.sequelize.models.servicios_ontrack.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		const validosOpcionales = []
		if(registroAEditar.estatus == "N"){
			const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({
				where:{
					clave: registroAEditar.no_operacion.split("-")[0] + "-" + registroAEditar.no_operacion.split("-")[1] + "-" + registroAEditar.no_operacion.split("-")[2]
				}
			});
			const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente);
			validosOpcionales.push({campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}}},)
			validosOpcionales.push({campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados})
			validosOpcionales.push({campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados})
			validosOpcionales.push({campo:'idContacto', tipo:'model', model:db.sequelize.models.contactos})
			validosOpcionales.push({campo:'idEstatusOntrack', tipo:'model', model:db.sequelize.models.estatus_ontrack})
			validosOpcionales.push({campo:'ciudadOrigen', tipo:'string', textoCase:"up", largo:255})
			validosOpcionales.push({campo:'ciudadDestino', tipo:'string', textoCase:"up", largo:255})
			validosOpcionales.push({campo:'fechaSalida', tipo:'stringDateTime'})
			validosOpcionales.push({campo:'fechaLlegada', tipo:'stringDateTime'})
			validosOpcionales.push({campo:'idCertificado', tipo:'model', model:db.sequelize.models.certificados, canNull: true})
			validosOpcionales.push({campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores, canNull: true})
			validosOpcionales.push({campo:'numConocimiento', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'numContenedor', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'nombreTransportista', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'comentarios', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'telefonoTransportista', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'correoTransportista', tipo:'correo',largo:100,textoCase:"up", canNull: true})
			validosOpcionales.push({campo:'correos', tipo:'string', textoCase:"up", largo:500, canNull: true})
			validosOpcionales.push({campo:'referenciaInterna', tipo:'string', textoCase:"up", largo:255, canNull: true})
			validosOpcionales.push({campo:'haveNotificaciones', tipo:'boolean'})
			validosOpcionales.push({campo:'temporalidad', tipo:'string', textoCase:"up", largo:500})
			validosOpcionales.push({campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas})
			validosOpcionales.push({campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas})
			if(parametros.haveNotificaciones === false || ((parametros.haveNotificaciones === null && parametros.haveNotificaciones === undefined) && registroAEditar.have_notificaciones === false)){
				parametros.temporalidad = ""
			}else if(parametros.temporalidad === null || parametros.temporalidad === undefined || parametros.temporalidad === ""){
				return res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: parametros.temporalidad });
			}
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res);
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0];
		seEdita = dataValidarOpcionales[1];
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}	
		if(parametros.idCertificado !== null && parametros.idCertificado !== undefined && parametros.idCertificado !== ""){
			try {
				const certificado = await db.sequelize.models.certificados.findByPk(parametros.idCertificado);
				if(certificado.id_cliente != registroAEditar.id_cliente){
					return res.status(400).send({ status: false, msg: "El cliente de la operación debe ser el mismo que el cliente ligado al certificado." });
				}
				const proveedor = await db.sequelize.models.proveedores.findByPk(certificado.id_proveedor);
				const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca);
				const canDoIt = proveedor.id_nacionalidad == 96 && marca.id_pais == 96
				if(canDoIt === false){
					return res.status(400).send({ status: false, msg: "Tanto la marca como el proveedor del certificado deben tener nacionalidad mexicana." });
				}
			} catch (error) {
				return res.status(500).send({ status: false, msg: "Error al validar la operación con id: " + parametros.idCertificado });
			}
		} 
		if(datosUpdate.id_proveedor !== null && datosUpdate.id_proveedor !== undefined && datosUpdate.id_proveedor !== ""){
			const proveedorTra = await db.sequelize.models.proveedores.findByPk(datosUpdate.id_proveedor);
			if(proveedorTra.id_proveedor_tipo != 2){
				return res.status(400).send({ status: false, msg: "El tipo del proveedor debe ser 'monitoreo'."});
			}
		}
		const registrosEncontrados = await db.sequelize.models.servicios_ontrack.findAll({
			where: {
                [db.Sequelize.Op.and]: {
                    id_certificado: parametros.idCertificado != undefined ? parametros.idCertificado : registroAEditar.id_certificado,
					id_certificado: {
						[db.Sequelize.Op.ne]: null, 
					},
                    deletedAt: null
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				const idCertificado = parametros.idCertificado != undefined ? parametros.idCertificado : registroAEditar.id_certificado;
				if((registro.id_certificado == idCertificado) && registro.id != id){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "No se puede ligar más de una solicitud de monitoreo a un certificado."});
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		
		if(parametros.idEstatusOntrack !== null && parametros.idEstatusOntrack !== undefined){
			if(registroAEditar.id_estatus_ontrack != datosUpdate.id_estatus_ontrack){
				const registroSEM = {
					id_servicio_ontrack: registroAEditar.id,
					id_estatus_ontrack: datosUpdate.id_estatus_ontrack,
					id_usuario_registro: req.usuario.id,
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				};
				await db.sequelize.models.seguimiento_estatus_ontrack.create(registroSEM);
			}
		}

        await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.servicios_ontrack.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			const registrosToDelete = []
			for (const modelo of Object.values(db.sequelize.models)) {
				if(modelo.name == "pedidos_factura"){
					let asociaciones = modelo.associations
					for (const asociacion of Object.values(asociaciones)) {
						if(asociacion.target.name == db.sequelize.models.servicios_ontrack.name){
							let where = {}
							if(asociacion.associationType != 'HasMany'){
								where[asociacion.foreignKey] = registroAEliminar.id
								let encontrados = await modelo.findAll({ where: where });
								for(const encontrado of encontrados){
									registrosToDelete.push(encontrado)
								}
							}
						}
					}
				}else if(modelo.name != "servicios_ontrack_detalles" && modelo.name != "contactos_transportistas"){
					let asociaciones = modelo.associations
					for (const asociacion of Object.values(asociaciones)) {
						if(asociacion.target.name == db.sequelize.models.servicios_ontrack.name){
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
			}
			if(!canDelete){
				return res.status(400).send({ status: false, msg: `No se pudo eliminar. El elemento actualmente está siendo referenciado en los modelos [${modelosUtilizados}].` });
			}
			if(registroAEliminar.estatus == "C"){
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			if(registroAEliminar.estatus == "F"){
				return res.status(400).send({ status: false, msg: "Registro no se puede eliminar. La solicitud se encuentra Facturada." });
			}
			const datosUpdate = {
				estatus: "C",
				updatedAt: moment().tz('America/Mexico_City')
			}
			await registroAEliminar.update(datosUpdate, { where: { id: id } });
			for(const registroToDelete of registrosToDelete){
				await registroToDelete.destroy({ where: { id: registroToDelete.id } });
			}
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function restaurar(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroARestaurar = await db.sequelize.models.servicios_ontrack.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.estatus == "C"){
				const registrosEncontrados = await db.sequelize.models.servicios_ontrack.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_certificado: registroARestaurar.id_certificado,
							id_certificado: {
								[db.Sequelize.Op.ne]: null, 
							},
							estatus:{
								[db.Sequelize.Op.ne]: "C", 
							},
							deletedAt: null
						}
					}
				});
				if(registrosEncontrados.length > 0){
					var regExistente = false;
					await registrosEncontrados.forEach(registro => {
						if(registro.id_certificado == registroARestaurar.id_certificado){
							if(!regExistente){
								regExistente = true;
								res.status(400).send({ status: false, msg: "No se puede restaurar ya que no se puede ligar más de una solicitud de monitoreo a un certificado."});
							}
						}
					});
					if(regExistente){
						return '';
					}
				}
				
				const datosUpdate = {
					estatus: "N",
					updatedAt: moment().tz('America/Mexico_City')
				}
				await registroARestaurar.update(datosUpdate, { where: { id: id } });
				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

//GetOficinaProductos
async function getOficinaProductosOnTrack(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	const parametros = req.query;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(!Number.isInteger(parseInt(parametros.idOficina))){
		res.status(400).send({status:false , msg: `El parametro idOficina debe ser int.` });
		return false
	} 
	if(!Number.isInteger(parseInt(parametros.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,{include:['categoria_cliente']});
	if(cliente == null){
		return res.status(400).send({ status: false, msg: `Registro con ID ${req.query.idCliente} (${db.sequelize.models.clientes.name}) no encontrado.` });
	}
	if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con ID ${req.query.idCliente} (${cliente.nombre}) es prospecto.` });
	}
	const oficina = await db.sequelize.models.oficinas.findByPk(req.query.idOficina);
	if(oficina == null){
		return res.status(400).send({ status: false, msg: `Registro con ID ${req.query.idOficina} (${db.sequelize.models.oficinas.name}) no encontrado.` });
	}
	const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{
		id_cliente: cliente.id,
		id_oficina: oficina.id
	}});
	if(oficinaCliente == null){
		return res.status(400).send({ status: false, msg: `La oficina con ID ${oficina.id} (${oficina.nombre}) no está relacionada al cliente (${cliente.nombre}).` });
	}
	const filtro = await getFiltroOficinasProductos(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const all = ['producto.moneda_compra','producto.moneda_venta','producto.pais.continente','producto.tipo_cobertura','producto.archivo','marca_agente_oficina.marca.domicilio.estado.pais.continente','marca_agente_oficina.marca.pais.continente','marca_agente_oficina.marca.archivo','marca_agente_oficina.marca.dato_facturacion.regimen_fiscal', 'marca_agente_oficina.marca.dato_facturacion.pais.continente', 'marca_agente_oficina.marca.dato_facturacion.nacionalidad_timbrado.continente','marca_agente_oficina.agente_venta_1','marca_agente_oficina.agente_venta_2','marca_agente_oficina.oficina_cliente.cliente.tipo_cliente', 'marca_agente_oficina.oficina_cliente.cliente.estado.pais.continente', 'marca_agente_oficina.oficina_cliente.cliente.oficina_interno','marca_agente_oficina.oficina_cliente.oficina']

		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.oficinas_productos.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.oficinas_productos.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/operaciones/getOficinaProductosOnTrack`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficina=${parametros.idOficina}&idCliente=${parametros.idCliente}&orden=${orden}` : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficina=${parametros.idOficina}&idCliente=${parametros.idCliente}&orden=${orden}` : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			data.push(element)
		}
		return res.status(200).send({
			status: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data
		});
		
	} catch (error) {
		return res.status(500).json({ status: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltroOficinasProductos(parametros){
	var filtro = {deletedAt: null};
	filtro['$marca_agente_oficina.oficina_cliente.id_oficina$'] =  parametros.idOficina
	filtro['$marca_agente_oficina.id_marca$'] = {[db.Sequelize.Op.or]: [2,2]}
	return filtro;

}

//canContratarSOT
async function canContratarSOT(req,res){
	const parametros = req.body;
	if(!Number.isInteger(parseInt(parametros.idMarca))){
		return res.status(400).send({status:false , msg: `El parametro idMarca debe ser int.` });
	}
	if(!Number.isInteger(parseInt(parametros.idProveedor))){
		return res.status(400).send({status:false , msg: `El parametro idProveedor debe ser int.` });
	}
	const proveedor = await db.sequelize.models.proveedores.findByPk(parametros.idProveedor);
	if(proveedor == null){
		return res.status(400).send({
			status: false,
			canContratarSOT: false
		});
	}
	const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca);
	if(marca == null){
		return res.status(400).send({
			status: false,
			canContratarSOT: false
		});
	}
	if(proveedor.id_nacionalidad == 96 && marca.id_pais == 96){
		if(!Number.isInteger(parseInt(parametros.idOficinaProdcutoCarga))){
			return res.status(400).send({status:false , msg: `El parametro idOficinaProdcutoCarga debe ser int.` });
		}
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProdcutoCarga);
		if(oficinaProducto == null){
			return res.status(400).send({
				status: false,
				msg: "No se encuentra el oficina producto con id " + parametros.idOficinaProdcutoCarga
			});
		}
		const mao = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.id_marca_agente_oficina);
		const marca = await db.sequelize.models.marcas.findByPk(mao.id_marca == 1 ? 2 : 2);
		const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(mao.id_oficina_cliente);
		const maoTr = await db.sequelize.models.marca_agentes_oficinas.findOne({where: {id_oficina_cliente: mao.id_oficina_cliente, id_marca: marca.id }});
		if(maoTr == null){
			const parametrosRelacion = ['oficina_cliente']
			const findRelaciones = new Relaciones(parametrosRelacion,parametrosRelacion,db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			const totalCount = await db.sequelize.models.marca_agentes_oficinas.count({
				paranoid: false,
				include: relaciones,
				where: {
					["$oficina_cliente.id_cliente$"]: oficinaCliente.id_cliente
				}
			});
			const clave = marca.clave + "-" + oficinaCliente.id_cliente + "-" + (totalCount +1)
			const maoT = await db.sequelize.models.marca_agentes_oficinas.create({
				id_oficina_cliente: oficinaCliente.id,
				id_marca: marca.id,
				clave: clave,
				id_usuario_registro: req.usuario.id,
				reasignado_av_1: false,
				reasignado_av_2: false,
				createdAt: moment().tz('America/Mexico_City'),
			});
			const productoTracking = await db.sequelize.models.productos.findByPk(5);
			if(productoTracking == null){
				return res.status(400).send({
					status: false,
					msg: "No se encuentra el producto activo (MONITOREO SATELITAL ACTIVO)"
				});
			}
			const oficinaProductoTracking = await db.sequelize.models.oficinas_productos.create({
				id_producto: 5, 
				id_marca_agente_oficina: maoT.id,
				id_usuario_registro: req.usuario.id,
				createdAt: moment().tz('America/Mexico_City'),
			});
			await db.sequelize.models.atributo_ontrack.create({
				id_oficina_producto: oficinaProductoTracking.id,
				id_moneda_compra: 2,
				id_moneda_venta: 2,
				precio: 39.0,
				porcentaje_sobreventa: 0,
				porcentaje_comisionista: 0,
				descripcion: productoTracking.descripcion,
				id_usuario_registro: req.usuario.id,
				createdAt: moment().tz('America/Mexico_City'),
			});
		}
	}
	return res.status(200).send({
		status: true,
		canContratarSOT: proveedor.id_nacionalidad == 96 && marca.id_pais == 96
	});
}

async function validDetalles(parametros, res) {
	let registro = {}
	
	const obligatorios = [
		{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
		{campo:'cantidad', tipo:'number'},
		{campo:'subtotal', tipo:'number'},
		{campo:'montoIva', tipo:'number'},
		{campo:'porcentajeIva', tipo:'number'},
		{campo:'descuentoPorcentaje', tipo:'number'},
		{campo:'descuentoMonto', tipo:'number'},
		{campo:'total', tipo:'number'},
		{campo:'retencionPorcentaje', tipo:'number'},
		{campo:'retencionMonto', tipo:'number'},
		{campo:'subtotalSobreventa', tipo:'number'},
		{campo:'costoCompra', tipo:'number'},
		{campo:'profit', tipo:'number'},
	];
	registro = await Validaciones.validParametros({body: parametros}, res,obligatorios,registro);
	if(!registro){
		return null;
	}
	return true
}



async function genNoOperacion(claveMarcaAgenteOficina,idRazonSocial, oficina, idMarca){
	var claveRazonSocial = undefined
	await oficina.razones_sociales.forEach((oficinaRazonSocial,index) => {
		if(oficinaRazonSocial.id_razon_social == idRazonSocial){
			claveRazonSocial = (index +1)
		}
	});
	var noOperacion = claveMarcaAgenteOficina + "-" + claveRazonSocial

	var whereFind = {
		where: {
			no_operacion: {[db.Sequelize.Op.like]: `%${noOperacion}%`},
			id_marca: idMarca
		},paranoid: false
	}
	const countOperaciones = await db.sequelize.models.servicios_ontrack.count(whereFind);
	noOperacion = noOperacion + "-" + (countOperaciones +1)
	return noOperacion
}

async function esPrimeraOperacion(claveMarcaAgenteOficina,idRazonSocial, oficina, idMarca){
	var claveRazonSocial = undefined
	await oficina.razones_sociales.forEach((oficinaRazonSocial,index) => {
		if(oficinaRazonSocial.id_razon_social == idRazonSocial){
			claveRazonSocial = (index +1)
		}
	});
	var noOperacion = claveMarcaAgenteOficina + "-" + claveRazonSocial

	var whereFind = {
		where: {
			no_operacion: {[db.Sequelize.Op.like]: `%${noOperacion}%`},
			id_marca: idMarca
		},paranoid: false
	}
	const countOperaciones = await db.sequelize.models.servicios_ontrack.count(whereFind);
	return countOperaciones == 0
}

async function getAgenteOperativo() {
	const usuariosOperadores = await db.sequelize.models.usuarios.findAll({
		include: [{
			model: db.sequelize.models.roles,
			as: 'listRoles', // Nombre del alias que utilizas en tu modelo
			through: {
				attributes: [] // No incluir atributos de la tabla intermedia
			},
			where: {
				id: 69
			},
			required: true // Esto asegura que solo se devuelvan usuarios que tengan el rol
		}]
	});
	const usuarios = []

	for(const usuario of usuariosOperadores){
		const element = usuario.toJSON()
		element.listRoles = undefined
		const macs = await db.sequelize.models.marca_agentes_clientes.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					id_agente_venta_1: usuario.id,
					id_agente_venta_2: usuario.id
				}
			}
		});
		const clientes = []
		for(const mac of macs){
			if(!clientes.includes(mac.id_cliente)){
				clientes.push(mac.id_cliente)
			}
		}
		if(clientes.length > 0){
			const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findAll({ 
				where: {id_cliente:{[db.Sequelize.Op.or]: clientes}}
			});
			const razonesSociales = []
			for(const clienteRS of clienteRazonSocial){
				if(!razonesSociales.includes(clienteRS.id_razon_social)){
					razonesSociales.push(clienteRS.id_razon_social)
				}
			}
			if(razonesSociales.length > 0){
				usuarios.push({
					idUsuario: element.id,
					saldoTotalFacturas: await getSaldoTotalFacturado(razonesSociales,element.email)
				})
			} else{
				usuarios.push({
					idUsuario: element.id,
					saldoTotalFacturas: 0
				})
			}
		} else{
			usuarios.push({
				idUsuario: element.id,
				saldoTotalFacturas: 0
			})
		}
	}
	const saldoMenor = Math.min(...usuarios.map(u => u.saldoTotalFacturas));
	const usuariosConMenorSaldo = usuarios.filter(u => u.saldoTotalFacturas === saldoMenor);
	return usuariosConMenorSaldo[0] !== undefined ? usuariosConMenorSaldo[0].idUsuario : null;
}

async function getSaldoTotalFacturado(idRazonesSociales) {
	try {
		const relacionesFn = ['clientes_razones_sociales.cliente.detalles_cliente.agente_credito_cobranza','nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio.estado.pais.continente', 'marca_preferente']
		const findRel = new Relaciones(relacionesFn,relacionesFn,db.sequelize.models)
		const relaciones = await findRel.getRelaciones()
		const filtro = {id:{[db.Sequelize.Op.or]: idRazonesSociales}}
		const docs = await db.sequelize.models.razones_sociales.findAll({
			include: relaciones,
			where: filtro
		})
		let sumatorio = 0
		for(const doc of docs){
			const credito = await getCredito(doc.id)
			sumatorio = sumatorio + credito
		}
		sumatorio = parseFloat(parseFloat(sumatorio).toFixed(2))
		return sumatorio
	} catch (error) {
		return 0
	}
	
}

async function getCredito(idRazonSocial){
    try {
        const razonSocial = await db.sequelize.models.razones_sociales.findByPk(idRazonSocial, {include:['moneda_credito'], paranoid: false });
		const listRel = [ 
			'factura_detalles.pedido_factura.certificado',
			'factura_detalles.producto.moneda_compra',
			'factura_detalles.producto.moneda_venta',
			'factura_detalles.producto.pais',
			'factura_detalles.producto.tipo_cobertura',
			'moneda'
		];
		const findRelacionesFacturas = new Relaciones(listRel,listRel,db.sequelize.models);
		const relacionesFacturas =  await findRelacionesFacturas.getRelaciones();
        const facturas = await db.sequelize.models.facturas.findAll({ where:{id_razon_social:idRazonSocial, id_marca: [17,26]},include:relacionesFacturas});
		if(razonSocial.moneda_credito === null || razonSocial.moneda_credito === undefined || razonSocial.moneda_credito === ''){
			razonSocial.moneda_credito = await db.sequelize.models.monedas.findOne({ where:{clave:"MXN"}});
		}
		let sumatorio = 0
        for(const factura of facturas){
            let fechaString = moment(factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD');
            let fechaBusqueda = moment(fechaString).tz('America/Mexico_City');
            let tipoCambio = 1;

            if(factura.moneda.clave.toUpperCase() != 'MXN'){
                let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
                if(doit !== true){
                    return doit
                }
                const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
                if(tipoCambioSelected != undefined){
                    tipoCambio = tipoCambioSelected.tipo_cambio
                }
            }
			let montoOriginal = 0
			for(const detalle of factura.factura_detalles){
				const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
				const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
				const impuesto = parseFloat(detalle.impuesto ?? 0)
				const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
				let subtotalFactura = (valorUnitario * cantidad )
				let descuentoFactura = descuentoGeneral
				let impuestoFactura = impuesto
				montoOriginal = parseFloat(montoOriginal) + (parseFloat(subtotalFactura) + parseFloat(impuestoFactura) - parseFloat(descuentoFactura))
			}
			montoOriginal = montoOriginal * tipoCambio
			sumatorio = sumatorio + montoOriginal
        }
		return  sumatorio
        
    } catch (error) {
		return 0
    }
}

async function envioNotificacionNuevoAgente(nuevoRegistro) {
	const fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	const cliente = await db.sequelize.models.clientes.findByPk(nuevoRegistro.id_cliente, {paranoid: false});
	const data = []
	if(nuevoRegistro.id_agente_operativo != null){
		const agente = await db.sequelize.models.usuarios.findByPk(nuevoRegistro.id_agente_operativo, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				idMarca:nuevoRegistro.id_marca,
				correo:agente.email
			}
			data.push(reg)
		}
	}
	for(const notificacion of data){
		sendNotificacion(notificacion)
	}
}

async function getInfoTablero(registro, perfil) {
	const dateList = registro.fecha_solicitud.split("-")
	const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
	const marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({
		where:{
			id_cliente: registro.id_cliente,
			id_marca: 2
		},
		include: ['agente_operativo' ]
	});
	const producto =  registro.servicios_ontrack_detalles[0].producto
	let profit = 0
	let subtotal = 0
	let descuento = 0
	let impuesto = 0
	let compraUSD = 0
	let compraMXN = 0
	let ventaUSD = 0
	let ventaMXN = 0
	for(const detalle of registro.servicios_ontrack_detalles){
		profit = profit + parseFloat(detalle.profit)
		subtotal = subtotal + parseFloat(detalle.subtotal)
		impuesto = impuesto + parseFloat(detalle.monto_iva)
		descuento = descuento + parseFloat(detalle.descuento_monto)
		compraUSD = compraUSD + parseFloat(detalle.costo_compra)
		compraMXN = compraMXN + parseFloat(detalle.costo_compra)
	}
	ventaUSD = parseFloat(((parseFloat(subtotal) + parseFloat(impuesto)) - parseFloat(descuento)).toFixed(2))
	ventaMXN = parseFloat(((parseFloat(subtotal) + parseFloat(impuesto)) - parseFloat(descuento)).toFixed(2))
	if(registro.moneda.clave == "MXN"){
		ventaUSD = parseFloat(parseFloat(ventaUSD / registro.tipo_cambio_futuro.tipo_cambio).toFixed(2))
	}else{
		ventaMXN = parseFloat(parseFloat(ventaMXN * registro.tipo_cambio_futuro.tipo_cambio).toFixed(2))
	}
	if(registro.moneda_compra.clave == "MXN"){
		profit = parseFloat(parseFloat(profit / registro.tipo_cambio_futuro.tipo_cambio).toFixed(2))
		compraUSD = parseFloat(parseFloat(compraUSD / registro.tipo_cambio_futuro.tipo_cambio).toFixed(2))
	}else{
		compraMXN = parseFloat(parseFloat(compraMXN * registro.tipo_cambio_futuro.tipo_cambio).toFixed(2))
	}
	subtotal = parseFloat(((parseFloat(subtotal) + parseFloat(impuesto)) - parseFloat(descuento)).toFixed(2))
	const diaSemana = moment(registro.createdAt).tz('America/Mexico_City').day()
	/*const docs = await db.sequelize.models.dias_inhabiles.findAll({
		where: {
			fecha: registro.fecha_solicitud
		}
	})*/
	const pedido_factura = await db.sequelize.models.pedidos_factura.findOne({
		where: {
			id_servicio_ontrack: registro.id
		}
	})
	let diasSinSerFacturado = 0
	let fechaFactura = "-"
	let folioFactura = "-"
	if(pedido_factura.estatus == "F"){
		const facturaDetalles = await db.sequelize.models.factura_detalles.findOne({
			where: {
				id_pedido_factura: pedido_factura.id
			}
		})
		const factura = await db.sequelize.models.facturas.findByPk(facturaDetalles.id_factura)
		diasSinSerFacturado = moment(factura.createdAt).diff(registro.createdAt, 'days');
		fechaFactura = moment(factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
		folioFactura = factura.folio
	}else{
		const now = moment().tz('America/Mexico_City')
		diasSinSerFacturado = now.diff(registro.createdAt, 'days');
	}
	const reg = {
		"ID": registro.id,
		"AÑO": dateList[0],
		"MES SERVICIO": meses[parseInt(dateList[1]) - 1].toUpperCase(),
		"DIRECCIÓN DE CORREO ELECTRÓNICO": registro.contacto !== null && registro.contacto !== undefined ? registro.contacto.email !== null && registro.contacto.email !== undefined ? registro.contacto.email : "" : "",
		"NOMBRE DEL SOLICITANTE": `${registro.contacto.nombre} ${registro.contacto.apellido_paterno}${registro.contacto.apellido_materno !== "" ? registro.contacto.apellido_materno : ""}`,
		"TELEFONO DEL SOLICITANTE": registro.contacto !== null && registro.contacto !== undefined ? registro.contacto.telefono !== null && registro.contacto.telefono !== undefined ? registro.contacto.telefono : "" : "",
		"NOMBRE DE LA EMPRESA SOLICITANTE PERSONA FÍSICA O PERSONA MORAL": registro.cliente !== null && registro.cliente !== undefined ? registro.cliente.nombre !== null && registro.cliente.nombre !== undefined ? registro.cliente.nombre : "" : "",
		"CLAVE DE CLIENTE": registro.cliente.id,
		"ST DE OPERACIÓN": registro.no_operacion !== null && registro.no_operacion !== undefined ? registro.no_operacion : "",
		"SERVICIO QUE DESEA CONTRATAR": producto.descripcion,
		"PROVEEDOR DE SERVICIO": registro.proveedor !== null && registro.proveedor !== undefined ? registro.proveedor.nombre : "",
		"EJECUTIVO OPERATIVO": marcaAgenteCliente.agente_operativo !== null ? marcaAgenteCliente.agente_operativo.nombre : "",
		"TEMPORALIDAD": registro.temporalidad !== null && registro.temporalidad !== undefined ? registro.temporalidad : "",
		"FECHA DE INICIO DE VIAJE": moment(registro.fecha_salida).tz('America/Mexico_City').format('YYYY-MM-DD'),
		"HORA DE INICIO DE VIAJE": moment(registro.fecha_salida).tz('America/Mexico_City').format("HH:mm:ss"),
		"FECHA ESTIMADA DE TÉRMINO DE VIAJE": moment(registro.fecha_llegada).tz('America/Mexico_City').format('YYYY-MM-DD'),
		"DIRECCIÓN DE ORIGEN": registro.ciudad_origen,
		"ESTADO ORIGEN": registro.estado_origen.descripcion,
		"PAIS ORIGEN": registro.estado_origen.pais.descripcion,
		"DIRECCIÓN DE DESTINO": registro.ciudad_destino,
		"ESTADO DESTINO": registro.estado_destino.descripcion,
		"PAIS DESTINO": registro.estado_destino.pais.descripcion,
		"NOMBRE DE LA LÍNEA DE TRANSPORTE Y/O EMPRESA DE LOGÍSTICA": registro.nombre_transportista !== null && registro.nombre_transportista !== undefined ? registro.nombre_transportista : "",
		"TELEFONO DEL CONTACTO DE LA LINEA TRANSPORTISTA QUE COORDINA EL EMBARQUE": registro.contactosTransportistas.length > 0 ? registro.contactosTransportistas[0].telefono_principal : "",
		"CORREO ELECTRÓNICO DEL CONTACTO DE LA LÍNEA TRANSPORTISTA QUE COORDINA EL EMBARQUE": registro.contactosTransportistas.length > 0 ? registro.contactosTransportistas[0].correo_electronico : "",
		"NOMBRE DEL CONTACTO DE LA LÍNEA TRANSPORTISTA QUE COORDINA EL EMBARQUE": registro.contactosTransportistas.length > 0 ? registro.contactosTransportistas[0].nombre_contacto : "",
		"CORREOS A LOS QUE SE ENVÍAN LAS NOTIFICACIONES": registro.correos !== null && registro.correos !== undefined ? registro.correos : "",
		"COMENTARIOS": registro.comentarios !== null && registro.comentarios !== undefined ? registro.comentarios : "",
		"COMPAÑÍA CONTRATADA PARA LA PÓLIZA DE SEGURO": registro.certificado !== null ? registro.certificado.detalle.atributo.proveedor.nombre : "",
		"NÚMERO DE OPERACIÓN / PÓLIZA DE SEGURO": registro.certificado !== null ? registro.certificado.no_operacion : "",
		"SERVICIOS OTORGADOS POR CORTESÍA // TARIFA PREFERENCIAL POR PARTE DE CARGA": parseFloat(registro.servicios_ontrack_detalles[0].descuento_monto) > 0 ? "Si" : "No",
		"FECHA DE SOLICITUD DE SERVICIO": registro.fecha_solicitud,
		"DÍAS NATURALES SIN SER FACTURADO UN SERVICIO": diasSinSerFacturado,
		"FECHA FACTURA DE VENTA CLIENTE": fechaFactura,
		"FOLIO FACTURA DE VENTA CLIENTE": folioFactura,
		"TIPO DE MONEDA": registro.moneda.descripcion,
		"FECHA ORDEN DE COMPRA PROVEEDOR": registro.ordenCompra !== null && registro.ordenCompra !== undefined ? moment(registro.ordenCompra.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD') : "",
		"FOLIO ORDEN DE COMPRA PROVEEDOR": registro.ordenCompra !== null && registro.ordenCompra !== undefined ? registro.ordenCompra.folio: "",
		"FOLIO FACTURA DE PROVEEDOR INTERNO": registro.facturaProveedor !== null && registro.facturaProveedor !== undefined ? registro.facturaProveedor.folio: "",
		"TOTAL DE COMPRA EN USD ANTES DE IVA": compraUSD,
		"TOTAL DE COMPRA EN MX": compraMXN,
		//"FOLIO FACTURA DE PROVEEDOR": "",
		"TOTAL DE VENTA EN USD": ventaUSD,
		"TOTAL DE VENTA MX": ventaMXN,
		"TIPO DE CAMBIO AL DÍA DEL SERVICIO": registro.tipo_cambio_futuro.tipo_cambio,
		"PROFIT EN USD": profit,
		"FACTURACIÓN REAL": subtotal,
		"ESTATUS DEL SERVICIO": registro.estatus_ontrack.descripcion,
		//"ATENCIÓN DE SERVICIO EN HORARIO INHÁBIL": docs.length > 0 ? "Si" : "No",
		"ATENCIÓN DE SERVICIO EN FIN DE SEMANA": diaSemana == 0 || diaSemana == 6 ? "Si" : "No",
		"CREADO POR": registro.usuario_registro.nombre,
		"OBSERVACIONES": registro.comentarios !== null && registro.comentarios !== undefined ? registro.comentarios : "",
	}
	if(perfil != "exportacion"){
		reg.detalles = registro.servicios_ontrack_detalles
	}
	return reg
}

async function exportacion(req, res) {
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.servicios_ontrack.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	
	const filtro = await getFiltro(req.query,db.sequelize.models.servicios_ontrack);
	try {
		req.query.perfil = 'tablero'
		const perfilesValidos = [ "certificado", "cliente", "oficina_razon_social", "marca", "tipo_cambio", "proveedor", "estado_origen", "estado_destino", "contacto", "estatus_ontrack", 'tablero', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				certificado: [ 'certificado' ],
				cliente: [ 'cliente.detalles_cliente' ],
				oficina_razon_social: [ 'oficina_razon_social.oficina','oficina_razon_social.razon_social' ],
				marca: [ 'marca' ],
				tipo_cambio: [ 'tipo_cambio_futuro' ],
				proveedor: [ 'proveedor' ],
				estado_origen: [ 'estado_origen.pais' ],
				estado_destino: [ 'estado_destino.pais' ],
				contacto: [ 'contacto' ],
				estatus_ontrack: [ 'estatus_ontrack' ],
				moneda: ['moneda'],
				moneda_compra: ['moneda_compra'],
				tablero: [ 'certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina','oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack', 'moneda', 'moneda_compra' ],
				all: [ 'certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina','oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack', 'moneda', 'moneda_compra' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.servicios_ontrack.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
		});
		
		if(docs.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const data = []
		for(const doc of docs){
			let element = doc.toJSON()
			const fechaFull = moment(element.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
			element.fecha_solicitud = fechaFull.split(" ")[0]
			element.hora_solicitud = fechaFull.split(" ")[1]
			if(req.query.perfil == "all" || req.query.perfil == "tablero"){
				const _filtro = { id_servicio_ontrack: element.id }
				const contactosTransportistas = await db.sequelize.models.contactos_transportistas.findAll({
					where: _filtro
				})
				element.contactosTransportistas = contactosTransportistas
				const perfilesValidos = [ 'estatus_ontrack' ]
				const findRelaciones = new Relaciones(perfilesValidos,perfilesValidos,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				const seguimiento_estatus = await db.sequelize.models.seguimiento_estatus_ontrack.findAll({
					where: _filtro,
					include: relaciones,
					order: [['createdAt', 'DESC']],
				})
				element.seguimiento_estatus = []
				for(const seguimientoEstatus of seguimiento_estatus){
					element.seguimiento_estatus.push(seguimientoEstatus.estatus_ontrack)
				}
				const perfilesValidosDetalles = [ 'producto','atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta']
				const findRelacionesDetalles = new Relaciones(perfilesValidosDetalles,perfilesValidosDetalles,db.sequelize.models)
				const relacionesDetalles = await findRelacionesDetalles.getRelaciones()
				const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: element.id},include: relacionesDetalles,})
				element.servicios_ontrack_detalles = detalles
				if(element.id_certificado !== null && element.id_certificado !== undefined && element.id_certificado !== ""){
					const parametrosDetalles = [ 'atributo.oficina_producto','atributo.proveedor' ]
					const findRelacionesDetCert = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
					const relacionesDetCert = await findRelacionesDetCert.getRelaciones()
					let det_cer = await db.sequelize.models.detalle_certificados.findOne({
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:element.id_certificado,
							},
						},
						include: relacionesDetCert
					})
					element.certificado.detalle = det_cer
				}
				element.pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({
					where: {
						id_servicio_ontrack: element.id
					}
				})
				element.factura = null
				element.ordenCompra = null
				element.facturaProveedor = null
				if(element.pedidoFactura.estatus == "F"){
					const facturaDetalles = await db.sequelize.models.factura_detalles.findOne({
						where: {
							id_pedido_factura: element.pedidoFactura.id
						}
					})
					const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
					const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
					element.factura = await db.sequelize.models.facturas.findByPk(facturaDetalles.id_factura, { include:relacionesFacturas})
					const ocFactura = await db.sequelize.models.oc_facturas.findOne({
						where: {
							id_factura: element.factura.id
						}
					})
					if(ocFactura !== null){
						const listRelOC = [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
						const findRelacionesOC = new Relaciones(listRelOC,listRelOC,db.sequelize.models)
						const relacionesOC = await findRelacionesOC.getRelaciones()
						element.ordenCompra = await db.sequelize.models.ordenes_compra.findByPk(ocFactura.id_orden_compra, { include:relacionesOC})
						const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'factura_proveedor.usuario_registro', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
						const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
						const relDetalles = await findRelaciones.getRelaciones()
						const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.ordenCompra.id},include: relDetalles})
						element.ordenCompra = element.ordenCompra.toJSON()
						element.ordenCompra.detalles = []
						for(const detalle of detalles){
							const det = detalle.toJSON()
							if(element.facturaProveedor === null){
								element.facturaProveedor = det.factura_proveedor
							}
							det.factura_proveedor = undefined
							element.ordenCompra.detalles.push(det)
						}
					}
				}
			} 
			if(req.query.perfil == "tablero"){
				element = await getInfoTablero(element,"exportacion")
			}
			data.push(element)
		}


        const nombreReporte = `${ManipuladorCadenas.toTitle(db.sequelize.models.servicios_ontrack.name.replace(/_/g, ' ')).replace(/ /g, '')}_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [ManipuladorCadenas.toTitle(db.sequelize.models.servicios_ontrack.name.replace(/_/g, ' '))]
        const reporteCertificados = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:data,
            namesSheets:namesSheets, 
            idMarca: null,
			carpeta: db.sequelize.models.servicios_ontrack.name
        })

        return await reporteCertificados.gerReporteOneSheet(res,req);
	} catch (error) {
		console.log('Ha ocurrido un error exportando la información');
		console.log(error);
		return;
	}
	
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	getOficinaProductosOnTrack,
	canContratarSOT,
	exportacion
}
