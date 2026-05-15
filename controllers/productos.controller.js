'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');	

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.productos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['producto_unidad_medida','moneda_compra','moneda_venta','marca','archivo','pais','tipo_cobertura','oficinas_productos', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				producto_unidad_medida: ['producto_unidad_medida'],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				archivo: [ 'archivo' ],/* 
				oficinas_productos: ['oficinas_productos.atributos'], */
				pais: ['pais.continente'],
				tipo_cobertura: ['tipo_cobertura'],
				all: [ 'producto_unidad_medida', 'moneda_compra','moneda_venta','marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','archivo','pais.continente','tipo_cobertura' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 'producto_unidad_medida', 'moneda_compra', 'moneda_venta', 'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo','archivo','pais','pais.continente','tipo_cobertura', 'oficinas_productos']
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.productos.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.productos.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/productos`;
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
		let obligatorios = [{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
							{campo:'idProductosUnidadesMedida', tipo:'model',model:db.sequelize.models.productos_unidades_medida},
							{campo:'idMonedaCompra', tipo:'model',model:db.sequelize.models.monedas},
							{campo:'idMonedaVenta', tipo:'model',model:db.sequelize.models.monedas},
							{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
							{campo:'descripcion', tipo:'string',largo:255,textoCase:"up"},
							{campo:'claveProductoServicioSat', tipo:'string',largo:20},
							{campo:'productoServicioSat', tipo:'string',largo:100},
							{campo:'clave', tipo:'string',largo:15,textoCase:"up"}]
					
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'idCargaArchivo', tipo:'model',model:db.sequelize.models.carga_archivos},
								  {campo:'visualizarVenta', tipo:'boolean'},
								  {campo:'tieneIva', tipo:'boolean'},
								  {campo:'estatus', tipo:'boolean'},
								  {campo:'leyendaCfdi', tipo:'string',largo:1000},
								  {campo:'iva', tipo:'number'},
								  {campo:'precio', tipo:'number'},
								  {campo:'idTipoCobertura', tipo:'model',model:db.sequelize.models.tipos_cobertura}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const registrosEncontrados = await db.sequelize.models.productos.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					id_tipo_cobertura: parametros.idTipoCobertura !== undefined && parametros.idTipoCobertura !== null ? parametros.idTipoCobertura : null,
					clave:  {
						[db.Sequelize.Op.like]: `%${parametros.clave}%`
					}
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_tipo_cobertura == (parametros.idTipoCobertura !== undefined && parametros.idTipoCobertura !== null ? parametros.idTipoCobertura : null) ||
					registro.clave.toUpperCase() ==  parametros.clave.toUpperCase()){
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
		const nuevoRegistro = await db.sequelize.models.productos.create(registro);
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
		const perfilesValidos = ['producto_unidad_medida','moneda_compra','moneda_venta','marca','archivo','pais','tipo_cobertura','oficinas_productos', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				producto_unidad_medida: ['producto_unidad_medida'],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				archivo: [ 'archivo' ],
				pais: ['pais.continente'],
				tipo_cobertura: ['tipo_cobertura'],
				all: [ 'producto_unidad_medida', 'moneda_compra','moneda_venta','marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','archivo','pais.continente','tipo_cobertura' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 'producto_unidad_medida', 'moneda_compra', 'moneda_venta', 'marca', 'marca.domicilio', 'marca.domicilio.estado', 'marca.domicilio.estado.pais', 'marca.domicilio.estado.pais.continente','marca.pais','marca.pais.continente','marca.archivo','archivo','pais','pais.continente','tipo_cobertura', 'oficinas_productos']
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.productos.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			let dat = registroEncontrado.toJSON()
			if(dat.archivo != undefined){
				let archivo = `${req.protocol}://${req.get('host')}/api/cargaArchivos/${dat.archivo.id}`
				dat.archivo.archivo = archivo
			}
			return res.status(200).send({ status: true, data:dat});
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
		const registroAEditar = await db.sequelize.models.productos.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
		const validosOpcionales =[{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
								  {campo:'idMonedaCompra', tipo:'model',model:db.sequelize.models.monedas},
								  {campo:'idMonedaVenta', tipo:'model',model:db.sequelize.models.monedas},
								  {campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
								  {campo:'idProductosUnidadesMedida', tipo:'model',model:db.sequelize.models.productos_unidades_medida},
								  {campo:'descripcion', tipo:'string',largo:255,textoCase:"up"},
								  {campo:'clave', tipo:'string',largo:15,textoCase:"up"},
								  {campo:'idCargaArchivo', tipo:'model',model:db.sequelize.models.carga_archivos},
								  {campo:'visualizarVenta', tipo:'boolean'},
								  {campo:'tieneIva', tipo:'boolean'},
								  {campo:'estatus', tipo:'boolean'},
								  {campo:'leyendaCfdi', tipo:'string',largo:1000},
								  {campo:'claveProductoServicioSat', tipo:'string',largo:20},
								  {campo:'productoServicioSat', tipo:'string',largo:100},
								  {campo:'idTipoCobertura', tipo:'model',model:db.sequelize.models.tipos_cobertura},
								  {campo:'iva', tipo:'number'},
								  {campo:'precio', tipo:'number'}]
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
					id_tipo_cobertura: parametros.idTipoCobertura != undefined ? parametros.idTipoCobertura : registroAEditar.id_tipo_cobertura,
					clave:  {
						[db.Sequelize.Op.like]: `%${parametros.clave != undefined ? parametros.clave : registroAEditar.clave}%`
					}
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.productos.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.id_tipo_cobertura == (parametros.id_tipo_cobertura != undefined ? parametros.idTipoCobertura: registroAEditar.id_tipo_cobertura) ||
					registro.clave.toUpperCase() ==  (parametros.clave != undefined ? parametros.clave.toUpperCase() : registroAEditar.clave.toUpperCase())) &&
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
		const registroEditado = await db.sequelize.models.productos.findByPk(id);
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
		const registroAEliminar = await db.sequelize.models.productos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.productos.name){
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
		const registroARestaurar = await db.sequelize.models.productos.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.productos.findAll({
					where: {
						[db.Sequelize.Op.or]: {
							id_tipo_cobertura: registroARestaurar.id_tipo_cobertura,
							clave:  {
								[db.Sequelize.Op.like]: `%${registroARestaurar.clave}%`
							}
						},
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.id_tipo_cobertura == (registroARestaurar.id_tipo_cobertura) ||
							registro.clave.toUpperCase() ==  (registroARestaurar.clave.toUpperCase())) &&
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


async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'marca';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.productos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['marca']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				producto_unidad_medida: ['producto_unidad_medida'],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				archivo: [ 'archivo' ],
				pais: ['pais.continente'],
				tipo_cobertura: ['tipo_cobertura'],
				all: [ 'producto_unidad_medida', 'moneda_compra','moneda_venta','marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','archivo','pais.continente','tipo_cobertura']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.productos.findAll({
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
				'Descripción': elemento.descripcion,
				'Precio': elemento.precio,
				'Marca': elemento.marca == null ? "-" : elemento.marca.nombre,
				'Estatus': elemento.estatus == true ? 'Activo' : 'Inactivo',
				'Eliminado': elemento.deletedAt != null ? 'Si' : 'No'
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Productos';
		const namesSheets = [db.sequelize.models.productos.name];
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
	exportar
}
