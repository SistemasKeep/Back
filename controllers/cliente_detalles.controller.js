'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { sendNotificacion } = require('./asignacion_marca_agente_cliente.controllers')


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cliente_detalles.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['comisionista', 'mediador_mercantil', 'agente_credito_cobranza', 'agente_customer', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				comisionista: ['comisionista.proveedor.moneda','comisionista.proveedor.conceptos_presupuesto','comisionista.proveedor.marca.domicilio.estado.pais.continente','comisionista.proveedor.marca.pais.continente','comisionista.proveedor.marca.archivo','comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 'comisionista.proveedor.marca.dato_facturacion.pais.continente', 'comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente','comisionista.proveedor.almacen.marca.pais.continente','comisionista.proveedor.almacen.marca.archivo','comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 'comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 'comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente','comisionista.proveedor.almacen.ubicacion_defecto','comisionista.proveedor.proveedor_tipo'],
				mediador_mercantil: ['mediador_mercantil'],
				agente_credito_cobranza: ['agente_credito_cobranza'],
				agente_customer: ['agente_customer'],
				all: ['comisionista','comisionista.proveedor','comisionista.proveedor.moneda','comisionista.proveedor.conceptos_presupuesto','comisionista.proveedor.marca.domicilio.estado.pais.continente','comisionista.proveedor.marca.pais.continente','comisionista.proveedor.marca.archivo','comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 'comisionista.proveedor.marca.dato_facturacion.pais.continente', 'comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente','comisionista.proveedor.almacen.marca.pais.continente','comisionista.proveedor.almacen.marca.archivo','comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 'comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 'comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente','comisionista.proveedor.almacen.ubicacion_defecto','comisionista.proveedor.proveedor_tipo','mediador_mercantil','agente_credito_cobranza','agente_customer' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.cliente_detalles.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cliente_detalles.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cliente_detalles`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const rellist = ['tipo_cliente','estado.pais.continente','oficina_interno']
				const findRelClientes = new Relaciones(rellist,rellist,db.sequelize.models)
				const relacionesCliente = await findRelClientes.getRelaciones()
				element.cliente = await db.sequelize.models.clientes.findOne({where:{id_detalle_cliente:element.id}, include: relacionesCliente})
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
	const nuevoRegistro = await saveClienteDetalles(req.body, res, req.usuario);
	if(nuevoRegistro != undefined){
		var codigoRespuesta = 200
		if(nuevoRegistro.status != true){
			codigoRespuesta = 500
		}
		return res.status(codigoRespuesta).send(nuevoRegistro)
	}
}

async function saveClienteDetalles(parametros, res, usuario){
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'bloqueado', tipo:'boolean'},
						    {campo:'autoemisor', tipo:'boolean'}
		]
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return undefined;
		}
		if(parametros.fechaAutomaticaCheck == true){
			const agenteCyC = await getAgenteCyC(parametros.idMediadorMercantil)
			const agenteC = await getAgenteC(parametros.idMediadorMercantil)
			parametros.idAgenteCreditoCobranza = agenteCyC
			parametros.idAgenteCustomer = agenteC
			parametros.fechaAutomatica = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		}else{
			parametros.fechaAutomatica = undefined
		}
        const validosOpcionales =[
            {campo:'idComisionista', tipo:'model', model:db.sequelize.models.comisionistas},
            {campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos},
            {campo:'idMediadorMercantil', tipo:'model', model:db.sequelize.models.comisionistas},
            {campo:'idAgenteCreditoCobranza', tipo:'model', model:db.sequelize.models.usuarios},
            {campo:'idAgenteCustomer', tipo:'model', model:db.sequelize.models.usuarios},
            {campo:'fechaAutomatica', tipo:'stringDate'},
            {campo:'fechaFactura', tipo:'stringDate'},
			{campo:'observaciones', tipo:'string', largo:600}   
        ]
        const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
        if(dataValidarOpcionales == undefined){
			return undefined;
        }
        registro = dataValidarOpcionales[0]
		registro.id_usuario_registro = usuario.id
		const nuevoRegistro = await db.sequelize.models.cliente_detalles.create(registro);
		return { status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}};
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()};
	} 
}

