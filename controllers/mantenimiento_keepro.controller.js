'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Filtros } = require('../middlewares/filtros');
const { Relaciones } = require('../middlewares/relaciones');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.mantenimiento_keepro.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.mantenimiento_keepro.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones, 
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.mantenimiento_keepro.count({
			paranoid: false,
			include:relaciones, 
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/mantenimientoKeepro`;
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
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'fechaInicio', tipo:'stringDateTime'},
							{campo:'fechaFin', tipo:'stringDateTime'},
		]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		if (!req.files || Object.keys(req.files).length === 0) {
			return res.status(400).send({ status: false, msg: "No se han encontrado archivos para subir."});
		} else{
			try {
				const obligatorios = ['imagen']
				for (const file of obligatorios) {
					if (!req.files[file]) {
						return res.status(400).send({ status: false, msg: `Falta el archivo ${file}`})
					}
				  }
				const files = req.files
				var fileContent = undefined
				var tipoDocumento = undefined
				var fileIsArray = false
				for (let key in files){
					if(obligatorios.includes(key)){
						const file = files[key]
						if (file.size > (50 * 1024 * 1024)) {
							return res.status(400).json({ status: false, msg: 'El archivo es demasiado grande. El tamaño máximo permitido es de 50MB' });
						}
						if(Array.isArray(file)){
							fileIsArray = true
						}else{
							fileContent = file.data.toString('base64');
							tipoDocumento = file.mimetype;
						}
					}
				}	
				if(fileIsArray){
					return res.status(400).json({ status: false, msg: 'Solo se debe enviar un archivo' });
				}
				if(tipoDocumento.split("/")[0] != 'image'){
					return res.status(400).json({ status: false, msg: 'Solo se admiten imagenes' });
				}
				registro.imagen = fileContent;
				registro.mime_type = tipoDocumento;

			} catch (error) {
				return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
			} 
		}	
		registro.id_usuario_registro = req.usuario.id
		const inicioVigencia = moment.tz(parametros.fechaInicio, 'America/Mexico_City');
    	const finVigencia = moment.tz(parametros.fechaFin, 'America/Mexico_City');
		//validar fecha_inicio y fecha_fin
		if (finVigencia.isSameOrBefore(inicioVigencia)) {
			return res.status(400).send({
				status: false,
				msg: "La fecha de inicio vigencia no puede ser mayor o igual que a la fecha fin vigencia"
			});
		}
		const nuevoRegistro = await db.sequelize.models.mantenimiento_keepro.create(registro);
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
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const registroEncontrado = await db.sequelize.models.mantenimiento_keepro.findByPk(id,{ include:relaciones, paranoid: false });
		if(registroEncontrado != null){
			res.setHeader('Content-Type', registroEncontrado.mime_type);
			return res.send(Buffer.from(registroEncontrado.imagen, 'base64'));
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
	
		const validosOpcionales = [{campo:'fechaInicio', tipo:'stringDateTime'},
								   {campo:'fechaFin', tipo:'stringDateTime'},						
		]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		const opcional = ['imagen']
		const files = req.files
		var fileContent = undefined
		var tipoDocumento = undefined
		var fileIsArray = false
		for (let key in files){
			if(opcional.includes(key)){
				const file = files[key]
				if (file.size > (50 * 1024 * 1024)) {
					return res.status(400).json({ status: false, msg: 'El archivo es demasiado grande. El tamaño máximo permitido es de 50MB' });
				}
				if(Array.isArray(file)){
					fileIsArray = true
				}else{
					fileContent = file.data.toString('base64');
					tipoDocumento = file.mimetype;
				}
			}
		}	
		if(fileIsArray){
			return res.status(400).json({ status: false, msg: 'Solo se debe enviar un archivo' });
		}	
		datosUpdate.imagen = fileContent;
		datosUpdate.mime_type = tipoDocumento;

		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.mantenimiento_keepro.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const fechaInicio = moment(parametros.fechaInicio != undefined ? parametros.fechaInicio : registroAEditar.fecha_inicio).tz('America/Mexico_City');
		const fechaFin = moment(parametros.fechaFin != undefined ? parametros.fechaFin : registroAEditar.fecha_fin).tz('America/Mexico_City');
		if ( fechaFin <= fechaInicio) {
			return res.status(400).send({
				status: false,
				msg: "La fecha de inicio vigencia no puede ser mayor o igual que a la fecha fin vigencia"
			});
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
		const registroAEliminar = await db.sequelize.models.mantenimiento_keepro.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.mantenimiento_keepro.name){
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
		const registroARestaurar = await db.sequelize.models.mantenimiento_keepro.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				await  registroARestaurar.restore();;
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
