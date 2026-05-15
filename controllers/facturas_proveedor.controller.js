'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { storeFPD, updateFPD, updateFPDEX } = require('./facturas_proveedor_detalles.controller');
const { sendMailFacturaProveedor } = require('./facturas_proveedor_mails.controllers')
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');



async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.facturas_proveedor.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	let visualizarTodas = req.usuario.id == 1
	const rolesPermitidos = [12,90]
	const relacionesUsuario = [{
		model: db.sequelize.models.roles,
		as: 'listRoles',
		through: {
			attributes: []
		},
	}]
	const usuarioConsulta = await db.sequelize.models.usuarios.findByPk(req.usuario.id,{ include: relacionesUsuario,paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
	for(const role of usuarioConsulta.listRoles){
		if(!visualizarTodas){
			visualizarTodas = rolesPermitidos.includes(role.id)
		}
		
	}
	try {
		const perfilesValidos = ['marca', 'proveedor', 'moneda', 'usuario_solicita', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				moneda: [ 'moneda' ],
				usuario_solicita: ['usuario_solicita'],
				all: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		if(!visualizarTodas){
			filtro.id_usuario_registro = req.usuario.id
		}
		const docs = await db.sequelize.models.facturas_proveedor.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.facturas_proveedor.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/facturasProveedor`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.facturas_proveedor_archivos.findAll({where:{id_factura_proveedor:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_factura_proveedor_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_factura_proveedor = undefined
                    data.id_usuario_registro = undefined
                    data.createdAt = undefined
                    data.updatedAt = undefined
                    data.deletedAt = undefined
					element.archivos.push(data)
				}
				const relacionesDetalles = [  'orden_compra.marca', 'orden_compra.proveedor', 'orden_compra.moneda', 'orden_compra.usuario_solicita', 'concepto_presupuesto', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura', 'producto.producto_unidad_medida' ]
				const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
				const relDetalles = await findRelaciones.getRelaciones()
				const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor:element.id},include: relDetalles})
				element.detalles_factura = []
				for(const detalle of detalles){
					element.detalles_factura.push(detalle)
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
		const detalles = parametros.detalles ?? []
		if(detalles.length < 1 && Array.isArray(detalles)){
			res.status(400).send({status:false , msg: `El parametro detalles no debe estar vacío.` });
			return false
		} 
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		parametros.estatus = 'A'
		let obligatorios = [{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
							{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
							{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
							{campo:'idUsuarioSolicita', tipo:'model', model:db.sequelize.models.usuarios},
							{campo:'fechaOriginal', tipo:'stringDate'},
							{campo:'estatus', tipo:'enum', largo:1, textoCase:"up", enum: ['A', 'B']}
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
        const validosOpcionales = [{campo:'comentarios', tipo:'string', largo:600},{campo:'referencia', tipo:'string', textoCase:"up", largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		for(const detalle of detalles){
			if(detalle.cantidad !== undefined){
				var regVal = {
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				}
				parametros.impuestoAdicional = parametros.impuestoAdicional === undefined || parametros.impuestoAdicional === null ? 0.0 : parametros.impuestoAdicional
				parametros.descuentos = parametros.descuentos === undefined || parametros.descuentos === null ? 0.0 : parametros.descuentos
				let obligatorios = [{campo:'idConceptoPresupuesto', tipo:'model', model:db.sequelize.models.conceptos_presupuesto},
									{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
									{campo:'precioUnitario', tipo:'number'},
									{campo:'cantidad', tipo:'number'},
									{campo:'haveImpuesto', tipo:'boolean'},
									{campo:'descuentos', tipo:'number'},
									{campo:'impuestoAdicional', tipo:'number'},
				]
				regVal = await Validaciones.validParametros({body:detalle}, res,obligatorios,regVal);
				if(!regVal){
					return false;
				}
			}else{
				const detalleData = await db.sequelize.models.facturas_proveedor_detalles.findByPk(detalle, { include:['orden_compra'],paranoid: false })
				if(detalleData == null){
					return res.status(400).send({ status: false, msg: "Registro no existe", detalle:detalle });
				}
				if(detalleData.deletedAt != null){
					return res.status(400).send({ status: false, msg: "Registro eliminado", detalle:detalle });
				}
				if(detalleData.id_factura_proveedor !== null){
					return res.status(400).send({ status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:detalle });
				}
				if(detalleData.orden_compra.id_proveedor != parametros.idProveedor){
					return res.status(400).send({ status: false, msg: "El detalle debe tener asignado el proveedor con id: " + parametros.idProveedor, detalle:detalle });
				}
			}
		}
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca)
		const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['nacionalidad_timbrado'],paranoid: false });
		registro = dataValidarOpcionales[0]
		registro.subtotal = 0
		registro.descuento = 0
		registro.impuesto = 0
        for(const detalleId of detalles){
			if(detalleId.cantidad !== undefined){
				let registroDetalle = {}
				let obligatoriosDetalle = [{campo:'cantidad', tipo:'number'},
										   {campo:'precioUnitario', tipo:'number'},
										   {campo:'haveImpuesto', tipo:'boolean'},
										   {campo:'descuentos', tipo:'number'},
										   {campo:'impuestoAdicional', tipo:'number'},
				]
				registroDetalle = await Validaciones.validParametros({body:detalleId}, res,obligatoriosDetalle,registroDetalle);
				if(!registroDetalle){
					return undefined;
				}
				registroDetalle.subtotal = convert((parseInt(detalleId.cantidad ?? 0) * parseFloat(detalleId.precioUnitario ?? 0)), 1, 6) 
				if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalleId.haveImpuesto === true){
					detalleId.impuestos = convert((registroDetalle.subtotal - (detalleId.descuentos)) * 0.16, 1, 6) 
				}
				let impuestoAdicionalPorcentaje = parseFloat(detalleId.impuestoAdicional) / 100;
				let impuestoAdicional = convert((registroDetalle.subtotal - (detalleId.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);
				registro.subtotal =  convert((registro.subtotal  + registroDetalle.subtotal), 1, 6) 
				registro.descuento = convert((registro.descuento  + parseFloat(detalleId.descuentos ?? 0)), 1, 6) 
				registro.impuesto = convert((registro.impuesto  + (parseFloat(detalleId.impuestos ?? 0) + impuestoAdicional)), 1, 6) 
			}else{
				const detalle = await db.sequelize.models.facturas_proveedor_detalles.findByPk(detalleId, { include:['orden_compra'],paranoid: false })
				if(detalle == null){
					return res.status(400).send({ status: false, msg: "Registro no existe", detalle:detalleId });
				}
				if(detalle.deletedAt != null){
					return res.status(400).send({ status: false, msg: "Registro eliminado", detalle:detalleId });
				}
				if(detalle.id_factura_proveedor !== null){
					return res.status(400).send({ status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:detalleId });
				}
				if(detalle.orden_compra.id_proveedor != parametros.idProveedor){
					return res.status(400).send({ status: false, msg: "El detalle debe tener asignado el proveedor con id: " + parametros.idProveedor, detalle:detalleId });
				}
				let impuestoAdicionalPorcentaje = parseFloat(detalle.impuesto_adicional) / 100;
				let impuestoAdicional = convert((detalle.subtotal - (detalle.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);

				registro.subtotal =  convert((registro.subtotal  +  parseFloat(detalle.subtotal ?? 0)), 1, 6) 
				registro.descuento = convert((registro.descuento  + parseFloat(detalle.descuentos ?? 0)), 1, 6) 
				registro.impuesto = convert((registro.impuesto  + (parseFloat(detalle.impuestos ?? 0) + impuestoAdicional)), 1, 6)
			}

        }
		const registrosEncontrados = await db.sequelize.models.facturas_proveedor.findAll({
			where: {
				id_marca: parametros.idMarca
			}
		});
		registro.folio = marca.clave + "-" + (registrosEncontrados.length + 1)
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.facturas_proveedor.create(registro);
		const proveedor = await db.sequelize.models.proveedores.findByPk(parametros.idProveedor)
		let fechaVencimiento = moment().tz('America/Mexico_City');
        fechaVencimiento = fechaVencimiento.add(proveedor.dias_credito, 'days');
		const registroCxP = {
			id_factura_proveedor: nuevoRegistro.id,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City'),
			fecha_vencimiento: fechaVencimiento,
			saldo: convert((registro.subtotal  - registro.descuento  + registro.impuesto), 1, 6),
			id_usuario_registro: req.usuario.id
		}
		await db.sequelize.models.cuentas_por_pagar.create(registroCxP);
		for(const detalle of detalles){
			if(detalle.cantidad !== undefined){
				detalle.idFacturaProveedor = nuevoRegistro.id
				detalle.subtotal = convert((parseInt(detalle.cantidad ?? 0) * parseFloat(detalle.precioUnitario ?? 0)), 1, 6) 
				if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalle.haveImpuesto === true){
					detalle.impuestos = convert((detalle.subtotal - detalle.descuentos) * 0.16, 1, 6)
				}else{
					detalle.impuestos = 0
				}
				const respuestaFPD = await storeFPD(detalle, res,req.usuario)
				if(respuestaFPD !== true){
					return undefined
				}
			}else{
				const respuestaFPD = await updateFPD(detalle, nuevoRegistro.id)
				if(respuestaFPD !== true){
					return undefined
				}
			}
        }
		// const permisosId = await db.sequelize.models.permisos.findOne({where:{name:'MAIL_FACTURA_PROVEEDOR', tipo:'L'}})
		// const rolesPermisos = await db.sequelize.models.permisos_roles.findAll({where:{id_permiso: permisosId.id}})
		// const idsRoles = []
		// for(const rolId of rolesPermisos){
		// 	idsRoles.push(rolId.id_role)
		// }
		// const rolesUsuarios = await db.sequelize.models.roles_usuarios.findAll({where:{id_role: {[db.Sequelize.Op.or]: idsRoles}}, include:['usuario']})
		
		//usuarios con rol de tesoreria 
		const usrTesoreria = await db.sequelize.models.roles_usuarios.findAll({
			where:{
				id_role: 12,
				deletedAt: null
			},
			include:['usuario']
		});

		const listaCorreos = []
		for(const usr of usrTesoreria){
			listaCorreos.push(usr.usuario.email);
		}
		if(listaCorreos.length > 0){
			sendMailFacturaProveedor(nuevoRegistro.id, req.usuario, listaCorreos)
		}
		
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
		const perfilesValidos = ['marca', 'proveedor', 'moneda', 'usuario_solicita', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				moneda: [ 'moneda' ],
				usuario_solicita: ['usuario_solicita'],
				all: [  'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.facturas_proveedor.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.facturas_proveedor_archivos.findAll({where:{id_factura_proveedor:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_factura_proveedor_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_factura_proveedor = undefined
                    data.id_usuario_registro = undefined
                    data.createdAt = undefined
                    data.updatedAt = undefined
                    data.deletedAt = undefined
					element.archivos.push(data)
				}
				const relacionesDetalles = [  'orden_compra.marca', 'orden_compra.proveedor', 'orden_compra.moneda', 'orden_compra.usuario_solicita', 'concepto_presupuesto', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ,'producto.producto_unidad_medida']
				const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
				const relDetalles = await findRelaciones.getRelaciones()
				const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor:element.id},include: relDetalles})
				element.detalles_factura = []
				for(const detalle of detalles){
					element.detalles_factura.push(detalle)
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
		const detalles = parametros.detalles ?? []
		if(detalles !== undefined){
			if(!Array.isArray(detalles)){
				res.status(400).send({status:false , msg: `El parametro detalles debe ser una lista.` });
				return false
			} 
		}
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
		const validosOpcionales = [{campo:'referencia', tipo:'string', textoCase:"up", largo:255},
                                  {campo:'comentarios', tipo:'string', largo:600},
								  {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
								  {campo:'idUsuarioSolicita', tipo:'model', model:db.sequelize.models.usuarios},
								  {campo:'fechaOriginal', tipo:'stringDate'},
								  {campo:'estatus', tipo:'enum', largo:1, textoCase:"up", enum: ['A', 'B']},
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		for(const detalle of detalles){
			if(detalle.cantidad !== undefined){
				var regVal = {
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				}
				parametros.impuestoAdicional = parametros.impuestoAdicional === undefined || parametros.impuestoAdicional === null ? 0.0 : parametros.impuestoAdicional
				parametros.descuentos = parametros.descuentos === undefined || parametros.descuentos === null ? 0.0 : parametros.descuentos
				parametros.id = parametros.id === undefined || parametros.id === null ? null : parametros.id
				let obligatorios = [{campo:'idConceptoPresupuesto', tipo:'model', model:db.sequelize.models.conceptos_presupuesto},
									{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
									{campo:'precioUnitario', tipo:'number'},
									{campo:'cantidad', tipo:'number'},
									{campo:'haveImpuesto', tipo:'boolean'},
									{campo:'descuentos', tipo:'number'},
									{campo:'impuestoAdicional', tipo:'number'},
									
				]
				regVal = await Validaciones.validParametros({body:detalle}, res,obligatorios,regVal);
				if(!regVal){
					return false;
				}
				const validosOpcionales = [{campo:'id', tipo:'model', model:db.sequelize.models.factura_detalles},]

				regVal = await Validaciones.validParametrosOpcionales(regVal,false,validosOpcionales,parametros,res)
				if(dataValidarOpcionales == undefined){
				return undefined;
				}
				regVal = dataValidarOpcionales[0]
			
			}else{
				const detalleData = await db.sequelize.models.facturas_proveedor_detalles.findByPk(detalle, { include:['orden_compra'],paranoid: false })
				if(detalleData == null){
					return res.status(400).send({ status: false, msg: "Registro no existe", detalle:detalle });
				}
				if(detalleData.deletedAt != null){
					return res.status(400).send({ status: false, msg: "Registro eliminado", detalle:detalle });
				}

				if(detalleData.id_factura_proveedor !== null && detalleData.id_factura_proveedor !== parseInt(id)){
					return res.status(400).send({ status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:detalle });
				}

				if(detalleData.orden_compra.id_proveedor != parametros.idProveedor){
					return res.status(400).send({ status: false, msg: "El detalle debe tener asignado el proveedor con id: " + parametros.idProveedor, detalle:detalle });
				}
			}
		}

		const registroAEditar = await db.sequelize.models.facturas_proveedor.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const marca = await db.sequelize.models.marcas.findByPk(registroAEditar.id_marca)
		const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['nacionalidad_timbrado'],paranoid: false });
		const cxp = await db.sequelize.models.cuentas_por_pagar.findOne({where:{id_factura_proveedor: id}});
		const pagosFacturacion = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar: cxp.id}});  
		if(pagosFacturacion.length > 0){
			return res.status(400).send({ status: false, msg: "No se puede editar, puesto que la cuenta por pagar ligada a la factura tiene pagos registrados." });
		}
		if(detalles.length > 0){
			seEdita = true
			const registrosEliminar = [];
			const detallesToDelete = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor:id}})
			const detallesOrdenEliminar= detallesToDelete.filter(registro => registro.id_orden_compra !== null);
			const detallesEliminar = detallesToDelete.filter(registro => registro.id_orden_compra === null);

			for (const dato of detallesOrdenEliminar) {
				const existe = detalles.some(item => item === dato.id);
				if (!existe) {
					registrosEliminar.push(dato);
				}
			}
			for (const dato_registrado of detallesEliminar) {
				// Si no hay ningún registro en los detalles que coincida con el id de detallesEliminar, se agrega para eliminar
				const existe = detalles.some(detalle => detalle.id === dato_registrado.id);
				if (!existe) {
					registrosEliminar.push(dato_registrado);
				}
			}

			if(registrosEliminar.length > 0){
				for(const datoEliminar of registrosEliminar){
					const respuestaFPD = await updateFPD(datoEliminar.id, null);
					if(respuestaFPD !== true){
						return res.status(400).send(respuestaFPD);
					}
				}
			}

			datosUpdate.subtotal = 0
			datosUpdate.descuento = 0
			datosUpdate.impuesto = 0

			for(const detalleId of detalles){
				if(detalleId.cantidad !== undefined){	
					let registroDetalle = {}
					let obligatoriosDetalle = [{campo:'cantidad', tipo:'number'},
											{campo:'precioUnitario', tipo:'number'},
											{campo:'haveImpuesto', tipo:'boolean'},
											{campo:'descuentos', tipo:'number'},
											{campo:'impuestoAdicional', tipo:'number'},
					]
					registroDetalle = await Validaciones.validParametros({body:detalleId}, res,obligatoriosDetalle,registroDetalle);
					if(!registroDetalle){
						return undefined;
					}
					registroDetalle.subtotal = convert((parseInt(detalleId.cantidad ?? 0) * parseFloat(detalleId.precioUnitario ?? 0)), 1, 6) 
					if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalleId.haveImpuesto === true){
						detalleId.impuestos = convert((registroDetalle.subtotal - (detalleId.descuentos)) * 0.16, 1, 6) 
					}
					let impuestoAdicionalPorcentaje = parseFloat(detalleId.impuestoAdicional) / 100;
					let impuestoAdicional = convert((registroDetalle.subtotal - (detalleId.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);
					datosUpdate.subtotal =  convert((datosUpdate.subtotal  + registroDetalle.subtotal), 1, 6) 
					datosUpdate.descuento = convert((datosUpdate.descuento  + parseFloat(detalleId.descuentos ?? 0)), 1, 6) 
					datosUpdate.impuesto = convert((datosUpdate.impuesto  + (parseFloat(detalleId.impuestos ?? 0) + impuestoAdicional)), 1, 6) 
					
				}else{
					const detalle = await db.sequelize.models.facturas_proveedor_detalles.findByPk(detalleId)
				
					if(detalle == null){
						return res.status(400).send({ status: false, msg: "Registro no existe", detalle:detalleId });
					}
					if(detalle.deletedAt != null){
						return res.status(400).send({ status: false, msg: "Registro eliminado", detalle:detalle });
					}
					if(detalle.id_factura_proveedor !== null && detalle.id_factura_proveedor != parseInt(id)){
						return res.status(400).send({ status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:detalle });
					}let impuestoAdicionalPorcentaje = parseFloat(detalle.impuesto_adicional) / 100;
					let impuestoAdicional = convert((detalle.subtotal - (detalle.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);
					datosUpdate.subtotal =  convert((datosUpdate.subtotal  + parseFloat(detalle.subtotal ?? 0)), 1, 6) 
					datosUpdate.descuento = convert((datosUpdate.descuento  + parseFloat(detalle.descuentos ?? 0)), 1, 6) 
					datosUpdate.impuesto = convert((datosUpdate.impuesto  + (parseFloat(detalle.impuestos ?? 0) + impuestoAdicional)), 1, 6)

				} 
			}
		
			const registroCxP = {
				updatedAt: moment().tz('America/Mexico_City'),
				saldo: convert((datosUpdate.subtotal  - datosUpdate.descuento  + datosUpdate.impuesto), 1, 6),
			}
			
			await cxp.update(registroCxP, { where: { id: cxp.id } });
			for(const detalle of detalles){
				if(detalle.cantidad !== undefined){
					detalle.idFacturaProveedor = id
					detalle.subtotal = convert((parseInt(detalle.cantidad ?? 0) * parseFloat(detalle.precioUnitario ?? 0)), 1, 6) 
					if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalle.haveImpuesto === true){
						detalle.impuestos = convert((detalle.subtotal - detalle.descuentos) * 0.16, 1, 6)  
					}else{
						detalle.impuestos = 0
					}
					if(detalle.id !== undefined){
						const respuestaFPD = await updateFPDEX(detalle)
						if(respuestaFPD !== true){
							return res.status(400).send(respuestaFPD);
						}
					}else{
						const respuestaFPD = await storeFPD(detalle, res,req.usuario)
						if(respuestaFPD !== true){
							return undefined
						}
					}
				}else{
					const respuestaFPD = await updateFPD(detalle, id)
					if(respuestaFPD !== true){
						return res.status(400).send(respuestaFPD);
					}
				}
			}
		}
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
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
		const registroAEliminar = await db.sequelize.models.facturas_proveedor.findByPk(id);
		if(registroAEliminar != null){
			const detallesToDelete = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor:id}})
			for(const detalleToDelete of detallesToDelete){
				const respuestaFPD = await updateFPD(detalleToDelete.id, null)
				if(respuestaFPD !== true){
					return res.status(400).send(respuestaFPD);
				}
			}
			const archivos = await db.sequelize.models.facturas_proveedor_archivos.findAll({where: {id_factura_proveedor:id}});
			for(const archivo of archivos){
				await archivo.destroy({ where: { id: archivo.id } })
			}
			const cxp = await db.sequelize.models.cuentas_por_pagar.findOne({where:{id_factura_proveedor: id}});
			const pagosFacturacion = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar: cxp.id}});  
			if(pagosFacturacion.length > 0){
				return res.status(400).send({ status: false, msg: "No se puede eliminar, puesto que la cuenta por pagar ligada a la factura tiene pagos registrados." });
			}
			await cxp.destroy({ where: { id: cxp.id } })
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.facturas_proveedor.name){
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
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			await registroAEliminar.destroy({ where: { id: id } })
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

function convert(cantidad, tipoCambio, decimales){
	return parseFloat((parseFloat(cantidad / tipoCambio)).toFixed(decimales))	
}

async function cargarArchivo(req, res){
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		}
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idCargaArchivo', tipo:'model',canNull: true, model:db.sequelize.models.carga_archivos}]

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const registrosEncontrados = await db.sequelize.models.facturas_proveedor_archivos.findAll({
			where: {
				id_factura_proveedor: id,
				id_carga_archivo: parametros.idCargaArchivo,
				deletedAt: null
			}
		});
		registro.id_factura_proveedor = id
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_factura_proveedor == id && 
				   registro.id_carga_archivo == parametros.idCargaArchivo){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.facturas_proveedor_archivos.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function eliminarArchivo(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	try {
		const registroAEliminar = await db.sequelize.models.facturas_proveedor_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.facturas_proveedor_archivos.name){
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
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			await registroAEliminar.destroy({ where: { id: id } })
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
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
    const camposModelo = Object.keys(db.sequelize.models.facturas_proveedor.rawAttributes);
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
					'proveedor.moneda',
					'proveedor.conceptos_presupuesto',
					'proveedor.marca.domicilio.estado.pais.continente',
					'proveedor.marca.pais.continente',
					'proveedor.marca.archivo',
					'proveedor.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.marca.dato_facturacion.pais.continente', 
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'proveedor.proveedor_tipo',
					'moneda',
					'usuario_solicita',
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal', 
                    'marca.dato_facturacion.pais.continente', 
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',   
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
            relaciones = await findRelaciones.getRelaciones();
        }
		
        const docs = await db.sequelize.models.facturas_proveedor.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        });

		const data = [];
        for(const doc of docs){
            const element = doc.toJSON();
            if(req.query.perfil == 'all'){
				const listRel = [
					'orden_compra.marca',
					'orden_compra.proveedor',
					'orden_compra.moneda',
					'orden_compra.usuario_solicita',
					'concepto_presupuesto',
					'producto.marca',
					'producto.moneda_compra',
					'producto.moneda_venta',
					'producto.pais.continente',
					'producto.tipo_cobertura',
                    'producto.archivo'
                ]
                const findRelacionesFacDet = new Relaciones(listRel,listRel,db.sequelize.models);
                const relacionesFacDet =  await findRelacionesFacDet.getRelaciones();
                element.factura_detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor: element.id}, include:relacionesFacDet})
				const listRelPagos = [ 
					'pagos_proveedor.pago_proveedor.cuenta_bancaria_interna.moneda',
					'pagos_proveedor.pago_proveedor.cuenta_bancaria_interna.entidad_bancaria',
					'pagos_proveedor.pago_proveedor.cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'pagos_proveedor.pago_proveedor.cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'pagos_proveedor.pago_proveedor.cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
				 ]
				const findRelacionesPagos = new Relaciones(listRelPagos,listRelPagos,db.sequelize.models);
				const relacionesPagos =  await findRelacionesPagos.getRelaciones();

                const cxcAux = await db.sequelize.models.cuentas_por_pagar.findOne({where:{id_factura_proveedor:element.id}});
                element.cxc = null;
                element.factura_pagada = false;
                if(cxcAux !== null){
                    const cxc = await db.sequelize.models.cuentas_por_pagar.findByPk(cxcAux.id,{ include:relacionesPagos});
                    element.cxc = cxc;
                    element.factura_pagada = parseFloat(cxc.saldo) == 0;
                }
            }
            data.push(element)
        }

        const elementos = []
        let idMarca
        for(const element of data){
            if(idMarca === undefined){
                idMarca = element.id_marca
            }

			// Válida que se tenga toda la información necesaria
			if(element.marca == null || element.impuesto == null || element.factura_detalles.length < 1 || element.folio == null || 
				element.fecha_original == null || element.proveedor == null || element.cxc == null){
				continue;
			}

            var subtotalFactura = 0
            var impuestoFactura = parseFloat(element.impuesto);
            var descuentoFactura = 0
            for(const detalle of element.factura_detalles){
                const valorUnitario = parseFloat(detalle.precio_unitario);
                const descuentoGeneral = parseFloat(detalle.descuentos);
                const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1);
                subtotalFactura = subtotalFactura + (valorUnitario * cantidad );
                descuentoFactura = descuentoFactura + descuentoGeneral;
            }

            const totalFactura = (subtotalFactura - descuentoFactura + impuestoFactura).toFixed(2);
            
			elementos.push({
				'Folio': element.folio,
				'Fecha': moment(element.fecha_original).tz('America/Mexico_City').format('YYYY-MM-DD'),
				'Proveedor': element.proveedor.nombre,
				'Persona que Solicita': element.usuario_solicita != null ? element.usuario_solicita.nombre : '',
				'Marca': element.marca.nombre,
				'Factura Pagada': element.factura_pagada ?? false ? 'Si' : 'No',
				'Referencia': element.referencia != null ? element.referencia : '',
				'IVA': ManipuladorCadenas.formatMoney(impuestoFactura.toFixed(2)),
				'Importe': ManipuladorCadenas.formatMoney(totalFactura),
				'Moneda': element.moneda != null ? element.moneda.clave : '',
				'Saldado': ManipuladorCadenas.formatMoney(totalFactura - element.cxc.saldo),
			});
        }

		if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
        
        const nombreReporte = `facturas_proveedor_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.facturas_proveedor.name];
        const reporteFacturasProveedor = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        });
        return await reporteFacturasProveedor.gerReporteOneSheet(res,req);
    } catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
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






module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	cargarArchivo,
	eliminarArchivo,
	exportacion
}
