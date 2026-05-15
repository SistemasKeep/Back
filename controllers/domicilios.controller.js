'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Validaciones } = require('../middlewares/validaciones');
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
	const camposModelo = Object.keys(db.sequelize.models.domicilios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['estado', 'pais', 'continente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				estado: ['estado'],
				pais: ['estado.pais'],
				continente: ['estado.pais.continente'],
				all: ['estado.pais.continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.domicilios.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.domicilios.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/domicilios`;
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
	const nuevoRegistro = await saveDomicilio(req.body, res,req.usuario);
	if(nuevoRegistro != undefined){
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	}
	return '';
}

async function saveDomicilio(parametros, res, usuario){
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idEstado', tipo:'model',model:db.sequelize.models.estados},
							{campo:'municipio', tipo:'string',largo:100,textoCase:"title"},
							{campo:'codigoPostal', tipo:'string',largo:20},
							{campo:'calle', tipo:'string',largo:255,textoCase:"title"},
							{campo:'numExt', tipo:'stringInt',largo:50}]
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return undefined;
		}
		const validosOpcionales =[{campo:'ciudadLocalidad',tipo:'string',textoCase:"up",largo:100},
								  {campo:'numInt',tipo:'string',largo:50},
								  {campo:'colonia',tipo:'string',textoCase:"up",largo:100},
								  {campo:'referencia',tipo:'string',textoCase:"up",largo:255},
								  {campo:'calleIzq',tipo:'string',textoCase:"up",largo:255},
								  {campo:'calleDer',tipo:'string',textoCase:"up",largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		registro.id_usuario_registro = usuario == null ? null : usuario.id
		const nuevoRegistro = await db.sequelize.models.domicilios.create(registro);
		return nuevoRegistro
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return undefined
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['estado', 'pais', 'continente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				estado: 'estado',
				pais: 'estado.pais',
				continente: 'estado.pais.continente',
				all: 'estado.pais.continente'
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],[parametrosRelaciones[req.query.perfil]],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.domicilios.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const registroAEditar = await updateDomicilio(req.body, res, true, req.params.id);
	if(registroAEditar != undefined){
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	}
	return ''
}

async function updateDomicilio(parametros, res, crudDom = false, idDomicilio = undefined){
	try {
		var id = idDomicilio;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
	
		const validosOpcionales =[{campo:'idEstado', tipo:'model',model:db.sequelize.models.estados},
								  {campo:'ciudadLocalidad',tipo:'string',textoCase:"up",largo:100},
								  {campo:'numInt',tipo:'string',largo:50},
								  {campo:'colonia',tipo:'string',textoCase:"up",largo:100},
								  {campo:'referencia',tipo:'string',textoCase:"up",largo:255},
								  {campo:'calleIzq',tipo:'string',textoCase:"up",largo:255},
								  {campo:'calleDer',tipo:'string',textoCase:"up",largo:255},
								  {campo:'municipio',tipo:'string',textoCase:"up",largo:100},
								  {campo:'codigoPostal',tipo:'string',largo:20},
								  {campo:'calle',tipo:'string',textoCase:"up",largo:255},
								  {campo:'numExt',tipo:'stringInt',largo:50},]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			if(crudDom){
				res.status(200).send({ status: true, msg: "Registro no editado" });
				return undefined;
			}
		}
		const registroAEditar = await db.sequelize.models.domicilios.findByPk(id);
		if(registroAEditar != null){
			if(registroAEditar.deletedAt != null){
				res.status(400).send({ status: false, msg: "Registro eliminado" });
				return undefined;
			}
			await registroAEditar.update(datosUpdate, { where: { id: id } });
			if(crudDom){
				return registroAEditar
			} else{
				return [registroAEditar,true] 
			}
		}
		res.status(400).send({ status: false, msg: "Registro no existe" });
		return undefined;
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return undefined;
	} 
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.domicilios.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.domicilios.name){
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
		const registroARestaurar = await db.sequelize.models.domicilios.findByPk(id,{ paranoid: false });
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
	update,
	destroy,
	restaurar,
	saveDomicilio,
	updateDomicilio
}
