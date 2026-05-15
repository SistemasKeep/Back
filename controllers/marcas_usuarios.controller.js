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
	const camposModelo = Object.keys(db.sequelize.models.marcas_usuarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['marca', 'usuario', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				usuario: [ 'usuario' ],
				all: [ 'usuario', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 'usuario', 'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo']
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.marcas_usuarios.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
			
		const dataDocs = await db.sequelize.models.marcas_usuarios.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		

		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/marcasUsuarios`;
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
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		const usuarioToSave = await db.sequelize.models.usuarios.findByPk(parametros.idUsuario)
		if(usuarioToSave != null && (parametros.email === null || parametros.email === undefined) ){
			parametros.email = usuarioToSave.email
		}
		let obligatorios = [{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
							{campo:'idUsuario', tipo:'model',model:db.sequelize.models.usuarios},
							{campo:'email', tipo:'correo',largo:255,textoCase:"up"},
							{campo:'telefono', tipo:'stringInt',largo:15}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const registrosEncontrados = await db.sequelize.models.marcas_usuarios.findAll({
			where: {
				id_marca: parametros.idMarca,
				id_usuario: parametros.idUsuario,
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_marca == parametros.idMarca &&
					registro.id_usuario ==  parametros.idUsuario){
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
		const nuevoRegistro = await db.sequelize.models.marcas_usuarios.create(registro);
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
		const perfilesValidos = ['marca', 'usuario', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				usuario: [ 'usuario' ],
				all: [ 'usuario', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 'usuario', 'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo']
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.marcas_usuarios.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales = [{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
								   {campo:'idUsuario', tipo:'model',model:db.sequelize.models.usuarios},
								   {campo:'email', tipo:'correo',largo:255,textoCase:"up"},
								   {campo:'telefono', tipo:'stringInt',largo:15}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		
		const registroAEditar = await db.sequelize.models.marcas_usuarios.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				id_marca: parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca,
				id_usuario: parametros.idUsuario != undefined ? parametros.idUsuario : registroAEditar.id_usuario,
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.marcas_usuarios.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.id_marca == (parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca)) &&
				    (registro.id_usuario == (parametros.idUsuario != undefined ? parametros.idUsuario : registroAEditar.id_usuario))) &&
				    registro.id != id){
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
		const registroAEliminar = await db.sequelize.models.marcas_usuarios.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.marcas_usuarios.name){
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
		const registroARestaurar = await db.sequelize.models.marcas_usuarios.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.marcas_usuarios.findAll({
					where: {
						id_marca: registroARestaurar.id_marca,
						id_usuario: registroARestaurar.id_usuario,
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.id_marca == registroARestaurar.id_marca &&
							registro.id_usuario == registroARestaurar.id_usuario) &&
							registro.id != id){
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
	restaurar
}
