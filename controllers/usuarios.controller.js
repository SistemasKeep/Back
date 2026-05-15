'use strict'
const {db} = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const seedrandom = require('seedrandom');
const { Relaciones } = require('../middlewares/relaciones');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { MailController } = require('./email.controller');
const path = require('path');
const fs = require('fs').promises;
const { Filtros } = require('../middlewares/filtros');
const { storeList } = require('../controllers/permisos.controller')
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { saveRazonSocial } = require('./razones_sociales.controller')
const { sendMail } = require('./newUser.controller')
const ofac = require('../controllers/validaciones_ofac.controller');
const crypto = require('crypto-js');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.usuarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	var roles = req.query.roles;
	try {
		roles = JSON.parse(req.query.roles)
	} catch (error) {
		roles = []
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cliente.detalles_cliente', 'oficina','roles', 'proveedor','marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: ['cliente.detalles_cliente.comisionista','cliente.detalles_cliente.comisionista.proveedor','cliente.detalles_cliente.mediador_mercantil','cliente.detalles_cliente.agente_credito_cobranza','cliente.detalles_cliente.agente_customer','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				oficina: ['oficina'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo', ],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'cliente.detalles_cliente.comisionista','cliente.detalles_cliente.mediador_mercantil','cliente.detalles_cliente.agente_credito_cobranza','cliente.detalles_cliente.agente_customer','oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo',   ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		if(roles.length > 0){
			relaciones.push({
				model: db.sequelize.models.roles,
				as: 'listRoles', // Nombre del alias que utilizas en tu modelo
				through: {
					attributes: [] // No incluir atributos de la tabla intermedia
				},
				where: {
					id: {[db.Sequelize.Op.or]: roles}
				},
				required: true // Esto asegura que solo se devuelvan usuarios que tengan el rol
			})
		}

		const docs = await db.sequelize.models.usuarios.findAll({
			paranoid: false,
			page: page || 1,
			attributes: { exclude: ['password','code_pass', 'uuid'] },
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		});
		const dataDocs = await db.sequelize.models.usuarios.count({
			paranoid: false,
			attributes: { exclude: ['password','code_pass', 'uuid'] },
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs;
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/usuarios`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for (let index = 0; index < docs.length; index++) {
			var registro = docs[index].toJSON()
			var registroAux = docs[index].toJSON()
			if(req.query.perfil == 'all'){
				const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
					where: {id_usuario: registro.id},
				});
				let idRoles = []
				if(registro.listRoles !== null && registro.listRoles !== undefined){
					registroAux.listRoles = undefined
					registroAux.roles = registro.listRoles
					for(const rol of registroAux.roles){
						if(!idRoles.includes(rol.id)){
							idRoles.push(rol.id)
						}
					}
				}else{
					registroAux.roles = []
				}
				registro.permisos = []
				let idPermisos = []
				for(const roUsuario of rolesUsuario){
					const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
					if(!idRoles.includes(rol.id)){
						idRoles.push(rol.id)
						registroAux.roles.push(rol)
					}
					if(registro.listRoles === null || registro.listRoles === undefined){
						registroAux.roles.push(rol.toJSON())
					}
					const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
						where: {id_role: rol.id}, include: ['permiso']
					});
					for(const permiso of permisosRoles){
						if(!idPermisos.includes(permiso.id)){
							idPermisos.push(permiso.id)
							registro.permisos.push(permiso.permiso.toJSON())
						}
					}
				}
			}
			registroAux.marcas = registro.marcas
			registroAux.permisos = registro.permisos
			data.push(registroAux)
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

async function getRelaciones(registro){
	const relaciones = []
	//Se obtienen las relaciones BelongsTo
	for (const key in registro) {
		let arrayCampo = key.split("_")
		if(arrayCampo.length > 1 && arrayCampo.includes("id")){
			let nameRelacion = ""
			for (let index = 0; index < arrayCampo.length; index++) {
				const ler = arrayCampo[index];
				if(index == 1){
					nameRelacion = nameRelacion  + ler
				} else if(index > 1){
					nameRelacion = nameRelacion  + "_" + ler
				}
				
			}
			relaciones.push(nameRelacion)
		}
	}
	const RelaccionHistorico = new RelacionesHistorico(relaciones,db.sequelize.models,registro)
	registro = await RelaccionHistorico.getRelaciones()
	const relacionesBelongsTo = []
	const foreignKeys = []
	for (const modelo of Object.values(db.sequelize.models)) {
		let asociaciones = modelo.associations
		for (const asociacion of Object.values(asociaciones)) {
			if(asociacion.target.name == db.sequelize.models.usuarios.name){
				if(asociacion.associationType == 'BelongsTo'){
					if(modelo.name == 'roles_usuarios'){
						if(!relacionesBelongsTo.includes(modelo.name)){
							relacionesBelongsTo.push(modelo.name)
							foreignKeys.push(asociacion.foreignKey)
						}
					}
				}
			}
		}
	}
	const RelacionesBelongsTo = new RelacionesHistorico(relacionesBelongsTo,db.sequelize.models,registro,foreignKeys)
	registro =  await RelacionesBelongsTo.getRelacionesBelongTo()
	return registro
}

async function store(req, res){
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'nombre', tipo:'string',largo:255,textoCase:"up"},
							{campo:'password', tipo:'password',largo:255},
							{campo:'email', tipo:'correo',largo:255,textoCase:"low"}]
		if(req.path != "/usuarioAdmin"){
			const validosOpcionales = [{campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos}];
			if(parametros.esProveedor === true){
				parametros.esMediadorMercantil = undefined
				parametros.esColaborador = undefined
				parametros.esAutoemisor = undefined
				obligatorios.push({campo:'idProveedor', tipo:'model', model:db.sequelize.models.oficinas})
				obligatorios.push({campo:'esProveedor',  tipo:'boolean'})
			} else if(parametros.esAutoemisor === true  && (parametros.esColaborador !== true)){
				parametros.esProveedor = undefined
				obligatorios.push({campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes})
				validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
				validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
				obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
			} else if(parametros.esMediadorMercantil === true){
				parametros.esProveedor = undefined
				parametros.esColaborador = undefined
				parametros.esAutoemisor = true
				obligatorios.push({campo:'idMediadorMercantil', tipo:'model', model:db.sequelize.models.comisionistas})
				validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
				validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
				obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
				obligatorios.push({campo:'esMediadorMercantil',  tipo:'boolean'})
			} else if(parametros.esColaborador === true){
				parametros.esProveedor = undefined
				parametros.esMediadorMercantil = undefined
				obligatorios.push({campo:'esColaborador',  tipo:'boolean'})
				validosOpcionales.push({campo:'idOficina', tipo:'model', model:db.sequelize.models.oficinas})
				validosOpcionales.push({campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas})
				if(parametros.esAutoemisor == true){
					obligatorios.push({campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes})
					validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
					validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
					obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
				}
				const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficina);
				if(oficina != null){
					if(oficina.is_interna == false){
						return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina interna." });
					}
				}
			}
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			if(registro.id_cliente !== undefined){
				const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
				if(cliente.cliente_prospecto !== true){
					return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
				}
			}
			const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
			if(dataValidarOpcionales == undefined){
				return undefined;
			}
			registro = dataValidarOpcionales[0]
		}else{
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
		}
		
		if(req.path == "/usuarioAdmin"){
			const registrosEncontrados = await db.sequelize.models.usuarios.findAll({
				where: {
					deletedAt: null
				}
			});
			if(registrosEncontrados.length > 0){
				return res.status(400).send({ status: false, msg: "Registro existente"});
			}
		}else{
			const registrosEncontrados = await db.sequelize.models.usuarios.findAll({
				where: {
					email: {
						[db.Sequelize.Op.like]: `%${parametros.email}%`
					},
					deletedAt: null
				}
			});
			if(registrosEncontrados.length > 0){
				var regExistente = false
				await registrosEncontrados.forEach(registro => {
					if(registro.email.toLowerCase() == parametros.email.toLowerCase()){
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
		}

		registro.password = bcrypt.hashSync(registro.password, 10);
		const nuevoRegistro  = await db.sequelize.models.usuarios.create(registro);

		if(req.path == "/usuarioAdmin"){
			await storeList(req, res)
			const registroMarca = {
				createdAt: moment().tz('America/Mexico_City'),
				nombre: "KeePro",
				clave: "KP"
			}
			await db.sequelize.models.marcas.create(registroMarca);
			return ""
		}
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
		const perfilesValidos = ['cliente.detalles_cliente', 'oficina','roles', 'proveedor','marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: ['cliente.detalles_cliente.comisionista','cliente.detalles_cliente.comisionista.proveedor','cliente.detalles_cliente.mediador_mercantil','cliente.detalles_cliente.agente_credito_cobranza','cliente.detalles_cliente.agente_customer','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				oficina: ['oficina'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.proveedor_tipo',,'proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo',   ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.usuarios.findByPk(id,{ include: relaciones,paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
		if(registroEncontrado != null){
			var registro = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				var registro = registroEncontrado.toJSON()
				const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
					where: {id_usuario: registro.id},
				});
				registro.roles = []
				registro.permisos = []
				for(const roUsuario of rolesUsuario){
					const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
					registro.roles.push(rol.toJSON())
					const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
						where: {id_role: rol.id}, include: ['permiso']
					});
					for(const permiso of permisosRoles){
						registro.permisos.push(permiso.permiso.toJSON())
					}
				}
			}
			return res.status(200).send({ status: true, data: registro});
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
		const registroAEditar = await db.sequelize.models.usuarios.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		let seEdita = false;
		var datosUpdate = {
			updatedAt: moment().tz('America/Mexico_City')}
		let obligatorios = []
		const validosOpcionales = [{campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos},
								   {campo:'nombre', tipo:'string',largo:255,textoCase:"up"},
								   {campo:'password', tipo:'password',largo:255},
								   {campo:'email', tipo:'correo',largo:255,textoCase:"low"}
		];
		if(parametros.esProveedor === true){
			parametros.esMediadorMercantil = undefined
			parametros.esColaborador = undefined
			parametros.esAutoemisor = undefined
			obligatorios.push({campo:'idProveedor', tipo:'model', canNull: true, model:db.sequelize.models.oficinas})
			obligatorios.push({campo:'esProveedor',  tipo:'boolean'})
			datosUpdate.id_cliente = null
			datosUpdate.id_oficina = null
			datosUpdate.id_marca = null
			datosUpdate.id_mediador_mercantil = null
			datosUpdate.es_mediador_mercantil = null
			datosUpdate.es_colaborador = null
			datosUpdate.es_autoemisor = null
			datosUpdate.hora_emision_token = null
			datosUpdate.google_code = null
			datosUpdate.fecha_terminos_condiciones = null
			datosUpdate.envio_automatico = null
			datosUpdate.filtro_visualizacion = null
		} else if(parametros.esColaborador === true){
			parametros.esProveedor = undefined
			parametros.esMediadorMercantil = undefined
			obligatorios.push({campo:'esColaborador',  tipo:'boolean'})
			validosOpcionales.push({campo:'idOficina', tipo:'model', canNull: true, model:db.sequelize.models.oficinas})
			validosOpcionales.push({campo:'idMarca', tipo:'model', canNull: true, model:db.sequelize.models.marcas })
			if(parametros.esAutoemisor === true){
				obligatorios.push({campo:'idCliente', tipo:'model', canNull: true, model:db.sequelize.models.clientes})
				validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
				validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
				obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
			} else if(parametros.esAutoemisor === false){
				datosUpdate.id_cliente = null
				datosUpdate.filtro_visualizacion = null
				datosUpdate.envio_automatico = null
				datosUpdate.es_autoemisor = null
			} else if(registroAEditar.es_autoemisor === false){
				datosUpdate.id_cliente = null
				datosUpdate.filtro_visualizacion = null
				datosUpdate.envio_automatico = null
				datosUpdate.es_autoemisor = null
			}
			datosUpdate.id_proveedor = null
			datosUpdate.id_mediador_mercantil = null
			datosUpdate.es_mediador_mercantil = null
			datosUpdate.es_proveedor = null
			const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficina != undefined ? parametros.idOficina : registroAEditar.id_oficina);
			if(oficina.is_interna == false){
				return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina interna." });
			}
		} else if(parametros.esAutoemisor === true  && (parametros.esColaborador !== true )){
			parametros.esProveedor = undefined
			obligatorios.push({campo:'idCliente', tipo:'model', canNull: true, model:db.sequelize.models.clientes})
			validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
			validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
			obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
			datosUpdate.id_oficina = null
			datosUpdate.id_marca = null
			datosUpdate.id_proveedor = null
			datosUpdate.id_mediador_mercantil = null
			datosUpdate.es_mediador_mercantil = null
			datosUpdate.es_colaborador = null
			datosUpdate.es_proveedor = null
			datosUpdate.hora_emision_token = null
			datosUpdate.google_code = null
			datosUpdate.fecha_code_gen = null
		} else if(parametros.esMediadorMercantil === true){
			parametros.esProveedor = undefined
			parametros.esColaborador = undefined
			obligatorios.push({campo:'idMediadorMercantil', tipo:'model',  canNull: true, model:db.sequelize.models.comisionistas})
			validosOpcionales.push({campo:'filtroVisualizacion',  tipo:'boolean'})
			validosOpcionales.push({campo:'envioAutomatico',  tipo:'boolean'})
			obligatorios.push({campo:'esAutoemisor',  tipo:'boolean'})
			obligatorios.push({campo:'esMediadorMercantil',  tipo:'boolean'})
			datosUpdate.id_cliente = null
			datosUpdate.id_oficina = null
			datosUpdate.id_marca = null
			datosUpdate.id_proveedor = null
			datosUpdate.es_colaborador = null
			datosUpdate.es_proveedor = null
			datosUpdate.hora_emision_token = null
			datosUpdate.google_code = null
			datosUpdate.fecha_code_gen = null
		}
		datosUpdate = await Validaciones.validParametros(req, res,obligatorios,datosUpdate);
		if(!datosUpdate){
			return '';
		}
		if(datosUpdate.id_cliente !== undefined && datosUpdate.id_cliente !== null){
			const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
			if(cliente.cliente_prospecto !== true){
				return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
			}
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		var where = {
			where: {
				email: {
					[db.Sequelize.Op.like]: `%${parametros.email != undefined ? parametros.email : registroAEditar.email}%`
				},
				deletedAt: null
			}
		};
		const registrosEncontrados = await db.sequelize.models.usuarios.findAll(where);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.email.toLowerCase() == (parametros.email != undefined ? parametros.email.toLowerCase() : registroAEditar.email.toLowerCase())) && 
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
		if(datosUpdate.password != undefined){
			datosUpdate.password = bcrypt.hashSync(datosUpdate.password, 10);
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
		const registroAEliminar = await db.sequelize.models.usuarios.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.usuarios.name){
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
		const registroARestaurar = await db.sequelize.models.usuarios.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.usuarios.findAll({
					where: {
						email: {
							[db.Sequelize.Op.like]: `%${registroARestaurar.email}%`
						},
						deletedAt: null
					}
				});
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.email.toLowerCase() == registroARestaurar.email.toLowerCase()) && 
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

async function login(req,res){
	try {
		const parametros = req.body;
		if(parametros.email === undefined || parametros.password === undefined){
			return res.status(400).json({ status:false, message: 'No se enviaron todos los parametros, favor de validar' });
		}
		const registroEncontrado = await db.sequelize.models.usuarios.findOne({ where: { email: parametros.email,deletedAt: null } });
		if(registroEncontrado == undefined){
			return res.status(401).json({ status:false, message: 'Credenciales inválidas' });
		}
		if (!bcrypt.compareSync(parametros.password, registroEncontrado.password)) {
			return res.status(401).json({ status:false, message: 'Credenciales inválidas' });
		}
		var duracionToken =  /*process.env.NODE_ENV != 'producction' ? undefined : */ { expiresIn:'1h' }
		if(registroEncontrado.uuid == null){
			const uuid = uuidv4();
			await registroEncontrado.update({uuid:uuid}, { where: { id: registroEncontrado.id } });
		}
		const token = jwt.sign({ idUsuario: registroEncontrado.uuid}, process.env.TOKEN_KEY, duracionToken);

	
		var relaciones = []
		const parametrosRelaciones = [ 'cliente.detalles_cliente','marca','proveedor']
		const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
		relaciones = await findRelaciones.getRelaciones()
		const usuario = await db.sequelize.models.usuarios.findByPk(registroEncontrado.id,{ include: relaciones, paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
		var registro = usuario.toJSON()
		const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
			where: {id_usuario: registro.id},
		});
		registro.roles = []
		registro.permisos = []
		for(const roUsuario of rolesUsuario){
			const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
			registro.roles.push(rol.toJSON())
			const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
				where: {id_role: rol.id}, include: ['permiso']
			});
			for(const permiso of permisosRoles){
				registro.permisos.push(permiso.permiso.toJSON())
			}
		}
		if(usuario.es_nuevo_autoemisor){
			return res.status(200).json({ status:true, token:token, esNuevoAutoEmisor:true, msg: 'Se debe cambiar la contraseña'})
		}
		return res.status(200).json( { status:true, token:token, esNuevoAutoEmisor: false,  usuario: registro} )
	} catch (error) {
		return res.status(400).json({ status:false, message: 'No se enviaron todos los parametros, favor de validar' });
	}
}

async function loginApi(req,res){
	try {
		const parametros = req.body;
		if(parametros.email === undefined || parametros.password === undefined){
			return res.status(400).json({ status:false, message: 'No se enviaron todos los parametros, favor de validar' });
		}
		const registroEncontrado = await db.sequelize.models.usuarios.findOne({ where: { email: parametros.email,deletedAt: null } });
		if(registroEncontrado == undefined){
			return res.status(401).json({ status:false, message: 'Credenciales inválidas' });
		}
		if (!bcrypt.compareSync(parametros.password, registroEncontrado.password)) {
			return res.status(401).json({ status:false, message: 'Credenciales inválidas' });
		}
		var duracionToken =  /*process.env.NODE_ENV != 'producction' ? undefined : */ { expiresIn:'1h' }
		if(registroEncontrado.uuid == null){
			const uuid = uuidv4();
			await registroEncontrado.update({uuid:uuid}, { where: { id: registroEncontrado.id } });
		}
		const token = jwt.sign({ idUsuario: registroEncontrado.uuid}, process.env.TOKEN_KEY, duracionToken);

	
		var relaciones = []
		const parametrosRelaciones = [ 'cliente.detalles_cliente','marca','proveedor']
		const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
		relaciones = await findRelaciones.getRelaciones()
		const usuario = await db.sequelize.models.usuarios.findByPk(registroEncontrado.id,{ include: relaciones, paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
		var registro = usuario.toJSON()
		const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
			where: {id_usuario: registro.id},
		});
		registro.roles = []
		registro.permisos = []
		for(const roUsuario of rolesUsuario){
			const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
			registro.roles.push(rol.toJSON())
			const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
				where: {id_role: rol.id}, include: ['permiso']
			});
			for(const permiso of permisosRoles){
				registro.permisos.push(permiso.permiso.toJSON())
			}
		}
		if(usuario.es_nuevo_autoemisor){
			return res.status(200).json({ status:true, token:token, msg: 'Se debe cambiar la contraseña'})
		}
		return res.status(200).json( { status:true, token:token,  usuario: {
			id: registro.id,
			nombre: registro.nombre,
			email: registro.email,
			cliente: registro.cliente.nombre,
		}} )
	} catch (error) {
		return res.status(400).json({ status:false, message: 'No se enviaron todos los parametros, favor de validar' });
	}
}

async function getCurrenUser(req,res){
	var relaciones = []
	const parametrosRelaciones = [ 'cliente.detalles_cliente','marca','proveedor']
	const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
	relaciones = await findRelaciones.getRelaciones()
	const usuario = await db.sequelize.models.usuarios.findOne({where:{uuid:req.usuario.uuid}, include: relaciones, paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
	var registro = usuario.toJSON()
	const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
		where: {id_usuario: registro.id},
	});
	registro.roles = []
	registro.permisos = []
	for(const roUsuario of rolesUsuario){
		const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
		registro.roles.push(rol.toJSON())
		const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
			where: {id_role: rol.id}, include: ['permiso']
		});
		for(const permiso of permisosRoles){
			registro.permisos.push(permiso.permiso.toJSON())
		}
	}
	return res.status(200).json( { status:true, usuario: registro } )
}

async function getCurrenUserApi(req,res){
	var relaciones = []
	const parametrosRelaciones = [ 'cliente.detalles_cliente','marca','proveedor']
	const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
	relaciones = await findRelaciones.getRelaciones()
	const usuario = await db.sequelize.models.usuarios.findOne({where:{uuid:req.usuario.uuid}, include: relaciones, paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
	var registro = usuario.toJSON()
	const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
		where: {id_usuario: registro.id},
	});
	registro.roles = []
	registro.permisos = []
	for(const roUsuario of rolesUsuario){
		const rol = await db.sequelize.models.roles.findByPk(roUsuario.id_role);
		registro.roles.push(rol.toJSON())
		const permisosRoles = await db.sequelize.models.permisos_roles.findAll({
			where: {id_role: rol.id}, include: ['permiso']
		});
		for(const permiso of permisosRoles){
			registro.permisos.push(permiso.permiso.toJSON())
		}
	}
	return res.status(200).json( { status:true, usuario: {
		id: registro.id,
		nombre: registro.nombre,
		email: registro.email,
		cliente: registro.cliente.nombre,
	} } )
}

async function changePassword(req, res){
	const parametros = req.body;
	try {
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}

		let obligatorios = [{campo:'passwordActual', tipo:'password',largo:255},
							{campo:'passwordNueva', tipo:'password',largo:255},
							{campo:'passwordNuevaVerif', tipo:'password',largo:255}]
		datosUpdate = await Validaciones.validParametros(req, res,obligatorios,datosUpdate);
		if(!datosUpdate){
			return '';
		}
		const registroAEditar = await db.sequelize.models.usuarios.findByPk(req.usuario.id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if (!bcrypt.compareSync(parametros.passwordActual, registroAEditar.password)) {
			return res.status(401).json({ status:false, message: 'Credenciales inválidas' });
		}
		if (parametros.passwordActual == parametros.passwordNueva) {
			return res.status(401).json({ status:false, message: 'La contraseña debe ser diferente a la actual' });
		}
		if (parametros.passwordNueva != parametros.passwordNuevaVerif) {
			return res.status(401).json({ status:false, message: 'Las contraseñas no coinciden' });
		}
		datosUpdate.password = bcrypt.hashSync(parametros.passwordNueva, 10);
		
		if(registroAEditar.es_nuevo_autoemisor){
			datosUpdate.es_nuevo_autoemisor = false;
		}
		await registroAEditar.update(datosUpdate, { where: { id: req.usuario.id } });

		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function sendCode(req, res){
	try {
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		req.body.email = req.body.email !== undefined && req.body.email !== null && req.body.email !== "" ? req.body.email.trim() : req.body.email

		let obligatorios = [{campo:'email', tipo:'correo',largo:255,textoCase:"low"}]
		datosUpdate = await Validaciones.validParametros(req, res,obligatorios,datosUpdate);
		if(!datosUpdate){
			return '';
		}
		const registrosAEditar = await db.sequelize.models.usuarios.findAll({where: { email: datosUpdate.email }});
		const registroAEditar = registrosAEditar[0]
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if(registroAEditar.code_pass == null){
			await genCode(registroAEditar);
			return res.status(200).send({ status: true, msg: "Código enviado correctamente"});
		}else{
			const fechaCodeGen = moment(registroAEditar.fecha_code_gen ?? "2000-05-30 12:34:56").tz('America/Mexico_City').add(5, 'minutes');
			const now = moment().tz('America/Mexico_City')
			if (fechaCodeGen.isAfter(now)) {
				return res.status(400).send({ status: false, msg: "Espera 5 minutos para generar nuevo código" });
			}
			await genCode(registroAEditar);
			return res.status(200).send({ status: true, msg: "Código enviado correctamente"});
		}
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function genCode(usuario){
	const mail = usuario.email;
	const code = await getNumAleatorio()
	const now = moment().tz('America/Mexico_City')
	const nowString = now.format('YYYY-MM-DD HH:mm:ss');
	usuario.code_pass = code;
	usuario.fecha_code_gen = nowString;
	await usuario.update({code_pass: code, fecha_code_gen: nowString}, { where: { id: usuario.id } });
	const data = {
		'idUsuario':usuario.id,
		'userName':usuario.nombre.toUpperCase(),
		'mail':mail,
		'code': code,
		'now': nowString
	};
	sendMailResetPass('reset_password',[{nombre:'userName',contenido: usuario.nombre.toUpperCase()},{nombre:'verificationCode',contenido: code}],data);
	return data;
}

async function getNumAleatorio(){
    const fechaActualMillis = moment().tz('America/Mexico_City').valueOf();
    const rng = seedrandom(fechaActualMillis.toString() + 'reestablecer_pass'); 
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let cadenaAlfanumerica = '';

    for (let i = 0; i < 6; i++) {
        const indice = Math.floor(rng() * caracteres.length);
        cadenaAlfanumerica += caracteres.charAt(indice);
    }

    return cadenaAlfanumerica;
}

async function sendMailResetPass(tpl,data,info){
    const rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `${tpl}.html`);
	var htmlContent = await fs.readFile(rutaArchivoHTML, 'utf8');
	for (let index = 0; index < data.length; index++) {
		const campo = data[index];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}
	let mailOptions = {
		to: [info.mail],
		subject: 'Reestablecer contraseña',
		html: htmlContent
	};
	const mainSender = new MailController(info.idUsuario,null,mailOptions, null,false, true)
	mainSender.sendMail()
}

async function verifCode(req, res){
	const parametros = req.body;
	try {
		parametros.verifCode = parametros.verifCode !== undefined && parametros.verifCode !== null && parametros.verifCode !== "" ? parametros.verifCode.trim() : parametros.verifCode
		parametros.email = parametros.email !== undefined && parametros.email !== null && parametros.email !== "" ? parametros.email.trim() : parametros.email
		parametros.passwordNueva = parametros.passwordNueva !== undefined && parametros.passwordNueva !== null && parametros.passwordNueva !== "" ? parametros.passwordNueva.trim() : parametros.passwordNueva
		parametros.passwordNuevaVerif = parametros.passwordNuevaVerif !== undefined && parametros.passwordNuevaVerif !== null && parametros.passwordNuevaVerif !== "" ? parametros.passwordNuevaVerif.trim() : parametros.passwordNuevaVerif
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		let obligatorios = [{campo:'verifCode', tipo:'string', textoCase:"up", largo:255},
							{campo:'email', tipo:'correo',largo:255,textoCase:"low"},
							{campo:'passwordNueva', tipo:'password',largo:255},
							{campo:'passwordNuevaVerif', tipo:'password',largo:255}]
		datosUpdate = await Validaciones.validParametros(req, res,obligatorios,datosUpdate);
		if(!datosUpdate){
			return '';
		}
		const registrosAEditar = await db.sequelize.models.usuarios.findAll({where: { email: datosUpdate.email }});
		const registroAEditar = registrosAEditar[0]
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if (parametros.verifCode != registroAEditar.code_pass) {
			return res.status(401).json({ status:false, message: 'Código inválido' });
		}
		if (bcrypt.compareSync(parametros.passwordNueva, registroAEditar.password)) {
			return res.status(401).json({ status:false, message: 'La contraseña debe ser diferente a la actual' });
		}
		if (parametros.passwordNueva != parametros.passwordNuevaVerif) {
			return res.status(401).json({ status:false, message: 'Las contraseñas no coinciden' });
		}
		datosUpdate.password = bcrypt.hashSync(parametros.passwordNueva, 10);
		datosUpdate.code_pass = null;
		datosUpdate.fecha_code_gen = null;
		await registroAEditar.update(datosUpdate, { where: { id: registroAEditar.id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function updateDateTerminosCondiciones(req, res){
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		var datosUpdate = {
			updatedAt: moment().tz('America/Mexico_City'),
			fecha_terminos_condiciones: moment().tz('America/Mexico_City')			  
		}
	
		const registroAEditar = await db.sequelize.models.usuarios.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Usuario no existe" });
		}else if(registroAEditar.fecha_terminos_condiciones != null){
			return res.status(400).send({ status: true, msg: "Términos y condiciones aceptados con anterioridad." });
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Términos y condiciones aceptados correctamente."});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'marca';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.usuarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['marca', 'all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'cliente.detalles_cliente.comisionista','cliente.detalles_cliente.mediador_mercantil','cliente.detalles_cliente.agente_credito_cobranza','cliente.detalles_cliente.agente_customer','oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo',   ]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.usuarios.findAll({
			paranoid: false,
			page: 1,
			attributes: { exclude: ['password','code_pass', 'uuid'] },
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro,
		});

		const data = [];
		for (let index = 0; index < docs.length; index++) {
			var registro = docs[index].toJSON()
			var registroAux = docs[index].toJSON()
			data.push(registroAux)
		}

		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			aux = {
				'Nombre': elemento.nombre,
				'Correo Electrónico': elemento.email,
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Usuarios';
		const namesSheets = [db.sequelize.models.usuarios.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		return await reporte.gerReporteOneSheet(res,req);
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function storeOpen(req, res){
	const parametros = req.body;
	try {
		var registro = {}
		parametros.idNacionalidadTimbrado = 96

		let obligatorios = [{campo:'razonSocial', tipo:'string',largo:255,textoCase:"up"},
							{campo:'noIdentificacion', tipo:'string',largo:255,textoCase:"up",verifNoSpace:true},
							{campo:'idEstado', tipo:'model',model:db.sequelize.models.estados},
							{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idNacionalidadTimbrado', tipo:'model',model:db.sequelize.models.paises},
							{campo:'municipio', tipo:'string',largo:100,textoCase:"title"},
							{campo:'codigoPostal', tipo:'string',largo:20},
							{campo:'calle', tipo:'string',largo:255,textoCase:"title"},
							{campo:'numExt', tipo:'stringInt',largo:50},
							{campo:'idRegimenFiscal', tipo:'model',model:db.sequelize.models.regimenes_fiscal},
							{campo:'tipoPersona', tipo:'enum', largo:1, textoCase:"up", enum: ['F', 'M']},
							{campo:'idUsoCfdi', tipo:'model',largo:null,model:db.sequelize.models.usos_cfdi},
							{campo:'idMetodoPago', tipo:'model',largo:null,model:db.sequelize.models.metodos_pago},
							{campo:'idFormaPago', tipo:'model',model:db.sequelize.models.formas_pago},
							{campo:'idMonedaCredito',tipo:'model',model:db.sequelize.models.monedas},
							{campo:'limiteCredito',tipo:'number'},
							{campo:'diasCredito',tipo:'number'},
							{campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
							{campo:'apellidoPaterno', tipo:'string',largo:100,textoCase:"up"},
							{campo:'email', tipo:'correo',largo:100,textoCase:"up"},
							{campo:'telefono', tipo:'stringInt',largo:15},
							{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
						]
	
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return undefined;
		}
		const validosOpcionales =[{campo:'ciudadLocalidad',tipo:'string',textoCase:"up",largo:100},
								  {campo:'numInt',tipo:'string',largo:50},
								  {campo:'apellidoMaterno', tipo:'string',largo:100,textoCase:"up"},]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		if(parametros.idCliente != 69){
			return res.status(400).send({ status: false, msg: "El cliente no es válido."});
		}
		
		
		const registrosEncontrados = await db.sequelize.models.usuarios.findAll({
			where: {
				email: {
					[db.Sequelize.Op.like]: `%${parametros.email}%`
				},
				deletedAt: null
			}
		});


		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.email.toLowerCase() == parametros.email.toLowerCase()){
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
		const clienteACopiar = await db.sequelize.models.clientes.findByPk(registro.id_cliente,{include: ['detalles_cliente']});
		if(clienteACopiar.detalles_cliente.id_mediador_mercantil == null){
			return res.status(400).send({ status: true, msg: "El cliente con idCliente: " + registro.id_cliente + ", no cuenta con mediador mercantil."});
		}

		const payloadClienteDetalle = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City'),
			fecha_factura: moment().tz('America/Mexico_City'),
			id_mediador_mercantil: clienteACopiar.detalles_cliente.id_mediador_mercantil,
			cliente_prospecto: true,
			autoemisor: false // se colocara como true una vez que suba los archivos especificados a su expediente
		}
		const clienteDetalle = await db.sequelize.models.cliente_detalles.create(payloadClienteDetalle);

		const payloadCliente = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City'),
			id_tipo_cliente: 5,
			id_estado: registro.id_estado,
			id_fuente: 5,
			nombre: registro.razon_social,
			cliente_prospecto: true,
			id_tipo_cliente: 1,
			id_detalle_cliente: clienteDetalle.id
		}

		//Validación de la OFAC
		const name = payloadCliente.nombre;
		let datosEntidad = {
			nombre: name,
			pais: '',
			rfc: ''
		}

		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		let cliente = undefined;

		if(entidadValidada.success){			
			if(entidadValidada.coincidencias.matches[name].length > 0){
				const entidades = entidadValidada.coincidencias.matches[name];
				let coincidenciaExacta = false;

				//verifica que el nombre se parezca
				for (let i = 0; i < entidades.length; i++) {
					const entidad = entidades[i];			
					const nombreOfac = await ManipuladorCadenas.quitarAcentos(entidad.fullName.toLowerCase());
					const nombreSist = await ManipuladorCadenas.quitarAcentos(datosEntidad.nombre.toLowerCase());

					if(nombreOfac == nombreSist){
						coincidenciaExacta = true;
					}
				}

				if(coincidenciaExacta == true){
					cliente = entidadValidada.coincidencias.matches;
					return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: cliente});
				}	
			}
			cliente = await db.sequelize.models.clientes.create(payloadCliente);
		}else{
			return res.status(500).send({ status: false, msg: "Error al validar el cliente ante la OFAC"});
		}
		const pais = await db.sequelize.models.paises.findByPk(parametros.idPais);
		const payloadOficina = {
			nombre: `${payloadCliente.nombre} - ${pais.descripcion}`,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City'),
		}
		const oficina = await db.sequelize.models.oficinas.create(payloadOficina);
		const payloadOficinaCliente = {
			id_cliente: cliente.id,
			id_oficina: oficina.id,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City'),
		}
		const  oficinaCliente = await db.sequelize.models.oficinas_cliente.create(payloadOficinaCliente);
		await db.sequelize.models.marca_agentes_clientes.create({
			id_cliente: cliente.id,
			id_marca: 1,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		});
		const marca = await db.sequelize.models.marcas.findByPk(1);
		const clave = marca.clave + "-" + cliente.id + "-" + 1
		const mao = await db.sequelize.models.marca_agentes_oficinas.create({
			id_oficina_cliente: oficinaCliente.id,
			id_marca: 1,
			clave: clave,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		});
		const parametrosRazonSocial = {
			idPais: parametros.idPais,
			idRegimenFiscal: parametros.idRegimenFiscal,
			idNacionalidadTimbrado: parametros.idNacionalidadTimbrado,
			idUsoCfdi: parametros.idUsoCfdi,
			idMetodoPago: parametros.idMetodoPago,
			idFormaPago: parametros.idFormaPago,
			noIdentificacion: parametros.noIdentificacion,
			razonSocial: parametros.razonSocial,
			idCliente: cliente.id,
			tipoPersona: parametros.tipoPersona,
			idMonedaCredito: parametros.idMonedaCredito,
			limiteCredito: parametros.limiteCredito,
			diasCredito: parametros.diasCredito,
			domicilios: [{
				tipo: "F",
				idEstado: parametros.idEstado,
				municipio: parametros.municipio,
				codigoPostal: parametros.codigoPostal,
				calle: parametros.calle,
				numExt: parametros.numExt,
				ciudadLocalidad: parametros.ciudadLocalidad,
				numInt: parametros.numInt,
				colonia: parametros.colonia
			}],
		}
		const razonSocial = await saveRazonSocial(parametrosRazonSocial, res, null)
		if(razonSocial == undefined){
			return undefined;
		}else if(razonSocial.status === false){
			return res.status(400).send(razonSocial);
		}
		await db.sequelize.models.oficinas_razones_sociales.create({
			id_oficina: oficina.id,
			id_razon_social: razonSocial.id,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		});
		//Clonar todos los productos y atributos
		let oficinasClienteACopiar = await db.sequelize.models.oficinas_cliente.findAll({
			where: {id_cliente: registro.id_cliente}
		});
		if(oficinasClienteACopiar.length > 1 && (parametros.idOficina === null || parametros.idOficina === undefined)){
			return res.status(200).send({ status: true, msg: "El cliente a copiar cuenta con más de una oficina, y no se recibio idOficina. Es necesario especificar el registro de la oficina a copiar."});
		}else if(oficinasClienteACopiar.length > 1 && (parametros.idOficina !== null || parametros.idOficina !== undefined)){
			oficinasClienteACopiar = await db.sequelize.models.oficinas_cliente.findAll({
				where:{
					id_cliente: registro.id_cliente,
					id_oficina: parametros.idOficina
				}
			});
			if(oficinasClienteACopiar.length != 1){
				return res.status(200).send({ status: true, msg: "No se encontro el registro de oficina cliente con los datos recibidos.", data: {id_cliente:registro.id_cliente, idOficina: parametros.id_oficina}});
			}
			return res.status(200).send({ status: true, msg: "El cliente a copiar cuenta con más de una oficina, y no se recibio idOficina. Es necesario especificar el registro de la oficina a copiar."});
		} else if(oficinasClienteACopiar.length == 0){
			return res.status(200).send({ status: true, msg: "El cliente a copiar no cuenta con oficina registrada."});
		}
		const oficinaClienteACopiar = oficinasClienteACopiar[0]

		const maoACopiar = await db.sequelize.models.marca_agentes_oficinas.findOne({
			where:{id_oficina_cliente: oficinaClienteACopiar.id}
		});
		if(maoACopiar == null){
			return res.status(200).send({ status: true, msg: "El cliente a copiar no cuenta con registro de agentes oficinas. Es necesario tenga registro para realizar el copiado."});
		}
		const oficinasProductosACopiar = await db.sequelize.models.oficinas_productos.findAll({
			where:{id_marca_agente_oficina: maoACopiar.id}
		});
		for(const opCopiar of oficinasProductosACopiar){
			const oficinaProducto = await db.sequelize.models.oficinas_productos.create({
				id_producto: opCopiar.id_producto,
				id_marca_agente_oficina: mao.id,
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			});
			const atributosKeepro = await db.sequelize.models.atributos_keepro.findAll({where:{
				id_oficina_producto: opCopiar.id
			}});
			for(const atributoKeepro of atributosKeepro){
				await db.sequelize.models.atributos_keepro.create({
					id_proveedor: atributoKeepro.id_proveedor,
					id_oficina_producto: oficinaProducto.id,
					id_moneda_compra: atributoKeepro.id_moneda_compra,
					id_moneda_venta: atributoKeepro.id_moneda_venta,
					id_beneficiario: atributoKeepro.id_beneficiario,
					id_commodity: atributoKeepro.id_commodity,
					id_tipo_contenedor: atributoKeepro.id_tipo_contenedor,
					id_pais_origen: atributoKeepro.id_pais_origen,
					id_pais_destino: atributoKeepro.id_pais_destino,
					descripcion: atributoKeepro.descripcion,
					tarifa_compra_forzosa: atributoKeepro.tarifa_compra_forzosa,
					is_deducible: atributoKeepro.is_deducible,
					limite_inferior: atributoKeepro.limite_inferior,
					limite_superior: atributoKeepro.limite_superior,
					tarifa_final_cliente: atributoKeepro.tarifa_final_cliente,
					tarifa_final_cliente_deducible: atributoKeepro.tarifa_final_cliente_deducible,
					minimo_venta: atributoKeepro.minimo_venta,
					tarifa_mediador_mercantil: atributoKeepro.tarifa_mediador_mercantil,
					minimo_mediador_mercantil: atributoKeepro.minimo_mediador_mercantil,
					minimo_venta_deducible: atributoKeepro.minimo_venta_deducible,
					tarifa_mediador_deducible: atributoKeepro.tarifa_mediador_deducible,
					minimo_mediador_mercantil_deducible: atributoKeepro.minimo_mediador_mercantil_deducible,
					tarifa_compra_especial: atributoKeepro.tarifa_compra_especial,
					minimo_compra_especial: atributoKeepro.minimo_compra_especial,
					comision_externa: atributoKeepro.comision_externa,
					comision_interna: atributoKeepro.comision_interna,
					num_movimientos: atributoKeepro.num_movimientos,
					fecha_vencimiento: atributoKeepro.fecha_vencimiento,
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				});
			}
		}
		
		await db.sequelize.models.contactos.create({
			id_ficina: oficina.id,
			nombre: registro.nombre,
			apellido_paterno: registro.apellido_paterno,
			departamento: "",
			puesto: "",
			email: registro.email,
			telefono: registro.telefono,
			maneraEnviar: 'M',
			diaEnvio: 1,
			apellido_materno: registro.apellido_materno,
			enviarCorreo: true,
			enviarEstadoCuenta: true,
			enviarFactura: true,
			enviarCertificado: true,
			esUsuario: true,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
			
		});
		const nombreCompleto = `${registro.nombre} ${registro.apellido_paterno} ${registro.apellido_materno}`;
		const passTemp = crypto.lib.WordArray.random(8).toString(crypto.enc.Base64).substring(0,8);
		const usuario  = await db.sequelize.models.usuarios.create({
			nombre: nombreCompleto,
			password: bcrypt.hashSync(passTemp, 10),
			email: registro.email,
			es_autoemisor: true,
			id_cliente: cliente.id,
			envio_automatico: true,
			filtro_visualizacion: true,
			id_carga_archivo: null,
			es_nuevo_autoemisor: true,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		});
        await db.sequelize.models.roles_usuarios.create({
			id_role: 18,
			id_usuario: usuario.id,
		});
        await db.sequelize.models.roles_usuarios.create({
			id_role: 146,
			id_usuario: usuario.id,
		});
		const info = {
			'idUsuario':null,
			'idMarca':1,
			'userName': nombreCompleto.toUpperCase(),
			'email': registro.email,
		};
		sendMail('registro_usuario',[{nombre:'userName',contenido: nombreCompleto.toUpperCase()}, {nombre:'email', contenido: registro.email.toLowerCase()},{nombre:'tempPassword', contenido:passTemp}],info);

		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {cliente:cliente.id}});
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
	login,
	loginApi,
	changePassword,
	sendCode,
	verifCode,
	getCurrenUser,
	getCurrenUserApi,
	updateDateTerminosCondiciones,
	exportar,
	storeOpen
}