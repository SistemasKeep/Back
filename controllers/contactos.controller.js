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
	const camposModelo = Object.keys(db.sequelize.models.contactos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const { filtro, idCliente} = await getFiltro(req.query,db.sequelize.models.contactos);
	if(idCliente !== undefined){
		const oficinasCliente = await db.sequelize.models.oficinas_cliente.findAll({
			where: {id_cliente: idCliente}
		})
		const oficinas = []
		for(const ofiCliente of oficinasCliente){
			oficinas.push(ofiCliente.id_oficina)
		}
		if(oficinas.length > 0){
			filtro.id_oficina = {
				[db.Sequelize.Op.in]: oficinas
			};
		}
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ 'oficina', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina: ['oficina'],
				all: [ 'oficina' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.contactos.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.contactos.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/contactos`;
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
	let idCliente = undefined
	try {
		filtro = JSON.parse(parametros.filter)
		try {
			const keys = Object.keys(filtro)
			let name = undefined
			for (const key of keys) {
				filtro[key] = filtro[key].filter(fil => {
					if (fil.property === "nombre") {
						name = fil.value;
						return false;
					}
					if (fil.property === "id_cliente") {
						idCliente = fil.value;
						return false;
					}
					return true;
				});
			}
			if(filtro.or === undefined){
				filtro.or = []
			}
			if(name !== undefined){
				const listName = name.trim().split(" ")
				for(const nombre of listName){
					filtro.or.push({"property": "nombre","value": nombre,"operator": "like"})
					filtro.or.push({"property": "apellido_paterno","value": nombre,"operator": "like"})
					filtro.or.push({"property": "apellido_materno","value": nombre,"operator": "like"})
				}
			}
		} catch (error) {}
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados,modelo:modelo})
	const filtros = await Filter.get()
	return {filtro:filtros, idCliente:idCliente}
}

async function store(req, res){
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idOficina', tipo:'model', model:db.sequelize.models.oficinas},
							{campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
							{campo:'apellidoPaterno', tipo:'string',largo:100,textoCase:"up"},
							{campo:'departamento', tipo:'string',largo:100,textoCase:"up"},
							{campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
							{campo:'email', tipo:'correo',largo:100,textoCase:"up"},
							{campo:'telefono', tipo:'stringInt',largo:15},
							]
		
		if(parametros.enviarEstadoCuenta == true){
			obligatorios.push({campo:'maneraEnviar', tipo:'enum', largo:1, enum: ['S', 'Q', 'M']});
			obligatorios.push({campo:'diaEnvio', tipo:'number'});
		}else{
			registro.manera_enviar = null;
			registro.dia_envio = null;
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const maneraEnviar = registro.manera_enviar;
		const diaEnvio = registro.dia_envio;

		if ((maneraEnviar === 'S' && (diaEnvio < 0 || diaEnvio > 6))) {
			return res.status(400).send({ 
				status: false, 
				msg: `El campo diaEnvio debe ser un día válido según la manera de envío: S => [0-6] (semanal).`
			});

		}
		if((maneraEnviar === 'Q' && (diaEnvio < 1 || diaEnvio > 15))){
			return res.status(400).send({ 
				status: false, 
				msg: `El campo diaEnvio debe ser un día válido según la manera de envío: Q => [1-15] (quincenal).`
			});
		}
		if ((maneraEnviar === 'M' && (diaEnvio < 1 || diaEnvio > 31))) {
			return res.status(400).send({ 
				status: false, 
				msg: `El campo diaEnvio debe ser un día válido según la manera de envío: M => [1-31] (mensual).`
			});
		}
		
		const validosOpcionales =[{campo:'apellidoMaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'comentarios', tipo:'string',largo:300},
								  {campo:'intereses', tipo:'string',largo:300},
								  {campo:'emailRepOp1', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'emailRepOp2', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'emailRepOp3', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'extension', tipo:'stringInt',largo:15},
								  {campo:'enviarCorreo',tipo:'boolean'},
								  {campo:'enviarEstadoCuenta',tipo:'boolean'},
								  {campo:'enviarFactura',tipo:'boolean'},
								  {campo:'enviarCertificado',tipo:'boolean'},
								  {campo:'enviarContactosOficinas',tipo:'boolean'},
								  {campo:'recibirReporteOperacion',tipo:'boolean'},
								  {campo:'esUsuario',tipo:'boolean'},
								  {campo:'cumpleanos', tipo:'stringDate'},
								  {campo:'parentesco', tipo:'enum', largo:1, enum: ['0','1','2']},
								  {campo:'genero', tipo:'enum', largo:1, enum: ['0','1']},
								  {campo:'tipoCorreo', tipo:'enum', largo:1, enum: ['0','1','2']}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficina);
		if(oficina.is_interna == true){
			return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina no interna." });
		}

		registro = dataValidarOpcionales[0]
		const usuarios = await db.sequelize.models.usuarios.findAll({
			where: {
				email: {
					[db.Sequelize.Op.like]: `%${parametros.email}%`
				},
				deletedAt: null
			}
		});
		if(usuarios.length > 0){
			var isUsuario = false
			await usuarios.forEach(usuario => {
				if(usuario.email == parametros.email){
					isUsuario = true;
				}
			});
			if(isUsuario){
				registro.esUsuario = isUsuario
			}
		}
		const registrosEncontrados = await db.sequelize.models.contactos.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_oficina: parametros.idOficina,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					[db.Sequelize.Op.and]: {
						nombre: {
							[db.Sequelize.Op.like]: `%${parametros.nombre}%`
						},
						apellido_paterno: {
							[db.Sequelize.Op.like]: `%${parametros.apellidoPaterno}%`
						},
						apellido_materno: {
							[db.Sequelize.Op.like]: `%${parametros.apellidoMaterno}%`
						}
					},
					email: {
						[db.Sequelize.Op.like]: `%${parametros.email}%`
					}
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_oficina == parametros.idOficina) &&
					(((registro.nombre.toLowerCase() == parametros.nombre.toLowerCase()) &&
					  (registro.apellido_paterno.toLowerCase() == parametros.apellidoPaterno.toLowerCase()) &&
					  (((registro.apellido_materno !== undefined && registro.apellido_materno !== null && registro.apellido_materno !== "") ? registro.apellido_materno.toLowerCase() : "") == ((parametros.apellidoMaterno !== undefined && parametros.apellidoMaterno !== null && parametros.apellidoMaterno !== "") ? parametros.apellidoMaterno.toLowerCase() : ""))) ||
					 (registro.email.toLowerCase() == parametros.email.toLowerCase()) )){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.contactos.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function show(req, res){
	const { id } = req.params;
	
	try {
		const perfilesValidos = [ 'oficina', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina: ['oficina'],
				all: [ 'oficina' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.contactos.findByPk(id,{include:relaciones,paranoid: false});
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
		let obligatorios = [];

		if(parametros.enviarEstadoCuenta == true){
			obligatorios.push({campo:'maneraEnviar', tipo:'enum', largo:1, enum: ['S', 'Q', 'M']});
			obligatorios.push({campo:'diaEnvio', tipo:'number'});
		}else{
			datosUpdate.manera_enviar = null;
			datosUpdate.dia_envio = null;
		}

		datosUpdate = await Validaciones.validParametros(req, res,obligatorios,datosUpdate);
		if(!datosUpdate){
			return '';
		}

	
		const registroAEditar = await db.sequelize.models.contactos.findByPk(id);

		const validosOpcionales =[{campo:'idOficina', tipo:'model', model:db.sequelize.models.oficinas},
								  {campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'apellidoPaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'departamento', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
								  {campo:'email', tipo:'correo',largo:100,textoCase:"up"},
								  {campo:'telefono', tipo:'stringInt',largo:15},
								  {campo:'apellidoMaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'comentarios', tipo:'string',largo:300},
								  {campo:'intereses', tipo:'string',largo:300},
								  {campo:'emailRepOp1', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'emailRepOp2', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'emailRepOp3', tipo:'correo',largo:255,textoCase:"up"},
								  {campo:'extension', tipo:'stringInt',largo:15},
								  {campo:'enviarCorreo',tipo:'boolean'},
								  {campo:'enviarEstadoCuenta',tipo:'boolean'},
								  {campo:'enviarFactura',tipo:'boolean'},
								  {campo:'enviarCertificado',tipo:'boolean'},
								  {campo:'enviarContactosOficinas',tipo:'boolean'},
								  {campo:'recibirReporteOperacion',tipo:'boolean'},
								  {campo:'esUsuario',tipo:'boolean'},
								  {campo:'cumpleanos', tipo:'stringDate'},
								  {campo:'parentesco', tipo:'enum', largo:1, enum: ['0','1','2']},
								  {campo:'genero', tipo:'enum', largo:1, enum: ['0','1']},
								  {campo:'tipoCorreo', tipo:'enum', largo:1, enum: ['0','1','2']}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		if(datosUpdate.manera_enviar != undefined && datosUpdate.dia_envio != undefined){
			const maneraEnviar = datosUpdate.manera_enviar;
			const diaEnvio = datosUpdate.dia_envio;
			const error = await validarDiaEnvio(maneraEnviar, diaEnvio, res);
			if (error) return error;

		}
		
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficina != undefined ? parametros.idOficina : registroAEditar.id_oficina);
		if(oficina.is_interna == true){
			return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina no interna." });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.and]: {
					id_oficina: parametros.idOficina != undefined ? parametros.idOficina : registroAEditar.id_oficina,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					[db.Sequelize.Op.and]: {
						nombre: {
							[db.Sequelize.Op.like]: `%${parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre}%`
						},
						apellido_paterno: {
							[db.Sequelize.Op.like]: `%${parametros.apellidoPaterno != undefined ? parametros.apellidoPaterno : registroAEditar.apellido_paterno}%`
						},
						apellido_materno: {
							[db.Sequelize.Op.like]: `%${parametros.apellidoMaterno != undefined ? parametros.apellidoMaterno : registroAEditar.apellido_materno}%`
						}
					},
					email: {
						[db.Sequelize.Op.like]: `%${parametros.email != undefined ? parametros.email : registroAEditar.email}%`
					}
				}
			}
		}
		const registrosEncontrados = await db.sequelize.models.contactos.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_oficina == (parametros.idOficina != undefined ? parametros.idOficina : registroAEditar.id_oficina)) &&
					(((registro.nombre.toLowerCase() == (parametros.nombre != undefined ? parametros.nombre.toLowerCase() : registroAEditar.nombre.toLowerCase())) &&
					  (registro.apellido_paterno.toLowerCase() == (parametros.apellidoPaterno != undefined ? parametros.apellidoPaterno.toLowerCase() : registroAEditar.apellido_paterno.toLowerCase())) &&
					  (((registro.apellido_materno !== undefined && registro.apellido_materno !== null && registro.apellido_materno !== "") ? registro.apellido_materno.toLowerCase() : "") == (parametros.apellidoMaterno != undefined ? parametros.apellidoMaterno.toLowerCase() : registroAEditar.apellido_materno.toLowerCase()))) ||
					 (registro.email.toLowerCase() == (parametros.email != undefined ? parametros.email.toLowerCase() : registroAEditar.email.toLowerCase()))) &&
					 registro.id != id){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
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


async function validarDiaEnvio(maneraEnviar, diaEnvio, res) {
    if ((maneraEnviar === 'S' && (diaEnvio < 0 || diaEnvio > 6))) {
        return res.status(400).send({ 
            status: false, 
            msg: `El campo diaEnvio debe ser un día válido según la manera de envío: S => [0-6] (semanal).`
        });
    }
    if ((maneraEnviar === 'Q' && (diaEnvio < 1 || diaEnvio > 15))) {
        return res.status(400).send({ 
            status: false, 
            msg: `El campo diaEnvio debe ser un día válido según la manera de envío: Q => [1-15] (quincenal).`
        });
    }
    if ((maneraEnviar === 'M' && (diaEnvio < 1 || diaEnvio > 31))) {
        return res.status(400).send({ 
            status: false, 
            msg: `El campo diaEnvio debe ser un día válido según la manera de envío: M => [1-31] (mensual).`
        });
    }
    return null;
}


async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.contactos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.contactos.name){
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
		const registroARestaurar = await db.sequelize.models.contactos.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.contactos.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_oficina: registroARestaurar.id_oficina,
							deletedAt: null
						},
						[db.Sequelize.Op.or]: {
							[db.Sequelize.Op.and]: {
								nombre: {
									[db.Sequelize.Op.like]: `%${registroARestaurar.nombre}%`
								},
								apellido_paterno: {
									[db.Sequelize.Op.like]: `%${registroARestaurar.apellido_paterno}%`
								},
								apellido_materno: {
									[db.Sequelize.Op.like]: `%${registroARestaurar.apellido_materno}%`
								}
							},
							email: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.email}%`
							}
						}
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.id_oficina == (registroARestaurar.id_oficina)) &&
							(((registro.nombre.toLowerCase() == (registroARestaurar.nombre.toLowerCase())) &&
							  (registro.apellido_paterno.toLowerCase() == (registroARestaurar.apellido_paterno.toLowerCase())) &&
							  (((registro.apellido_materno !== undefined && registro.apellido_materno !== null && registro.apellido_materno !== "") ? registro.apellido_materno.toLowerCase() : "") == (registroARestaurar.apellido_materno.toLowerCase()))) ||
							 (registro.email.toLowerCase() == (registroARestaurar.email.toLowerCase()))) &&
							 registro.id != id){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
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
