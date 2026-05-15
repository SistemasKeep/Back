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
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales_archivos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	if(req.query.specialFilter !== undefined && req.query.specialFilter !== null && req.query.keepro === 1){
		filtro[db.Sequelize.Op.and] = req.query.specialFilter;
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['razon_social', 'archivo','documento_razon_social', 'marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				razon_social: [
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
				documento_razon_social: ['documento_razon_social'],
                archivo: ['archivo'],
				marca: ['marca'],
				all: [
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'archivo',
					'marca',
					'documento_razon_social',
					'usuario_registro'
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.razones_sociales_archivos.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.razones_sociales_archivos.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/razonesSocialesArchivos`;
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
		for(const key in filtro){
			for(const fil of filtro[key]){
				if(fil.property == 'id_razon_social'){
					await updateArchivoRazonSocial(fil.value)
				}
			}
		}
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
	return await Filter.get()
}

async function updateArchivoRazonSocial(idRazonSocial) {
	const registroEncontrado = await db.sequelize.models.razones_sociales.findByPk(idRazonSocial);
	if(registroEncontrado == null){
		return undefined
	}
	const documentosRazonesSociales = await db.sequelize.models.razones_sociales_documentos_generales.findAll()
	for(const documentoRazonSocial of documentosRazonesSociales){
		const registroExpediente = {
			id_marca: documentoRazonSocial.id_marca,
			id_razon_social: idRazonSocial,
			id_documento_razon_social: documentoRazonSocial.id,
			descripcion: documentoRazonSocial.descripcion,
			obligatorio: documentoRazonSocial.obligatorio
		}
		const registroFind = await db.sequelize.models.razones_sociales_archivos.findOne({
			where:{
				id_razon_social: idRazonSocial,
				id_documento_razon_social: documentoRazonSocial.id,
			}
		});
		if(registroFind == null){
			await db.sequelize.models.razones_sociales_archivos.create(registroExpediente);
		}
	}
	
}

async function store(req, res){
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idRazonSocial', tipo:'model', model:db.sequelize.models.razones_sociales},
						    {campo:'descripcion', tipo:'string', largo:255, textoCase:"up"},
							{campo:'obligatorio', tipo:'boolean'}
        ]

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
        const validosOpcionales =[{campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos},
								  {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas}
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]

		if(registro.id_carga_archivo != undefined){
			registro.fecha_subida = moment().tz('America/Mexico_City')
		} else{
			registro.fecha_subida = null
		}

		const registrosEncontrados = await db.sequelize.models.razones_sociales_archivos.findAll({
			where: {
				id_razon_social: parametros.idRazonSocial,
				descripcion:{
					[db.Sequelize.Op.like]: `%${parametros.descripcion}%`
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.descripcion.toLowerCase() == parametros.descripcion.toLowerCase() &&
				registro.id_razon_social == parametros.idRazonSocial &&
				registro.id_marca == parametros.idMarca){

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
		const nuevoRegistro = await db.sequelize.models.razones_sociales_archivos.create(registro);
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
		const perfilesValidos = ['razon_social', 'archivo','documento_razon_social','marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				razon_social: [
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
				documento_razon_social: ['documento_razon_social'],
                archivo: ['archivo'],
				marca: ['marca'],
				all: [
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'archivo',
					'marca',
					'documento_razon_social'
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}
		const registroEncontrado = await db.sequelize.models.razones_sociales_archivos.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales = []
		if(req.query.keepro === 1){
			validosOpcionales.push({campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos})
		} else{
			validosOpcionales.push({campo:'descripcion', tipo:'string', largo:255, textoCase:"up"})
			validosOpcionales.push({campo:'obligatorio', tipo:'boolean'})
			validosOpcionales.push({campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos})
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
		if(datosUpdate.id_carga_archivo == null){
			datosUpdate.fecha_subida = null
		}
		if(datosUpdate.id_carga_archivo != undefined){
			datosUpdate.fecha_subida = moment().tz('America/Mexico_City')
		}
		const registroAEditar = await db.sequelize.models.razones_sociales_archivos.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				id_razon_social: registroAEditar.id_razon_social,
				descripcion: {
					[db.Sequelize.Op.like]: `%${parametros.descripcion != undefined ? parametros.descripcion :registroAEditar.descripcion}%`
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.razones_sociales_archivos.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.descripcion.toLowerCase() == (parametros.descripcion != undefined? parametros.descripcion.toLowerCase(): registroAEditar.descripcion.toLowerCase()) &&
				   registro.id_razon_social == registroAEditar.id_razon_social &&
				   registro.id_marca == registroAEditar.id_marca &&
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
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		if(req.query.keepro === 1){
			const registrosObligatorios = await db.sequelize.models.razones_sociales_archivos.findAll({
				where:{
					id_razon_social:{[db.Sequelize.Op.or]: req.idsRS},
					obligatorio: true
				}
			});
			let expedienteCompleto = true
			for(const registroObligatorio of registrosObligatorios){
				expedienteCompleto = expedienteCompleto && (registroObligatorio.id_carga_archivo != null)
			}
			if(expedienteCompleto === true){
				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({
					where:{
						id_razon_social: req.idsRS[0],
					}
				});
				const cliente = await await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente);
				const clienteDetalle = await await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente);
				await clienteDetalle.update({autoemisor:true}, { where: { id: clienteDetalle.id } });
			}
		}
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
		const registroAEliminar = await db.sequelize.models.razones_sociales_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.razones_sociales_archivos.name){
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
		const registroARestaurar = await db.sequelize.models.razones_sociales_archivos.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.razones_sociales_archivos.findAll({
					where: {
						id_razon_social: registroARestaurar.id_razon_social,
						descripcion: {
							[db.Sequelize.Op.like]: `%${registroARestaurar.descripcion}%`
						},
						deletedAt: null
                    }
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(registro.descripcion.toLowerCase() == registroARestaurar.descripcion.toLowerCase() &&
						registro.id_razon_social == registroARestaurar.id_razon_social && 
						registro.id_marca == registroARestaurar.id_marca &&
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


module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar
}
