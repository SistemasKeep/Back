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
	const camposModelo = Object.keys(db.sequelize.models.contactos_proveedor.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.contactos_proveedor.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.contactos_proveedor.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/contactosProveedor`;
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
		let obligatorios = [{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
							{campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
							{campo:'apellidoPaterno', tipo:'string',largo:100,textoCase:"up"},
							{campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
							{campo:'email', tipo:'correo',largo:100,textoCase:"up"},
							{campo:'telefono', tipo:'stringInt',largo:15}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'apellidoMaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'extension', tipo:'stringInt',largo:15}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.contactos_proveedor.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_proveedor: parametros.idProveedor,
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
				if((registro.id_proveedor == parametros.idProveedor) &&
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
		const nuevoRegistro = await db.sequelize.models.contactos_proveedor.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function show(req, res){
	const { id } = req.params;
	
	try {
		const perfilesValidos = [ 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.contactos_proveedor.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales =[{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
								  {campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'apellidoPaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
								  {campo:'email', tipo:'correo',largo:100,textoCase:"up"},
								  {campo:'telefono', tipo:'stringInt',largo:15},
								  {campo:'apellidoMaterno', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'extension', tipo:'stringInt',largo:15}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.contactos_proveedor.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.and]: {
					id_proveedor: parametros.idProveedor != undefined ? parametros.idProveedor : registroAEditar.id_proveedor,
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
		const registrosEncontrados = await db.sequelize.models.contactos_proveedor.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_proveedor == (parametros.idProveedor != undefined ? parametros.idProveedor : registroAEditar.id_proveedor)) &&
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

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.contactos_proveedor.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.contactos_proveedor.name){
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
		const registroARestaurar = await db.sequelize.models.contactos_proveedor.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.contactos_proveedor.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_proveedor: registroARestaurar.id_proveedor,
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
						if((registro.id_proveedor == (registroARestaurar.id_proveedor)) &&
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
