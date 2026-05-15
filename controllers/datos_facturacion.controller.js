'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const ofac = require('../controllers/validaciones_ofac.controller');
const { Filtros } = require('../middlewares/filtros');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { saveDomicilio } = require('./domicilios.controller')
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.datos_facturacion.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['pais', 'nacionalidad_timbrado', 'regimen_fiscal','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				pais: ['pais.continente'],
				nacionalidad_timbrado: ['nacionalidad_timbrado.continente'],
				regimen_fiscal: ['regimen_fiscal'],
				all: ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'regimen_fiscal']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.datos_facturacion.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.datos_facturacion.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/datosFacturacion`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			element.cer = element.cer != null ? "private": element.cer
			element.key = element.key != null ? "private": element.key
			element.password = await CryptoMiddleware.desencriptarString(element.password) 
			element.password = element.password != null && element.password != '' ? element.password: element.key
			if(req.query.perfil == 'all'){
				const listRel = [ 'domicilio.estado.pais.continente' ]
				const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones()
				const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.id}, include:relacionesDomicilios})
				const domicilios = []
				for(const domicilio of domiciliosData){
					const e = domicilio.domicilio.toJSON()
					e.tipo = domicilio.tipo
					e.usuario_registro = undefined
					domicilios.push(e)
				}
				element.domicilios = domicilios
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
	const nuevoRegistro = await saveDatoFacturacion(req.body, res, req, req.usuario);
	const name = req.body.razonSocial;

	if(nuevoRegistro !== undefined){
		if(nuevoRegistro.hasOwnProperty(name)){
			return res.status(200).send({ status: false, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", coincidencias: nuevoRegistro});
		}else{
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
		}
	}
}

async function saveDatoFacturacion(parametros, res, req, usuario){
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idNacionalidadTimbrado', tipo:'model',model:db.sequelize.models.paises},
							{campo:'noIdentificacion', tipo:'string',largo:255,textoCase:"up",verifNoSpace:true},
							{campo:'razonSocial', tipo:'string',largo:255,textoCase:"up"}]
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(parametros.idNacionalidadTimbrado, { include:[{all:true}],paranoid: false });
		if(nacionalidadTimbrado == null){
			res.status(400).send({ status: false, msg: "Nacionalidad timbrado no existe" });
			return undefined;
		}
		if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
			const regimenFiscal = await db.sequelize.models.regimenes_fiscal.findByPk(parametros.idRegimenFiscal);
			if(regimenFiscal == null){
				res.status(400).send({ status: false, msg: "Régimen fiscal no existe" });
				return undefined;
			}
			if(regimenFiscal.tipo_persona.toUpperCase() != parametros.tipoPersona.toUpperCase() && regimenFiscal.tipo_persona.toUpperCase() != "FM" ){
				res.status(400).send({ status: false, msg: "Régimen fiscal no válido."});
				return undefined
			}
			obligatorios.push({campo:'idRegimenFiscal', tipo:'model',model:db.sequelize.models.regimenes_fiscal})
			obligatorios.push({campo:'tipoPersona', tipo:'enum', largo:1, textoCase:"up", enum: ['F', 'M']})

			obligatorios.push({campo:'password', tipo:'password',largo:255})  
			const docsObligatorios = ['cer','key']
			for (const file of docsObligatorios) {
				if (!req.files[file]) {
					return res.status(400).send({ status: false, msg: `Falta el archivo ${file}`})
				}
				if (req.files[file].size > (50 * 1024 * 1024)) {
					return res.status(400).json({ status: false, msg: `El archivo ${file} es demasiado grande. El tamaño máximo permitido es de 50MB` });
				}
			}
			const files = req.files
			for (let key in files){
				if(docsObligatorios.includes(key)){
					const file = files[key]
					if(Array.isArray(file)){
						return res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
					}
					try {
						const campoDB = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
						registro[campoDB] = file.data.toString('base64')
					} catch (error) {
						return res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento válido.'})
					}
				}
			}
		}
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return undefined;
		}
		if(parametros.domicilios == undefined){
			res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro:'domicilios'});
			return undefined;
		} else if(parametros.domicilios == null || parametros.domicilios.length < 1){
			res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro:'domicilios'});
			return undefined;
		}
		var domTipoFSaved = false
		var haveDomTipoF = false
		const domicilios = []
		for(const domicilio of JSON.parse(parametros.domicilios)){
			domicilio.tipo = domicilio.tipo.toUpperCase()
			if(domTipoFSaved == false || domicilio.tipo == "S"){
				const domicilioRegistro = await saveDomicilio(domicilio, res,usuario);
				if(domicilioRegistro == undefined){
					return ''
				} else{
					if(domicilio.tipo == "F"){
						domTipoFSaved = true
						haveDomTipoF = true
					}
					const dom = domicilioRegistro.toJSON()
					dom.tipo = domicilio.tipo
					domicilios.push(dom)
				}
			}
		}
		if(haveDomTipoF == false){
			res.status(400).send({status:false , msg: 'Debe registrar al menos un domicilio Fiscal (tipo: F).'});
			return undefined;
		}

		const registrosEncontrados = await db.sequelize.models.datos_facturacion.findAll({
			where: {
				deletedAt: null,
				id_pais: registro.id_pais,
				[db.Sequelize.Op.or]: {
					razon_social: {
						[db.Sequelize.Op.like]: `%${parametros.razonSocial}%`
					},
					no_identificacion: {
						[db.Sequelize.Op.like]: `%${parametros.noIdentificacion}%`
					}
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			for (const registro of registrosEncontrados) {
				/*Si el registro nuevo contiene RFC genérico, ya sea extranjero o nacional, no se toma
				en cuenta para registros existentes*/
				const razonSocialParametro = await ManipuladorCadenas.quitarAcentos(parametros.razonSocial.toLowerCase())
				if(((registro.razon_social.toLowerCase() == parametros.razonSocial.toLowerCase() && (razonSocialParametro != "publico general" && razonSocialParametro != "publico en general")) || 
				   	(registro.no_identificacion.toLowerCase() == parametros.noIdentificacion.toLowerCase()) && (parametros.noIdentificacion.toUpperCase() != 'XEXX010101000' && parametros.noIdentificacion.toUpperCase() != 'XAXX010101000')) &&
					(registro.id_pais == parametros.idPais)){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
				}

			}
			if(regExistente){
				return undefined;
			}
		}
		registro.password = await CryptoMiddleware.encriptarString(registro.password);
		registro.id_usuario_registro = usuario.id

		//Validación de la OFAC
		const name = parametros.razonSocial;
		const rfc = parametros.noIdentificacion != undefined ? parametros.noIdentificacion : '';
		const pais = await db.sequelize.models.paises.findByPk(parametros.idPais, { include:[{all:true}],paranoid: false });
		let datosEntidad = {
			nombre: name,
			pais: pais.descripcion,
			rfc: rfc
		}
		
		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		let nuevoRegistro = undefined;

		if(entidadValidada.success){
			if(entidadValidada.coincidencias.matches[name].length > 0){
				nuevoRegistro = entidadValidada.coincidencias.matches;
			}else{
				nuevoRegistro = await db.sequelize.models.datos_facturacion.create(registro);
				for(const domicilio of domicilios){
					var registro = {
						id_domicilio: domicilio.id,
						id_dato_facturacion:nuevoRegistro.id,
						tipo: domicilio.tipo,
						id_usuario_registro: req.usuario.id,
						createdAt: moment().tz('America/Mexico_City'),
						updatedAt: moment().tz('America/Mexico_City')
					}
					await db.sequelize.models.datos_facturacion_domicilios.create(registro);
				}
			}
		}else{
			res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
			return undefined;
		}
		return nuevoRegistro;
		
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return undefined;
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['pais', 'nacionalidad_timbrado', 'regimen_fiscal','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				pais: ['pais.continente'],
				nacionalidad_timbrado: ['nacionalidad_timbrado.continente'],
				regimen_fiscal: ['regimen_fiscal'],
				all: ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'regimen_fiscal']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}
		const registroEncontrado = await db.sequelize.models.datos_facturacion.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			element.password = await CryptoMiddleware.desencriptarString(element.password);
			element.cer = element.cer != null ? "private": element.cer
			element.key = element.key != null ? "private": element.key
			element.password = element.password != null && element.password != '' ? element.password: element.key
			if(req.query.perfil == 'all'){
				const listRel = [ 'domicilio.estado.pais.continente' ]
				const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones()
				const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.id}, include:relacionesDomicilios})
				const domicilios = []
				for(const domicilio of domiciliosData){
					const e = domicilio.domicilio.toJSON()
					e.tipo = domicilio.tipo
					e.usuario_registro = undefined
					domicilios.push(e)
				}
				element.domicilios = domicilios
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const registroAEditar = await updateDatoFacturacion(req.body, res, req, true, req.params.id, req.usuario);
	let name = await db.sequelize.models.datos_facturacion.findByPk(req.params.id);
	name = req.body.razonSocial != undefined ? req.body.razonSocial : name.razon_social;

	if(registroAEditar !== undefined){
		if(registroAEditar.hasOwnProperty(name)){
			return res.status(200).send({ status: false, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", coincidencias: registroAEditar});
		}else{
			return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
		}
	}
}

async function updateDatoFacturacion(parametros, res, req, crudMarca = false, idRazonSocial = undefined, usuario){

	try {
		const id  = idRazonSocial;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		
		const registroAEditar = await db.sequelize.models.datos_facturacion.findByPk(id);
		if(registroAEditar == null){
			res.status(400).send({ status: false, msg: "Registro no existe" });
			return undefined;
		}
		if(registroAEditar.deletedAt != null){
			res.status(400).send({ status: false, msg: "Registro eliminado" });
			return undefined;
		}
		let obligatorios = []
			
		const validosOpcionales =[{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
								  {campo:'idNacionalidadTimbrado', tipo:'model',model:db.sequelize.models.paises},
								  {campo:'noIdentificacion', tipo:'string',largo:255,textoCase:"up",verifNoSpace:true},
								  {campo:'razonSocial', tipo:'string',largo:255,textoCase:"up"}]
		const idNacionalidadTimbrado = parametros.idNacionalidadTimbrado !== undefined && parametros.idNacionalidadTimbrado !== null ? parametros.idNacionalidadTimbrado : registroAEditar.id_nacionalidad_timbrado
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(idNacionalidadTimbrado, { include:[{all:true}],paranoid: false });
		if(nacionalidadTimbrado == null){
			res.status(400).send({ status: false, msg: "Nacionalidad timbrado no existe" });
			return undefined;
		}
		if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
			const idRegimenFiscal = parametros.idRegimenFiscal !== undefined && parametros.idRegimenFiscal !== null ? parametros.idRegimenFiscal : registroAEditar.id_regimen_fiscal
			const regimenFiscal = await db.sequelize.models.regimenes_fiscal.findByPk(idRegimenFiscal);
			if(regimenFiscal == null){
				res.status(400).send({ status: false, msg: "Régimen fiscal no existe" });
				return undefined;
			}
			if(parametros.tipoPersona !== null && parametros.tipoPersona !== undefined){
				if(regimenFiscal.tipo_persona.toUpperCase() != parametros.tipoPersona.toUpperCase() && regimenFiscal.tipo_persona.toUpperCase() != "FM" ){
					res.status(400).send({ status: false, msg: "Régimen fiscal no válido."});
					return undefined
				}
				obligatorios.push({campo:'tipoPersona', tipo:'enum', largo:1, textoCase:"up", enum: ['F', 'M']})
				seEdita = true
			}
			if(parametros.idRegimenFiscal !== undefined && parametros.idRegimenFiscal !== null){
				obligatorios.push({campo:'idRegimenFiscal', tipo:'model',model:db.sequelize.models.regimenes_fiscal})
				seEdita = true
			}
			if((req.files === undefined || req.files === null) && registroAEditar.cer == null && registroAEditar.key == null){
				res.status(400).send({ status: false, msg: `No se adjuntaron archivos`})
				return undefined
			}
			const docsObligatorios = []
			const cer = req.files !== undefined && req.files !== null ? req.files.cer !== undefined && req.files.cer !== null: false
			const key = req.files !== undefined && req.files !== null ? req.files.key !== undefined && req.files.key !== null: false
			const password = parametros.password !== undefined && parametros.password !== null
			if(cer || registroAEditar.cer == null){
				docsObligatorios.push('cer')
			}
			if(key || registroAEditar.key == null){
				docsObligatorios.push('key')
			}
			if(password || registroAEditar.password == null || registroAEditar.password == ''){
				obligatorios.push({campo:'password', tipo:'password',largo:255})  
				seEdita = true
			}
			for (const file of docsObligatorios) {
				if (!req.files[file]) {
					res.status(400).send({ status: false, msg: `Falta el archivo ${file}`})
					return undefined
				}
				if (req.files[file].size > (50 * 1024 * 1024)) {
					res.status(400).json({ status: false, msg: `El archivo ${file} es demasiado grande. El tamaño máximo permitido es de 50MB` });
					return undefined
				}
			}
			const files = req.files
			for (let key in files){
				if(docsObligatorios.includes(key)){
					const file = files[key]
					if(Array.isArray(file)){
						res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
						return undefined
					}
					try {
						const campoDB = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
						datosUpdate[campoDB] = file.data.toString('base64')
						seEdita = true
					} catch (error) {
						res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento válido.'})
						return undefined
					}
				}
			}
		}else{
			datosUpdate.cer = null
			datosUpdate.key = null
			datosUpdate.password = ''
			datosUpdate.id_regimen_fiscal = null
			datosUpdate.tipo_persona = null
		}
		if(obligatorios.length > 0){
			datosUpdate = await Validaciones.validParametros({body:parametros}, res,obligatorios,datosUpdate);
			if(!datosUpdate){
				return undefined;
			}
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = seEdita || dataValidarOpcionales[1]
			
		if(!seEdita){
			if(crudMarca){
				res.status(200).send({ status: true, msg: "Registro no editado" });
				return undefined;
			}
		}
		var whereFind = {
			where: {
				deletedAt: null,
				id_pais: parametros.idPais != undefined ? parametros.idPais : registroAEditar.id_pais,
				[db.Sequelize.Op.or]: {
					razon_social: {
						[db.Sequelize.Op.like]: `%${parametros.razonSocial != undefined ? parametros.razonSocial : registroAEditar.razon_social}%`
					},
					no_identificacion: {
						[db.Sequelize.Op.like]: `%${parametros.noIdentificacion != undefined ? parametros.noIdentificacion : registroAEditar.no_identificacion}%`
					}
				}
			}
		}
		const registrosEncontrados = await db.sequelize.models.datos_facturacion.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			for(const registro of registrosEncontrados){
				/*Si el registro a editar contiene RFC genérico, ya sea extranjero o nacional, no se toma
				en cuenta para registros existentes*/
	
				const rfc = parametros.noIdentificacion != undefined ? parametros.noIdentificacion : registroAEditar.no_identificacion;
				const razonSocialParametro = await ManipuladorCadenas.quitarAcentos(parametros.razonSocial != undefined ? parametros.razonSocial.toLowerCase() : registroAEditar.razon_social.toLowerCase())
				if((((registro.razon_social.toLowerCase() == (parametros.razonSocial != undefined ? parametros.razonSocial.toLowerCase() : registroAEditar.razon_social.toLowerCase())) && (razonSocialParametro != "publico general" && razonSocialParametro != "publico en general")) || 
					((registro.no_identificacion.toLowerCase() == (parametros.noIdentificacion != undefined ? parametros.noIdentificacion.toLowerCase() : registroAEditar.no_identificacion.toLowerCase())) && (rfc.toUpperCase() != 'XEXX010101000' && rfc.toUpperCase() != 'XAXX010101000'))) &&
					registro.id != id && registro.id_pais == (parametros.idPais != undefined ? parametros.idPais : registroAEditar.id_pais)){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
				}
			}
			if(regExistente){
				return undefined;
			}
		}
	
		//Validación de la OFAC
		let pais = parametros.idPais != undefined ? parametros.idPais : registroAEditar.id_pais;
		pais = await db.sequelize.models.paises.findByPk(pais);
		const name = parametros.razonSocial != undefined ? parametros.razonSocial : registroAEditar.razon_social;
		const rfc = parametros.noIdentificacion != undefined ? parametros.noIdentificacion : registroAEditar.no_identificacion;
		let datosEntidad = {
			nombre: name,
			pais: pais.descripcion,
			rfc: rfc
		}
		
		const entidadValidada = await ofac.validarEntidad(datosEntidad);
	
		if(entidadValidada.success){
			if(entidadValidada.coincidencias.matches[name].length > 0){
				return entidadValidada.coincidencias.matches;
			}else{
				const registrosActuales = await registroAEditar.update(datosUpdate, { where: { id: id } });
				return registrosActuales
			}
		}else{
			res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
			return undefined;
		}
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return undefined;
	} 
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.datos_facturacion.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.datos_facturacion.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name) && modelo.name != "datos_facturacion_domicilios"){
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
			const domicilios = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion:registroAEliminar.id}});
			for(const domicilio of domicilios){
				await domicilio.destroy({ where: { id: domicilio.id } });
			}
			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
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
		const registroARestaurar = await db.sequelize.models.datos_facturacion.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.datos_facturacion.findAll({
					where: {
						deletedAt: null,
						id_pais: registroARestaurar.id_pais != undefined ? registroARestaurar.id_pais : null,
						[db.Sequelize.Op.or]:{
							razon_social: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.razon_social}%`
							},
							no_identificacion: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.no_identificacion}%`
							}
						}
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.razon_social.toLowerCase() == registroARestaurar.razon_social.toLowerCase() ||
						   registro.no_identificacion.toLowerCase() == registroARestaurar.no_identificacion.toLowerCase()) &&
						   registro.id != id &&
						   registro.id_pais ==  (registroARestaurar.id_pais)){
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
				const domicilios = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion:registroARestaurar.id},paranoid: false});
				for(const domicilio of domicilios){
					await domicilio.restore({ where: { id: domicilio.id } });
				}
				const registrosActuales = await registroARestaurar.restore();
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
	restaurar,
	updateDatoFacturacion,
}
