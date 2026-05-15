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
	const camposModelo = Object.keys(db.sequelize.models.facturas_proveedor_detalles.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['orden_compra','concepto_presupuesto', 'factura_proveedor', 'producto', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				orden_compra: [
					'orden_compra.ordenes_compra_archivos.archivo',
					'orden_compra.marca.domicilio.estado.pais.continente',
					'orden_compra.marca.pais.continente',
					'orden_compra.marca.archivo',
					'orden_compra.marca.dato_facturacion.regimen_fiscal', 
					'orden_compra.marca.dato_facturacion.pais.continente', 
					'orden_compra.marca.dato_facturacion.nacionalidad_timbrado.continente', 
					'orden_compra.proveedor.moneda',
					'orden_compra.proveedor.conceptos_presupuesto',
					'orden_compra.proveedor.marca.domicilio.estado.pais.continente',
					'orden_compra.proveedor.marca.pais.continente',
					'orden_compra.proveedor.marca.archivo',
					'orden_compra.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'orden_compra.proveedor.marca.dato_facturacion.pais.continente', 
					'orden_compra.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'orden_compra.proveedor.proveedor_tipo',
					'orden_compra.moneda',
					'orden_compra.usuario_solicita'
				],
				concepto_presupuesto: ['conceptos_presupuesto'],
				factura_proveedor: [
					'factura_proveedor.facturas_proveedor_archivos.archivo', 
					'factura_proveedor.marca.domicilio.estado.pais.continente',
					'factura_proveedor.marca.pais.continente',
					'factura_proveedor.marca.archivo',
					'factura_proveedor.marca.dato_facturacion.regimen_fiscal', 
					'factura_proveedor.marca.dato_facturacion.pais.continente', 
					'factura_proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente', 
					'factura_proveedor.proveedor.moneda',
					'factura_proveedor.proveedor.conceptos_presupuesto',
					'factura_proveedor.proveedor.marca.domicilio.estado.pais.continente',
					'factura_proveedor.proveedor.marca.pais.continente',
					'factura_proveedor.proveedor.marca.archivo',
					'factura_proveedor.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'factura_proveedor.proveedor.marca.dato_facturacion.pais.continente', 
					'factura_proveedor.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura_proveedor.proveedor.proveedor_tipo',
					'factura_proveedor.moneda',
					'factura_proveedor.usuario_solicita'
				],
				producto: [
					'producto.marca.domicilio.estado.pais.continente',
					'producto.marca.pais.continente',
					'producto.marca.archivo',
					'producto.marca.dato_facturacion.regimen_fiscal', 
					'producto.marca.dato_facturacion.pais.continente', 
					'producto.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'producto.moneda_compra',
					'producto.moneda_venta',
					'producto.pais.continente',
					'producto.tipo_cobertura',
					'producto.archivo'
				],
				all: [ 
					'orden_compra.marca',
					'orden_compra.proveedor',
					'orden_compra.moneda',
					'orden_compra.usuario_solicita',
					'concepto_presupuesto',
					'factura_proveedor.marca', 
					'factura_proveedor.proveedor',
					'factura_proveedor.moneda',
					'factura_proveedor.usuario_solicita',
					'producto.marca',
					'producto.moneda_compra',
					'producto.moneda_venta',
					'producto.pais.continente',
					'producto.tipo_cobertura'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}


		const docs = await db.sequelize.models.facturas_proveedor_detalles.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.facturas_proveedor_detalles.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/facturasProveedorDetalles`;
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

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['orden_compra','concepto_presupuesto', 'factura_proveedor', 'producto', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				orden_compra: [
					'orden_compra.ordenes_compra_archivos.archivo',
					'orden_compra.marca.domicilio.estado.pais.continente',
					'orden_compra.marca.pais.continente',
					'orden_compra.marca.archivo',
					'orden_compra.marca.dato_facturacion.regimen_fiscal', 
					'orden_compra.marca.dato_facturacion.pais.continente', 
					'orden_compra.marca.dato_facturacion.nacionalidad_timbrado.continente', 
					'orden_compra.proveedor.moneda',
					'orden_compra.proveedor.conceptos_presupuesto',
					'orden_compra.proveedor.marca.domicilio.estado.pais.continente',
					'orden_compra.proveedor.marca.pais.continente',
					'orden_compra.proveedor.marca.archivo',
					'orden_compra.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'orden_compra.proveedor.marca.dato_facturacion.pais.continente', 
					'orden_compra.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'orden_compra.proveedor.proveedor_tipo',
					'orden_compra.moneda',
					'orden_compra.usuario_solicita'
				],
				concepto_presupuesto: ['conceptos_presupuesto'],
				factura_proveedor: [
					'factura_proveedor.facturas_proveedor_archivos.archivo', 
					'factura_proveedor.marca.domicilio.estado.pais.continente',
					'factura_proveedor.marca.pais.continente',
					'factura_proveedor.marca.archivo',
					'factura_proveedor.marca.dato_facturacion.regimen_fiscal', 
					'factura_proveedor.marca.dato_facturacion.pais.continente', 
					'factura_proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente', 
					'factura_proveedor.proveedor.moneda',
					'factura_proveedor.proveedor.conceptos_presupuesto',
					'factura_proveedor.proveedor.marca.domicilio.estado.pais.continente',
					'factura_proveedor.proveedor.marca.pais.continente',
					'factura_proveedor.proveedor.marca.archivo',
					'factura_proveedor.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'factura_proveedor.proveedor.marca.dato_facturacion.pais.continente', 
					'factura_proveedor.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'factura_proveedor.proveedor.proveedor_tipo',
					'factura_proveedor.moneda',
					'factura_proveedor.usuario_solicita'
				],
				producto: [
					'producto.marca.domicilio.estado.pais.continente',
					'producto.marca.pais.continente',
					'producto.marca.archivo',
					'producto.marca.dato_facturacion.regimen_fiscal', 
					'producto.marca.dato_facturacion.pais.continente', 
					'producto.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'producto.moneda_compra',
					'producto.moneda_venta',
					'producto.pais.continente',
					'producto.tipo_cobertura',
					'producto.archivo'
				],
				all: [ 
					'orden_compra.ordenes_compra_archivos.archivo',
					'orden_compra.marca',
					'orden_compra.proveedor',
					'orden_compra.moneda',
					'orden_compra.usuario_solicita',
					'concepto_presupuesto',
					'factura_proveedor.facturas_proveedor_archivos.archivo', 
					'factura_proveedor.marca', 
					'factura_proveedor.proveedor',
					'factura_proveedor.moneda',
					'factura_proveedor.usuario_solicita',
					'producto.marca',
					'producto.moneda_compra',
					'producto.moneda_venta',
					'producto.pais.continente',
					'producto.tipo_cobertura'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.facturas_proveedor_detalles.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function storeFPD(parametros, res, usuario){
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		parametros.impuestoAdicional = parametros.impuestoAdicional === undefined || parametros.impuestoAdicional === null ? 0.0 : parametros.impuestoAdicional
		parametros.descuentos = parametros.descuentos === undefined || parametros.descuentos === null ? 0.0 : parametros.descuentos
		let obligatorios = [{campo:'idConceptoPresupuesto', tipo:'model', model:db.sequelize.models.conceptos_presupuesto},
							{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
							{campo:'precioUnitario', tipo:'number'},
							{campo:'cantidad', tipo:'number'},
							{campo:'subtotal', tipo:'number'},
							{campo:'impuestos', tipo:'number'},
							{campo:'descuentos', tipo:'number'},
							{campo:'impuestoAdicional', tipo:'number'},
        ]
		registro = await Validaciones.validParametros({body:parametros}, res,obligatorios,registro);
		if(!registro){
			return false;
		}
        const validosOpcionales =[{campo:'idOrdenCompra', tipo:'model', model:db.sequelize.models.ordenes_compra},
								  {campo:'idFacturaProveedor', tipo:'model', model:db.sequelize.models.facturas_proveedor},
								  {campo:'comentarios', tipo:'string', largo:45},
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return false;
		}
		registro = dataValidarOpcionales[0]
		registro.id_usuario_registro = usuario.id
		const nuevoRegistro = await db.sequelize.models.facturas_proveedor_detalles.create(registro);
		return true
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return false
	} 
}

async function updateFPD(id,idFacturaProveedor){
	if(!Number.isInteger(parseInt(id))){
		return {status:false , msg: `El parametro id debe ser int.` }
	} 
	try {
		const datosUpdate = {
			id_factura_proveedor: idFacturaProveedor,
			updatedAt: moment().tz('America/Mexico_City')
		}
		const registroAEditar = await db.sequelize.models.facturas_proveedor_detalles.findByPk(id);

		if(registroAEditar.id_factura_proveedor !== null && idFacturaProveedor !== null && registroAEditar.id_factura_proveedor != idFacturaProveedor){
			return { status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:registroAEditar }
		}
		if(registroAEditar == null){
			return { status: false, msg: "Registro no existe" }
		}
		if(registroAEditar.deletedAt != null){
			return { status: false, msg: "Registro eliminado" }
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		if(registroAEditar.id_factura_proveedor == null && registroAEditar.id_orden_compra == null){
			await registroAEditar.destroy({ where: { id: id } })
		}
		return true
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
}

async function updateFPDEX(parametros){
	try {
		const datosUpdate = {
			id_factura_proveedor: parametros.idFacturaProveedor ?? null,
			id_concepto_presupuesto: parametros.idConceptoPresupuesto,
			precio_unitario: parametros.precioUnitario,
			cantidad: parametros.cantidad,
			subtotal: parametros.subtotal,
			impuestos: parametros.impuestos,
			impuesto_adicional: parametros.impuestoAdicional,
			descuentos: parametros.descuentos,
			comentarios: parametros.comentarios,
			updatedAt: moment().tz('America/Mexico_City')
		}
		const registroAEditar = await db.sequelize.models.facturas_proveedor_detalles.findByPk(parametros.id);
		
		if(registroAEditar.id_factura_proveedor !== null && parametros.idFacturaProveedor !== null && registroAEditar.id_factura_proveedor != parametros.idFacturaProveedor){
			return { status: false, msg: "El detalle ya cuenta con factura proveedor asignada.", detalle:registroAEditar }
		}
		if(registroAEditar == null){
			return { status: false, msg: "Registro no existe" }
		}
		if(registroAEditar.deletedAt != null){
			return { status: false, msg: "Registro eliminado" }
		}

		await registroAEditar.update(datosUpdate, { where: { id: parametros.id } });
		if(registroAEditar.id_factura_proveedor == null && registroAEditar.id_orden_compra == null){
			await registroAEditar.destroy({ where: { id: id } })
		}
		return true
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
}

async function destroyFPD(id){
	if(!Number.isInteger(parseInt(id))){
		return {status:false , msg: `El parametro id debe ser int.` }
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.facturas_proveedor_detalles.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.facturas_proveedor_detalles.name){
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
				return { status: false, msg: `No se pudo eliminar. El elemento actualmente está siendo referenciado en los modelos [${modelosUtilizados}].` }
			}
			if(registroAEliminar.deletedAt != null){
				return { status: false, msg: "Registro eliminado" }
			}
			await registroAEliminar.destroy({ where: { id: id } })
			return { status: true, msg: "Registro eliminado con éxito"}
		}
		return { status: false, msg: "Registro no existe" }
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
}

module.exports = {
	storeFPD,
	destroyFPD,
	updateFPD,
	updateFPDEX,
	index,
	show
}
