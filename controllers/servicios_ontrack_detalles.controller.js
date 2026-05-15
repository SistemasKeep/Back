'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.servicios_ontrack_detalles.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query,db.sequelize.models.servicios_ontrack_detalles);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ "servicio_ontrack", "producto", 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
				producto: [ 'producto.marca.pais.continente','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura',],
				atributo_ontrack: [ 'atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta'],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra','producto.marca.pais.continente','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const docs = await db.sequelize.models.servicios_ontrack_detalles.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.servicios_ontrack_detalles.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/serviciosOnTrackDetalles`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: docs
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltro(parametros,modelo){
	var filtro
	try {
		filtro = JSON.parse(parametros.filter)
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados,modelo:modelo})
	return await Filter.get()
}

async function store(req, res){
	const parametros = req.body;
	try {
		const servicioMonitoreoDetalle = await storeServicioMonitoreoDetalles(parametros, req.usuario, res)
		if(servicioMonitoreoDetalle === null){
			return null
		} else if(servicioMonitoreoDetalle.status !== undefined){
			return res.status(500).send(servicioMonitoreoDetalle)
		}else{
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:servicioMonitoreoDetalle.id}});
		}
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function storeServicioMonitoreoDetalles(payload, usuario, res){
	const parametros = payload;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		const obligatorios = [
			{campo:'idServicioOntrack', tipo:'model', model:db.sequelize.models.servicios_ontrack},
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
			{campo:'precioUnitario', tipo:'number'},
		];
		const validosOpcionales = [
			{campo:'cortesia', tipo:'boolean'}
		]
		registro = await Validaciones.validParametros({body: parametros}, res,obligatorios,registro);
		if(!registro){
			return null;
		}
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return null;
		}
		registro = dataValidarOpcionales[0]
		const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(parametros.idServicioOntrack,{ paranoid: false });
		if(servicioMonitoreo.estatus != "N"){
			res.status(400).send({ status: false, msg: "No se puede generar mas detalles. La solicitud monitoreo se encuentra Facturada." });
			return null
		}
		if(servicioMonitoreo.deletedAt !=null){
			res.status(400).send({ status: false, msg: "No se puede generar el detalle. La solicitud monitoreo se encuentra eliminada." });
			return null
		}
		const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({
			where:{
				clave: servicioMonitoreo.no_operacion.split("-")[0] + "-" + servicioMonitoreo.no_operacion.split("-")[1] + "-" + servicioMonitoreo.no_operacion.split("-")[2]
			}
		});
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findOne({
			where:{
				id_marca_agente_oficina: marcaAgenteOficina.id,
				id_producto: payload.idProducto
			}
		});
		if(oficinaProducto !== null){
			const atributoTracking = await db.sequelize.models.atributos_ontrack.findOne({
				where:{
					id_oficina_producto: oficinaProducto.id,
				}
			});
			if(atributoTracking == null){
				const productoTracking = await db.sequelize.models.productos.findByPk(5);
				if(productoTracking == null){
					return res.status(400).send({
						status: false,
						msg: "No se encuentra el producto activo (MONITOREO SATELITAL ACTIVO)"
					});
				}
				const atributoTracking = await db.sequelize.models.atributos_ontrack.create({
					id_oficina_producto: oficinaProducto.id,
					id_moneda_compra: 2,
					id_moneda_venta: 2,
					precio: 39.0,
					porcentaje_sobreventa: 0,
					porcentaje_comisionista: 0,
					descripcion: productoTracking.descripcion,
					id_usuario_registro: usuario.id,
					createdAt: moment().tz('America/Mexico_City'),
				});
				registro.id_atributo_ontrack = atributoTracking.id
			}else{
				registro.id_atributo_ontrack = atributoTracking.id
			}
		}
		registro.id_usuario_registro = usuario.id;
		return await db.sequelize.models.servicios_ontrack_detalles.create(registro);
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = [ "servicio_ontrack", "producto", 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
				producto: [ 'producto.marca.pais.continente','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura',],
				atributo_ontrack: [ 'atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta'],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra','producto.marca.pais.continente','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.moneda_compra', 'producto.moneda_venta', 'producto.pais.continente', 'producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.moneda_compra','atributo_ontrack.oficina_producto.producto.moneda_venta','atributo_ontrack.oficina_producto.producto.pais.continente','atributo_ontrack.oficina_producto.producto.tipo_cobertura','atributo_ontrack.oficina_producto.producto.archivo', 'atributo_ontrack.moneda_compra',  'atributo_ontrack.moneda_venta' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.servicios_ontrack_detalles.findByPk(id,{paranoid: false, include: relaciones});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
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
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
		const validosOpcionales = [
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
			{campo:'cortesia', tipo:'boolean'},
			{campo:'precioUnitario', tipo:'number'},
		];
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res);
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0];
		seEdita = dataValidarOpcionales[1];
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}	
		const registroAEditar = await db.sequelize.models.servicios_ontrack_detalles.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(registroAEditar.id_servicio_ontrack);
		if(servicioMonitoreo.estatus != "N"){
			return res.status(400).send({ status: false, msg: "No se puede editar el detalle. La solicitud monitoreo se encuentra Facturada." });
		}
		if(servicioMonitoreo.deletedAt !=null){
			return res.status(400).send({ status: false, msg: "No se puede editar el detalle. La solicitud monitoreo se encuentra eliminada." });
		}

        await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		console.log(error)
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
		const registroAEliminar = await db.sequelize.models.servicios_ontrack_detalles.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.servicios_ontrack_detalles.name){
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
			const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(registroAEliminar.id_servicio_ontrack,{ paranoid: false });
			if(servicioMonitoreo.estatus != "N"){
				return res.status(400).send({ status: false, msg: "No se puede eliminar el detalle. La solicitud monitoreo se encuentra Facturada." });
			}
			if(servicioMonitoreo.deletedAt !=null){
				return res.status(400).send({ status: false, msg: "No se puede eliminar el detalle. La solicitud monitoreo se encuentra eliminada." });
			}

			await registroAEliminar.destroy({ where: { id: id } });
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
		const registroARestaurar = await db.sequelize.models.servicios_ontrack_detalles.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(registroARestaurar.id_servicio_ontrack,{ paranoid: false });
				if(servicioMonitoreo.estatus != "N"){
					return res.status(400).send({ status: false, msg: "No se puede restaurar el detalle. La solicitud monitoreo se encuentra Facturada." });
				}
				if(servicioMonitoreo.deletedAt !=null){
					return res.status(400).send({ status: false, msg: "No se puede restaurar el detalle. La solicitud monitoreo se encuentra eliminada." });
				}
				await registroARestaurar.restore();
				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

module.exports = {
	index,
	store,
	storeServicioMonitoreoDetalles,
	show,
	update,
	destroy,
	restaurar
}
