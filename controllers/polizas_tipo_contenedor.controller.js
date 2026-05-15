'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { getPolizaDetalle } = require('../middlewares/getters');
const { Filtros } = require('../middlewares/filtros');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.polizas_tipo_contenedor.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['poliza_detalle', 'tipo_contenedor', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				poliza_detalle: [
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
				],
				tipo_contenedor: ['tipo_contenedor'],
				all: [
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
					'tipo_contenedor',
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 
					'poliza_detalle',
					'poliza_detalle.poliza',
					'poliza_detalle.poliza.proveedor',
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca',
					'poliza_detalle.poliza.proveedor.marca.domicilio',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen',
					'poliza_detalle.poliza.proveedor.almacen.marca',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
					'tipo_contenedor',
				]
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.polizas_tipo_contenedor.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.polizas_tipo_contenedor.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/polizasTipoContenedor`;
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
		let obligatorios = [{campo:'idPolizaDetalle', tipo:'model', model:db.sequelize.models.poliza_detalles},
							{campo:'idTipoContenedor', tipo:'model', model:db.sequelize.models.tipo_contenedor},
							{campo:'sumaAsegurada', tipo:'number'},
							{campo:'isPrecioCompra', tipo:'boolean'}]
	
		const validosOpcionales = []

		if(parametros.isPrecioCompra === true){
			obligatorios.push({campo:'precioCompra', tipo:'number'})
			validosOpcionales.push({campo:'precioCompraDeducible', tipo:'number'})
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		var polizaDetalle = await db.sequelize.models.poliza_detalles.findByPk(parametros.idPolizaDetalle, {include: ['poliza' ]});
		var tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(polizaDetalle.poliza.id_tipo_cobertura);
		const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
		const isContenedor = cobertura.includes("contenedor")
		if(!isContenedor){
			return res.status(400).send({ status: false, msg: "La cobertura de la poliza debe ser 'COBERTURA CONTENEDOR'"});
		}

		const registrosEncontrados = await db.sequelize.models.polizas_tipo_contenedor.findAll({
			where: {
				id_poliza_detalle: parametros.idPolizaDetalle,
				id_tipo_contenedor: parametros.idTipoContenedor,
				suma_asegurada: parametros.sumaAsegurada,
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_poliza_detalle == parametros.idPolizaDetalle) &&
                   registro.id_tipo_contenedor == parametros.idTipoContenedor &&
				   registro.suma_asegurada == parametros.sumaAsegurada){
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
		const nuevoRegistro = await db.sequelize.models.polizas_tipo_contenedor.create(registro);
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
		const perfilesValidos = ['poliza_detalle', 'tipo_contenedor', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				poliza_detalle: [
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
				],
				tipo_contenedor: ['tipo_contenedor.tamanios_contenedor'],
				all: [
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza_detalle.poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
					'tipo_contenedor.tamanios_contenedor'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 
					'poliza_detalle',
					'poliza_detalle.poliza',
					'poliza_detalle.poliza.proveedor',
					'poliza_detalle.poliza.proveedor.moneda',
					'poliza_detalle.poliza.proveedor.conceptos_presupuesto',
					'poliza_detalle.poliza.proveedor.marca',
					'poliza_detalle.poliza.proveedor.marca.domicilio',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais',
					'poliza_detalle.poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.pais',
					'poliza_detalle.poliza.proveedor.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen',
					'poliza_detalle.poliza.proveedor.almacen.marca',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais',
					'poliza_detalle.poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais',
					'poliza_detalle.poliza.proveedor.almacen.marca.pais.continente',
					'poliza_detalle.poliza.proveedor.almacen.marca.archivo',
					'poliza_detalle.poliza.proveedor.almacen.ubicacion_defecto',
					'poliza_detalle.poliza.proveedor.proveedor_tipo',
					'poliza_detalle.poliza.tipo_cobertura',
					'tipo_contenedor',
					'tipo_contenedor.tamanios_contenedor'
				]
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.polizas_tipo_contenedor.findByPk(id, {include:relaciones,paranoid: false});
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
		let seEditaAux = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
		const registroAEditar = await db.sequelize.models.polizas_tipo_contenedor.findByPk(id);
	
		const validosOpcionales =[{campo:'idPolizaDetalle', tipo:'model', model:db.sequelize.models.poliza_detalles},
								  {campo:'idTipoContenedor', tipo:'model', model:db.sequelize.models.tipo_contenedor},
								  {campo:'sumaAsegurada', tipo:'number'}]
		if(parametros.isPrecioCompra === true || (parametros.isPrecioCompra === undefined && registroAEditar.is_precio_compra === true)){
			validosOpcionales.push({campo:'precioCompra', tipo:'number'})
			validosOpcionales.push({campo:'precioCompraDeducible', tipo:'number'})
			seEditaAux = true
			datosUpdate.is_precio_compra = true
		} else if(parametros.isPrecioCompra === false){
			datosUpdate.precio_compra = null
			datosUpdate.precio_compra_deducible = null
			datosUpdate.is_precio_compra = false
			seEditaAux = true
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1] || seEditaAux
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				id_poliza_detalle: parametros.idPolizaDetalle != undefined ? parametros.idPolizaDetalle : registroAEditar.id_poliza_detalle,
				id_tipo_contenedor: parametros.idTipoContenedor != undefined ? parametros.idTipoContenedor : registroAEditar.id_tipo_contenedor,
				suma_asegurada: parametros.sumaAsegurada != undefined ? parametros.sumaAsegurada : registroAEditar.suma_asegurada,
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.polizas_tipo_contenedor.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.id_poliza_detalle == (parametros.idPolizaDetalle != undefined ? parametros.idPolizaDetalle : registroAEditar.id_poliza_detalle)) &&
                   registro.id_tipo_contenedor == (parametros.idTipoContenedor != undefined ? parametros.idTipoContenedor : registroAEditar.id_tipo_contenedor) &&
				   registro.suma_asegurada == (parametros.sumaAsegurada != undefined ? parametros.sumaAsegurada : registroAEditar.suma_asegurada)) &&
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
		const registroAEliminar = await db.sequelize.models.polizas_tipo_contenedor.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.polizas_tipo_contenedor.name){
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
		const registroARestaurar = await db.sequelize.models.polizas_tipo_contenedor.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.polizas_tipo_contenedor.findAll({
					where: {
						id_poliza_detalle: registroARestaurar.id_poliza_detalle,
						id_tipo_contenedor: registroARestaurar.id_tipo_contenedor,
						suma_asegurada: registroARestaurar.suma_asegurada,
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(((registro.id_poliza_detalle == registroARestaurar.id_poliza_detalle) &&
						   registro.id_tipo_contenedor == registroARestaurar.id_tipo_contenedor &&
						   registro.suma_asegurada == registroARestaurar.suma_asegurada) &&
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
