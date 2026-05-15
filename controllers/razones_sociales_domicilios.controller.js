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
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales_domicilios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['razon_social', 'domicilio', 'all']
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
				domicilio: ['domicilio.estado.pais.continente'],
				all: [
					'razon_social.pais.continente',
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito',
					'domicilio.estado.pais.continente'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 
                    'razon_social',
                    'razon_social.pais',
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'domicilio',
                    'domicilio.estado',
                    'domicilio.estado.pais',
                    'domicilio.estado-pais.continente',
                ]

				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.razones_sociales_domicilios.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.razones_sociales_domicilios.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/razonesSocialesDomicilios`;
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
		parametros.tipo = parametros.tipo.toUpperCase()
		let obligatorios = [{campo:'idRazonSocial',  tipo:'model', model:db.sequelize.models.razones_sociales},
                            {campo:'idDomicilio',  tipo:'model', model:db.sequelize.models.domicilios},
                            {campo:'tipo', tipo:'enum', largo:1, enum: ['F', 'S']}
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		
		const registrosEncontrados = await db.sequelize.models.razones_sociales_domicilios.findAll({
			where: {
				deletedAt: null,
				[db.Sequelize.Op.or]: [
					{ id_domicilio: parametros.idDomicilio },
					{
						[db.Sequelize.Op.and]: [
							{ id_razon_social: parametros.idRazonSocial },
							{ tipo: 'F' }
						]
					}
				]
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_domicilio == parametros.idDomicilio) || 
				   (registro.id_razon_social == parametros.idRazonSocial && (parametros.tipo == "F" && registro.tipo == "F"))){
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
		const nuevoRegistro = await db.sequelize.models.razones_sociales_domicilios.create(registro);
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

        //relaciones
        const perfilesValidos = ['razon_social', 'domicilio', 'all']
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
            domicilio: ['domicilio.estado.pais.continente'],
			all: [
                'razon_social.pais.continente',
                'razon_social.uso_cfdi',
                'razon_social.metodo_pago',
                'razon_social.forma_pago',
                'razon_social.razon_bloqueo',
                'razon_social.regimen_fiscal',
                'razon_social.moneda_credito',
                'domicilio.estado.pais.continente'
            ]
		}
		const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
		relaciones = await findRelaciones.getRelaciones()
	    }else{
		    try {
			    const relacionesValidas = [ 
                    'razon_social',
                    'razon_social.pais',
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',
                    'domicilio',
                    'domicilio.estado',
                    'domicilio.estado.pais',
                    'domicilio.estado-pais.continente',
                ]

			    const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
			    relaciones = await findRelaciones.getRelaciones()
		    } catch (error) {
		    	relaciones = []
		    }
	    }

		const registroEncontrado = await db.sequelize.models.razones_sociales_domicilios.findByPk(id, {include:relaciones,paranoid: false});
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
		if(parametros.tipo != undefined){
			parametros.tipo = parametros.tipo.toUpperCase()
		}
		const validosOpcionales =[{campo:'idRazonSocial',  tipo:'model', model:db.sequelize.models.razones_sociales},
                                  {campo:'idDomicilio',  tipo:'model', model:db.sequelize.models.domicilios},
                                  {campo:'tipo', tipo:'enum', largo:1, enum: ['F', 'S']}
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
		const registroAEditar = await db.sequelize.models.razones_sociales_domicilios.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				deletedAt: null,
				[db.Sequelize.Op.or]: [
					{ id_domicilio: parametros.idDomicilio != undefined ? parametros.idDomicilio : registroAEditar.id_domicilio },
					{
						[db.Sequelize.Op.and]: [
							{ id_razon_social: parametros.idRazonSocial != undefined ? parametros.idRazonSocial : registroAEditar.id_razon_social },
							{ tipo: 'F' }
						]
					}
				]
			}
		}

		const registrosEncontrados = await db.sequelize.models.razones_sociales_domicilios.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_domicilio == (parametros.idDomicilio != undefined ? parametros.idDomicilio : registroAEditar.id_domicilio)) || 
				   (registro.id_razon_social == (parametros.idRazonSocial != undefined ? parametros.idRazonSocial : registroAEditar.id_razon_social) && (((parametros.tipo != undefined ? parametros.tipo : registroAEditar.tipo) == "F") && registro.tipo == "F")) &&
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
		const registroAEliminar = await db.sequelize.models.razones_sociales_domicilios.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.razones_sociales_domicilios.name){
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
		const registroARestaurar = await db.sequelize.models.razones_sociales_domicilios.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.razones_sociales_domicilios.findAll({
					where: {
						deletedAt: null,
						[db.Sequelize.Op.or]: [
							{ id_domicilio: registroARestaurar.id_domicilio },
							{
								[db.Sequelize.Op.and]: [
									{ id_razon_social: registroARestaurar.id_razon_social },
									{ tipo: 'F' }
								]
							}
						]
					}
				});   
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {                     
                        if((registro.id_domicilio == (registroARestaurar.id_domicilio)) || 
						   (registro.id_razon_social == (registroARestaurar.id_razon_social) && ((registroARestaurar.tipo == "F") && registro.tipo == "F")) &&
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
