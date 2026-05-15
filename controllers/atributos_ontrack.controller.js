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
	const camposModelo = Object.keys(db.sequelize.models.atributos_ontrack.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query,db.sequelize.models.atributos_ontrack);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ 'oficina_producto', 'moneda_compra', 'moneda_venta', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina_producto: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo' ],
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				all: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo', 'moneda_compra',  'moneda_venta']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.atributos_ontrack.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.atributos_ontrack.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/atributosOnTrack`;
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

async function getFiltro(parametros,modelo){
	var filtro
	try {
		filtro = JSON.parse(parametros.filter)
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados,modelo:modelo})
	return await Filter.get()
}

async function store(req, res){
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [
			{campo:'idOficinaProducto', tipo:'model', model:db.sequelize.models.oficinas_productos},
			{campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'idMonedaVenta', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'precio', tipo:'number'},
			{campo:'porcentajeSobreventa', tipo:'number'},
			{campo:'porcentajeComisionista', tipo:'number'},
			{campo:'descripcion', tipo:'string',largo:150,textoCase:"up"},
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
        const validosOpcionales =[
			{campo:'fechaVencimiento', tipo:'stringDateTime'}
		]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const warnings = []
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
		const producto = await db.sequelize.models.productos.findByPk(oficinaProducto.id_producto);
		if(producto.id_marca != 17 && producto.id_marca != 26){
			return res.status(400).send({ status: false, msg: "La marca del producto es inválida.", warnings: warnings});
		}
		if(parametros.fechaVencimiento !== null && parametros.fechaVencimiento !== undefined && parametros.fechaVencimiento !== ""){
			const fechaVencimiento = moment(parametros.fechaVencimiento).tz('America/Mexico_City')
			const now = moment().tz('America/Mexico_City')
			if(fechaVencimiento < now){
				warnings.push("La fecha de vencimiento del atributo es mayor que la fecha actual.")
			}
		}

		const whereFind = {
			where: {
				precio: parametros.idOficinaProducto,
				precio: parametros.precio,
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.atributos_ontrack.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			for(const registro of registrosEncontrados){
				if(registro.id_oficina_producto == parametros.idOficinaProducto && registro.precio == parametros.precio){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente",warnings:warnings});
					}
				}
			}
			if(regExistente){
				return '';
			}
		}
		registro = dataValidarOpcionales[0]
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.atributos_ontrack.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}, warnings: warnings});
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
		const perfilesValidos = [ 'oficina_producto', 'moneda_compra', 'moneda_venta', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina_producto: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo' ],
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				all: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo', 'moneda_compra',  'moneda_venta']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.atributos_ontrack.findByPk(id, {include:relaciones,paranoid: false});
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
			{campo:'descripcion', tipo:'string',largo:150,textoCase:"up"},
			{campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'idMonedaVenta', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'precio', tipo:'number'},
			{campo:'porcentajeSobreventa', tipo:'number'},
			{campo:'porcentajeComisionista', tipo:'number'},
			{campo:'fechaVencimiento', tipo:'stringDateTime'}
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
		const registroAEditar = await db.sequelize.models.atributos_ontrack.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const warnings = []
		if(parametros.fechaVencimiento !== null && parametros.fechaVencimiento !== undefined && parametros.fechaVencimiento !== ""){
			const fechaVencimiento = moment(parametros.fechaVencimiento).tz('America/Mexico_City')
			const now = moment().tz('America/Mexico_City')
			if(fechaVencimiento < now){
				warnings.push("La fecha de vencimiento del atributo es mayor que la fecha actual.")
			}
		}
		const whereFind = {
			where: {
				precio: registroAEditar.id_oficina_producto,
				precio: parametros.precio !== null && parametros.precio !== undefined && parametros.precio !== "" ? parametros.precio : registroAEditar.precio,
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.atributos_ontrack.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			for(const registro of registrosEncontrados){
				if((registro.precio == (parametros.precio !== null && parametros.precio !== undefined && parametros.precio !== "" ? parametros.precio : registroAEditar.precio)) && id != registro.id){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente",warnings:warnings});
					}
				}
			}
			if(regExistente){
				return '';
			}
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito", warnings: warnings});
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
		const registroAEliminar = await db.sequelize.models.atributos_ontrack.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.atributos_ontrack.name){
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
			await registroAEliminar.destroy({ where: { id: id } })
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
		const registroARestaurar = await db.sequelize.models.atributos_ontrack.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const whereFind = {
					where: {
						precio: registroARestaurar.id_oficina_producto,
						precio: registroARestaurar.precio,
						deletedAt: null
					}
				}
				const registrosEncontrados = await db.sequelize.models.atributos_ontrack.findAll(whereFind);
				if(registrosEncontrados.length > 0){
					var regExistente = false
					for(const registro of registrosEncontrados){
						if(registro.precio == registroARestaurar.precio && id != registro.id){
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
				await registroARestaurar.restore()
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
