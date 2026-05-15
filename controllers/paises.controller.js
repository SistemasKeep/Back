'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const axios = require('axios');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.paises.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['continente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				continente: ['continente'],
				all: ['continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = ['continente' ]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}
		
		const docs = await db.sequelize.models.paises.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.paises.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/paises`;
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
		let obligatorios = [{campo:'idContinente', tipo:'model',model:db.sequelize.models.continentes},
							{campo:'descripcion', tipo:'string',largo:255,textoCase:"up"},
							{campo:'clave', tipo:'string',largo:255,textoCase:"up"},
							{campo:'claveSat', tipo:'string',largo:255,textoCase:"up"},
							{campo:'lada', tipo:'number'},
							{campo:'mostrarBeneficiario',tipo:'boolean'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const registrosEncontrados = await db.sequelize.models.paises.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_continente: parametros.idContinente,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					descripcion: {
						[db.Sequelize.Op.like]: `%${parametros.descripcion}%`
					},
					clave: {
						[db.Sequelize.Op.like]: `%${parametros.clave}%`
					},
					clave_sat: {
						[db.Sequelize.Op.like]: `%${parametros.claveSat}%`
					},
					lada: {
						[db.Sequelize.Op.like]: `%${parametros.lada}%`
					}
				}
			}
		});
		
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.descripcion.toLowerCase() == parametros.descripcion.toLowerCase() ||
				   registro.clave.toLowerCase() == parametros.clave.toLowerCase() ||
				   registro.clave_sat.toLowerCase() == parametros.claveSat.toLowerCase() ||
				   registro.lada == parametros.lada){
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
		
		const nuevoRegistro = await db.sequelize.models.paises.create(registro);
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
		const perfilesValidos = ['estados', 'continente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				estados: ['estados'],
				continente: ['continente'],
				all: ['estados','continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 'estados', 'continente' ]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.paises.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			if(req.query.keepro === 3){
				const element = {
					id: registroEncontrado.id,
					clave: registroEncontrado.clave,
					descripcion: registroEncontrado.descripcion,
				}
				return res.status(200).send({ status: true, data: element});
			}
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
	
		const validosOpcionales =[{campo:'idContinente',tipo:'model',model:db.sequelize.models.continentes},
								  {campo:'descripcion',tipo:'string',textoCase:"up",largo:255},
								  {campo:'clave',tipo:'string',textoCase:"up",largo:255},
								  {campo:'claveSat', tipo:'string',largo:255,textoCase:"up"},
								  {campo:'lada',tipo:'number'},
								  {campo:'mostrarBeneficiario',tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.paises.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var where = {
			where: {
				[db.Sequelize.Op.and]: {
					id_continente:parametros.idContinente != undefined ? parametros.idContinente : registroAEditar.id_continente,
					deletedAt: null
				},
				[db.Sequelize.Op.or]:{
					clave: {
						[db.Sequelize.Op.like]: `%${parametros.clave != undefined ?parametros.clave:registroAEditar.clave}%`
					},
					clave_sat: {
						[db.Sequelize.Op.like]: `%${parametros.claveSat != undefined ?parametros.claveSat:registroAEditar.clave_sat}%`
					},
					lada: {
						[db.Sequelize.Op.like]: `%${parametros.lada != undefined ?parametros.lada:registroAEditar.lada}%`
					},
					descripcion: {
						[db.Sequelize.Op.like]: `%${parametros.descripcion}%`
					}
				}
			}
		};
		const registrosEncontrados = await db.sequelize.models.paises.findAll(where);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.clave.toLowerCase() == (parametros.clave != undefined ? parametros.clave.toLowerCase() : registroAEditar.clave.toLowerCase())) ||
					(registro.clave_sat.toLowerCase() == (parametros.claveSat != undefined ? parametros.claveSat.toLowerCase() : registroAEditar.clave_sat.toLowerCase())) ||
					(registro.lada == (parametros.lada != undefined ? parametros.lada : registroAEditar.lada)) ||
					(registro.descripcion.toLowerCase() == (parametros.descripcion != undefined ? parametros.descripcion.toLowerCase() : registroAEditar.descripcion.toLowerCase()))) && 
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
			tabla: db.sequelize.models.paises.name.toUpperCase() ,
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
		const registroAEliminar = await db.sequelize.models.paises.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.paises.name){
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
				tabla: db.sequelize.models.paises.name.toUpperCase() ,
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
		const registroARestaurar = await db.sequelize.models.paises.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.paises.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_continente: registroARestaurar.id_continente,
							deletedAt: null
						},
						[db.Sequelize.Op.or]:{
							descripcion: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.descripcion}%`
							},
							clave: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.clave}%`
							},
							clave_sat: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.clave_sat}%`
							},
							lada: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.lada}%`
							}
						}
					}
				});
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.descripcion.toLowerCase() == registroARestaurar.descripcion.toLowerCase() ||
							registro.clave.toLowerCase() == registroARestaurar.clave.toLowerCase() ||
							registro.clave_sat.toLowerCase() == registroARestaurar.clave_sat.toLowerCase() ||
							registro.lada == registroARestaurar.lada) && 
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
					tabla: db.sequelize.models.paises.name.toUpperCase(),
					accion: 'RESTAURAR',
					createdAt: moment().tz('America/Mexico_City')
				}
				//encriptación para restaurar
				const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroARestaurar);
				registro2.encriptacion_previa = stringEncriptado;

				const registrosActuales = await  registroARestaurar.restore();;
				
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
			tabla: db.sequelize.models.paises.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.paises.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud paises" });
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
			if(asociacion.target.name == db.sequelize.models.paises.name){
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

async function updateClavePais(req,res){
	const listPaises = [
		{clave:"AFG",   pais: "Afganistán"},
		{clave:"ALA",   pais: "Islas Åland"},
		{clave:"ALB",	pais: "Albania"},
		{clave:"DEU",	pais: "Alemania"},
		{clave:"AND",	pais: "Andorra"},
		{clave:"AGO",	pais: "Angola"},
		{clave:"AIA",	pais: "Anguila"},
		{clave:"ATA",	pais: "Antártida"},
		{clave:"ATG",	pais: "Antigua y Barbuda"},
		{clave:"SAU",	pais: "ARABIA SAUDI"},
		{clave:"DZA",	pais: "Argelia"},
		{clave:"ARG",	pais: "Argentina"},
		{clave:"ARM",	pais: "Armenia"},
		{clave:"ABW",	pais: "Aruba"},
		{clave:"AUS",	pais: "Australia"},
		{clave:"AUT",	pais: "Austria"},
		{clave:"AZE",	pais: "Azerbaiyán"},
		{clave:"BHS",	pais: "BAHAMAS"},
		{clave:"BGD",	pais: "Bangladés"},
		{clave:"BRB",	pais: "Barbados"},
		{clave:"BHR",	pais: "Baréin"},
		{clave:"BEL",	pais: "Bélgica"},
		{clave:"BLZ",	pais: "Belice"},
		{clave:"BEN",	pais: "Benín"},
		{clave:"BMU",	pais: "Bermudas"},
		{clave:"BLR",	pais: "Bielorrusia"},
		{clave:"MMR",	pais: "Myanmar"},
		{clave:"BOL",	pais: "BOLIVIA"},
		{clave:"BIH",	pais: "Bosnia y Herzegovina"},
		{clave:"BWA",	pais: "BOTSWANA"},
		{clave:"BRA",	pais: "Brasil"},
		{clave:"BRN",	pais: "Brunei"},
		{clave:"BGR",	pais: "Bulgaria"},
		{clave:"BFA",	pais: "Burkina Faso"},
		{clave:"BDI",	pais: "Burundi"},
		{clave:"BTN",	pais: "Bután"},
		{clave:"CPV",	pais: "Cabo Verde"},
		{clave:"KHM",	pais: "Camboya"},
		{clave:"CMR",	pais: "Camerún"},
		{clave:"CAN",	pais: "Canadá"},
		{clave:"QAT",	pais: "Catar"},
		{clave:"BES",	pais: "Bonaire, San Eustaquio y Saba"},
		{clave:"TCD",	pais: "Chad"},
		{clave:"CHL",	pais: "Chile"},
		{clave:"CHN",	pais: "China"},
		{clave:"CYP",	pais: "Chipre"},
		{clave:"COL",	pais: "Colombia"},
		{clave:"COM",	pais: "Comoras"},
		{clave:"PRK",	pais: "COREA DEL NORTE"},
		{clave:"KOR",	pais: "COREA DEL SUR"},
		{clave:"CIV",	pais: "Côte d'Ivoire"},
		{clave:"CRI",	pais: "Costa Rica"},
		{clave:"HRV",	pais: "Croacia"},
		{clave:"CUB",	pais: "Cuba"},
		{clave:"CUW",	pais: "CURAZAO"},
		{clave:"DNK",	pais: "Dinamarca"},
		{clave:"DMA",	pais: "DOMINICA"},
		{clave:"ECU",	pais: "Ecuador"},
		{clave:"EGY",	pais: "Egipto"},
		{clave:"SLV",	pais: "El Salvador"},
		{clave:"ARE",	pais: "EMIRATOS ÁRABES UNIDOS"},
		{clave:"ERI",	pais: "Eritrea"},
		{clave:"SVK",	pais: "Eslovaquia"},
		{clave:"SVN",	pais: "Eslovenia"},
		{clave:"ESP",	pais: "España"},
		{clave:"USA",	pais: "ESTADOS UNIDOS DE AMÉRICA"},
		{clave:"EST",	pais: "Estonia"},
		{clave:"ETH",	pais: "Etiopía"},
		{clave:"PHL",	pais: "Filipinas"},
		{clave:"FIN",	pais: "Finlandia"},
		{clave:"FJI",	pais: "Fiji"},
		{clave:"FRA",	pais: "Francia"},
		{clave:"GAB",	pais: "Gabón"},
		{clave:"GMB",	pais: "Gambia"},
		{clave:"GEO",	pais: "Georgia"},
		{clave:"GHA",	pais: "Ghana"},
		{clave:"GIB",	pais: "Gibraltar"},
		{clave:"GRD",	pais: "Granada"},
		{clave:"GRC",	pais: "Grecia"},
		{clave:"GRL",	pais: "Groenlandia"},
		{clave:"GLP",	pais: "Guadalupe"},
		{clave:"GUM",	pais: "Guam"},
		{clave:"GTM",	pais: "Guatemala"},
		{clave:"GUF",	pais: "Guayana Francesa"},
		{clave:"GGY",	pais: "Guernsey"},
		{clave:"GIN",	pais: "GUINEA"},
		{clave:"GNB",	pais: "GUINEA-BISÁU"},
		{clave:"GNQ",	pais: "GUINEA ECUATORIAL"},
		{clave:"GUY",	pais: "Guyana"},
		{clave:"HTI",	pais: "Haití"},
		{clave:"HND",	pais: "Honduras"},
		{clave:"HKG",	pais: "Hong Kong"},
		{clave:"HUN",	pais: "Hungría"},
		{clave:"IND",	pais: "India"},
		{clave:"IDN",	pais: "Indonesia"},
		{clave:"IRQ",	pais: "Irak"},
		{clave:"IRN",	pais: "IRÁN"},
		{clave:"IRL",	pais: "Irlanda"},
		{clave:"BVT",	pais: "Isla Bouvet"},
		{clave:"IMN",	pais: "Isla de Man"},
		{clave:"CXR",	pais: "Isla de Navidad"},
		{clave:"NFK",	pais: "Isla Norfolk"},
		{clave:"ISL",	pais: "Islandia"},
		{clave:"CYM",	pais: "ISLAS CAIMÁN"},
		{clave:"CCK",	pais: "Islas Cocos (Keeling)"},
		{clave:"COK",	pais: "ISLAS COOK"},
		{clave:"FRO",	pais: "ISLAS FEROE"},
		{clave:"SGS",	pais: "Georgia del sur y las islas sandwich del sur"},
		{clave:"HMD",	pais: "Isla Heard e Islas McDonald"},
		{clave:"FLK",	pais: "ISLAS MALVINAS"},
		{clave:"MNP",	pais: "ISLAS MARIANAS DEL NORTE"},
		{clave:"MHL",	pais: "ISLAS MARSHALL"},
		{clave:"PCN",	pais: "Pitcairn"},
		{clave:"SLB",	pais: "ISLAS SALOMÓN"},
		{clave:"TCA",	pais: "ISLAS TURCAS Y CAICOS"},
		{clave:"UMI",	pais: "Islas de Ultramar Menores de Estados Unidos (las)"},
		{clave:"VGB",	pais: "Islas Vírgenes (Británicas)"},
		{clave:"VIR",	pais: "ISLAS VÍRGENES DE LOS ESTADOS UNIDOS"},
		{clave:"ISR",	pais: "Israel"},
		{clave:"ITA",	pais: "Italia"},
		{clave:"JAM",	pais: "Jamaica"},
		{clave:"JPN",	pais: "Japón"},
		{clave:"JEY",	pais: "Jersey"},
		{clave:"JOR",	pais: "Jordania"},
		{clave:"KAZ",	pais: "Kazajistán"},
		{clave:"KEN",	pais: "Kenia"},
		{clave:"KGZ",	pais: "Kirguistán"},
		{clave:"KIR",	pais: "Kiribati"},
		{clave:"KWT",	pais: "Kuwait"},
		{clave:"LAO",	pais: "LAOS"},
		{clave:"LSO",	pais: "LESOTHO"},
		{clave:"LVA",	pais: "Letonia"},
		{clave:"LBN",	pais: "Líbano"},
		{clave:"LBR",	pais: "Liberia"},
		{clave:"LBY",	pais: "Libia"},
		{clave:"LIE",	pais: "Liechtenstein"},
		{clave:"LTU",	pais: "Lituania"},
		{clave:"LUX",	pais: "Luxemburgo"},
		{clave:"MAC",	pais: "Macao"},
		{clave:"MDG",	pais: "Madagascar"},
		{clave:"MYS",	pais: "Malasia"},
		{clave:"MWI",	pais: "MALAWI"},
		{clave:"MDV",	pais: "Maldivas"},
		{clave:"MLI",	pais: "Malí"},
		{clave:"MLT",	pais: "Malta"},
		{clave:"MAR",	pais: "Marruecos"},
		{clave:"MTQ",	pais: "Martinica"},
		{clave:"MUS",	pais: "Mauricio"},
		{clave:"MRT",	pais: "Mauritania"},
		{clave:"MYT",	pais: "Mayotte"},
		{clave:"MEX",	pais: "México"},
		{clave:"FSM",	pais: "MICRONESIA"},
		{clave:"MDA",	pais: "Moldavia"},
		{clave:"MCO",	pais: "Mónaco"},
		{clave:"MNG",	pais: "Mongolia"},
		{clave:"MNE",	pais: "Montenegro"},
		{clave:"MSR",	pais: "Montserrat"},
		{clave:"MOZ",	pais: "Mozambique"},
		{clave:"NAM",	pais: "Namibia"},
		{clave:"NRU",	pais: "Nauru"},
		{clave:"NPL",	pais: "Nepal"},
		{clave:"NIC",	pais: "Nicaragua"},
		{clave:"NER",	pais: "NIGER"},
		{clave:"NGA",	pais: "Nigeria"},
		{clave:"NIU",	pais: "Niue"},
		{clave:"NOR",	pais: "Noruega"},
		{clave:"NCL",	pais: "Nueva Caledonia"},
		{clave:"NZL",	pais: "Nueva Zelanda"},
		{clave:"OMN",	pais: "Omán"},
		{clave:"NLD",	pais: "Países Bajos (los)"},
		{clave:"PAK",	pais: "Pakistán"},
		{clave:"PLW",	pais: "Palaos"},
		{clave:"PSE",	pais: "PALESTINA"},
		{clave:"PAN",	pais: "Panamá"},
		{clave:"PNG",	pais: "Papúa Nueva Guinea"},
		{clave:"PRY",	pais: "Paraguay"},
		{clave:"PER",	pais: "Perú"},
		{clave:"PYF",	pais: "Polinesia Francesa"},
		{clave:"POL",	pais: "Polonia"},
		{clave:"PRT",	pais: "Portugal"},
		{clave:"PRI",	pais: "Puerto Rico"},
		{clave:"GBR",	pais: "Reino Unido"},
		{clave:"CAF",	pais: "REPÚBLICA CENTROAFRICANA"},
		{clave:"CZE",	pais: "REPÚBLICA CHECA"},
		{clave:"MKD",	pais: "MACEDONIA"},
		{clave:"COG",	pais: "CONGO"},
		{clave:"COD",	pais: "REPÚBLICA DEMOCRÁTICA DEL CONGO"},
		{clave:"DOM",	pais: "REPÚBLICA DOMINICANA"},
		{clave:"REU",	pais: "Reunión"},
		{clave:"RWA",	pais: "Ruanda"},
		{clave:"ROU",	pais: "Rumania"},
		{clave:"RUS",	pais: "RUSIA"},
		{clave:"ESH",	pais: "Sahara Occidental"},
		{clave:"WSM",	pais: "SAMOA"},
		{clave:"ASM",	pais: "Samoa Americana"},
		{clave:"BLM",	pais: "San Bartolomé"},
		{clave:"KNA",	pais: "San Cristóbal y Nieves"},
		{clave:"SMR",	pais: "San Marino"},
		{clave:"MAF",	pais: "San Martín (parte francesa)"},
		{clave:"SPM",	pais: "San Pedro y Miquelón"},
		{clave:"VCT",	pais: "San Vicente y las Granadinas"},
		{clave:"SHN",	pais: "SANTA HELENA"},
		{clave:"LCA",	pais: "Santa Lucía"},
		{clave:"STP",	pais: "Santo Tomé y Príncipe"},
		{clave:"SEN",	pais: "Senegal"},
		{clave:"SRB",	pais: "Serbia"},
		{clave:"SYC",	pais: "Seychelles"},
		{clave:"SLE",	pais: "Sierra leona"},
		{clave:"SGP",	pais: "Singapur"},
		{clave:"SXM",	pais: "Sint Maarten (parte holandesa)"},
		{clave:"SYR",	pais: "SIRIA"},
		{clave:"SOM",	pais: "Somalia"},
		{clave:"LKA",	pais: "Sri Lanka"},
		{clave:"SWZ",	pais: "Suazilandia"},
		{clave:"ZAF",	pais: "Sudáfrica"},
		{clave:"SDN",	pais: "SUDAN"},
		{clave:"SSD",	pais: "REPÚBLICA DE SUDÁN DEL SUR"},
		{clave:"SWE",	pais: "Suecia"},
		{clave:"CHE",	pais: "Suiza"},
		{clave:"SUR",	pais: "Surinam"},
		{clave:"SJM",	pais: "Svalbard y Jan Mayen"},
		{clave:"THA",	pais: "Tailandia"},
		{clave:"TWN",	pais: "Taiwán (Provincia de China)"},
		{clave:"TZA",	pais: "TANZANIA"},
		{clave:"TJK",	pais: "Tayikistán"},
		{clave:"IOT",	pais: "Territorio Británico del Océano Índico (el)"},
		{clave:"ATF",	pais: "Territorios Australes Franceses (los)"},
		{clave:"TLS",	pais: "Timor-Leste"},
		{clave:"TGO",	pais: "Togo"},
		{clave:"TKL",	pais: "Tokelau"},
		{clave:"TON",	pais: "Tonga"},
		{clave:"TTO",	pais: "Trinidad y Tobago"},
		{clave:"TUN",	pais: "Túnez"},
		{clave:"TKM",	pais: "Turkmenistán"},
		{clave:"TUR",	pais: "Turquía"},
		{clave:"TUV",	pais: "Tuvalu"},
		{clave:"UKR",	pais: "Ucrania"},
		{clave:"UGA",	pais: "Uganda"},
		{clave:"URY",	pais: "Uruguay"},
		{clave:"UZB",	pais: "Uzbekistán"},
		{clave:"VUT",	pais: "Vanuatu"},
		{clave:"VAT",	pais: "Santa Sede"},
		{clave:"VEN",	pais: "VENEZUELA"},
		{clave:"VNM",	pais: "VietNam"},
		{clave:"WLF",	pais: "Wallis y Futuna"},
		{clave:"YEM",	pais: "Yemen"},
		{clave:"DJI",	pais: "Yibuti"},
		{clave:"ZMB",	pais: "Zambia"},
		{clave:"ZWE",	pais: "ZIMBABWE"},
		{clave:"ZZZ",	pais: "Países no declarados"},
	]
	const listPaisesDB = []
	const listPaisesDBName = []
	const listaPaisesFull = await db.sequelize.models.paises.findAll()
	for(const pais of listPaises){
		const paisesDb = await db.sequelize.models.paises.findAll({where:{descripcion:{ [db.Sequelize.Op.like]: `%${pais.pais}%` }}})
		if(paisesDb.length == 1){
			const paisDb = paisesDb[0]
			if(paisDb != null && !listPaisesDBName.includes(paisDb.descripcion)){
				listPaisesDB.push(paisDb)
				listPaisesDBName.push(paisDb.descripcion)
				await paisDb.update({clave_sat:pais.clave}, { where: { id: paisDb.id } });
			}
		} else if(paisesDb.length > 1){
			let paisDb = undefined
			for(const paisBusqueda of paisesDb){
				if(paisBusqueda.descripcion == pais.pais){
					paisDb = paisBusqueda
				}
			}
			if(paisDb != null && !listPaisesDBName.includes(paisDb.descripcion)){
				listPaisesDB.push(paisDb)
				listPaisesDBName.push(paisDb.descripcion)
				await paisDb.update({clave_sat:pais.clave}, { where: { id: paisDb.id } });
			}
		}
	}
	return res.status(200).send({
		success: true,
		listPaisesDB: listPaisesDB.length,
		listPaises: listPaises.length,
		listaPaisesFull: listaPaisesFull.length,
		listPaisesDBName:listPaisesDBName.length
	});
}


async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.paises.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {
		
		req.query.perfil = 'all';
        const perfilesValidos = ['all'];
        var relaciones = [];
        if(perfilesValidos.includes(req.query.perfil)){
            const parametrosRelaciones = {
                all: [ 
					'continente',
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
            relaciones = await findRelaciones.getRelaciones();
        }
        
		
        const docs = await db.sequelize.models.paises.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        });
            
        let idMarca = null;
		const elementos = [];
        for(const element of docs){

			elementos.push({
                'Clave': element.clave,
                'Descripción': element.descripcion,
                'Lada': element.rc,
				'Continente': element.continente.nombre,
				'Clave Sat': element.clave_sat ? element.clave_sat : "N/A",
            });
        }
        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        const nombreReporte = `paises_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.paises.name];
        const reportePaises = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        });
        return await reportePaises.gerReporteOneSheet(res,req);
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
    }
      
}

async function getFiltroExportacion(parametros){
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


module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos,
	updateClavePais,
	exportacion
}