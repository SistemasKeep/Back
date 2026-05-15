'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const ofac = require('../controllers/validaciones_ofac.controller');
const { saveDomicilio } = require('./domicilios.controller')
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.proveedores.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['archivo','contactos_proveedor','moneda', 'conceptos_presupuesto', 'marca', 'almacen', 'proveedor_tipo', 'nacionalidad','estado', 'domicilio', 'all']
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				archivo: ['archivo'],
				contactos_proveedor: ['contactos_proveedor'],
				moneda: ['moneda'],
				conceptos_presupuesto: ['conceptos_presupuesto'],
				marca: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				almacen: [
					'almacen.marca.domicilio.estado.pais.continente',
					'almacen.marca.pais.continente',
					'almacen.marca.archivo',
					'almacen.marca.dato_facturacion.regimen_fiscal', 
					'almacen.marca.dato_facturacion.pais.continente', 
					'almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.ubicacion_defecto',
				],
				proveedor_tipo: ['proveedor_tipo'],
				nacionalidad: ['nacionalidad.continente'],
				estado: ['estado.pais.continente'],
				domicilio: ['domicilio.estado.pais.continente'],
				all: [
					'archivo',
					'contactos_proveedor',
					'moneda',
					'conceptos_presupuesto',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.marca.domicilio.estado.pais.continente',
					'almacen.marca.pais.continente',
					'almacen.marca.dato_facturacion.regimen_fiscal', 
					'almacen.marca.dato_facturacion.pais.continente', 
					'almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.ubicacion_defecto',
					'proveedor_tipo',
					'nacionalidad.continente',
					'estado.pais.continente',
					'domicilio.estado.pais.continente'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.proveedores.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.proveedores.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/proveedores`;
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
		const domicilioRegistro = await saveDomicilio(req.body.domicilio, res,req.usuario);
		if(domicilioRegistro == undefined){
			return ''
		}
		parametros.idDomicilio = domicilioRegistro.id
		let obligatorios = [
            {campo:'nombre', tipo:'string', largo:80, textoCase:"up"},
			{campo:'idDomicilio', tipo:'model',model:db.sequelize.models.domicilios},
            {campo:'rfc', tipo:'string', largo:15, textoCase:"up"},
			{campo:'idNacionalidad', tipo:'model', model:db.sequelize.models.paises}
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[
            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
            {campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos},
            {campo:'idConceptosPresupuesto', tipo:'model', model:db.sequelize.models.conceptos_presupuesto},
            {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
			{campo:'idAlmacen', tipo:'model', model:db.sequelize.models.almacenes},
            {campo:'idProveedorTipo', tipo:'model', model:db.sequelize.models.proveedor_tipos},
            {campo:'idEstado', tipo:'model', model:db.sequelize.models.estados},
            {campo:'telefono', tipo:'stringInt',largo:15},
            {campo:'telefono2', tipo:'stringInt',largo:15},
            {campo:'nombreFiscal', tipo:'string', largo:255, textoCase:"up"},
            {campo:'email', tipo:'string', largo:50, textoCase:"up"},
            {campo:'nombreComercial', tipo:'string', largo:255, textoCase:"up"},
            {campo:'tipo', tipo:'enum', largo:2, enum: ['CR', 'CO']},
            {campo:'bloqueado', tipo:'boolean'},
            {campo:'porcentaje', tipo:'number'},
            {campo:'diasPlaneacion', tipo:'number'},
            {campo:'validado', tipo:'boolean'},
            {campo:'iva', tipo:'number'},
            {campo:'generarIva', tipo:'boolean'},
            {campo:'diasCredito', tipo:'number'},
            {campo:'limiteCredito', tipo:'number'},
            {campo:'descuento', tipo:'number'},
            {campo:'monto', tipo:'number'},
            {campo:'plazo', tipo:'number'},
            {campo:'nacionalExtranjero', tipo:'boolean'},
            {campo:'dirInternet', tipo:'string', largo:60, textoCase:"up"},
            {campo:'maquilador', tipo:'boolean'},
            {campo:'comentarios', tipo:'string', largo:255, textoCase:"up"}
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.proveedores.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre}%`
					
					}
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.nombre.toLowerCase() == parametros.nombre.toLowerCase()){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
				}
			});
			if(regExistente){
				const domicilioAEliminar = await db.sequelize.models.domicilios.findByPk(domicilioRegistro.id);
				await domicilioAEliminar.destroy({ where: { id: domicilioAEliminar.id } });
				return '';
			}
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
				const coincidencias = entidadValidada.coincidencias.matches;
				return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: coincidencias});
			}else{
				const nuevoRegistro = await db.sequelize.models.proveedores.create(registro);
				const documentosProveedor = await db.sequelize.models.proveedores_documentos_generales.findAll()
				for(const documentoProveedor of documentosProveedor){
					const registroExpediente = {
						id_proveedor: nuevoRegistro.id,
						id_documento_proveedor: documentoProveedor.id,
						descripcion: documentoProveedor.descripcion,
						obligatorio: documentoProveedor.obligatorio,
						id_usuario_registro: req.usuario.id
					}
					await db.sequelize.models.proveedores_expediente.create(registroExpediente);
				}
				return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
			}
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
		const perfilesValidos = ['archivo','contactos_proveedor','moneda', 'conceptos_presupuesto', 'marca', 'almacen', 'proveedor_tipo', 'nacionalidad','estado', 'domicilio', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				archivo: ['archivo'],
				contactos_proveedor: ['contactos_proveedor'],
				moneda: ['moneda'],
				conceptos_presupuesto: ['conceptos_presupuesto'],
				marca: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				almacen: [
					'almacen.marca.domicilio.estado.pais.continente',
					'almacen.marca.pais.continente',
					'almacen.marca.archivo',
					'almacen.marca.dato_facturacion.regimen_fiscal', 
					'almacen.marca.dato_facturacion.pais.continente', 
					'almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.ubicacion_defecto',
				],
				proveedor_tipo: ['proveedor_tipo'],
				nacionalidad: ['nacionalidad.continente'],
				estado: ['estado.pais.continente'],
				domicilio: ['domicilio.estado.pais.continente'],
				all: [
					'archivo',
					'contactos_proveedor',
					'moneda',
					'conceptos_presupuesto',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.marca.domicilio.estado.pais.continente',
					'almacen.marca.pais.continente',
					'almacen.marca.dato_facturacion.regimen_fiscal', 
					'almacen.marca.dato_facturacion.pais.continente', 
					'almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'almacen.ubicacion_defecto',
					'proveedor_tipo',
					
					'nacionalidad.continente',
					'estado.pais.continente',
					'domicilio.estado.pais.continente'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}
		const registroEncontrado = await db.sequelize.models.proveedores.findByPk(id,{include:relaciones,paranoid: false});
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

		const registroAEditar = await db.sequelize.models.proveedores.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const validosOpcionales = [
            {campo:'nombre', tipo:'string', largo:80, textoCase:"up"},
            {campo:'idCargaArchivo', tipo:'model', model:db.sequelize.models.carga_archivos, canNull: true},
            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
            {campo:'idConceptosPresupuesto', tipo:'model', model:db.sequelize.models.conceptos_presupuesto},
            {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
			{campo:'idAlmacen', tipo:'model', model:db.sequelize.models.almacenes},
            {campo:'idProveedorTipo', tipo:'model', model:db.sequelize.models.proveedor_tipos},
			{campo:'idNacionalidad', tipo:'model', model:db.sequelize.models.paises},
            {campo:'idEstado', tipo:'model', model:db.sequelize.models.estados},
            {campo:'telefono', tipo:'stringInt',largo:15},
            {campo:'telefono2', tipo:'stringInt',largo:15},
            {campo:'nombreFiscal', tipo:'string', largo:255, textoCase:"up"},
            {campo:'rfc', tipo:'string', largo:15, textoCase:"up"},
            {campo:'email', tipo:'string', largo:50, textoCase:"up"},
            {campo:'nombreComercial', tipo:'string', largo:255, textoCase:"up"},
            {campo:'tipo', tipo:'enum', largo:2, enum: ['CR', 'CO']},
            {campo:'bloqueado', tipo:'boolean'},
            {campo:'porcentaje', tipo:'number'},
            {campo:'diasPlaneacion', tipo:'number'},
            {campo:'validado', tipo:'boolean'},
            {campo:'iva', tipo:'number'},
            {campo:'generarIva', tipo:'boolean'},
            {campo:'diasCredito', tipo:'number'},
            {campo:'limiteCredito', tipo:'number'},
            {campo:'descuento', tipo:'number'},
            {campo:'monto', tipo:'number'},
            {campo:'plazo', tipo:'number'},
            {campo:'nacionalExtranjero', tipo:'boolean'},
            {campo:'dirInternet', tipo:'string', largo:60, textoCase:"up"},
            {campo:'maquilador', tipo:'boolean'},
            {campo:'comentarios', tipo:'string', largo:255, textoCase:"up"}
        ]
		if(parametros.domicilio !== undefined && registroAEditar.id_domicilio == null){
			const domicilioRegistro = await saveDomicilio(req.body.domicilio, res,req.usuario);
			if(domicilioRegistro == undefined){
				return ''
			}
			parametros.idDomicilio = domicilioRegistro.id
			validosOpcionales.push({campo:'idDomicilio', tipo:'model',model:db.sequelize.models.domicilios})
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
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]: {
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre}%`
					
					}
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.proveedores.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.nombre.toLowerCase() == (parametros.nombre != undefined ? parametros.nombre.toLowerCase() : registroAEditar.nombre.toLowerCase())) &&
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
			tabla: db.sequelize.models.proveedores.name.toUpperCase() ,
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
		const registroAEliminar = await db.sequelize.models.proveedores.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.proveedores.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name) && modelo.name != "proveedores_expediente"){
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
				tabla: db.sequelize.models.proveedores.name.toUpperCase() ,
				accion: 'ELIMINAR',
				createdAt: moment().tz('America/Mexico_City')
			}
			//encriptación para eliminar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEliminar);
			registro2.encriptacion_previa = stringEncriptado;

			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
			try {
				const domicilioAEliminar = await db.sequelize.models.domicilios.findByPk(registroAEliminar.id_domicilio);
				await domicilioAEliminar.destroy({ where: { id: domicilioAEliminar.id } });
			} catch (error) {
				
			}
			try {
				const expedientesProveedor = await db.sequelize.models.proveedores_expediente.findAll({
					where: {
						id_proveedor:id
					}
				})
				for(const expedienteProveedor of expedientesProveedor){
					await expedienteProveedor.destroy({ where: { id: expedienteProveedor.id } });
				}
			} catch (error) {
				
			}
			
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
		const registroARestaurar = await db.sequelize.models.proveedores.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.proveedores.findAll({
					where: {
						[db.Sequelize.Op.or]: {
							nombre: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.nombre}%`
							
							}
						},
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.nombre.toLowerCase() == (registroARestaurar.nombre.toLowerCase())) &&
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
					tabla: db.sequelize.models.proveedores.name.toUpperCase(),
					accion: 'RESTAURAR',
					createdAt: moment().tz('America/Mexico_City')
				}
				//encriptación para restaurar
				const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroARestaurar);
				registro2.encriptacion_previa = stringEncriptado;

				const registrosActuales = await registroARestaurar.restore();
				try {
					const domicilioARestaurar = await db.sequelize.models.domicilios.findByPk(registroARestaurar.id_domicilio,{ paranoid: false });
					await domicilioARestaurar.restore({ where: { id: domicilioARestaurar.id } });
				} catch (error) {
					
				}
				try {
					const expedientesProveedor = await db.sequelize.models.proveedores_expediente.findAll({
						paranoid: false,
						where: {
							id_proveedor:id
						}
					})
					for(const expedienteProveedor of expedientesProveedor){
						await expedienteProveedor.restore({ where: { id: expedienteProveedor.id } });
					}
				} catch (error) {
					
				}
				
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
			tabla: db.sequelize.models.proveedores.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.proveedores.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud proveedores" });
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
			if(asociacion.target.name == db.sequelize.models.proveedores.name){
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
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.proveedores.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones();

		const docs = await db.sequelize.models.proveedores.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
		});

		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			data.push(element)
		}

		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			aux = {
				'Clave': elemento.clave ?? '',
				'Nombre': elemento.nombre,
				'Teléfono': elemento.telefono,
				'Email': elemento.email,
				'Validado': elemento.validado == true ? 'Si' : 'No'
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
		}
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Proveedores';
		const namesSheets = [db.sequelize.models.proveedores.name];
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

