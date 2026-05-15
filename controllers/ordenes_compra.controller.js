'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { storeFPD, destroyFPD, updateFPDEX } = require('./facturas_proveedor_detalles.controller');
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
	const camposModelo = Object.keys(db.sequelize.models.ordenes_compra.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

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

		const docs = await db.sequelize.models.ordenes_compra.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.ordenes_compra.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/ordenesCompra`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.ordenes_compra_archivos.findAll({where:{id_orden_compra:element.id}, include:['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const elementArchivo = archivo.archivo.toJSON()
					elementArchivo.id_orden_compra_archivo = archivo.id
					element.archivos.push(elementArchivo)
				}
				const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
				const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
				const relDetalles = await findRelaciones.getRelaciones()
				const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.id},include: relDetalles})
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
		let obligatorios = [{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
							{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
							{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
							{campo:'idUsuarioSolicita', tipo:'model', model:db.sequelize.models.usuarios},
							{campo:'referencia', tipo:'string', textoCase:"up", largo:255}
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
        const validosOpcionales = [{campo:'comentarios', tipo:'string', largo:600}
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca)
		const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['nacionalidad_timbrado'],paranoid: false });
		registro = dataValidarOpcionales[0]
		registro.subtotal = 0
		registro.descuento = 0
		registro.impuestos = 0
        for(const detalle of detalles){
			let registroDetalle = {}
			let obligatoriosDetalle = [{campo:'cantidad', tipo:'number'},
									   {campo:'precioUnitario', tipo:'number'},
									   {campo:'haveImpuesto', tipo:'boolean'},
									   {campo:'descuentos', tipo:'number'},
									   {campo:'impuestoAdicional', tipo:'number'},
			]
			registroDetalle = await Validaciones.validParametros({body:detalle}, res,obligatoriosDetalle,registroDetalle);
			if(!registroDetalle){
				return undefined;
			}
			registroDetalle.subtotal = convert((parseInt(detalle.cantidad ?? 0) * parseFloat(detalle.precioUnitario ?? 0)), 1, 6) 
			if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalle.haveImpuesto === true){
				detalle.impuestos = convert((registroDetalle.subtotal  - (detalle.descuentos)) * 0.16, 1, 6) 
			}
			let impuestoAdicionalPorcentaje = parseFloat(detalle.impuestoAdicional) / 100;
			let impuestoAdicional = convert((registroDetalle.subtotal - (detalle.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);

			registro.subtotal =  convert((registro.subtotal  + registroDetalle.subtotal), 1, 6) 
			registro.descuento = convert((registro.descuento  + parseFloat(detalle.descuentos ?? 0)), 1, 6) 
			registro.impuestos = convert((registro.impuestos  + (parseFloat(detalle.impuestos ?? 0) + impuestoAdicional)), 1, 6) 

        }
		const registrosEncontrados = await db.sequelize.models.ordenes_compra.findAll({
			where: {
				id_marca: parametros.idMarca
			}
		});
		registro.folio = marca.clave + "-" + (registrosEncontrados.length + 1)
		registro.id_usuario_registro = req.usuario.id
		for(const detalle of detalles){
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
		}
		const nuevoRegistro = await db.sequelize.models.ordenes_compra.create(registro);
		for(const detalle of detalles){
			detalle.idOrdenCompra = nuevoRegistro.id
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
				all: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.ordenes_compra.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.ordenes_compra_archivos.findAll({where:{id_orden_compra:element.id}, include:['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const elementArchivo = archivo.archivo.toJSON()
					elementArchivo.id_orden_compra_archivo = archivo.id
					element.archivos.push(elementArchivo)
				}
				const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
				const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
				const relDetalles = await findRelaciones.getRelaciones()
				const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.id},include: relDetalles})
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
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		const registroAEditar = await db.sequelize.models.ordenes_compra.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca !== undefined ? parametros.idMarca : registroAEditar.id_marca)
		const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['nacionalidad_timbrado'],paranoid: false });
		if(detalles.length > 0){
			for(const detalle of detalles){
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
			}

			seEdita = true
			const detallesToDelete = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:id}})
			for(const detalleToDelete of detallesToDelete){
				const existe = detalles.some(detalle => detalle.id === detalleToDelete.id);
				if (detalleToDelete.id_factura_proveedor === null && !existe) {
					const datosUpdate = {
						id_orden_compra: null,
						updatedAt: moment().tz('America/Mexico_City')
					}
					const registroAEditar = await db.sequelize.models.facturas_proveedor_detalles.findByPk(detalleToDelete.id);
					await registroAEditar.update(datosUpdate, { where: { id: detalleToDelete.id } });

					const respuestaDetalle = await destroyFPD(detalleToDelete.id);
					if (respuestaDetalle.status !== true) {
					    return res.status(400).send(respuestaDetalle);
					}
				} 
				else if (detalleToDelete.id_factura_proveedor !== null) {
					return res.status(400).send({
						status: false,
						msg: "No se puede editar la orden de compra ya que un detalle está ligado a una factura de proveedor.",
						detalle: detalleToDelete
					});
				}
			}

			datosUpdate.subtotal = 0
			datosUpdate.descuento = 0
			datosUpdate.impuestos = 0
			for(const detalle of detalles){
				let registroDetalle = {}
				let obligatoriosDetalle = [{campo:'cantidad', tipo:'number'},
										   {campo:'precioUnitario', tipo:'number'},
										   {campo:'haveImpuesto', tipo:'boolean'},
										   {campo:'descuentos', tipo:'number'},
										   {campo:'impuestoAdicional', tipo:'number'},
				]
				registroDetalle = await Validaciones.validParametros({body:detalle}, res,obligatoriosDetalle,registroDetalle);
				if(!registroDetalle){
					return undefined;
				}
				registroDetalle.subtotal = convert((parseInt(detalle.cantidad ?? 0) * parseFloat(detalle.precioUnitario ?? 0)), 1, 6) 
				if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalle.haveImpuesto === true){
					detalle.impuestos = convert((registroDetalle.subtotal  - (detalle.descuentos)) * 0.16, 1, 6) 
				}let impuestoAdicionalPorcentaje = parseFloat(detalle.impuestoAdicional) / 100;
				let impuestoAdicional = convert((registroDetalle.subtotal - (detalle.descuentos)) * impuestoAdicionalPorcentaje, 1, 6);

				datosUpdate.subtotal =  convert((datosUpdate.subtotal  + registroDetalle.subtotal), 1, 6) 
				datosUpdate.descuento = convert((datosUpdate.descuento  + parseFloat(detalle.descuentos ?? 0)), 1, 6) 
				datosUpdate.impuestos = convert((datosUpdate.impuestos  + (parseFloat(detalle.impuestos ?? 0) + impuestoAdicional)), 1, 6) 	
			}
			for(const detalle of detalles){
				detalle.idOrdenCompra = id
				detalle.subtotal = convert((parseInt(detalle.cantidad ?? 0) * parseFloat(detalle.precioUnitario ?? 0)), 1, 6) 
				if(datoFacturacionEmisor.nacionalidad_timbrado.clave.toUpperCase() == "MX" && detalle.haveImpuesto === true){
					detalle.impuestos = convert((detalle.subtotal - detalle.descuentos) * 0.16, 1, 6)  
				}else{
					detalle.impuestos = 0
				}
				if(detalle.id != null){
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
		const registroAEliminar = await db.sequelize.models.ordenes_compra.findByPk(id);
		if(registroAEliminar != null){
			const detallesToDelete = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:id}})
			for(const detalleToDelete of detallesToDelete){
				if(detalleToDelete.id_factura_proveedor === null){
					const respuestaDetalle = await destroyFPD(detalleToDelete.id)
					if(respuestaDetalle.status !== true){
						return res.status(400).send(respuestaDetalle);
					}
				}else{
					return res.status(400).send({ status: false, msg: "No se puede eliminar la orden de compra ya que un detalle esta ligado a una factura proveedor.", detalle:detalleToDelete });
				}
			}
			const archivos = await db.sequelize.models.ordenes_compra_archivos.findAll({where: {id_orden_compra:id}});
			for(const archivo of archivos){
				await archivo.destroy({ where: { id: archivo.id } })
			}
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.ordenes_compra.name){
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
		let obligatorios = [{campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos}]

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const registrosEncontrados = await db.sequelize.models.ordenes_compra_archivos.findAll({
			where: {
				id_orden_compra: id,
				id_carga_archivo: parametros.idCargaArchivo,
				deletedAt: null
			}
		});
		registro.id_orden_compra = id
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_orden_compra == id && 
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
		const nuevoRegistro = await db.sequelize.models.ordenes_compra_archivos.create(registro);
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
		const registroAEliminar = await db.sequelize.models.ordenes_compra_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.ordenes_compra_archivos.name){
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
	const camposModelo = Object.keys(db.sequelize.models.ordenes_compra.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltroExportacion(req.query);

	try {
		const perfilesValidos = ['all']
		var relaciones = []
		req.query.perfil = 'all'
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente', 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','moneda','usuario_solicita']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.ordenes_compra.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
		})

		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.ordenes_compra_archivos.findAll({where:{id_orden_compra:element.id}, include:['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const elementArchivo = archivo.archivo.toJSON()
					elementArchivo.id_orden_compra_archivo = archivo.id
					element.archivos.push(elementArchivo)
				}
				const relacionesDetalles = [  'concepto_presupuesto', 'factura_proveedor.marca',  'factura_proveedor.proveedor', 'factura_proveedor.moneda', 'factura_proveedor.usuario_solicita', 'producto.marca', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura' ]
				const findRelaciones = new Relaciones(relacionesDetalles,relacionesDetalles,db.sequelize.models)
				const relDetalles = await findRelaciones.getRelaciones()
				const detalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_orden_compra:element.id},include: relDetalles})
				element.detalles_factura = []
				for(const detalle of detalles){
					element.detalles_factura.push(detalle)
				}
			}
			data.push(element)
		}
        let idMarca
        const elementos = []
		for(const element of data){
			if(idMarca === undefined){
				idMarca = element.id_marca
			}
			elementos.push({
				'Folio': element.folio,
				'Fecha': moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
				'Proveedor': element.proveedor.nombre,
				'Marca': element.marca.nombre,
				'Referencia': element.referencia,
				'IVA': ManipuladorCadenas.formatMoney(element.impuestos),
				'Importe': ManipuladorCadenas.formatMoney(parseFloat(element.impuestos) + parseFloat(element.subtotal)),
				'Moneda': element.moneda.clave,
				'Servicio registrado': element.detalles_factura[0].producto.descripcion
			})
		}

        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        const nombreReporte = `${ManipuladorCadenas.toTitle(db.sequelize.models.ordenes_compra.name.replace(/_/g, ' ')).replace(/ /g, '')}_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [ManipuladorCadenas.toTitle(db.sequelize.models.ordenes_compra.name.replace(/_/g, ' '))]
        const reporteCertificados = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        })

        return await reporteCertificados.gerReporteOneSheet(res,req)
		
		
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
