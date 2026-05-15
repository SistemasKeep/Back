'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const ofac = require('../controllers/validaciones_ofac.controller');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { saveDomicilio } = require('./domicilios.controller')
const { creditoActualizado } = require('./notificacion_credito_razones_sociales.controllers')

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['pais', 'nacionalidad_timbrado', 'datosFiscales', 'razones_sociales_domicilios', 'marca_preferente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				pais: ['pais.continente'],
				marca_preferente: ['marca_preferente'],
				razones_sociales_domicilios: 'razones_sociales_domicilios.domicilio.estado.pais.continente',
				nacionalidad_timbrado: ['nacionalidad_timbrado.continente'],
				datosFiscales: ['uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito'],
				all: ['nacionalidad_timbrado',
					'nacionalidad_timbrado.continente',
					'pais',
					'usuario_registro',
					'pais.continente',
					 'uso_cfdi',
					 'metodo_pago',
					 'forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio.estado.pais.continente', 'marca_preferente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.razones_sociales.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		});
		const dataFull = await db.sequelize.models.razones_sociales.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataFull;
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/razonesSociales`;
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
	const nuevoRegistro = await saveRazonSocial(req.body, res, req.usuario);
	const name = req.body.razonSocial;

	if(nuevoRegistro !== undefined){
		if(nuevoRegistro.status == false){
			return res.status(400).send(nuevoRegistro);
		}
		if(nuevoRegistro.hasOwnProperty(name)){
			return res.status(200).send({ status: false, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", coincidencias: nuevoRegistro});
		}else{
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
		}
	}
}

async function saveRazonSocial(parametros, res, usuario){
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idRegimenFiscal', tipo:'model',model:db.sequelize.models.regimenes_fiscal},
							{campo:'idNacionalidadTimbrado', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idUsoCfdi', tipo:'model',largo:null,model:db.sequelize.models.usos_cfdi},
							{campo:'idMetodoPago', tipo:'model',largo:null,model:db.sequelize.models.metodos_pago},
							{campo:'idFormaPago', tipo:'model',model:db.sequelize.models.formas_pago},
							{campo:'noIdentificacion', tipo:'string',largo:255,textoCase:"up",verifNoSpace:true},
							{campo:'razonSocial', tipo:'string',largo:255,textoCase:"up"},
							{campo:'idCliente', tipo:'model',model:db.sequelize.models.clientes},
							{campo:'tipoPersona', tipo:'enum', largo:1, textoCase:"up", enum: ['F', 'M']}]
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return undefined;
		}
		const regimenFiscal = await db.sequelize.models.regimenes_fiscal.findByPk(parametros.idRegimenFiscal);
		if(regimenFiscal == null){
			res.status(400).send({ status: false, msg: "Régimen fiscal no existe" });
			return undefined;
		}
		if(regimenFiscal.tipo_persona.toUpperCase() != parametros.tipoPersona.toUpperCase() && regimenFiscal.tipo_persona.toUpperCase() != "FM" ){
			res.status(400).send({ status: false, msg: "Régimen fiscal no válido."});
			return undefined
		}

		const formaPago = await db.sequelize.models.formas_pago.findByPk(registro.id_forma_pago)
		const metodoPago = await db.sequelize.models.metodos_pago.findByPk(registro.id_metodo_pago)
		if(metodoPago.clave.toUpperCase() === 'PPD' && formaPago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return { status: false, msg: `Si selecciona el método de pago (${metodoPago.clave}) ${metodoPago.descripcion}, por favor asegúrese de elegir la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`}
		}
		const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
		if(cliente.cliente_prospecto !== true){
			return { status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` };
		}
		const validosOpcionales =[{campo:'idRazonBloqueo',tipo:'model',model:db.sequelize.models.razones_bloqueo},{campo:'idMonedaCredito',tipo:'model',model:db.sequelize.models.monedas},{campo:'idMarcaPreferente',tipo:'model',model:db.sequelize.models.marcas},{campo:'limiteCredito',tipo:'number'},{campo:'diasCredito',tipo:'number'},{campo:'creditoValidado',tipo:'boolean'},{campo:'bloqueado',tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		if(parametros.domicilios == undefined){
			return {status:false , msg: 'No se recibieron todos los parametros.', parametro:'domicilios'};
		} else if(parametros.domicilios == null || parametros.domicilios.length < 1){
			return {status:false , msg: 'No se recibieron todos los parametros.', parametro:'domicilios'};
		}
		var domTipoFSaved = false
		var haveDomTipoF = false
		const domicilios = []
		for(const domicilio of parametros.domicilios){
			domicilio.tipo = domicilio.tipo.toUpperCase()
			if(domTipoFSaved == false || domicilio.tipo == "S"){
				const domicilioRegistro = await saveDomicilio(domicilio, res,usuario);
				if(domicilioRegistro == undefined){
					return undefined
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
			return {status:false , msg: 'Debe registrar al menos un domicilio Fiscal (tipo: F).'};
		}

		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.razones_sociales.findAll({
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
			let respuestaError = undefined
			for (const registro of registrosEncontrados) {
				/*Si el registro nuevo contiene RFC genérico, ya sea extranjero o nacional, no se toma
				en cuenta para registros existentes*/
				const razonSocialParametro = await ManipuladorCadenas.quitarAcentos(parametros.razonSocial.toLowerCase())
				if(((registro.razon_social.toLowerCase() == parametros.razonSocial.toLowerCase() && (razonSocialParametro != "publico general" && razonSocialParametro != "publico en general") && parametros.noIdentificacion.toUpperCase() != 'ESA2012145V5') || 
				   	(registro.no_identificacion.toLowerCase() == parametros.noIdentificacion.toLowerCase()) && (parametros.noIdentificacion.toUpperCase() != 'XEXX010101000' && parametros.noIdentificacion.toUpperCase() != 'XAXX010101000' && parametros.noIdentificacion.toUpperCase() != 'ESA2012145V5')) &&
					(registro.id_pais == parametros.idPais)){
						if(!regExistente){
							regExistente = true;
							respuestaError = { status: false, msg: "Registro existente", id: registro.id}
						}
				}

			}
			if(regExistente){
				return respuestaError;
			}
		}
		registro.id_usuario_registro = usuario == null ? null : usuario.id

		//Validación de la OFAC
		const pais = await db.sequelize.models.paises.findByPk(parametros.idPais);
		const name = parametros.razonSocial;
		const rfc = parametros.noIdentificacion != undefined ? parametros.noIdentificacion : '';
		let datosEntidad = {
			nombre: name,
			pais: pais.descripcion,
			rfc: rfc
		}
		
		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		let nuevoRegistro = undefined;

		if(entidadValidada.success){
			if(entidadValidada.coincidencias.matches[name].length > 0){
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
	
						if(entidad.ids.length > 0){
							const rfcObj = entidad.ids.find(item => item.type === "R.F.C.");
							const rfcId = rfcObj ? rfcObj.id : null;
							if(rfcId != null){
								if(rfcId == datosEntidad.rfc){
									coincidenciaExacta = true;
								}
							}
						}
					}
					if(coincidenciaExacta == true){
						nuevoRegistro = entidadValidada.coincidencias.matches;
					}	
				}
			}
			
			if(nuevoRegistro == undefined){
				nuevoRegistro = await db.sequelize.models.razones_sociales.create(registro);
				var registroCRS = {
					id_cliente: parametros.idCliente,
					id_razon_social: nuevoRegistro.id,
					id_usuario_registro: usuario == null ? null : usuario.id,
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				}
		
				await db.sequelize.models.clientes_razones_sociales.create(registroCRS);
				for(const domicilio of domicilios){
					var registro = {
						id_domicilio: domicilio.id,
						id_razon_social:nuevoRegistro.id,
						tipo: domicilio.tipo,
						createdAt: moment().tz('America/Mexico_City'),
						updatedAt: moment().tz('America/Mexico_City')
					}
					await db.sequelize.models.razones_sociales_domicilios.create(registro);
				}
				const documentosRazonesSociales = await db.sequelize.models.razones_sociales_documentos_generales.findAll()
				for(const documentoRazonSocial of documentosRazonesSociales){
					const registroExpediente = {
						id_marca: documentoRazonSocial.id_marca,
						id_razon_social: nuevoRegistro.id,
						id_documento_razon_social: documentoRazonSocial.id,
						descripcion: documentoRazonSocial.descripcion,
						obligatorio: documentoRazonSocial.obligatorio,
						id_usuario_registro: usuario == null ? null : usuario.id
					}
					await db.sequelize.models.razones_sociales_archivos.create(registroExpediente);
				}
			}
		}else{
			return { status: false, msg: "Error consultando a la OFAC"};
		}
		return nuevoRegistro;
		
	} catch (error) {
		console.log(error)
		return { status: false, msg: "Error interno del servidor", error: error.toString()};
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['pais', 'nacionalidad_timbrado', 'datosFiscales', 'razones_sociales_domicilios', 'marca_preferente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				pais: ['pais.continente'],
				marca_preferente: ['marca_preferente'],
				razones_sociales_domicilios: 'razones_sociales_domicilios.domicilio.estado.pais.continente',
				nacionalidad_timbrado: ['nacionalidad_timbrado.continente'],
				datosFiscales: ['uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito'],
				all: ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio.estado.pais.continente','marca_preferente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}
		const registroEncontrado = await db.sequelize.models.razones_sociales.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const registroAEditar = await updateRazonSocial(req.body, res, true, req.params.id, req.usuario);
	if(registroAEditar !== undefined){
		if(registroAEditar.status !== undefined){
			return res.status(400).send(registroAEditar);
		}
		let name = await db.sequelize.models.razones_sociales.findByPk(req.params.id);
		name = req.body.razonSocial != undefined ? req.body.razonSocial : name.razon_social;
	
		if(registroAEditar !== undefined){
			if(registroAEditar.hasOwnProperty(name)){
				return res.status(200).send({ status: false, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", coincidencias: registroAEditar});
			}else{
				return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
			}
		}
	}
}

async function updateRazonSocial(parametros, res, crudMarca = false, idRazonSocial = undefined, usuario){

	try {
		const id  = idRazonSocial;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		
		const validosOpcionales =[{campo:'idRazonBloqueo',tipo:'model',model:db.sequelize.models.razones_bloqueo},
								  {campo:'idMonedaCredito',tipo:'model',model:db.sequelize.models.monedas},
								  {campo:'idMarcaPreferente',tipo:'model',model:db.sequelize.models.marcas},
								  {campo:'limiteCredito',tipo:'number'},{campo:'diasCredito',tipo:'number'},
								  {campo:'creditoValidado',tipo:'boolean'},{campo:'bloqueado',tipo:'boolean'},
								  {campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
								  {campo:'idRegimenFiscal', tipo:'model',model:db.sequelize.models.regimenes_fiscal},
								  {campo:'idNacionalidadTimbrado', tipo:'model',model:db.sequelize.models.paises},
								  {campo:'idUsoCfdi', tipo:'model',largo:null,model:db.sequelize.models.usos_cfdi},
								  {campo:'idMetodoPago', tipo:'model',largo:null,model:db.sequelize.models.metodos_pago},
								  {campo:'idFormaPago', tipo:'model',model:db.sequelize.models.formas_pago},
								  {campo:'tipoPersona', tipo:'enum', largo:1, textoCase:"up", enum: ['F', 'M']}]
		const facturas = await db.sequelize.models.facturas.findAll({where:{id_razon_social:id}, include:['razon_social']})
		let permitirActurlizar = true
		for(const factura of facturas){
			const nT = await db.sequelize.models.paises.findByPk(factura.razon_social.id_nacionalidad_timbrado)
			if(factura.id_cfdi != null || nT.clave.toLowerCase() == 'mx'){
				permitirActurlizar = false
			}
		}
		if(permitirActurlizar){
			validosOpcionales.push({campo:'razonSocial', tipo:'string',largo:255,textoCase:"up"})
			validosOpcionales.push({campo:'noIdentificacion', tipo:'string',largo:255,textoCase:"up",verifNoSpace:true})
		}

		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			if(crudMarca){
				res.status(200).send({ status: true, msg: "Registro no editado" });
				return undefined;
			}
		}
		
		const registroAEditar = await db.sequelize.models.razones_sociales.findByPk(id);
		if(registroAEditar == null){
			res.status(400).send({ status: false, msg: "Registro no existe" });
			return undefined;
		}
		if(registroAEditar.deletedAt != null){
			res.status(400).send({ status: false, msg: "Registro eliminado" });
			return undefined;
		}
		const idRegimenFiscal = parametros.idRegimenFiscal !== undefined && parametros.idRegimenFiscal !== null ? parametros.idRegimenFiscal : registroAEditar.id_regimen_fiscal
		const regimenFiscal = await db.sequelize.models.regimenes_fiscal.findByPk(idRegimenFiscal);
		if(regimenFiscal == null){
			res.status(400).send({ status: false, msg: "Régimen fiscal no existe" });
			return undefined;
		}
		const regimenFiscalSelected = parametros.tipoPersona !== undefined && parametros.tipoPersona !== null ? parametros.tipoPersona.toUpperCase() : registroAEditar.tipo_persona.toUpperCase()
		if(regimenFiscal.tipo_persona.toUpperCase() != regimenFiscalSelected && regimenFiscal.tipo_persona.toUpperCase() != "FM" ){
			res.status(400).send({ status: false, msg: "Régimen fiscal no válido."});
			return undefined
		}

		const formaPago = await db.sequelize.models.formas_pago.findByPk(parametros.idFormaPago != undefined ? parametros.idFormaPago : registroAEditar.id_forma_pago)
		const metodoPago = await db.sequelize.models.metodos_pago.findByPk(parametros.idMetodoPago != undefined ? parametros.idMetodoPago : registroAEditar.id_metodo_pago)
		if(metodoPago.clave.toUpperCase() === 'PPD' && formaPago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return { status: false, msg: `Si selecciona el método de pago (${metodoPago.clave}) ${metodoPago.descripcion}, por favor asegúrese de elegir la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`}
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]:{
					id_pais: parametros.idPais != undefined ? parametros.idPais : registroAEditar.id_pais,
					razon_social: {
						[db.Sequelize.Op.like]: `%${parametros.razonSocial != undefined ? parametros.razonSocial : registroAEditar.razon_social}%`
					},
					no_identificacion: {
						[db.Sequelize.Op.like]: `%${parametros.noIdentificacion != undefined ? parametros.noIdentificacion : registroAEditar.no_identificacion}%`
					}
				},
				[db.Sequelize.Op.and]: {
					deletedAt: null
				}
			}
		}
		const registrosEncontrados = await db.sequelize.models.razones_sociales.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			for(const registro of registrosEncontrados){
				/*Si el registro a editar contiene RFC genérico, ya sea extranjero o nacional, no se toma
				en cuenta para registros existentes*/
	
				const rfc = parametros.noIdentificacion != undefined ? parametros.noIdentificacion : registroAEditar.no_identificacion;
				const razonSocialParametro = await ManipuladorCadenas.quitarAcentos(parametros.razonSocial != undefined ? parametros.razonSocial.toLowerCase() : registroAEditar.razon_social.toLowerCase())
				if((((registro.razon_social.toLowerCase() == (parametros.razonSocial != undefined ? parametros.razonSocial.toLowerCase() : registroAEditar.razon_social.toLowerCase())) && (razonSocialParametro != "publico general" && razonSocialParametro != "publico en general" && rfc.toUpperCase() != 'ESA2012145V5')) || 
					((registro.no_identificacion.toLowerCase() == (parametros.noIdentificacion != undefined ? parametros.noIdentificacion.toLowerCase() : registroAEditar.no_identificacion.toLowerCase())) && (rfc.toUpperCase() != 'XEXX010101000' && rfc.toUpperCase() != 'XAXX010101000' && rfc.toUpperCase() != 'ESA2012145V5'))) &&
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
	
						if(entidad.ids.length > 0){
							const rfcObj = entidad.ids.find(item => item.type === "R.F.C.");
							const rfcId = rfcObj ? rfcObj.id : null;
							if(rfcId != null){
								if(rfcId == datosEntidad.rfc){
									coincidenciaExacta = true;
								}
							}
						}
					}
					if(coincidenciaExacta == true){
						return entidadValidada.coincidencias.matches;
					}	
				}
			}
			
			// registro de historial
			var registro2 = {
				id_usuario_registro: usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.razones_sociales.name.toUpperCase(),
				accion: 'EDICION',
				createdAt: moment().tz('America/Mexico_City')
			}
				
			//encriptación para actualizar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEditar);
			registro2.encriptacion_previa = stringEncriptado;
	
			const antes = await db.sequelize.models.razones_sociales.findByPk(id);
			const registrosActuales = await registroAEditar.update(datosUpdate, { where: { id: id } });
			sendNotificacionCreditoActualizado(antes, id, usuario)
				
			const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
			registro2.encriptacion_posterior = stringEncriptado2;
			const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
	
			if(crudMarca){
				return [registroAEditar, null, datosHistoricos];
			} else{
				return [registroAEditar, true, datosHistoricos];
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
		const registroAEliminar = await db.sequelize.models.razones_sociales.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.razones_sociales.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name) && modelo.name != "clientes_razones_sociales" && modelo.name != "razones_sociales_domicilios"  && modelo.name != "razones_sociales_archivos"){
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
			const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where:{id_razon_social:registroAEliminar.id},paranoid: false});
			for(const clienteRazonSocial of clientesRazonesSociales){
				await clienteRazonSocial.destroy({ where: { id: clienteRazonSocial.id } });
			}
			const domicilios = await db.sequelize.models.razones_sociales_domicilios.findAll({where:{id_razon_social:registroAEliminar.id},paranoid: false});
			for(const domicilio of domicilios){
				await domicilio.destroy({ where: { id: domicilio.id } });
			}
			const archivosRazonesSociales = await db.sequelize.models.razones_sociales_archivos.findAll({
				paranoid: false,
				where: {
					id_razon_social:id
				}
			})
			for(const archivoRazonSocial of archivosRazonesSociales){
				await archivoRazonSocial.destroy({ where: { id: archivoRazonSocial.id } });
			}

			// registro de historial
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.razones_sociales.name.toUpperCase() ,
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
		const registroARestaurar = await db.sequelize.models.razones_sociales.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.razones_sociales.findAll({
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
					for(const registro of registrosEncontrados){
						const rfc = registroARestaurar.no_identificacion;
						const razonSocialParametro = await ManipuladorCadenas.quitarAcentos(registroARestaurar.razon_social.toLowerCase())
				
						if((((registro.razon_social.toLowerCase() == (registroARestaurar.razon_social.toLowerCase())) && (razonSocialParametro != "publico general" && razonSocialParametro != "publico en general" && rfc.toUpperCase() != 'ESA2012145V5')) || 
							((registro.no_identificacion.toLowerCase() == (registroARestaurar.no_identificacion.toLowerCase())) && (rfc.toUpperCase() != 'XEXX010101000' && rfc.toUpperCase() != 'XAXX010101000' && rfc.toUpperCase() != 'ESA2012145V5'))) &&
							registro.id != id && registro.id_pais == (registroARestaurar.id_pais)){
								if(!regExistente){
									regExistente = true;
									res.status(400).send({ status: false, msg: "Registro existente"});
								}
						}
					}
					if(regExistente){
						return '';
					}
				}
				const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where:{id_razon_social:registroARestaurar.id},paranoid: false});
				for(const clienteRazonSocial of clientesRazonesSociales){
					await clienteRazonSocial.restore({ where: { id: clienteRazonSocial.id } });
				}
				const domicilios = await db.sequelize.models.razones_sociales_domicilios.findAll({where:{id_razon_social:registroARestaurar.id},paranoid: false});
				for(const domicilio of domicilios){
					await domicilio.restore({ where: { id: domicilio.id } });
				}
				const archivosRazonesSociales = await db.sequelize.models.razones_sociales_archivos.findAll({
					paranoid: false,
					where: {
						id_razon_social:id
					}
				})
				for(const archivoRazonSocial of archivosRazonesSociales){
					await archivoRazonSocial.restore({ where: { id: archivoRazonSocial.id } });
				}

				// registro de historial
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.razones_sociales.name.toUpperCase(),
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
			tabla: db.sequelize.models.razones_sociales.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.razones_sociales.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud razones_sociales" });
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
			if(asociacion.target.name == db.sequelize.models.razones_sociales.name){
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

async function sendNotificacionCreditoActualizado(antes, idRazonSocial, usuario) {
	const razonSocial = await db.sequelize.models.razones_sociales.findByPk(idRazonSocial);
	if(antes.dias_credito != razonSocial.dias_credito || antes.limite_credito != razonSocial.limite_credito){
		const clienteRS = await db.sequelize.models.clientes_razones_sociales.findOne({ where: { id_razon_social : idRazonSocial} });
		const relCliente = [ 
			'detalles_cliente.agente_credito_cobranza',
			'detalles_cliente.agente_customer'
		]
		const findRelCliente = new Relaciones(relCliente,relCliente,db.sequelize.models)
		const relacionesCliente = await findRelCliente.getRelaciones()
		const cliente = await db.sequelize.models.clientes.findByPk(clienteRS.id_cliente, { include:relacionesCliente });
		const email = await getMailsAgentes(cliente)
		const dataMail = {
			email: email,
			idUsuario: usuario.id,
			idMarca: null,
			nombreRazonSocial: razonSocial.razon_social,
			nombreCliente: cliente.nombre,
			fechaCambio:  moment(razonSocial.updatedAt).format("DD-MM-YYYY"),
			horaCambio:  moment(razonSocial.updatedAt).format("HH:mm:ss"),
			diasCreditoAntes: antes.dias_credito,
			limiteCreditoAntes: "USD " + ManipuladorCadenas.formatMoney(antes.limite_credito,2),
			diasCreditoDespues: razonSocial.dias_credito,
			limiteCreditoDespues: "USD " + ManipuladorCadenas.formatMoney(razonSocial.limite_credito,2)
		}
		creditoActualizado(dataMail)
	}
}

async function getMailsAgentes(cliente) {
	const emails = []
	if(cliente.detalles_cliente.agente_credito_cobranza != null){
		emails.push(cliente.detalles_cliente.agente_credito_cobranza.email)
	}
	if(cliente.detalles_cliente.agente_customer != null){
		if(!emails.includes(cliente.detalles_cliente.agente_customer.email)){
			emails.push(cliente.detalles_cliente.agente_customer.email)
		}
	}
	const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findAll({
		where: {
			id_cliente: cliente.id,
			deletedAt: null
		},
		include: ['agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	});
	for(const mac of marcaAgentesCliente){
		if(mac.agente_operativo != null){
			if(!emails.includes(mac.agente_operativo.email)){
				emails.push(mac.agente_operativo.email)
			}
		}
		if(mac.agente_venta_1 != null){
			if(!emails.includes(mac.agente_venta_1.email)){
				emails.push(mac.agente_venta_1.email)
			}
		}
		if(mac.agente_venta_2 != null){
			if(!emails.includes(mac.agente_venta_2.email)){
				emails.push(mac.agente_venta_2.email)
			}
		}
		if(mac.inside_sales != null){
			if(!emails.includes(mac.inside_sales.email)){
				emails.push(mac.inside_sales.email)
			}
		}
	}
	const oficinasClienteData = await db.sequelize.models.oficinas_cliente.findAll({
		where: {
			id_cliente: cliente.id,
			deletedAt: null
		}
	});
	const oficinasCliente = []
	for(const oc of oficinasClienteData){
		oficinasCliente.push(oc.id)
	}
	if(oficinasCliente.length > 0){
		const marcaAgentesOficina = await db.sequelize.models.marca_agentes_oficinas.findAll({
			where: {
				id_oficina_cliente:  {[db.Sequelize.Op.or]: oficinasCliente},
				deletedAt: null
			},
			include: ['agente_venta_1','agente_venta_2','inside_sales' ]
		});
		for(const mao of marcaAgentesOficina){
			if(mao.agente_venta_1 != null){
				if(!emails.includes(mao.agente_venta_1.email)){
					emails.push(mao.agente_venta_1.email)
				}
			}
			if(mao.agente_venta_2 != null){
				if(!emails.includes(mao.agente_venta_2.email)){
					emails.push(mao.agente_venta_2.email)
				}
			}
			if(mao.inside_sales != null){
				if(!emails.includes(mao.inside_sales.email)){
					emails.push(mao.inside_sales.email)
				}
			}
		}
	}
	return emails
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	saveRazonSocial,
	updateRazonSocial,
	indexHistoricos,
	showHistoricos
}
