'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { sendNotificacion } = require('./asignacion_marca_agente_cliente.controllers')

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.marca_agentes_clientes.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cliente', 'marca', 'agente_operativo', 'agente_venta_1', 'agente_venta_2', 'inside_sales', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				agente_operativo: [ 'agente_operativo' ],
				agente_venta_1: [ 'agente_venta_1' ],
				agente_venta_2: [ 'agente_venta_2' ],
				inside_sales: [ 'inside_sales' ],
				all: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.marca_agentes_clientes.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.marca_agentes_clientes.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/marcaAgentesClientes`;
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
		const cliente = await db.sequelize.models.clientes.findByPk(req.body.idCliente,{include:['detalles_cliente']});
		if(cliente == null){
			return res.status(400).send({ status: false, msg: `Cliente no existe o se encuentra eliminado` });
		}
		try {
			if(cliente.detalles_cliente != null){
				if(cliente.detalles_cliente.fecha_automatica !== null){
					const agenteO = await getAgenteO(cliente.detalles_cliente.id_mediador_mercantil, parametros.idMarca)
					parametros.idAgenteOperativo = agenteO
				}
			}
		} catch (error) {
			parametros.idAgenteOperativo = parametros.idAgenteOperativo
		}
		let obligatorios = [{campo:'idCliente', tipo:'model',model:db.sequelize.models.clientes},
							{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'facturacionPromedio', tipo:'number'},
								  {campo:'profitPromedio', tipo:'number'}, 
								  {campo:'grupoWhatsapp', tipo:'stringWhatsApp', largo:255},
								  {campo:'idAgenteVenta1', tipo:'model',model:db.sequelize.models.usuarios},
								  {campo:'idAgenteVenta2', tipo:'model',model:db.sequelize.models.usuarios},
								  {campo:'idInsideSales', tipo:'model',model:db.sequelize.models.usuarios},
								  {campo:'idAgenteOperativo', tipo:'model',model:db.sequelize.models.usuarios}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.marca_agentes_clientes.findAll({
			where: {
				id_cliente: parametros.idCliente,
				id_marca: parametros.idMarca,
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_cliente == parametros.idCliente &&
					registro.id_marca ==  parametros.idMarca){
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
		const nuevoRegistro = await db.sequelize.models.marca_agentes_clientes.create(registro);
		envioNotificacionNuevo(nuevoRegistro, req.usuario.id)
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
		const perfilesValidos = ['cliente', 'marca', 'agente_operativo', 'agente_venta_1', 'agente_venta_2', 'inside_sales', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				agente_operativo: [ 'agente_operativo' ],
				agente_venta_1: [ 'agente_venta_1' ],
				agente_venta_2: [ 'agente_venta_2' ],
				inside_sales: [ 'inside_sales' ],
				all: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.marca_agentes_clientes.findByPk(id,{include:relaciones,paranoid: false});
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
		if(parametros.profitPromedio === null){
			parametros.profitPromedio = 0
		}
		if(parametros.facturacionPromedio === null){
			parametros.facturacionPromedio = 0
		}
	
		const validosOpcionales = [{campo:'idAgenteOperativo', canNull: true, tipo:'model',model:db.sequelize.models.usuarios},
								   {campo:'idAgenteVenta1', canNull: true, tipo:'model',model:db.sequelize.models.usuarios},
								   {campo:'idAgenteVenta2', canNull: true, tipo:'model',model:db.sequelize.models.usuarios},
								   {campo:'idInsideSales', canNull: true, tipo:'model',model:db.sequelize.models.usuarios},
								   {campo:'facturacionPromedio', canNull: true, tipo:'number'},
								   {campo:'profitPromedio', canNull: true, tipo:'number'}, 
								   {campo:'grupoWhatsapp', canNull: true, tipo:'stringWhatsApp', largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		
		const registroAEditar = await db.sequelize.models.marca_agentes_clientes.findByPk(id);
		const antes = await db.sequelize.models.marca_agentes_clientes.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				id_cliente: ( registroAEditar.id_cliente),
				id_marca: ( registroAEditar.id_marca),
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.marca_agentes_clientes.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_cliente == ( registroAEditar.id_cliente) &&
					registro.id_marca ==  ( registroAEditar.id_marca)) &&
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
		//registro de historial
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.marca_agentes_clientes.name.toUpperCase() ,
			accion: 'EDICION',
			createdAt: moment().tz('America/Mexico_City')
		}

		//encriptación para actualizar
		const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEditar);
		registro2.encriptacion_previa = stringEncriptado;

		const registrosActuales = await registroAEditar.update(datosUpdate, { where: { id: id } });

		const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
		registro2.encriptacion_posterior = stringEncriptado2;
		const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
		envioNotificacion(antes,registrosActuales, req.usuario.id)
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
		const registroAEliminar = await db.sequelize.models.marca_agentes_clientes.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.marca_agentes_clientes.name){
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
		const registroARestaurar = await db.sequelize.models.marca_agentes_clientes.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.marca_agentes_clientes.findAll({
					where: {
						id_cliente: registroARestaurar.id_cliente,
						id_marca: registroARestaurar.id_marca,
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(registro.id_cliente == (registroARestaurar.id_cliente) &&
							registro.id_marca ==  (registroARestaurar.id_marca)){
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


async function historicoAsignacionAgentes(req,res) {
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	const registroEncontrado = await db.sequelize.models.marca_agentes_clientes.findByPk(id);
	if(registroEncontrado == null){
		return res.status(400).send({
			success: false,
			total: 0,
			msg: "Registro con id: " + id + " no existe",
			data: []
		});
	}

	var whereFind = {
		where: {
			id_registro: id,
			accion: "EDICION",
			tabla: db.sequelize.models.marca_agentes_clientes.name.toUpperCase()
		}
	}
	const registrosEncontrados = await db.sequelize.models.historicos.findAll(whereFind);
	const data = []
	for(const registro of registrosEncontrados){
		let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
		let usuario_registro = {id: usuario.id, nombre: usuario.nombre}
		let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa)
		let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior)
		let fecha_asignacion = moment(registro.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
		if(datosDesencriptadosPrevia.id_agente_operativo != datosDesencriptadosPosterior.id_agente_operativo){
			let agente = await db.sequelize.models.usuarios.findByPk(datosDesencriptadosPosterior.id_agente_operativo, {paranoid: false});
			let regAO = {
				clave_cliente: datosDesencriptadosPosterior.id_cliente,
				usuario_edicion: usuario_registro,
				fecha_asignacion: fecha_asignacion,
				agente: agente.nombre,
				puesto: 'Agente Operativo',
			}
			data.push(regAO)
		}
		if(datosDesencriptadosPrevia.id_agente_venta_1 != datosDesencriptadosPosterior.id_agente_venta_1){
			let agente = await db.sequelize.models.usuarios.findByPk(datosDesencriptadosPosterior.id_agente_venta_1, {paranoid: false});
			let regAV1 = {
				clave_cliente: datosDesencriptadosPosterior.id_cliente,
				usuario_edicion: usuario_registro,
				fecha_asignacion: fecha_asignacion,
				agente: agente.nombre,
				puesto: 'Agente Ventas 1',
			}

			data.push(regAV1)
		}
		if(datosDesencriptadosPrevia.id_agente_venta_2 != datosDesencriptadosPosterior.id_agente_venta_2){
			let agente = await db.sequelize.models.usuarios.findByPk(datosDesencriptadosPosterior.id_agente_venta_2, {paranoid: false});
			let regAV2 = {
				clave_cliente: datosDesencriptadosPosterior.id_cliente,
				usuario_edicion: usuario_registro,
				fecha_asignacion: fecha_asignacion,
				agente: agente.nombre,
				puesto: 'Agente Ventas 2',
			}

			data.push(regAV2)
		}
		if(datosDesencriptadosPrevia.id_inside_sales != datosDesencriptadosPosterior.id_inside_sales){
			let agente = await db.sequelize.models.usuarios.findByPk(datosDesencriptadosPosterior.id_inside_sales, {paranoid: false});
			let regIS = {
				clave_cliente: datosDesencriptadosPosterior.id_cliente,
				usuario_edicion: usuario_registro,
				fecha_asignacion: fecha_asignacion,
				agente: agente.nombre,
				puesto: 'Agente Inside Sales',
			}

			data.push(regIS)
		}
	}
	return res.status(200).send({
		success: true,
		total: data.length,
		data: data
	});
}


async function envioNotificacion(antes,despues, idUsuarioRegistro) {
	let fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	const data = []
	if(antes.id_agente_operativo != despues.id_agente_operativo){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_operativo, {paranoid: false});
		if(agente != null){
			let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
			let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: despues.id_cliente,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:despues.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo:'Agente Operativo'
			}
			data.push(reg)
		}
	}
	if(antes.id_agente_venta_1 != despues.id_agente_venta_1){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_venta_1, {paranoid: false});
		if(agente != null){
			let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
			let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: despues.id_cliente,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:despues.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo:'Agente de Ventas 1'
			}
			data.push(reg)
		}
	}
	if(antes.id_agente_venta_2 != despues.id_agente_venta_2){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_venta_2, {paranoid: false});
		if(agente != null){
			let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
			let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: despues.id_cliente,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:despues.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo:'Agente de Ventas 2'
			}
			data.push(reg)
		}
	}
	if(antes.id_inside_sales != despues.id_inside_sales){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_inside_sales, {paranoid: false});
		if(agente != null){
			let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
			let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: despues.id_cliente,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:despues.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo:'Inside Sales'
			}
			data.push(reg)
		}
	}
	for(const notificacion of data){
		sendNotificacion(notificacion)
	}
}


async function envioNotificacionNuevo(nuevoRegistro, idUsuarioRegistro) {
	const fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	const usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
	const cliente = await db.sequelize.models.clientes.findByPk(nuevoRegistro.id_cliente, {paranoid: false});
	const data = []
	if(nuevoRegistro.id_agente_operativo != null){
		const agente = await db.sequelize.models.usuarios.findByPk(nuevoRegistro.id_agente_operativo, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:nuevoRegistro.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				asignado: true,
				ejecutivo:'Agente Operativo'
			}
			data.push(reg)
		}
	}
	if(nuevoRegistro.id_agente_venta_1 != null){
		const agente = await db.sequelize.models.usuarios.findByPk(nuevoRegistro.id_agente_venta_1, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:nuevoRegistro.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				asignado: true,
				ejecutivo:'Agente de Ventas 1'
			}
			data.push(reg)
		}
	}
	if(nuevoRegistro.id_agente_venta_2 != null){
		const agente = await db.sequelize.models.usuarios.findByPk(nuevoRegistro.id_agente_venta_2, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:nuevoRegistro.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				asignado: true,
				ejecutivo:'Agente de Ventas 2'
			}
			data.push(reg)
		}
	}
	if(nuevoRegistro.id_inside_sales != null){
		const agente = await db.sequelize.models.usuarios.findByPk(nuevoRegistro.id_inside_sales, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:nuevoRegistro.id_marca,
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				asignado: true,
				ejecutivo:'Inside Sales'
			}
			data.push(reg)
		}
	}
	for(const notificacion of data){
		sendNotificacion(notificacion)
	}
}


async function getAgenteO(mediador, idMarca){
	const usuariosTest = [1, 10, 652, 2152, 2153, 2257, 2258, 2496, 2766, 2921, 3391, 3504, 3611, 3836, 3893, 4031]
	if(mediador !== null && mediador !== undefined){
		const findRelaciones = new Relaciones(['detalles_cliente'],['detalles_cliente'],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const clientesData = await db.sequelize.models.clientes.findAll({
			include:relaciones,
			where: {
				'$detalles_cliente.id_mediador_mercantil$': mediador
			}
		});
		const clientesIds = []
		for(const clienteData of clientesData){
			clientesIds.push(clienteData.id)
		}
		if(clientesIds.length > 0){
            const marcaAgentesClientes = await db.sequelize.models.marca_agentes_clientes.findAll({
				where:{id_cliente : {[db.Sequelize.Op.or]: clientesIds}, id_marca : idMarca}
			});
			let usuario = undefined
			for(const marcaAgenteCliente of marcaAgentesClientes){
				if(usuario === undefined && marcaAgenteCliente.id_agente_operativo != null){
					usuario = usuariosTest.includes(marcaAgenteCliente.id_agente_operativo) ? undefined :  marcaAgenteCliente.id_agente_operativo
				}
			}
			if(usuario !== undefined){
				return usuario
			}
		}
	}
	const idRole = idMarca == 3 ? 4 : idMarca == 17 ? 69 : null
	const fechaActual = moment().tz('America/Mexico_City')
	const usuariosOperadores = await db.sequelize.models.usuarios.findAll({
		include: [{
			model: db.sequelize.models.roles,
			as: 'listRoles', // Nombre del alias que utilizas en tu modelo
			through: {
				attributes: [] // No incluir atributos de la tabla intermedia
			},
			where: {
				id: idRole
			},
			required: true // Esto asegura que solo se devuelvan usuarios que tengan el rol
		}],
		where: {
		  createdAt: { [db.Sequelize.Op.lte]: fechaActual.subtract(30, 'days') } 
		}
	});
	const usuarios = []
	for(const usr of usuariosOperadores){
		if(!usuariosTest.includes(usr.id)){
			usuarios.push(usr.id)
		}
	}
	const usuariosMAC = await db.sequelize.models.usuarios.findAll({
		include: [{
		  model: db.sequelize.models.marca_agentes_clientes,
		  as: "clientes_mac",
		  attributes: ['id_cliente'] 
		}],
		where: {id: {[db.Sequelize.Op.or]: usuarios}}
	});
	let usuariosData = []
	let menor = Infinity
	for(const usr of usuariosMAC){
		const element = usr.toJSON()
		const clientes = []
		for(const mac of element.clientes_mac){
			clientes.push(mac.id_cliente)
		}
		const facturas = []
		if(clientes.length > 0){
			const razonesSocialesData = await db.sequelize.models.clientes_razones_sociales.findAll({
				where:{id_cliente: {[db.Sequelize.Op.or]: clientes}}
			})
			const rsIds = []
			for(const rsData of razonesSocialesData){
				rsIds.push(rsData.id_razon_social)
			}
			if(rsIds.length > 0){
				const facturasData = await db.sequelize.models.facturas.findAll({
					where:{id_razon_social: {[db.Sequelize.Op.or]: rsIds}, id_marca: idMarca}
				})
				for(const facturaData of facturasData){
					facturas.push(facturaData.id)
				}
			}
		}
		element.clientes_mac = undefined
		if(menor > facturas.length){
			menor = facturas.length
			usuariosData = []
			usuariosData.push(element.id)
		} else if(menor == facturas.length){
			usuariosData.push(element.id)
		}
	}
	return usuariosData[Math.floor(Math.random() * usuariosData.length)]
}



module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	historicoAsignacionAgentes,
	getAgenteO
}
