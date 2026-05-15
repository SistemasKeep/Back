'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.proveedores_monedas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['moneda', 'proveedor', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				moneda: ['moneda'],
                proveedor: [
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
					'proveedor.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.marca.dato_facturacion.pais.continente', 
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
					'proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ],
				all: [
                    'moneda',
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
					'proveedor.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.marca.dato_facturacion.pais.continente', 
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
					'proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [
                    'moneda',
                    'proveedor',
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca',
                    'proveedor.marca.domicilio',
                    'proveedor.marca.domicilio.estado',
                    'proveedor.marca.domicilio.estado.pais',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
                    'proveedor.almacen',
                    'proveedor.almacen.marca',
                    'proveedor.almacen.marca.domicilio',
                    'proveedor.almacen.marca.domicilio.estado',
                    'proveedor.almacen.marca.domicilio.estado.pais',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ]
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.proveedores_monedas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})

		const dataDocs = await db.sequelize.models.proveedores_monedas.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/proveedoresMonedas`;
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
		const validosOpcionales =[
            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
            {campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores}
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.proveedores_monedas.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_moneda: parametros.idMoneda,
                    id_proveedor: parametros.idProveedor,
					deletedAt: null
				}
			}
		});

		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_moneda == parametros.idMoneda && registro.id_proveedor == parametros.idProveedor){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Esa moneda ya se encuentra registrada para ese proveedor"});
						}
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.proveedores_monedas.create(registro);
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
		const perfilesValidos = ['moneda', 'proveedor', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				moneda: ['moneda'],
                proveedor: [
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
					'proveedor.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.marca.dato_facturacion.pais.continente', 
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
					'proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ],
				all: [
                    'moneda',
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
					'proveedor.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.marca.dato_facturacion.pais.continente', 
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
					'proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [
                    'moneda',
                    'proveedor',
                    'proveedor.moneda',
                    'proveedor.conceptos_presupuesto',
                    'proveedor.marca',
                    'proveedor.marca.domicilio',
                    'proveedor.marca.domicilio.estado',
                    'proveedor.marca.domicilio.estado.pais',
                    'proveedor.marca.domicilio.estado.pais.continente',
                    'proveedor.marca.pais',
                    'proveedor.marca.pais.continente',
                    'proveedor.marca.archivo',
                    'proveedor.almacen',
                    'proveedor.almacen.marca',
                    'proveedor.almacen.marca.domicilio',
                    'proveedor.almacen.marca.domicilio.estado',
                    'proveedor.almacen.marca.domicilio.estado.pais',
                    'proveedor.almacen.marca.domicilio.estado.pais.continente',
                    'proveedor.almacen.marca.pais',
                    'proveedor.almacen.marca.pais.continente',
                    'proveedor.almacen.marca.archivo',
                    'proveedor.almacen.ubicacion_defecto',
                    'proveedor.proveedor_tipo',
                ]
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.proveedores_monedas.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales = [
            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
            {campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores}
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
		const registroAEditar = await db.sequelize.models.proveedores_monedas.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]: {
					id_moneda: parametros.idMoneda != undefined ? parametros.idMoneda : registroAEditar.id_moneda,
                    id_proveedor: parametros.idProveedor != undefined ? parametros.idProveedor : registroAEditar.id_proveedor,
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.proveedores_monedas.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_moneda == (parametros.idMoneda != undefined ? parametros.idMoneda : registroAEditar.id_moneda) &&
                    registro.id_proveedor == (parametros.idProveedor != undefined ? parametros.idProveedor : registroAEditar.id_proveedor)) &&
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
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.proveedores_monedas.name.toUpperCase() ,
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
		
		return res.status(200).send({ status: true, msg: "Registro editado con éxito" });
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
		const registroAEliminar = await db.sequelize.models.proveedores_monedas.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.proveedores_monedas.name){
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
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.proveedores_monedas.name.toUpperCase() ,
				accion: 'ELIMINAR',
				createdAt: moment().tz('America/Mexico_City')
			}
			//encriptación para eliminar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEliminar);
			registro2.encriptacion_previa = stringEncriptado;

			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
			
			const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
			registro2.encriptacion_posterior = stringEncriptado2;
			const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
			
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
		const registroARestaurar = await db.sequelize.models.proveedores_monedas.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.proveedores_monedas.findAll({
					where: {
						[db.Sequelize.Op.and]: {
                            id_moneda: registroARestaurar.id_moneda,
							id_proveedor: registroARestaurar.id_proveedor,
							deletedAt: null
						}
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.id_proveedor == registroARestaurar.id_proveedor && registro.id_moneda == registroARestaurar.id_moneda) &&
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
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.proveedores_monedas.name.toUpperCase(),
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
			tabla: db.sequelize.models.proveedores_monedas.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.proveedores_monedas.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud proveedores_monedas" });
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
			if(asociacion.target.name == db.sequelize.models.proveedores_monedas.name){
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

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos
}