async function show(req, res){
	const { id } = req.params;
	
	try {
		const perfilesValidos = ['comisionista', 'mediador_mercantil', 'agente_credito_cobranza', 'agente_customer', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				comisionista: [
					'comisionista.proveedor.moneda',
					'comisionista.proveedor.conceptos_presupuesto',
					'comisionista.proveedor.marca.domicilio.estado.pais.continente',
					'comisionista.proveedor.marca.pais.continente',
					'comisionista.proveedor.marca.archivo',
					'comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'comisionista.proveedor.marca.dato_facturacion.pais.continente', 
					'comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'comisionista.proveedor.almacen.marca.pais.continente',
					'comisionista.proveedor.almacen.marca.archivo',
					'comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'comisionista.proveedor.almacen.ubicacion_defecto',
					'comisionista.proveedor.proveedor_tipo',
				],
				mediador_mercantil: ['mediador_mercantil'],
				agente_credito_cobranza: ['agente_credito_cobranza'],
				agente_customer: ['agente_customer'],
				all: [
					'comisionista.proveedor.moneda',
					'comisionista.proveedor.conceptos_presupuesto',
					'comisionista.proveedor.marca.domicilio.estado.pais.continente',
					'comisionista.proveedor.marca.pais.continente',
					'comisionista.proveedor.marca.archivo',
					'comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'comisionista.proveedor.marca.dato_facturacion.pais.continente', 
					'comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'comisionista.proveedor.almacen.marca.pais.continente',
					'comisionista.proveedor.almacen.marca.archivo',
					'comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'comisionista.proveedor.almacen.ubicacion_defecto',
					'comisionista.proveedor.proveedor_tipo',
					'mediador_mercantil',
					'agente_credito_cobranza',
					'agente_customer'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.cliente_detalles.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const rellist = ['tipo_cliente','estado.pais.continente','oficina_interno']
				const findRelClientes = new Relaciones(rellist,rellist,db.sequelize.models)
				const relacionesCliente = await findRelClientes.getRelaciones()
				element.cliente = await db.sequelize.models.clientes.findOne({where:{id_detalle_cliente:element.id}, include: relacionesCliente})
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
			{campo:'idComisionista', tipo:'model', model:db.sequelize.models.comisionistas, canNull: true},
            {campo:'idCargaArchivo', tipo:'model', model:db.sequelize.models.carga_archivos, canNull: true},
            {campo:'idMediadorMercantil', tipo:'model', model:db.sequelize.models.comisionistas, canNull: true},
            {campo:'idAgenteCreditoCobranza', tipo:'model', model:db.sequelize.models.usuarios, canNull: true},
            {campo:'idAgenteCustomer', tipo:'model', model:db.sequelize.models.usuarios, canNull: true},
            {campo:'fechaAutomatica', tipo:'stringDate', canNull: true},
            {campo:'fechaFactura', tipo:'stringDate', canNull: true},
            {campo:'bloqueado', tipo:'boolean'},
            {campo:'autoemisor', tipo:'boolean'},
			{campo:'observaciones', tipo:'string', largo:600, canNull: true}
		]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const antes = await db.sequelize.models.cliente_detalles.findByPk(id);
		const registroAEditar = await db.sequelize.models.cliente_detalles.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		
		if(((registroAEditar.fecha_automatica != null && datosUpdate.fecha_automatica === null || datosUpdate.fecha_automatica === undefined) || (datosUpdate.fecha_automatica !== null && datosUpdate.fecha_automatica !== undefined))){
			if(registroAEditar.id_agente_credito_cobranza == null){
				const agenteCyC = await getAgenteCyC(registroAEditar.id_mediador_mercantil ?? parametros.idMediadorMercantil)
				datosUpdate.id_agente_credito_cobranza = agenteCyC
			}
			if(registroAEditar.id_agente_customer == null){
				const agenteC = await getAgenteC(registroAEditar.id_mediador_mercantil ?? parametros.idMediadorMercantil)
				datosUpdate.id_agente_customer = agenteC
			}
		}

		// registro de historial
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.cliente_detalles.name.toUpperCase(),
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
		envioNotificacion(antes,registrosActuales,req.usuario.id)

		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function envioNotificacion(antes,despues, idUsuarioRegistro) {
	const fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	const data = []
	const usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
	const cliente = await db.sequelize.models.clientes.findOne({where: {id_detalle_cliente: antes.id}});
	if(antes.id_agente_credito_cobranza != despues.id_agente_credito_cobranza){
		const agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_credito_cobranza, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:'',
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo: 'Ejecutivo de Crédito y Cobranza'
			}
			data.push(reg)
		}
	}
	if(antes.id_agente_customer != despues.id_agente_customer){
		const agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_customer, {paranoid: false});
		if(agente != null){
			let reg = {
				nombreAgente: agente.nombre,
				nombreCliente: cliente.nombre,
				claveCliente: cliente.id,
				fechaAsignacion: fechaAsignacion,
				nombreUsuarioRegistro: usuarioRegistro.nombre,
				idMarca:'',
				idUsuario:idUsuarioRegistro,
				correo:agente.email,
				ejecutivo: 'Ejecutivo de Atención a Cliente'
			}
			data.push(reg)
		}
	}
	for(const notificacion of data){
		sendNotificacion(notificacion)
	}
}


