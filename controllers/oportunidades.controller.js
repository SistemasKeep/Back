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
	const camposModelo = Object.keys(db.sequelize.models.oportunidades.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cliente', 'marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				producto: [ 'producto.moneda_compra','producto.moneda_venta','producto.marca.domicilio.estado.pais.continente','producto.marca.pais.continente','producto.marca.archivo','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.marca.dato_facturacion.nacionalidad_timbrado.continente','producto.archivo','producto.pais.continente','producto.tipo_cobertura' ],
				cliente: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'cliente','cliente.tipo_cliente','cliente.estado','cliente.estado.pais','cliente.estado.pais.continente','cliente.oficina_interno',  'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','producto.moneda_compra','producto.moneda_venta','producto.marca.domicilio.estado.pais.continente','producto.marca.pais.continente','producto.marca.archivo','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.marca.dato_facturacion.nacionalidad_timbrado.continente','producto.archivo','producto.pais.continente','producto.tipo_cobertura' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 'producto.moneda_compra','producto.moneda_venta','producto.marca','producto.marca.domicilio','producto.marca.domicilio.estado','producto.marca.domicilio.estado.pais','producto.marca.domicilio.estado.pais.continente','producto.marca.pais','producto.marca.pais.continente','producto.marca.archivo','producto.archivo','producto.pais','producto.pais.continente','producto.tipo_cobertura','cliente','cliente.tipo_cliente','cliente.estado','cliente.estado.pais','cliente.estado.pais.continente','cliente.oficina_interno',  'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo' ]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.oportunidades.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.oportunidades.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		

		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/oportunidades`;
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
		let obligatorios = [{campo:'idProducto', tipo:'model',model:db.sequelize.models.productos},
							{campo:'idCliente', tipo:'model',model:db.sequelize.models.clientes},
							{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales = [{campo:'fechaCierre', tipo:'stringDate'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models. oportunidades.findAll({
			where: {
				id_producto: parametros.idProducto,
				id_cliente: parametros.idCliente,
				id_marca: parametros.idMarca,
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_producto == parametros.idProducto &&
					registro.id_cliente ==  parametros.idCliente &&
					registro.id_marca ==  parametros.idMarca){
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
		const nuevoRegistro = await db.sequelize.models. oportunidades.create(registro);
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
		const perfilesValidos = ['cliente', 'marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				producto: [ 'producto.moneda_compra','producto.moneda_venta','producto.marca.domicilio.estado.pais.continente','producto.marca.pais.continente','producto.marca.archivo','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.marca.dato_facturacion.nacionalidad_timbrado.continente','producto.archivo','producto.pais.continente','producto.tipo_cobertura' ],
				cliente: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'cliente','cliente.tipo_cliente','cliente.estado','cliente.estado.pais','cliente.estado.pais.continente','cliente.oficina_interno',  'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','producto.moneda_compra','producto.moneda_venta','producto.marca.domicilio.estado.pais.continente','producto.marca.pais.continente','producto.marca.archivo','producto.marca.dato_facturacion.regimen_fiscal', 'producto.marca.dato_facturacion.pais.continente', 'producto.marca.dato_facturacion.nacionalidad_timbrado.continente','producto.archivo','producto.pais.continente','producto.tipo_cobertura' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 'producto.moneda_compra','producto.moneda_venta','producto.marca','producto.marca.domicilio','producto.marca.domicilio.estado','producto.marca.domicilio.estado.pais','producto.marca.domicilio.estado.pais.continente','producto.marca.pais','producto.marca.pais.continente','producto.marca.archivo','producto.archivo','producto.pais','producto.pais.continente','producto.tipo_cobertura','cliente','cliente.tipo_cliente','cliente.estado','cliente.estado.pais','cliente.estado.pais.continente','cliente.oficina_interno',  'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo' ]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models. oportunidades.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales = [{campo:'idProducto', tipo:'model',model:db.sequelize.models.productos},
								   {campo:'idCliente', tipo:'model',model:db.sequelize.models.clientes},
								   {campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
								   {campo:'fechaCierre', tipo:'stringDate'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		
		const registroAEditar = await db.sequelize.models. oportunidades.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				id_producto: (parametros.idProducto != undefined ? parametros.idProducto : registroAEditar.id_producto),
				id_cliente: (parametros.idCliente != undefined ? parametros.idCliente : registroAEditar.id_cliente),
				id_marca: (parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca),
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models. oportunidades.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.id_producto == (parametros.idProducto != undefined ? parametros.idProducto : registroAEditar.id_producto)) &&
					(registro.id_cliente == (parametros.idCliente != undefined ? parametros.idCliente : registroAEditar.id_cliente)) &&
					(registro.id_marca == (parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca))) &&
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
		const registroAEliminar = await db.sequelize.models. oportunidades.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.oportunidades.name){
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
		const registroARestaurar = await db.sequelize.models. oportunidades.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models. oportunidades.findAll({
					where: {
						id_producto: (registroARestaurar.id_producto),
						id_cliente: (registroARestaurar.id_cliente),
						id_marca: (registroARestaurar.id_marca),
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(((registro.id_producto == (registroARestaurar.id_producto)) &&
							(registro.id_cliente == (registroARestaurar.id_cliente)) &&
							(registro.id_marca == (registroARestaurar.id_marca))) &&
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
