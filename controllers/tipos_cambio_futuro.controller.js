'use strict'
const axios = require('axios');
const moment = require('moment-timezone');
const {db} = require('../models');
const {Validaciones} = require('../middlewares/validaciones');
const { Filtros } = require('../middlewares/filtros');
const { nuevoTC } = require('./notificacion_registro_tc.controllers')

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.tipos_cambio_futuro.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	var fechaFiltro = undefined
	try {
		fechaFiltro = filtro[db.Sequelize.Op.or]['fecha'].tz('America/Mexico_City')
	} catch (error) {
		fechaFiltro = undefined
	}
	if(fechaFiltro != undefined){
		let doit = await buscarActualiarTipoCambio(fechaFiltro,res)
		if(doit == undefined){
			return ''
		}
	} else{
		let doit = await buscarActualiarTipoCambio(moment().tz('America/Mexico_City'),res)
		if(doit == undefined){
			return ''
		}
	}

	try {
		const docs = await db.sequelize.models.tipos_cambio_futuro.findAll({
			paranoid: false,
			page: page || 1,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		});
		const dataDocs = await db.sequelize.models.tipos_cambio_futuro.count({
			paranoid: false,
			where: filtro
		});

		const totalCount = dataDocs;
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/tiposCambioFuturo`;
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


async function getTipoCambioByFecha(req, res) {
	const { dateFind } = req.params;
	try {
		let valido = await Validaciones.validType(dateFind,'dateFind','stringDate',res);
		if(valido == undefined){
			return '';
		}
		let doit = await buscarActualiarTipoCambio(moment(dateFind).tz('America/Mexico_City'),res)
		if(doit == undefined){
			return ''
		}
		let fechaString = moment(dateFind).tz('America/Mexico_City').format('YYYY-MM-DD')
		let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
		const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
			where: {
				fecha: {
					[db.Sequelize.Op.like]: fechaBusqueda
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length >0){
			const registroEncontrado = registrosEncontrados[0]
			if(registroEncontrado != null){
				if(registroEncontrado.deletedAt == null){
					const element = registroEncontrado.toJSON()
					if(req.query.keepro === 3 ){
						element.id_usuario_registro = undefined
						element.createdAt = undefined
						element.updatedAt = undefined
						element.deletedAt = undefined
					}
					return res.status(200).send({ status: true, data: element});

				}
			}
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function buscarActualiarTipoCambio(fechaBuscar,res){
	try {
		const fechaString = fechaBuscar.format('YYYY-MM-DD')
		const fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
		const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
			where: {
				fecha: {
					[db.Sequelize.Op.like]: fechaBusqueda
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length < 1){
			let tipoCambio = await getTipoCambioFuturo(fechaBusqueda,res)
			if(tipoCambio == undefined){
				return undefined
			} else if(tipoCambio == 0.0){
				return false
			}
			const registro = {
				tipo_cambio: tipoCambio,
				fecha: fechaString,
				createdAt: moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss.SSS'),
				updatedAt: moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss.SSS')
			}
			await db.sequelize.models.tipos_cambio_futuro.create(registro);
			return true
		}
		return false
	} catch (error) {
		return false
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
		let obligatorios = [{campo:'fecha', tipo:'stringDate'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		let tipoCambio = await getTipoCambioFuturo(moment(parametros.fecha).tz('America/Mexico_City'),res)
		if(tipoCambio == undefined){
			return ''
		} else if(tipoCambio == 0.0){
			return res.status(400).send({ status: false, msg: "Tipo cambio no válido"});
		}
		registro.tipo_cambio = tipoCambio
		const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
			where: {
				fecha: {
					[db.Sequelize.Op.like]: parametros.fecha
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			return res.status(400).send({ status: false, msg: "Registro existente"});
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.tipos_cambio_futuro.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function getTipoCambioFuturo(fecha,res){
	return new Promise(resolve => {
		const config = {
		  headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		  }
		};
		const dateFind = moment(fecha).format('YYYY-MM-DD')
		const token = 'c65217376292f80870f171dc094c02c57d1ddfb33ff21ada3f9fcb7c0d6d18d2'
		const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos/${dateFind}/${dateFind}?token=${token}`
		
		axios.get(url,config).then(response => {
			if(response.status == 200){
				try {
					const fecha = moment(dateFind).tz('America/Mexico_City').format('DD/MM/YYYY')
					const diaSemana = moment(dateFind).tz('America/Mexico_City').isoWeekday(); 
					const nuevaFecha = moment(dateFind).tz('America/Mexico_City').subtract(diaSemana == 1 ? 3 : diaSemana == 7 ? 2 :1, 'days');
					const fecha_1 = nuevaFecha.tz('America/Mexico_City').format('DD/MM/YYYY')
					const dataMail = {
						rutaDOF: `https://dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=158&dfecha=${fecha_1}&hfecha=${fecha}`,
						fechaTC: fecha,
						email: ['general@keepro.com'],
						valorTC: parseFloat(response.data.bmx.series[0].datos[0].dato),
						idUsuario: null,
						idMarca: null
					}
					nuevoTC(dataMail)
					resolve(parseFloat(response.data.bmx.series[0].datos[0].dato))
				} catch (error) {
					resolve(0.0)
				}
			}else{
				resolve(0.0)
			}
		}).catch((error) => {
			res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
			resolve(undefined)
		});
	  });
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroEncontrado = await db.sequelize.models.tipos_cambio_futuro.findByPk(id,{ paranoid: false });
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	try {
		const registroAEditar = await db.sequelize.models.tipos_cambio_futuro.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		let tipoCambio = await getTipoCambioFuturo(moment(registroAEditar.fecha).tz('America/Mexico_City'),res)
		if(tipoCambio == undefined){
			return ''
		} else if(tipoCambio == 0.0){
			return res.status(400).send({ status: false, msg: "Tipo cambio no válido"});
		}
		datosUpdate['tipo_cambio'] = tipoCambio
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
		const registroAEliminar = await db.sequelize.models.tipos_cambio_futuro.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.tipos_cambio_futuro.name){
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
		const registroARestaurar = await db.sequelize.models.tipos_cambio_futuro.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
					where: {
						fecha: {
							[db.Sequelize.Op.like]: moment(registroARestaurar.fecha).tz('America/Mexico_City')
						},
						deletedAt: null
					}
				});
				if(registrosEncontrados.length > 0){
					return res.status(400).send({ status: false, msg: "Registro existente"});
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

async function buscarActualiarTipoCambioSRes(fechaBuscar){
	try {
		const fechaString = fechaBuscar.format('YYYY-MM-DD')
		const fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
		const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
			where: {
				fecha: {
					[db.Sequelize.Op.like]: fechaBusqueda
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length < 1){
			let tipoCambio = await getTipoCambioFuturoSRes(fechaBusqueda)
			if(isNaN(parseFloat(tipoCambio))){
				return tipoCambio
			} else if(tipoCambio == 0.0){
				return { status: false, msg: "Error interno del servidor"}
			}
			const registro = {
				tipo_cambio: tipoCambio,
				fecha: fechaString,
				createdAt: moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss.SSS'),
				updatedAt: moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss.SSS')
			}
			await db.sequelize.models.tipos_cambio_futuro.create(registro);
			return true
		}else if(registrosEncontrados.length > 0){
			return true
		}
		return { status: false, msg: "Error interno del servidor"}
	} catch (error) {
		return { status: false, msg: "Error interno del servidor"}
	}
}


async function getTipoCambioFuturoSRes(fecha){
	return new Promise(resolve => {
		const config = {
		  headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		  }
		};
		const dateFind = moment(fecha).format('YYYY-MM-DD')
		const token = 'c65217376292f80870f171dc094c02c57d1ddfb33ff21ada3f9fcb7c0d6d18d2'
		const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos/${dateFind}/${dateFind}?token=${token}`
		
		axios.get(url,config).then(response => {
			if(response.status == 200){
				try {
					const fecha = moment(dateFind).tz('America/Mexico_City').format('DD/MM/YYYY')
					const diaSemana = moment(dateFind).tz('America/Mexico_City').isoWeekday(); 
					const nuevaFecha = moment(dateFind).tz('America/Mexico_City').subtract(diaSemana == 1 ? 3 : diaSemana == 7 ? 2 :1, 'days');
					const fecha_1 = nuevaFecha.tz('America/Mexico_City').format('DD/MM/YYYY')
					const dataMail = {
						rutaDOF: `https://dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=158&dfecha=${fecha_1}&hfecha=${fecha}`,
						fechaTC: fecha,
						email: ['general@keepro.com'],
						valorTC: parseFloat(response.data.bmx.series[0].datos[0].dato),
						idUsuario: null,
						idMarca: null
					}
					nuevoTC(dataMail)
					resolve(parseFloat(response.data.bmx.series[0].datos[0].dato))
				} catch (error) {
					resolve(0.0)
				}
			}else{
				resolve(0.0)
			}
		}).catch((error) => {
			resolve({ status: false, msg: "Error interno del servidor", error: error.toString()})
		});
	  });
}


module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	getTipoCambioByFecha,
	buscarActualiarTipoCambioSRes
}