async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.cliente_detalles.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.cliente_detalles.name){
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

			// registro de historial
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.cliente_detalles.name.toUpperCase() ,
				accion: 'ELIMINAR',
				createdAt: moment().tz('America/Mexico_City')
			}

			//encriptación para eliminar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEliminar);
			registro2.encriptacion_previa = stringEncriptado;

			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
			
			const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
			registro2.encriptacion_posterior = stringEncriptado2;
			const datosHistoricos = await db.sequelize.models.historicos.create(registro2);

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
		const registroARestaurar = await db.sequelize.models.cliente_detalles.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				// registro de historial
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.cliente_detalles.name.toUpperCase(),
					accion: 'RESTAURAR',
					createdAt: moment().tz('America/Mexico_City')
				}
			
				//encriptación para restaurar
				const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroARestaurar);
				registro2.encriptacion_previa = stringEncriptado;
				
				const registrosActuales = await registroARestaurar.restore();
				
				const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
				registro2.encriptacion_posterior = stringEncriptado2;
				const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);

				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function indexHistoricos(req, res) {
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    const filtro = await getFiltro(req.query);

	var whereFind = {
		where: {
			id_registro: id,
			tabla: db.sequelize.models.cliente_detalles.name.toUpperCase()
		}
	}
	const registrosEncontrados = await db.sequelize.models.historicos.findAll(whereFind);
	const data = []
	for (let index = 0; index < registrosEncontrados.length; index++) {
		let reg = {}
		const registro = registrosEncontrados[index];
		let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
		reg.id = registro.id
		reg.usuario_registro = {id: usuario.id, nombre: usuario.nombre}
		reg.accion = registro.accion
		let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa)
		let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior)
		reg.encriptacion_previa = datosDesencriptadosPrevia
		reg.encriptacion_posterior = datosDesencriptadosPosterior
		reg.createdAt = registro.createdAt
		data.push(reg)
	}
	return res.status(200).send({
		success: true,
		total: data.length,
		data: data
	});
}

async function showHistoricos(req, res) {
	const { id } = req.params;
	const perfilesValidos = ['all'];
	var generarRelaciones = false;
	if(perfilesValidos.includes(req.query.perfil)){
		if(req.query.perfil == 'all'){
			generarRelaciones =  true;
		}
	}
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false;
	} 
    let reg = {};
	let registro = await db.sequelize.models.historicos.findByPk(id);

	if(registro === null){
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} 
	if(registro.tabla != db.sequelize.models.cliente_detalles.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud cliente_detalles" });
	} 
	let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
	reg.id = registro.id;
	reg.usuario_registro = {id: usuario.id, nombre: usuario.nombre};
	reg.accion = registro.accion;
	let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa);
	let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior);
	if(generarRelaciones){
		reg.encriptacion_previa = await getRelaciones(datosDesencriptadosPrevia);
		reg.encriptacion_posterior = await getRelaciones(datosDesencriptadosPosterior);
	}
	reg.encriptacion_previa = datosDesencriptadosPrevia;
	reg.encriptacion_posterior = datosDesencriptadosPosterior;
	reg.createdAt = registro.createdAt;
	return res.status(200).send({
		success: true,
		data: reg
	});
}

