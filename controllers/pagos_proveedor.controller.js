'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.pagos_proveedor.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cuenta_bancaria_interna', 'marca', 'moneda', 'metodo_pago', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cuenta_bancaria_interna: [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
				],
				marca: [ 
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				moneda: ['moneda'],
				metodo_pago: ['metodo_pago'],
				all: [ 
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
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.pagos_proveedor.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.pagos_proveedor.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/pagosProveedor`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.pagos_proveedor_archivos.findAll({where:{id_pago_proveedor:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_pago_proveedor_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_pago_proveedor = undefined
					data.id_usuario_registro = undefined
					data.createdAt = undefined
					data.updatedAt = undefined
					data.deletedAt = undefined
					element.archivos.push(data)
				}
				var relacionesP = [];
					
				const pagos = await db.sequelize.models.pagos_proveedor_facturacion.findOne({where:{id_pago_proveedor:element.id}});
				const relP = ['factura_proveedor.proveedor'];
				const findRelacioneP = new Relaciones(relP,relP,db.sequelize.models);
				relacionesP= await findRelacioneP.getRelaciones();	
				const proveedor = await db.sequelize.models.cuentas_por_pagar.findByPk(pagos.id_cuenta_por_pagar,{include: relacionesP});				
				element.proveedores = proveedor.factura_proveedor.proveedor;
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

async function store(req, res){
	try {
		const parametros = req.body;
		const cxps = parametros.cxps ?? []
		if(cxps.length < 1 && Array.isArray(cxps)){
			res.status(400).send({status:false , msg: `El parametro cxps no debe estar vacío.` });
			return false
		} 
		var registroPago = {
			createdAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idCuentaBancariaInterna', tipo:'model', model:db.sequelize.models.cuentas_bancarias_internas},
							{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
							{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
							{campo:'referencia', tipo:'string', largo:100},
							{campo:'fechaPago', tipo:'stringDate'},
		]
		registroPago = await Validaciones.validParametros(req, res,obligatorios,registroPago);
		if(!registroPago){
			return '';
		}
		const fechaPago = moment(registroPago.fecha_pago).tz('America/Mexico_City').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
		registroPago.fecha_pago = fechaPago
		const now = moment().tz('America/Mexico_City')
		
		if(fechaPago > now){
			return res.status(400).send({ status: true, msg: "No se puede registrar una fecha de pago superar a la fecha actual."});
		}
		const validosOpcionales =[{campo:'comentarios', tipo:'string',largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registroPago,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const registrosEncontrados = await db.sequelize.models.pagos_proveedor.findAll({
			where: {
				id_marca: parametros.idMarca
			},
			paranoid: false
		});
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca);
		registroPago.folio = marca.clave + "-" + (registrosEncontrados.length + 1)
		registroPago.subtotal = 0
		registroPago.impuestos = 0
		const cxcInPago = []
		const pagosFacturacionToSave = []
		let idProveedor
		let monedaCxp
		const decimales = 6
		const decimalesTotales = 2
		const monedaPago = await db.sequelize.models.monedas.findByPk(registroPago.id_moneda);
		let isPUE = true
		for(const cxp of cxps){
			if(!cxcInPago.includes(cxp.idCuentaPorPagar)){
				cxcInPago.push(cxp.idCuentaPorPagar)
			} else{
				return res.status(400).send({ status: false, msg: "Ya se esta registrando un pago para la cuenta por pagar con id: " + cxp.idCuentaPorPagar});
			}
			var registro = {
				createdAt: moment().tz('America/Mexico_City'),
			}
			let obligatorios = [{campo:'idCuentaPorPagar', tipo:'model', model:db.sequelize.models.cuentas_por_pagar},
								{campo:'total', tipo:'number'}
			]
			registro = await Validaciones.validParametros({body:cxp}, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			const cXp = await db.sequelize.models.cuentas_por_pagar.findByPk(registro.id_cuenta_por_pagar,{include:['factura_proveedor']});
			const factura = await db.sequelize.models.facturas_proveedor.findByPk(cXp.factura_proveedor.id, { include:['moneda'] });
			const saldoCxP = cXp.saldo
			if(saldoCxP <= 0){
				return res.status(400).send({ status: false, cxp: cxp,  msg: "Ya no se puede generar más pagos_proveedor. El saldo de la cuenta por cobrar es igual o menor a $0.0"});
			}
			if(registroPago.id_marca !== factura.id_marca){
				return res.status(400).send({ status: false, msg: "Todas las cuentas por pagar deber pertenecer a la misma marca que la factura"});
			}
			if(idProveedor === undefined){
				idProveedor = factura.id_proveedor
			} else if(idProveedor !== factura.id_proveedor){
				return res.status(400).send({ status: false, msg: "Todas las cuentas por pagar deber pertenecer al mismo proveedor"});
			}
			
			if(registroPago.folio === undefined){
				const pagosMarca = await db.sequelize.models.pagos_proveedor.findAll({
					where: {
						id_marca: marca.id
					},
					paranoid: false
				});
				const folio = marca.clave + "-" + (pagosMarca.length + 1)
				registroPago.folio = folio
			}
			if(monedaCxp !== factura.moneda.clave && monedaCxp !== undefined){
				return res.status(400).send({ status: false, msg: "Todas las cuentas por pagar deber tener la misma moneda"});
			}
			monedaCxp = factura.moneda.clave
			
			//Se obtiene el tipo de cambio del dia
			let fechaString = moment(registroPago.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DD')
			let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
		
			let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
			if(doit !== true){
				return doit
			}
			const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
			if(tipoCambioSelected == undefined){
				return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
			}
			let tipoCambio = 1
			if(monedaCxp != monedaPago.clave){
				if(monedaCxp == "MXN"){
					tipoCambio = parseFloat((parseFloat((tipoCambioSelected.tipo_cambio))).toFixed(8))
				} else{
					tipoCambio = (parseFloat((1 / tipoCambioSelected.tipo_cambio)))
				}
			}
			//Se calcula el total del pago en la moneda del documento relacionado
			registroPago.pagoTotal = parseFloat((registro.total * tipoCambio).toFixed(decimales))
			const totalPagoMonedaCxP = parseFloat((registro.total * tipoCambio).toFixed(decimales))
			if(totalPagoMonedaCxP > saldoCxP){
				cxp.saldo = saldoCxP
				cxp.total = undefined
				cxp.moneda = monedaCxp
				return res.status(400).send({ status: false, cxp: cxp,  msg: "No se puede generar el pagos_proveedor. El saldo a pagar es mayor que la cuenta por pagar"});
			}
			//Se calcula el nuevo saldo de la cuenta por cobrar
			const nuevoSaldoCxP = parseFloat((saldoCxP - parseFloat((totalPagoMonedaCxP).toFixed(decimalesTotales))).toFixed(decimales))
			const totalFactura = parseFloat(((parseFloat(factura.subtotal) + parseFloat(factura.impuesto) - parseFloat(factura.descuento)) * tipoCambio).toFixed(decimales))
			//Se calcula el porcentajePagado = valor pagado / valor factura
			const porcentajePagado = totalPagoMonedaCxP/totalFactura

			registroPago.subtotal = registroPago.subtotal + parseFloat((((parseFloat(factura.subtotal) - parseFloat(factura.descuento)) * porcentajePagado) ).toFixed(decimalesTotales))
			registroPago.impuestos = registroPago.impuestos + parseFloat(((parseFloat(factura.impuesto) * porcentajePagado)).toFixed(decimalesTotales))

			const pagosFacturacionCxP = await db.sequelize.models.pagos_proveedor_facturacion.findAll({where:{id_cuenta_por_pagar: registro.id_cuenta_por_pagar}})
			const numParcialidad = pagosFacturacionCxP.length + 1
			if(numParcialidad > 1){
				isPUE = false
			} else{
				if(porcentajePagado < 1){
					isPUE = false
				}
			}
			registro.saldo_anterior = parseFloat(saldoCxP)
			registro.saldo_nuevo = nuevoSaldoCxP
			registro.monto = parseFloat((totalPagoMonedaCxP).toFixed(decimalesTotales))
			registro.parcialidad = numParcialidad
			registro.tipo_cambio = tipoCambio
			registro.id_usuario_registro = req.usuario.id
			registro.total = undefined
			pagosFacturacionToSave.push(registro)
		}
		const cuentaBancaria = await db.sequelize.models.cuentas_bancarias_internas.findByPk(registroPago.id_cuenta_bancaria_interna, { paranoid: false });
		if((marca.id_dato_facturacion != cuentaBancaria.id_datos_facturacion)){
			return res.status(400).send({ status: true, msg: "La cuenta bancaria seleccionada debe tener los mismos datos de facturación que la marca seleccionada."});
		}
		if(cuentaBancaria.id_moneda != registroPago.id_moneda){
			return res.status(400).send({ status: true, msg: "La moneda del pago debe coincidir con la moneda de la cuenta bancaria seleccionada."});
		}

		let claveMetodoPago = "PUE"
		if(!isPUE){
			claveMetodoPago = "PPD"
		}
		const metodoPago = await db.sequelize.models.metodos_pago.findOne({where:{clave:claveMetodoPago}})
		registroPago.id_metodo_pago = metodoPago.id
		registroPago.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.pagos_proveedor.create(registroPago);
		for(const pagoFacturacion of pagosFacturacionToSave){
			pagoFacturacion.id_pago_proveedor = nuevoRegistro.id
			await db.sequelize.models.pagos_proveedor_facturacion.create(pagoFacturacion);
			const datosUpdateCxP = {
				saldo: parseFloat((parseFloat(pagoFacturacion.saldo_nuevo)).toFixed(2)),
				updatedAt: moment().tz('America/Mexico_City')
			}
			const cXp = await db.sequelize.models.cuentas_por_pagar.findByPk(pagoFacturacion.id_cuenta_por_pagar);
			await cXp.update(datosUpdateCxP, { where: { id: cXp.id } });
		}
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
		const perfilesValidos = ['cuenta_bancaria_interna', 'marca', 'moneda', 'metodo_pago', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cuenta_bancaria_interna: [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal',
				],
				marca: [ 
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				moneda: ['moneda'],
				metodo_pago: ['metodo_pago'],
				all: [ 
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
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.pagos_proveedor.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const archivos = await db.sequelize.models.pagos_proveedor_archivos.findAll({where:{id_pago_proveedor:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_pago_proveedor_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_pago_proveedor = undefined
					data.id_usuario_registro = undefined
					data.createdAt = undefined
					data.updatedAt = undefined
					data.deletedAt = undefined
					element.archivos.push(data)
				}
				var relacionesP = [];
					
				const pagos = await db.sequelize.models.pagos_proveedor_facturacion.findOne({where:{id_pago_proveedor:element.id}});
				const relP = ['factura_proveedor.proveedor'];
				const findRelacioneP = new Relaciones(relP,relP,db.sequelize.models);
				relacionesP= await findRelacioneP.getRelaciones();	
				const proveedor = await db.sequelize.models.cuentas_por_pagar.findByPk(pagos.id_cuenta_por_pagar,{include: relacionesP});				
				element.proveedores = proveedor.factura_proveedor.proveedor;
			}
			return res.status(200).send({ status: true, data: element});
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
		const registroAEliminar = await db.sequelize.models.pagos_proveedor.findByPk(id);
		if(registroAEliminar != null){
			const archivos = await db.sequelize.models.pagos_proveedor_archivos.findAll({where: {id_pago_proveedor:id}});
			for(const archivo of archivos){
				console.log(archivo.id)
				await archivo.destroy({ where: { id: archivo.id } })
			}
			let canDelete = true
			let pagosPosterirores = false
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.pagos_proveedor.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(modelo.name == "pagos_proveedor_facturacion"){
								for(const encontrado of encontrados){
									let pagosGenerados = await modelo.findAll({ where: {id_cuenta_por_pagar:encontrado.id_cuenta_por_pagar} });
									if(encontrado.parcialidad < pagosGenerados.length){
										canDelete = false
										pagosPosterirores = true
										modelosUtilizados.push(modelo.name)
									}
									const cXp = await db.sequelize.models.cuentas_por_pagar.findByPk(encontrado.id_cuenta_por_pagar);
									const datosUpdateCxP = {
										saldo: parseFloat((parseFloat(parseFloat(cXp.saldo) + parseFloat(encontrado.monto))).toFixed(2)) ,
										updatedAt: moment().tz('America/Mexico_City')
									}
									await cXp.update(datosUpdateCxP, { where: { id: cXp.id } });
									await encontrado.destroy({ where: { id: encontrado.id } })
								}
							}else if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name)){
								canDelete = false
								modelosUtilizados.push(modelo.name)
							}
						}
					}
				}
			}
			if(!canDelete){
				if(pagosPosterirores){
					return res.status(400).send({ status: false, msg: `No se pudo eliminar. Existen pagos posteriores.` });
				}
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

async function cargarArchivo(req, res){
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		}
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idCargaArchivo', tipo:'model', canNull: true, model:db.sequelize.models.carga_archivos}]

		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const registrosEncontrados = await db.sequelize.models.pagos_proveedor_archivos.findAll({
			where: {
				id_pago_proveedor: id,
				id_carga_archivo: parametros.idCargaArchivo,
				deletedAt: null
			}
		});
		registro.id_pago_proveedor = id
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_pago_proveedor == id && 
				   registro.id_carga_archivo == parametros.idCargaArchivo){
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
		const nuevoRegistro = await db.sequelize.models.pagos_proveedor_archivos.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function eliminarArchivo(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	try {
		const registroAEliminar = await db.sequelize.models.pagos_proveedor_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.pagos_proveedor_archivos.name){
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


async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.pagos_proveedor.rawAttributes);
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
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.pagos_proveedor.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10,
			order: [[campoOrden, orden]],
			where: filtro
		});

		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			if(req.query.perfil == 'all'){
				if(element.subtotal == null || element.impuestos == null) continue;
				const subtotal = parseFloat(element.subtotal);
				const impuesto = parseFloat(element.impuestos);
				element.importe = subtotal - impuesto;
			}
			data.push(element);
		}
		
		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			if(elemento.moneda == null || elemento.cuenta_bancaria_interna == null || elemento.usuario_registro == null) continue;
			aux = {
				'Folio': elemento.folio,
				'Fecha': elemento.fecha_pago != null ? elemento.fecha_pago : '-',
				'importe': elemento.importe,
				'Moneda': elemento.moneda.clave,
				'Referencia': elemento.referencia != null ? elemento.referencia : '-',
				'Creado por': elemento.usuario_registro.nombre,
				'Banco': elemento.cuenta_bancaria_interna.entidad_bancaria.nombre
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Aplicaciones de egreso';
		const namesSheets = [db.sequelize.models.pagos_proveedor.name];
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
	destroy,
	cargarArchivo,
	eliminarArchivo,
	exportar
}
