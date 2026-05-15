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
	const camposModelo = Object.keys(db.sequelize.models.clientes_saldos_a_favor.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cliente', 'pago', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [
					'cliente.tipo_cliente',
					'cliente.estado.pais.continente',
					'cliente.oficina_interno'
				],
				pago: [ 
					'pago.cfdi.uso_cfdi',
					'pago.cfdi.metodo_pago',
					'pago.cfdi.forma_pago',
					'pago.cfdi.motivo_cancelacion',
					'pago.cuenta_bancaria_interna.moneda',
					'pago.cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.datos_facturacion_domicilios.domicilio.estado.pais.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
					'pago.marca.domicilio.estado.pais.continente',
					'pago.marca.pais.continente',
					'pago.marca.archivo',
					'pago.marca.dato_facturacion.regimen_fiscal', 
					'pago.marca.dato_facturacion.pais.continente', 
					'pago.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'pago.moneda',
					'pago.metodo_pago',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.marca.domicilio.estado',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.marca.pais',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.razon_social',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.moneda',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.cfdi',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.oficina',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.factura_detalles.pedido_factura.certificado',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.factura_detalles.producto',
					'pago.razon_social.pais.continente', 
					'pago.razon_social.uso_cfdi',
					'pago.razon_social.metodo_pago',
					'pago.razon_social.forma_pago',
					'pago.razon_social.razon_bloqueo',
					'pago.razon_social.regimen_fiscal',
					'pago.razon_social.moneda_credito' 
				],
				all: [
					'cliente.tipo_cliente',
					'cliente.estado.pais.continente',
					'cliente.oficina_interno',
					'pago.cfdi',
					'pago.cuenta_bancaria_interna.moneda',
					'pago.cuenta_bancaria_interna.dato_facturacion',
					'pago.moneda',
					'pago.metodo_pago',
					'pago.razon_social.pais', 
					'pago.razon_social.uso_cfdi',
					'pago.razon_social.metodo_pago',
					'pago.razon_social.forma_pago',
					'pago.razon_social.razon_bloqueo',
					'pago.razon_social.regimen_fiscal',
					'pago.razon_social.moneda_credito' 
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.clientes_saldos_a_favor.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.clientes_saldos_a_favor.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/clientesSaldosAFavor`;
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
		const perfilesValidos = ['cliente', 'pago', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [
					'cliente.tipo_cliente',
					'cliente.estado.pais.continente',
					'cliente.oficina_interno'
				],
				pago: [ 
					'pago.cfdi.uso_cfdi',
					'pago.cfdi.metodo_pago',
					'pago.cfdi.forma_pago',
					'pago.cfdi.motivo_cancelacion',
					'pago.cuenta_bancaria_interna.moneda',
					'pago.cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.datos_facturacion_domicilios.domicilio.estado.pais.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'pago.cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
					'pago.marca.domicilio.estado.pais.continente',
					'pago.marca.pais.continente',
					'pago.marca.archivo',
					'pago.marca.dato_facturacion.regimen_fiscal', 
					'pago.marca.dato_facturacion.pais.continente', 
					'pago.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'pago.moneda',
					'pago.metodo_pago',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.marca.domicilio.estado',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.marca.pais',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.razon_social',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.moneda',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.cfdi',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.oficina',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.factura_detalles.pedido_factura.certificado',
					'pago.pagos_facturacion.cuenta_por_cobrar.factura.factura_detalles.producto',
					'pago.razon_social.pais.continente', 
					'pago.razon_social.uso_cfdi',
					'pago.razon_social.metodo_pago',
					'pago.razon_social.forma_pago',
					'pago.razon_social.razon_bloqueo',
					'pago.razon_social.regimen_fiscal',
					'pago.razon_social.moneda_credito' 
				],
				all: [
					'cliente.tipo_cliente',
					'cliente.estado.pais.continente',
					'cliente.oficina_interno',
					'pago.cfdi',
					'pago.cuenta_bancaria_interna.moneda',
					'pago.cuenta_bancaria_interna.dato_facturacion',
					'pago.moneda',
					'pago.metodo_pago',
					'pago.razon_social.pais', 
					'pago.razon_social.uso_cfdi',
					'pago.razon_social.metodo_pago',
					'pago.razon_social.forma_pago',
					'pago.razon_social.razon_bloqueo',
					'pago.razon_social.regimen_fiscal',
					'pago.razon_social.moneda_credito' 
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.clientes_saldos_a_favor.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
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
		const registroAEliminar = await db.sequelize.models.clientes_saldos_a_favor.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.clientes_saldos_a_favor.name){
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



module.exports = {
	index,
	show,
	destroy,
}