async function getRelaciones(registro){
	const relaciones = [];
	//Se obtienen las relaciones BelongsTo
	for (const key in registro) {
		let arrayCampo = key.split("_");
		if(arrayCampo.length > 1 && arrayCampo.includes("id")){
			let nameRelacion = "";
			for (let index = 0; index < arrayCampo.length; index++) {
				const ler = arrayCampo[index];
				if(index == 1){
					nameRelacion = nameRelacion  + ler;
				} else if(index > 1){
					nameRelacion = nameRelacion  + "_" + ler;
				}
			}
			relaciones.push(nameRelacion)
		}
	}
	const Relaciones = new RelacionesHistorico(relaciones,db.sequelize.models,registro);
	registro = await Relaciones.getRelaciones();
	const relacionesBelongsTo = [];
	const foreignKeys = [];
	for (const modelo of Object.values(db.sequelize.models)) {
		let asociaciones = modelo.associations;
		for (const asociacion of Object.values(asociaciones)) {
			if(asociacion.target.name == db.sequelize.models.cliente_detalles.name){
				if(asociacion.associationType == 'BelongsTo'){
					if(!relacionesBelongsTo.includes(modelo.name)){
						relacionesBelongsTo.push(modelo.name);
						foreignKeys.push(asociacion.foreignKey);
					}
				}
			}
		}
	}
	const RelacionesBelongsTo = new RelacionesHistorico(relacionesBelongsTo,db.sequelize.models,registro,foreignKeys);
	return await RelacionesBelongsTo.getRelacionesBelongTo();
}

async function getAgenteCyC(mediador){
	const usuariosTest = [1, 10, 652, 2152, 2153, 2257, 2258, 2496, 2766, 2921, 3391, 3504, 3611, 3836, 3893, 4031]
	if(mediador !== null && mediador !== undefined){
		const clientesDetalles = await db.sequelize.models.cliente_detalles.findAll({
			where: {
				id_mediador_mercantil: mediador
			}
		});
		let usuario = undefined
		for(const detalle of clientesDetalles){
			if(usuario === undefined && detalle.id_agente_credito_cobranza != null){
				usuario = usuariosTest.includes(detalle.id_agente_credito_cobranza) ? undefined :  detalle.id_agente_credito_cobranza
			}
		}
		if(usuario !== undefined){
			return usuario
		}
	}
	const fechaActual = moment().tz('America/Mexico_City')
	const aux = await db.sequelize.models.usuarios.findAll({
		include: [{
		  model: db.sequelize.models.cliente_detalles,
		  as: "clientes_agente_cyc",
		  attributes: [] 
		}],
		attributes: [
		  'id',
		  [db.Sequelize.fn("COUNT", db.Sequelize.col("clientes_agente_cyc.id")), "clienteCount"]
		],
		group: ['usuarios.id'],
		having: {
		  clienteCount: { [db.Sequelize.Op.gt]: 0 } 
		},
		where: {
		  createdAt: { [db.Sequelize.Op.lte]: fechaActual.subtract(30, 'days') } 
		}
	});
	const usuarios = []
	for(const usr of aux){
		if(!usuariosTest.includes(usr.id)){
			usuarios.push(usr.id)
		}
	}
	const usuariosConMultiplesClientes = await db.sequelize.models.usuarios.findAll({
		include: [{
		  model: db.sequelize.models.cliente_detalles,
		  as: "clientes_agente_cyc",
		  attributes: ['id'] 
		}],
		where: {id: {[db.Sequelize.Op.or]: usuarios}}
	});
	let usuariosData = []
	let menor = Infinity
	for(const usr of usuariosConMultiplesClientes){
		const element = usr.toJSON()
		const clientes = []
		for(const dc of element.clientes_agente_cyc){
			const cliente = await db.sequelize.models.clientes.findOne({
				paranoid: false,
				attributes: ['id','id_detalle_cliente'],
				where: {id_detalle_cliente: dc.id}
			});
			if(cliente != null){
				clientes.push(cliente.id)
			}
		}
		element.clientes_agente_cyc = undefined
		const razonesSociales = []
		for(const cliente of clientes){
			const razonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({
				paranoid: false,
				attributes: ['id','id_cliente','id_razon_social'],
				where: {id_cliente: cliente}
			});
			if(razonSocial != null){
				razonesSociales.push(razonSocial.id_razon_social)
			}
		}
		if(razonesSociales.length > 0){
			const cxcs = []
			for(const razonSocial of razonesSociales){
				const cXcs = await db.sequelize.models.cuentas_por_cobrar.findAll({
					paranoid: false,
					attributes: ['id'],
					include:['factura'],
					where: {
						'$factura.id_razon_social$': razonSocial
					}
				});
				if(cXcs.length > 0){
					for(const cxc of cXcs){
						cxcs.push(cxc.id)
					}
				}
			} 
			if(menor > cxcs.length){
				menor = cxcs.length
				usuariosData = []
				usuariosData.push(element.id)
			} else if(menor == clientes.length){
				usuariosData.push(element.id)
			}
		}
		
	}
	return usuariosData[Math.floor(Math.random() * usuariosData.length)]
}