async function enviarNotificacionNuevoProveedor(proveedor) {
	const usuariosTesr = await db.sequelize.models.roles_usuarios.findAll({where: {id_role: 12, deletedAt: null}});
	if(usuariosTesr == null) return 'Ocurrió un problema al envíar el correo';

	const destinatarios = [];
	for (let i = 0; i < usuariosTesr.length; i++) {
		const element = usuariosTesr[i];
		const usr = await db.sequelize.models.usuarios.findByPk(element.id_usuario);
		if(usr == null) continue;
		destinatarios.push(usr.email);
	}
	if(destinatarios == null) return 'Ocurrió un problema al envíar el correo';

	const creadoPor = await db.sequelize.models.usuarios.findByPk(proveedor.id_usuario_registro);
	let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `nuevo_proveedor.html`);
    var htmlContent = await fs.readFile(rutaArchivoHTML, 'utf8');
	const data = [
        {nombre:'nombreProveedor', contenido: proveedor.nombre},
        {nombre:'createdBy', contenido: creadoPor.nombre}
    ];
	for (let i = 0; i < data.length; i++) {
		const campo = data[i];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}
	
	try {
        let mailOptions = {
            to: destinatarios,
            subject: `Nuevo Proveedor creado | ${proveedor.nombre}`,
            html: htmlContent,
        };
        const mainSender = new MailController(null, null, mailOptions, null);
        await mainSender.sendMail();
		return 'Correo envíado';
    } catch (error) {
        return 'Ocurrió un problema al envíar el correo';
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
