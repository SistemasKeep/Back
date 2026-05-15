'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { saveDomicilio, updateDomicilio } = require('./domicilios.controller')
const ofac = require('../controllers/validaciones_ofac.controller');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	var bloqueados = req.query.bloqueados;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.beneficiarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	/* if(bloqueados == 'only'){
		filtro.bloqueado = true
	} else if(bloqueados == 'true'){
		filtro.bloqueado = {
			[db.Sequelize.Op.or]: [true, false, null]
		  }
	} else if(bloqueados == 'false' || bloqueados == undefined){
		filtro.bloqueado = {
			[db.Sequelize.Op.or]: [false, null]
		  }
	} */
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['pais_sat','nacionalidad', 'domicilio', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				nacionalidad: ['nacionalidad.continente'],
				pais_sat: ['pais_sat.continente'],
				domicilio: ['domicilio.estado.pais.continente'],
				all: ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.beneficiarios.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const data = await db.sequelize.models.beneficiarios.findAll({
			paranoid: false,
			include: relaciones,
			where: filtro,
		})

		const totalCount = data.length

		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/beneficiarios`;
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
	var filtros
	try {
		filtros = JSON.parse(parametros.filter)
	} catch (error) {
		filtros = {"or":[],"and":[]}
	}
	
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtros,eliminados:eliminados})
	return await Filter.get()
}

async function store(req, res){
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		const tiposKeepro = {0 : 'Operaciones',1 : 'Autoemisor-Web',2 : 'Autoemisor-App',3 : 'Autoemisor-Api',}
		let numKeepro = parametros.keepro == 0 || parametros.keepro == 1 || parametros.keepro == 2 || parametros.keepro == 3 ? parametros.keepro : 0;

		let clienteSelected = undefined
		const marcaSelected = await db.sequelize.models.marcas.findByPk(1);

		try {
			const paisValid = await db.sequelize.models.paises.findByPk(parametros.idNacionalidad);
			if(!paisValid.mostrar_beneficiario){
				return res.status(400).send({ status: false, msg: "El país seleccionado no puede ser asignado como nacionalidad del beneficiario. Favor de validar."});
			}
		} catch (error) {
			return res.status(500).send({ status: false, msg: "Error al validar nacionalidad beneficiario"});
		}
		if (parametros.keepro != undefined || parametros.keepro != null) {
			if(typeof parametros.keepro != 'number'){
				return res.status(400).send({status:false , msg: `El parametro keepro debe ser int pero se recibio ${typeof parametros.keepro}.`});
			}else if(parametros.keepro < 0 || parametros.keepro > 3){
				return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });

			}
			if(parametros.idCliente != undefined || parametros.idCliente != null ){
				if(typeof parametros.idCliente != 'number'){
					return res.status(400).send({status:false , msg: `El parametro idCliente debe ser int pero se recibio ${typeof parametros.idCliente}.`});
				}
				clienteSelected = await db.sequelize.models.clientes.findByPk(parseInt(parametros.idCliente));
				if(clienteSelected == null){
					return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} no encontrado` });
				}
				if(clienteSelected.deletedAt != null){
					return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} eliminado` });
				}
				if(clienteSelected.cliente_prospecto !== true){
					return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
				}
			}else{
				return res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: 'idCliente' });
			}
		} else {
			return res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: 'keepro' });
			
		}
		
		var clave = clienteSelected != undefined ? `${marcaSelected.clave}-${clienteSelected.id}` : parametros.clave
		const beneficiariosRegistrados = await db.sequelize.models.beneficiarios.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					clave: {
						[db.Sequelize.Op.like]: `%${clave}%`
					}
				}
			}
		});
		
		const claveBusqueda = clave.toUpperCase()
		clave = tiposKeepro[numKeepro] + "-" + clave.toUpperCase() + "-" + (parseInt(beneficiariosRegistrados.length +1));
		parametros.clave = clave
		const domicilioRegistro = await saveDomicilio(req.body.domicilio, res,req.usuario);
		if(domicilioRegistro == undefined){
			return ''
		}
		parametros.idDomicilio = domicilioRegistro.id
		let obligatorios = [{campo:'idNacionalidad', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idDomicilio', tipo:'model',model:db.sequelize.models.domicilios},
							{campo:'nombre', tipo:'string',largo:175,textoCase:"up"},
							{campo:'rfc', tipo:'string',largo:150,textoCase:"up"},
							{campo:'email', tipo:'correo',largo:255,textoCase:"up"},
							{campo:'clave', tipo:'string',largo:45,textoCase:"up"}]
		if(parametros.keepro !== 3){
			obligatorios.push({campo:'idPaisSat', tipo:'model',model:db.sequelize.models.paises})
		}else{
			parametros.idPaisSat = parametros.idNacionalidad
			obligatorios.push({campo:'idPaisSat', tipo:'model',model:db.sequelize.models.paises})
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const findBloqueado = await db.sequelize.models.beneficiarios.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					rfc: {
						[db.Sequelize.Op.like]: `%${parametros.rfc}%`
					}
				}
			}
		})
		var rfcBloqueado = false
		for(const beneficiarioFind of findBloqueado){
			if(beneficiarioFind.bloqueado === true && beneficiarioFind.rfc.toUpperCase() == parametros.rfc.toUpperCase()){
				rfcBloqueado = true
			}
		}
		if(rfcBloqueado){
			return res.status(400).send({status:false , msg: 'El RFC del beneficiario no puede registrarse porque está bloqueado en el sistema.' });
		}
	
		const registrosEncontrados = await db.sequelize.models.beneficiarios.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					clave: {
						[db.Sequelize.Op.like]: `%${claveBusqueda}%`
					},
					id_nacionalidad: parametros.idNacionalidad,
					deletedAt: null
				},
				[db.Sequelize.Op.or]: {
					rfc: {
						[db.Sequelize.Op.like]: `%${parametros.rfc}%`
					},
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre}%`
					}
				}
			}
		});
		var regExistente = false
		await registrosEncontrados.forEach(registro => {
			const arrayClave = registro.clave.split("-");
			/*Si el registro nuevo contiene RFC genérico, ya sea extranjero o nacional, no se toma
			en cuenta para registros existentes*/

			if(parametros.rfc.toUpperCase() == 'XEXX010101000' || parametros.rfc.toUpperCase() == 'XAXX010101000'){
				if(registro.nombre.toLowerCase() == parametros.nombre.toLowerCase() && arrayClave[arrayClave.length - 2] == clienteSelected.id){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				}
			}else{
				if((registro.rfc.toLowerCase() == parametros.rfc.toLowerCase() || 
				registro.nombre.toLowerCase() == parametros.nombre.toLowerCase()) && arrayClave[arrayClave.length - 2] == clienteSelected.id){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				}
			}

			
		});
		if(regExistente){
			return '';
		}
		registro.id_usuario_registro = req.usuario.id

		//Validación de la OFAC
		const name = parametros.nombre;
		const pais = await db.sequelize.models.paises.findByPk(parametros.idNacionalidad);
		let datosEntidad = {
			nombre: name,
			pais: pais.descripcion,
			rfc: parametros.rfc
		}
		const entidadValidada = await ofac.validarEntidad(datosEntidad);

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
					const coincidencias = entidadValidada.coincidencias.matches;
					return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: coincidencias});
				}	
			}

			const nuevoRegistro = await db.sequelize.models.beneficiarios.create(registro);
			const registroClienteBeneficiario = {
				id_cliente: parametros.idCliente,
				id_beneficiario: nuevoRegistro.id,
				id_usuario_registro: req.usuario.id,
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			}
			await db.sequelize.models.clientes_beneficiarios.create(registroClienteBeneficiario);
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});	
		}else{
			return res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
		}
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
		if(req.query.keepro === 3 ){
			req.query.perfil = "domicilio"
		}
		const perfilesValidos = ['pais_sat','nacionalidad', 'domicilio', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				nacionalidad: ['nacionalidad.continente'],
				pais_sat: ['pais_sat.continente'],
				domicilio: ['domicilio.estado.pais.continente'],
				all: ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.beneficiarios.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			if(registroEncontrado.bloqueado == true){
				return res.status(400).send({ status: false, msg: "Beneficiario bloqueado" });
			}
			const element = registroEncontrado.toJSON()
			if(req.query.keepro === 3 ){
				element.usuario_registro = undefined
				element.nacionalidad = undefined
				element.pais_sat = undefined
				element.domicilio = {
					estado: element.domicilio.estado.descripcion,
					municipio: element.domicilio.municipio,
					codigo_postal: element.domicilio.codigo_postal,
					ciudad_localidad: element.domicilio.ciudad_localidad,
					colonia: element.domicilio.colonia,
					calle: element.domicilio.calle,
					num_int: element.domicilio.num_int,
					num_ext: element.domicilio.num_ext,
					referencia: element.domicilio.referencia,
					calle_izq: element.domicilio.calle_izq,
					calle_der: element.domicilio.calle_der
				}



				element.id_nacionalidad = undefined
				element.id_pais_sat = undefined
				element.id_usuario_registro = undefined
				element.id_domicilio = undefined
				element.bloqueado = undefined
				element.clave = undefined
				element.email = undefined
				element.createdAt = undefined
				element.updatedAt = undefined
				element.deletedAt = undefined
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
		const registroAEditar = await db.sequelize.models.beneficiarios.findByPk(id,{include: 'domicilio'});
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.bloqueado == true && parametros.keepro != 0){
			return res.status(400).send({ status: false, msg: "Beneficiario bloqueado" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if(parametros.domicilio != undefined){
			const estadoRegistrado = await db.sequelize.models.estados.findByPk(registroAEditar.domicilio.id_estado);
			const estadoActualizar = await db.sequelize.models.estados.findByPk(parametros.domicilio.idEstado);
			var canUpdate = true;
			if(estadoActualizar != undefined){
				if(estadoRegistrado.id_pais != estadoActualizar.id_pais && estadoRegistrado.id_pais != 233){
					canUpdate = false
				}
			}
			if(!canUpdate){
				return res.status(400).send({ status: false, msg: "El estado a actualizar y el estado almacenado deben ser del mismo país." });
			}
		}
		if(parametros.keepro < 0 || parametros.keepro > 3){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
		}
		try {
			const paisValid = await db.sequelize.models.paises.findByPk(parametros.idNacionalidad ?? registroAEditar.id_nacionalidad);
			if(!paisValid.mostrar_beneficiario){
				return res.status(400).send({ status: false, msg: "El país seleccionado no puede ser asignado como nacionalidad del beneficiario. Favor de validar."});
			}
		} catch (error) {
			return res.status(500).send({ status: false, msg: "Error al validar nacionalidad beneficiario"});
		}

		if (parametros.keepro == 0){
			var datosUpdate = {update_at: moment().tz('America/Mexico_City')}
			const validosOpcionales =[{campo:'idNacionalidad',tipo:'model',model:db.sequelize.models.paises},
									  {campo:'nombre',tipo:'string',textoCase:"up",largo:175},
									  {campo:'rfc',tipo:'string',textoCase:"up",largo:150},
									  {campo:'idPaisSat', tipo:'model',model:db.sequelize.models.paises},
									  {campo:'clavePaisSat',tipo:'string',textoCase:"up",largo:20},
									  {campo:'paisSat',tipo:'string',textoCase:"up",largo:100},
									  {campo:'email',tipo:'correo',textoCase:"up",largo:255},
									  {campo:'bloqueado', tipo:'boolean'},]
			const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
			if(dataValidarOpcionales == undefined){
				return '';
			}
			datosUpdate = dataValidarOpcionales[0]
			seEdita = dataValidarOpcionales[1]

			const findBloqueado = await db.sequelize.models.beneficiarios.findAll({
				where: {
					[db.Sequelize.Op.or]: {
						rfc: {
							[db.Sequelize.Op.like]: `%${parametros.rfc != undefined ? parametros.rfc : registroAEditar.rfc}%`
						}
					}
				}
			})
			var rfcBloqueado = false
			for(const beneficiarioFind of findBloqueado){
				if(beneficiarioFind.bloqueado === true && beneficiarioFind.rfc.toUpperCase() == parametros.rfc.toUpperCase()){
					rfcBloqueado = true
				}
			}
			if(rfcBloqueado){
				return res.status(400).send({status:false , msg: 'El RFC del beneficiario no puede registrarse porque está bloqueado en el sistema.' });
			}

			const claveArray = registroAEditar.clave.split("-")
			const claveFind = claveArray[claveArray.length-3] + "-" + claveArray[claveArray.length-2]
			var whereFind = {
				where:{
					[db.Sequelize.Op.and]: {
						clave: {[db.Sequelize.Op.like]: `%${claveFind}%`},
						deletedAt: null
					},
					[db.Sequelize.Op.or]: {
						rfc: {
							[db.Sequelize.Op.like]: `%${parametros.rfc != undefined ? parametros.rfc : registroAEditar.rfc}%`
						},
						nombre: {
							[db.Sequelize.Op.like]: `%${parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre}%`
						}
					}
				}
			}
			const arrayClaveSaved = registroAEditar.clave.split("-");
			const registrosEncontrados = await db.sequelize.models.beneficiarios.findAll(whereFind);
			if(registrosEncontrados.length > 0){
				var regExistente = false
				await registrosEncontrados.forEach(registro => {
					const arrayClave = registro.clave.split("-");
					/*Si el registro a editar contiene RFC genérico, ya sea extranjero o nacional, no se toma
					en cuenta para registros existentes*/
					const rfc = parametros.rfc != undefined ? parametros.rfc : registroAEditar.rfc;
					if(rfc.toUpperCase() == 'XAXX010101000' || rfc.toUpperCase() == 'XEXX010101000'){
						if((registro.nombre.toLowerCase() == (parametros.nombre != undefined ? parametros.nombre.toLowerCase() : registroAEditar.nombre.toLowerCase())) &&
					   	registro.id != id &&
						arrayClave[arrayClave.length - 2] == arrayClaveSaved[arrayClave.length - 2]){
							if(!regExistente){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
							}
						}
					}else{
						if((registro.rfc.toLowerCase() == (parametros.rfc != undefined ? parametros.rfc.toLowerCase() : registroAEditar.rfc.toLowerCase()) ||
					   	registro.nombre.toLowerCase() == (parametros.nombre != undefined ? parametros.nombre.toLowerCase() : registroAEditar.nombre.toLowerCase())) &&
					   	registro.id != id &&
						arrayClave[arrayClave.length - 2] == arrayClaveSaved[arrayClave.length - 2]){
							if(!regExistente){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
							}
						}
					}
				});
				if(regExistente){
					return '';
				}
			}
			//Validación de la OFAC
			const name = parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre;
			const rfc = parametros.rfc != undefined ? parametros.rfc : registroAEditar.rfc;
			let pais = parametros.idNacionalidad != undefined ? parametros.idNacionalidad : registroAEditar.id_nacionalidad;
			pais = await db.sequelize.models.paises.findByPk(pais);
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

							
						}
		
						if(coincidenciaExacta == true){
							const coincidencias = entidadValidada.coincidencias.matches;
							return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: coincidencias});
						}	
					}
				}
					
				var domEditado = false;
				if(parametros.domicilio != undefined){
					const domicilioEditado = await updateDomicilio(req.body.domicilio, res, false, registroAEditar.id_domicilio);
					if(domicilioEditado == undefined){
						return ''
					}
					domEditado = domicilioEditado[1];
				}
				if(!seEdita){
					if(domEditado == false){
						return res.status(200).send({ status: true, msg: "Registro no editado" });
					}else{
						return res.status(200).send({ status: true, msg: "Domicilio editado" });
					}
				}
					
				// registro de historico
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.beneficiarios.name.toUpperCase(),
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
			}else{
				return res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
			}
		} else{
			var domEditado = false;
			if(parametros.domicilio != undefined){
				const domicilioEditado = await updateDomicilio(req.body.domicilio, res, false, registroAEditar.id_domicilio);
				if(domicilioEditado == undefined){
						return ''
				}
				domEditado = domicilioEditado[1];
				if(!seEdita){
					if(domEditado == false){
						return res.status(200).send({ status: true, msg: "Registro no editado" });
					}else{
						return res.status(200).send({ status: true, msg: "Domicilio editado" });
					}
				}
				}else{
					return res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
				}		
		}
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
		const registroAEliminar = await db.sequelize.models.beneficiarios.findByPk(id);
		if(registroAEliminar != null){
			if(registroAEliminar.bloqueado == true){
				return res.status(400).send({ status: false, msg: "Beneficiario bloqueado" });
			}
			let canDelete = true
			let delRegRel = false
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.beneficiarios.name){
						let where = {}
						if(modelo.name =="clientes_beneficiarios"){
							delRegRel = true
						} else if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name)){
								canDelete = false
								if(modelo.name == "atributos_keepro" && !modelosUtilizados.includes("tarifas")){
									modelosUtilizados.push("tarifas")
								}else{
									modelosUtilizados.push(modelo.name)
								}
							}
						}
					}
				}
			}
			if(!canDelete){
				if(modelosUtilizados.length == 1){
					return res.status(400).send({ status: false, msg: `No se pudo eliminar: el elemento está referenciado en ${modelosUtilizados[0]}.` });
				}else{
					return res.status(400).send({ status: false, msg: `No se pudo eliminar: el elemento está referenciado en [${modelosUtilizados}].` });
				}
				
			}
			if(registroAEliminar.deletedAt != null){
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			if(delRegRel){
				const regRelAEliminar = await db.sequelize.models.clientes_beneficiarios.findAll({where:{id_beneficiario:registroAEliminar.id}});
				await regRelAEliminar.forEach(async (regRelDel) => {
					let regId = regRelDel.id
					await regRelDel.destroy({ where: { id: regId } })
				});
			}
			// registro de historico
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.beneficiarios.name.toUpperCase() ,
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
		const registroARestaurar = await db.sequelize.models.beneficiarios.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.bloqueado == true){
				return res.status(400).send({ status: false, msg: "Beneficiario bloqueado" });
			}
			if(registroARestaurar.deletedAt != null){
				const claveArray = registroARestaurar.clave.split("-")
				const claveFind = claveArray[claveArray.length-3] + "-" + claveArray[claveArray.length-2]
				const registrosEncontrados = await db.sequelize.models.beneficiarios.findAll({
					where: {
						clave: {[db.Sequelize.Op.like]: `%${claveFind}%`},
						rfc: {
							[db.Sequelize.Op.like]: `%${registroARestaurar.rfc}%`
						},
						nombre: {
							[db.Sequelize.Op.like]: `%${registroARestaurar.nombre}%`
						},
						id_nacionalidad: registroARestaurar.id_nacionalidad,
						deletedAt: null
					}
				});
				const arrayClaveSaved = registroAEditar.clave.split("-");
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
					const arrayClave = registro.clave.split("-");
						if((registro.rfc.toLowerCase() == registroARestaurar.rfc.toLowerCase() ||
						   registro.nombre.toLowerCase() == registroARestaurar.nombre.toLowerCase()) &&
						   registro.id != id &&
						   arrayClave[arrayClave.length - 2] == arrayClaveSaved[arrayClave.length - 2]){
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

				const regRelARestaurar = await db.sequelize.models.clientes_beneficiarios.findAll({where:{id_beneficiario:registroARestaurar.id},paranoid: false});
				await regRelARestaurar.forEach(async (regRelRes) => {
					await regRelRes.restore()
				});
				// registro de historico
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.beneficiarios.name.toUpperCase(),
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
			tabla: db.sequelize.models.beneficiarios.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.beneficiarios.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud beneficiarios" });
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
			if(asociacion.target.name == db.sequelize.models.beneficiarios.name){
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

async function exportar(req, res) {
	var orden = req.query.orden;
	var bloqueados = req.query.bloqueados;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.beneficiarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.beneficiarios.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro,
		});

		const dataExcel = [];
		let aux;
		for (let i = 0; i < docs.length; i++) {
			let elemento = docs[i];

			aux = {
				'Clave': elemento.clave,
				'Nombre': elemento.nombre,
				'RFC': elemento.rfc,
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Beneficiarios';
		const namesSheets = [db.sequelize.models.beneficiarios.name];
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



module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos,
	exportar
}