async function getAgenteC(mediador){
	const usuariosTest = [1, 10, 652, 2152, 2153, 2257, 2258, 2496, 2766, 2921, 3391, 3504, 3611, 3836, 3893, 4031]
	if(mediador !== null && mediador !== undefined){
		const clientesDetalles = await db.sequelize.models.cliente_detalles.findAll({
			where: {
				id_mediador_mercantil: mediador
			}
		});
		let usuario = undefined
		for(const detalle of clientesDetalles){
			if(usuario === undefined && detalle.id_agente_customer != null){
				usuario = usuariosTest.includes(detalle.id_agente_customer) ? undefined :  detalle.id_agente_customer
			}
		}
		if(usuario !== undefined){
			return usuario
		}
	}
	const fechaActual = moment().tz('America/Mexico_City')
	const aux = await db.sequelize.models.usuarios.findAll({
		include: [{
		  model: db.sequelize.models.cliente_detalles,
		  as: "clientes_agente_customer",
		  attributes: [] 
		}],
		attributes: [
		  'id',
		  [db.Sequelize.fn("COUNT", db.Sequelize.col("clientes_agente_customer.id")), "clienteCount"]
		],
		group: ['usuarios.id'],
		having: {
		  clienteCount: { [db.Sequelize.Op.gt]: 0 } 
		},
		where: {
		  createdAt: { [db.Sequelize.Op.lte]: fechaActual.subtract(30, 'days') } 
		}
	});
	const usuarios = []
	for(const usr of aux){
		if(!usuariosTest.includes(usr.id)){
			usuarios.push(usr.id)
		}
	}
	const usuariosConMultiplesClientes = await db.sequelize.models.usuarios.findAll({
		include: [{
		  model: db.sequelize.models.cliente_detalles,
		  as: "clientes_agente_customer",
		  attributes: ['id'] 
		}],
		where: {id: {[db.Sequelize.Op.or]: usuarios}}
	});
	let usuariosData = []
	let menor = Infinity
	for(const usr of usuariosConMultiplesClientes){
		const element = usr.toJSON()
		const clientes = []
		for(const dc of element.clientes_agente_customer){
			const cliente = await db.sequelize.models.clientes.findOne({
				paranoid: false,
				attributes: ['id','id_detalle_cliente'],
				where: {id_detalle_cliente: dc.id}
			});
			if(cliente != null){
				clientes.push(cliente.id)
			}
		}
		element.clientes_agente_customer = undefined
		if(menor > clientes.length){
			menor = clientes.length
			usuariosData = []
			usuariosData.push(element.id)
		} else if(menor == clientes.length){
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
	indexHistoricos,
	showHistoricos,
	saveClienteDetalles,
	getAgenteCyC,
	getAgenteC
}
