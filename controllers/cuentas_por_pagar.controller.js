'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_por_pagar.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
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
					'factura_proveedor.usuario_solicita',
				 ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.cuentas_por_pagar.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cuentas_por_pagar.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		})

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cuentasPorPagar`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []

		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const facturaProveedor = element.factura_proveedor
				const findRelFacProDoc = new Relaciones(['archivo'],['archivo'],db.sequelize.models)
				const relacionesFacProDoc = await findRelFacProDoc.getRelaciones()
				const facturasProveedorArchivo = await db.sequelize.models.facturas_proveedor_archivos.findAll({where:{id_factura_proveedor: facturaProveedor.id}, include:relacionesFacProDoc})
				element.factura_proveedor.facturas_proveedor_archivos = facturasProveedorArchivo
	
				const facturasProveedorDetalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor: facturaProveedor.id}})
				element.factura_proveedor.facturas_proveedor_detalles = facturasProveedorDetalles
				const pagosFacturacion = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar:element.id}})
				const relsPago = [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'moneda',
					'metodo_pago'
				]
				const findRelPago = new Relaciones(relsPago,relsPago,db.sequelize.models)
				const relPagos = await findRelPago.getRelaciones()
				element.pagos = []
				for(const pagoFac of pagosFacturacion){
					const pago = await db.sequelize.models.pagos_proveedor.findByPk(pagoFac.id_pago_proveedor,{include: relPagos})
					element.pagos.push(pago)
				}
			}
			data.push(element)
		}
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data
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
		const perfilesValidos = ['all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
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
					'factura_proveedor.usuario_solicita',
				 ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.cuentas_por_pagar.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){

			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const facturaProveedor = element.factura_proveedor
				const findRelFacProDoc = new Relaciones(['archivo'],['archivo'],db.sequelize.models)
				const relacionesFacProDoc = await findRelFacProDoc.getRelaciones()
				const facturasProveedorArchivo = await db.sequelize.models.facturas_proveedor_archivos.findAll({where:{id_factura_proveedor: facturaProveedor.id}, include:relacionesFacProDoc})
				element.factura_proveedor.facturas_proveedor_archivos = facturasProveedorArchivo
	
				const facturasProveedorDetalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor: facturaProveedor.id}})
				element.factura_proveedor.facturas_proveedor_detalles = facturasProveedorDetalles
				const pagosFacturacion = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar:element.id}})
				const relsPago = [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'moneda',
					'metodo_pago'
				]
				const findRelPago = new Relaciones(relsPago,relsPago,db.sequelize.models)
				const relPagos = await findRelPago.getRelaciones()
				element.pagos = []
				for(const pagoFac of pagosFacturacion){
					const pago = await db.sequelize.models.pagos_proveedor.findByPk(pagoFac.id_pago_proveedor,{include: relPagos})
					element.pagos.push(pago)
				}
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_por_pagar.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
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
					'factura_proveedor.proveedor.proveedor_grupo',
					'factura_proveedor.moneda',
					'factura_proveedor.usuario_solicita',
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.cuentas_por_pagar.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		});

		const data = [];
		for(const doc of docs){
			const element = doc.toJSON()
			
			if(element.factura_proveedor == null) continue;
			if(element.factura_proveedor.proveedor == null || element.factura_proveedor.marca == null || element.factura_proveedor.usuario_solicita == null){
				continue;
			}
			const facturaProveedor = element.factura_proveedor;
			const findRelFacProDoc = new Relaciones(['archivo'],['archivo'],db.sequelize.models);
			const relacionesFacProDoc = await findRelFacProDoc.getRelaciones();
			const facturasProveedorArchivo = await db.sequelize.models.facturas_proveedor_archivos.findAll({where:{id_factura_proveedor: facturaProveedor.id}, include:relacionesFacProDoc});
			element.factura_proveedor.facturas_proveedor_archivos = facturasProveedorArchivo;

			const facturasProveedorDetalles = await db.sequelize.models.facturas_proveedor_detalles.findAll({where:{id_factura_proveedor: facturaProveedor.id}});
			element.factura_proveedor.facturas_proveedor_detalles = facturasProveedorDetalles;
			const pagosFacturacion = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar:element.id}});
			const relsPago = [
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'moneda',
					'metodo_pago'
			];
			const findRelPago = new Relaciones(relsPago,relsPago,db.sequelize.models);
			const relPagos = await findRelPago.getRelaciones();
			element.pagos = [];
			for(const pagoFac of pagosFacturacion){
					const pago = await db.sequelize.models.pagos_proveedor.findByPk(pagoFac.id_pago_proveedor,{include: relPagos});
					element.pagos.push(pago);
			}

			element.montoOriginal = parseFloat(element.factura_proveedor.subtotal) + parseFloat(element.factura_proveedor.impuesto) - parseFloat(element.factura_proveedor.descuento);
			element.fecha_emision = element.factura_proveedor.createdAt.toISOString().slice(0, 19).replace('T', ' ');
			element.saldoVencido = '';
			const fechaVencimiento = moment(element.fecha_vencimiento).tz('America/Mexico_City');
			const fechaActual = moment().tz('America/Mexico_City');
			if(fechaActual >= fechaVencimiento){
					element.saldoVencido = element.saldo;
					element.saldo = '';
			}
			const diasVencimiento = fechaActual.diff(fechaVencimiento, 'days');
			element.diasVencimiento = diasVencimiento+1;
			
			data.push(element);
		}

		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			aux = {
				'Folio': elemento.factura_proveedor.folio,
				'Proveedor': elemento.factura_proveedor.proveedor.nombre,
				'Marca': elemento.factura_proveedor.marca.nombre,
				'Monto original': elemento.montoOriginal,
				'Solicitante': elemento.factura_proveedor.usuario_solicita.nombre,
				'Saldo': elemento.saldo,
				'Saldo vencido': elemento.saldoVencido,
				'Días crédito': elemento.factura_proveedor.proveedor.dias_credito,
				'Fecha de emisión': elemento.fecha_emision,
				'Fehca de vencimiento': elemento.fecha_vencimiento,
				'Días de vencimiento': elemento.diasVencimiento,
				'Referencia': elemento.factura_proveedor.referencia
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
			return res.status(400).json({success: false, error: 'Sin registros'});
		}
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Cuentas por pagar';
		const namesSheets = [db.sequelize.models.cuentas_por_pagar.name];
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
	show,
	exportar
}


