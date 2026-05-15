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
	const camposModelo = Object.keys(db.sequelize.models.contactos_transportistas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query,db.sequelize.models.contactos_transportistas);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ "servicio_ontrack", 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda','servicio_ontrack.moneda_compra' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const docs = await db.sequelize.models.contactos_transportistas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.contactos_transportistas.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/contactosTransportistas`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(element.servicio_ontrack !== undefined && element.servicio_ontrack !== null){
				const fechaFull = moment(element.servicio_ontrack.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
				element.servicio_ontrack.fecha_solicitud = fechaFull.split(" ")[0]
				element.servicio_ontrack.hora_solicitud = fechaFull.split(" ")[1]
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
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		const obligatorios = [
			{campo:'idServicioOntrack', tipo:'model', model:db.sequelize.models.servicios_ontrack},
		]
		const validosOpcionales = [
			{campo:'nombreContacto', tipo:'string',largo:300,textoCase:"up"},
			{campo:'correoElectronico', tipo:'correo',largo:100,textoCase:"up"},
			{campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
			{campo:'telefono', tipo:'stringInt',largo:15},
			{campo:'extensionTelefono', tipo:'stringInt',largo:10},
			{campo:'telefonoPrincipal', tipo:'stringInt',largo:15},
			{campo:'extensionTelefonoPrincipal', tipo:'stringInt',largo:10},
			{campo:'telefonoSecundario', tipo:'stringInt',largo:15},
			{campo:'extensionTelefonoSecundario', tipo:'stringInt',largo:10},
		]

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]

		const registrosEncontrados = await db.sequelize.models.contactos_transportistas.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_servicio_ontrack: parametros.idServicioOntrack,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					nombre_contacto: {
						[db.Sequelize.Op.like]: `%${parametros.nombreContacto}%`
					},
					correo_electronico: {
						[db.Sequelize.Op.like]: `%${parametros.correoElectronico}%`
					}
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				if((registro.id_servicio_ontrack == parametros.idServicioOntrack) &&
					((((registro.nombre_contacto !== null && registro.nombre_contacto !== undefined && registro.nombre_contacto !== "" ? registro.nombre_contacto.toLowerCase() : "") == (parametros.nombreContacto !== null && parametros.nombreContacto !== undefined && parametros.nombreContacto !== "" ? parametros.nombreContacto.toLowerCase() : ""))) ||
					 (((registro.correo_electronico !== null && registro.correo_electronico !== undefined && registro.correo_electronico !== "" ? registro.correo_electronico.toLowerCase() : "") == (parametros.correoElectronico !== null && parametros.correoElectronico !== undefined && parametros.correoElectronico !== "" ? parametros.correoElectronico.toLowerCase() : ""))) )){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id;
		const nuevoRegistro = await db.sequelize.models.contactos_transportistas.create(registro);
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
		const perfilesValidos = [ "servicio_ontrack", 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				servicio_ontrack: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda', ,'servicio_ontrack.moneda_compra' ],
				all: [ 'servicio_ontrack.certificado', 'servicio_ontrack.cliente.detalles_cliente', 'servicio_ontrack.oficina_razon_social.oficina','servicio_ontrack.oficina_razon_social.razon_social', 'servicio_ontrack.marca', 'servicio_ontrack.tipo_cambio_futuro', 'servicio_ontrack.proveedor', 'servicio_ontrack.estado_origen.pais', 'servicio_ontrack.estado_destino.pais', 'servicio_ontrack.contacto', 'servicio_ontrack.estatus_ontrack', 'servicio_ontrack.moneda', ,'servicio_ontrack.moneda_compra' ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.contactos_transportistas.findByPk(id,{paranoid: false, include: relaciones});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(element.servicio_ontrack !== undefined && element.servicio_ontrack !== null){
				const fechaFull = moment(element.servicio_ontrack.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
				element.servicio_ontrack.fecha_solicitud = fechaFull.split(" ")[0]
				element.servicio_ontrack.hora_solicitud = fechaFull.split(" ")[1]
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
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
		const validosOpcionales = [
			{campo:'nombreContacto', tipo:'string',largo:300,textoCase:"up", canNull: true},
			{campo:'correoElectronico', tipo:'correo',largo:100,textoCase:"up", canNull: true},
			{campo:'puesto', tipo:'string',largo:45,textoCase:"up", canNull: true},
			{campo:'telefono', tipo:'stringInt',largo:15, canNull: true},
			{campo:'extensionTelefono', tipo:'stringInt',largo:10, canNull: true},
			{campo:'telefonoPrincipal', tipo:'stringInt',largo:15, canNull: true},
			{campo:'extensionTelefonoPrincipal', tipo:'stringInt',largo:10, canNull: true},
			{campo:'telefonoSecundario', tipo:'stringInt',largo:15, canNull: true},
			{campo:'extensionTelefonoSecundario', tipo:'stringInt',largo:10, canNull: true},
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
		const registroAEditar = await db.sequelize.models.contactos_transportistas.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.and]: {
					id_servicio_ontrack: registroAEditar.id_servicio_ontrack,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					nombre_contacto: {
						[db.Sequelize.Op.like]: `%${parametros.nombreContacto !== undefined ? parametros.nombreContacto : registroAEditar.nombre_contacto}%`
					},
					correo_electronico: {
						[db.Sequelize.Op.like]: `%${parametros.correoElectronico != undefined ? parametros.correoElectronico : registroAEditar.correo_electronico}%`
					}
				}
			}
		};
		const registrosEncontrados = await db.sequelize.models.contactos_transportistas.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				const nombreContacto = parametros.nombreContacto !== null && parametros.nombreContacto !== undefined && parametros.nombreContacto !== "" ? parametros.nombreContacto.toLowerCase() : registroAEditar.nombre_contacto !== null && registroAEditar.nombre_contacto !== undefined && registroAEditar.nombre_contacto !== "" ? registroAEditar.nombre_contacto.toLowerCase() : ""
			  	const correoElectronico = parametros.correoElectronico !== null && parametros.correoElectronico !== undefined && parametros.correoElectronico !== "" ? parametros.correoElectronico.toLowerCase() : registroAEditar.correo_electronico !== null && registroAEditar.correo_electronico !== undefined && registroAEditar.correo_electronico !== "" ? registroAEditar.correo_electronico.toLowerCase() : ""
				const nombreContactoRegistro =  registro.nombre_contacto !== null && registro.nombre_contacto !== undefined && registro.nombre_contacto !== "" ? registro.nombre_contacto.toLowerCase() : ""
				const correoElectronicoRegistro =  registro.correo_electronico !== null && registro.correo_electronico !== undefined && registro.correo_electronico !== "" ? registro.correo_electronico.toLowerCase() : ""
				const idServicioOntrack = registroAEditar.id_servicio_ontrack;
				if((registro.id_servicio_ontrack == idServicioOntrack) &&
					(nombreContactoRegistro == nombreContacto ||
					 correoElectronicoRegistro == correoElectronico) && registro.id != id){
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
		const registroAEliminar = await db.sequelize.models.contactos_transportistas.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.contactos_transportistas.name){
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
		const registroARestaurar = await db.sequelize.models.contactos_transportistas.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.contactos_transportistas.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_servicio_ontrack: registroARestaurar.id_servicio_ontrack,
							deletedAt: null
						},
						[db.Sequelize.Op.or]: {
							nombre_contacto: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.nombre_contacto}%`
							},
							correo_electronico: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.correo_electronico}%`
							}
						}
					}
				});

				if(registrosEncontrados.length > 0){
					let regExistente = false;
					await registrosEncontrados.forEach(registro => {
						const nombreContacto =  registroARestaurar.nombre_contacto !== null && registroARestaurar.nombre_contacto !== undefined && registroARestaurar.nombre_contacto !== "" ? registroARestaurar.nombre_contacto.toLowerCase() : ""
						const correoElectronico =  registroARestaurar.correo_electronico !== null && registroARestaurar.correo_electronico !== undefined && registroARestaurar.correo_electronico !== "" ? registroARestaurar.correo_electronico.toLowerCase() : ""
						const nombreContactoRegistro =  registro.nombre_contacto !== null && registro.nombre_contacto !== undefined && registro.nombre_contacto !== "" ? registro.nombre_contacto.toLowerCase() : ""
						const correoElectronicoRegistro =  registro.correo_electronico !== null && registro.correo_electronico !== undefined && registro.correo_electronico !== "" ? registro.correo_electronico.toLowerCase() : ""
						const idServicioOntrack = registroARestaurar.id_servicio_ontrack;
						if((registro.id_servicio_ontrack == idServicioOntrack) &&
							(nombreContactoRegistro == nombreContacto ||
							correoElectronicoRegistro == correoElectronico) && registro.id != id){
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

async function onlyValid(parametros, res) {
	var registro = {
		createdAt: moment().tz('America/Mexico_City'),
		updatedAt: moment().tz('America/Mexico_City')
	};
	const obligatorios = []
	const validosOpcionales = [
		{campo:'nombreContacto', tipo:'string',largo:300,textoCase:"up"},
		{campo:'correoElectronico', tipo:'correo',largo:100,textoCase:"up"},
		{campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
		{campo:'telefono', tipo:'stringInt',largo:15},
		{campo:'extensionTelefono', tipo:'stringInt',largo:10},
		{campo:'telefonoPrincipal', tipo:'stringInt',largo:15},
		{campo:'extensionTelefonoPrincipal', tipo:'stringInt',largo:10},
		{campo:'telefonoSecundario', tipo:'stringInt',largo:15},
		{campo:'extensionTelefonoSecundario', tipo:'stringInt',largo:10},
	]

	registro = await Validaciones.validParametros({body: parametros}, res,obligatorios,registro);
	if(!registro){
		return '';
	}
	//Se validan los parametros opcionales
	const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
	if(dataValidarOpcionales == undefined){
		return undefined;
	}
	registro = dataValidarOpcionales[0]
	return registro
}

async function storeContactoTransportista(param, usuario, res){
	const parametros = param;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		};
		const obligatorios = [
			{campo:'idServicioOntrack', tipo:'model', model:db.sequelize.models.servicios_ontrack},
		]
		const validosOpcionales = [
			{campo:'nombreContacto', tipo:'string',largo:300,textoCase:"up"},
			{campo:'correoElectronico', tipo:'correo',largo:100,textoCase:"up"},
			{campo:'puesto', tipo:'string',largo:45,textoCase:"up"},
			{campo:'telefono', tipo:'stringInt',largo:15},
			{campo:'extensionTelefono', tipo:'stringInt',largo:10},
			{campo:'telefonoPrincipal', tipo:'stringInt',largo:15},
			{campo:'extensionTelefonoPrincipal', tipo:'stringInt',largo:10},
			{campo:'telefonoSecundario', tipo:'stringInt',largo:15},
			{campo:'extensionTelefonoSecundario', tipo:'stringInt',largo:10},
		]

		registro = await Validaciones.validParametros({body: parametros}, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]

		const registrosEncontrados = await db.sequelize.models.contactos_transportistas.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_servicio_ontrack: parametros.idServicioOntrack,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					nombre_contacto: {
						[db.Sequelize.Op.like]: `%${parametros.nombreContacto}%`
					},
					correo_electronico: {
						[db.Sequelize.Op.like]: `%${parametros.correoElectronico}%`
					}
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				if((registro.id_servicio_ontrack == parametros.idServicioOntrack) &&
					((((registro.nombre_contacto !== null && registro.nombre_contacto !== undefined && registro.nombre_contacto !== "" ? registro.nombre_contacto.toLowerCase() : "") == (parametros.nombreContacto !== null && parametros.nombreContacto !== undefined && parametros.nombreContacto !== "" ? parametros.nombreContacto.toLowerCase() : ""))) ||
					 (((registro.correo_electronico !== null && registro.correo_electronico !== undefined && registro.correo_electronico !== "" ? registro.correo_electronico.toLowerCase() : "") == (parametros.correoElectronico !== null && parametros.correoElectronico !== undefined && parametros.correoElectronico !== "" ? parametros.correoElectronico.toLowerCase() : ""))) )){
						regExistente = true;
				}
			});
			if(regExistente){
				return { status: false, msg: "Registro existente"};
			}
		}
		registro.id_usuario_registro = usuario.id;
		const nuevoRegistro = await db.sequelize.models.contactos_transportistas.create(registro);
		return nuevoRegistro
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	onlyValid,
	storeContactoTransportista
}
