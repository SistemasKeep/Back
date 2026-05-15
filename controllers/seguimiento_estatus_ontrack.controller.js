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
	const camposModelo = Object.keys(db.sequelize.models.seguimiento_estatus_ontrack.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query,db.sequelize.models.seguimiento_estatus_ontrack);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ "servicio_ontrack", "estatus_ontrack", 'all' ]
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
				estatus_ontrack: [ 'estatus_ontrack' ],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra', 'estatus_ontrack' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const docs = await db.sequelize.models.seguimiento_estatus_ontrack.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.seguimiento_estatus_ontrack.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/seguimientoEstatusMonitoreo`;
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
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		let obligatorios = [
			{campo:'idServicioOntrack', tipo:'model', model:db.sequelize.models.servicios_ontrack},
			{campo:'idEstatusOntrack', tipo:'model', model:db.sequelize.models.estatus_ontrack},
		];

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		registro.id_usuario_registro = req.usuario.id;
		await db.sequelize.models.seguimiento_estatus_ontrack.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente"});
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
		const perfilesValidos = [ "servicio_ontrack", "estatus_ontrack", 'all' ]
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
				estatus_ontrack: [ 'estatus_ontrack' ],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra', 'estatus_ontrack' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.seguimiento_estatus_ontrack.findByPk(id,{paranoid: false, include: relaciones});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
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
		const registroAEliminar = await db.sequelize.models.seguimiento_estatus_ontrack.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.seguimiento_estatus_ontrack.name){
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
		const registroARestaurar = await db.sequelize.models.seguimiento_estatus_ontrack.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
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
	show,
	destroy,
	restaurar
}
