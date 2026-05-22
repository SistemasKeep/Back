'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { sendMailPago } = require('./pagos_mails.controllers')
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { sendMailErrorTimbradoPago } = require('./notificacion_error_timbrado_pagos.controllers')
const xml2js = require('xml2js');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.pagos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cfdi','cuenta_bancaria_interna', 'marca', 'moneda', 'metodo_pago', 'pagos_facturacion', 'razon_social', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cfdi: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion'
				],
				cuenta_bancaria_interna: [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal'
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
				razon_social: [ 
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito' 
				],
				all: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'cuenta_bancaria_interna.moneda',
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
					'metodo_pago',
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito' 
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		
		const docs = await db.sequelize.models.pagos.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.pagos.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/pagos`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 'domicilio.estado.pais.continente' ]
				const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones()
				const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.cuenta_bancaria_interna.dato_facturacion.id}, include:relacionesDomicilios})
				const domicilios = []
				for(const domicilio of domiciliosData){
					const e = domicilio.domicilio.toJSON()
					e.tipo = domicilio.tipo
					e.usuario_registro = undefined
					domicilios.push(e)
				}
				element.cuenta_bancaria_interna.dato_facturacion.domicilios = domicilios
				const listPagos = [
					'cuenta_por_cobrar.factura.marca.domicilio.estado',
					'cuenta_por_cobrar.factura.marca.pais',
					'cuenta_por_cobrar.factura.razon_social.pais.continente', 
					'cuenta_por_cobrar.factura.razon_social.uso_cfdi',
					'cuenta_por_cobrar.factura.razon_social.metodo_pago',
					'cuenta_por_cobrar.factura.razon_social.forma_pago',
					'cuenta_por_cobrar.factura.razon_social.razon_bloqueo',
					'cuenta_por_cobrar.factura.razon_social.regimen_fiscal',
					'cuenta_por_cobrar.factura.moneda',
					'cuenta_por_cobrar.factura.cfdi',
					'cuenta_por_cobrar.factura.oficina',
					'cuenta_por_cobrar.factura.factura_detalles.pedido_factura.certificado',
					'cuenta_por_cobrar.factura.factura_detalles.producto',
				]
				const findRelacionesPagos = new Relaciones(listPagos,listPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
				element.pagos_facturacion = await db.sequelize.models.pagos_facturacion.findAll({where:{id_pago: element.id}, include:relacionesPagos})
				const archivos = await db.sequelize.models.pagos_archivos.findAll({where:{id_pago:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_pago_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_pago = undefined
					data.id_usuario_registro = undefined
					data.createdAt = undefined
					data.updatedAt = undefined
					data.deletedAt = undefined
					element.archivos.push(data)
				}
				const clientes = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.id_razon_social},include: ['cliente']})
				if(clientes == null){
					element.cliente = null;
				}else{
					element.cliente = clientes.cliente;
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

async function store(req, res) {
	try {
		const parametros = req.body;
		const cxcs = parametros.cxcs ?? []
		if(cxcs.length < 1 && Array.isArray(cxcs)){
			res.status(400).send({status:false , msg: `El parametro cxcs no debe estar vacío.` });
			return false
		} 
		var registroPago = {
			createdAt: moment().tz('America/Mexico_City')
		}
		let obligatoriosPago = [{campo:'idCuentaBancariaInterna', tipo:'model', model:db.sequelize.models.cuentas_bancarias_internas},
								{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
								{campo:'idFormaPago', tipo:'model', model:db.sequelize.models.formas_pago},
								{campo:'referencia', tipo:'string', largo:100},
								{campo:'fechaPago', tipo:'stringDate'},
		]
		registroPago = await Validaciones.validParametros(req, res,obligatoriosPago,registroPago);
		if(!registroPago){
			return '';
		}
		const validosOpcionales =[{campo:'comentarios', tipo:'string',largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registroPago,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		const fechaPago = moment(registroPago.fecha_pago).tz('America/Mexico_City').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
		registroPago.fecha_pago = fechaPago
		const fechaLimiteTimbrado = fechaPago.clone().add(1, 'month').date(5).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }); 
		const now = moment().tz('America/Mexico_City')
		const fechaValidaTimbrar = now <= fechaLimiteTimbrado
		
		if(fechaPago > now){
			return res.status(400).send({ status: true, msg: "No se puede registrar una fecha de pago superar a la fecha actual."});
		}
		registroPago.id_usuario_registro = req.usuario.id
		const decimales = 6
		const decimalesTotales = 2
		const monedaPago = await db.sequelize.models.monedas.findByPk(registroPago.id_moneda, { paranoid: false });
		const alertas = []
		const cxcInPago = []
		var metodoPago
		const formaPago = await db.sequelize.models.formas_pago.findByPk(registroPago.id_forma_pago,{ paranoid: false });
		registroPago.id_forma_pago = undefined
		const dataTimbrado = {
			pagos:{
				pago: {},
				totales: {
					TotalTrasladosBaseIVA16: 0,
					TotalTrasladosImpuestoIVA16: 0,
					TotalTrasladosBaseIVA0: 0,
					TotalTrasladosImpuestoIVA0: 0,
					MontoTotalPagos: 0
				}
			}
		}
		const pagosFacturacionToSave = []
		const saldosAFavor = []
		var marca
		var porcentajePagado
		registroPago.pagoTotal = 0.0
		const ImpuestosP = []
		const ImpuestosPSave = []
		let contador = 0
		const dataBase = {}
		for(const cxc of cxcs){
			if(!cxcInPago.includes(cxc.idCuentaPorCobrar)){
				cxcInPago.push(cxc.idCuentaPorCobrar)
			} else{
				return res.status(400).send({ status: false, msg: "Ya se esta registrando un pago para la cuenta por cobrar con id: " + cxc.idCuentaPorCobrar});
			}
			var registro = {
				createdAt: moment().tz('America/Mexico_City'),
			}
			let obligatorios = [{campo:'idCuentaPorCobrar', tipo:'model', model:db.sequelize.models.cuentas_por_cobrar},
								{campo:'total', tipo:'number'}
			]
			registro = await Validaciones.validParametros({body:cxc}, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(registro.id_cuenta_por_cobrar);
			const factura = await db.sequelize.models.facturas.findByPk(cXc.id_factura, { include:['moneda','factura_detalles','cfdi'] });
			const saldoCxC = parseFloat(cXc.saldo)
			if(saldoCxC <= 0){
				return res.status(400).send({ status: false, cxc: cxc,  msg: "Ya no se puede generar más pagos. El saldo de la cuenta por cobrar es igual o menor a $0.0"});
			}
			if(cxc.total < 0.01){
				return res.status(400).send({ status: false, msg: "No se puede generar el pago. El valor a pagar debe ser mayor a 0.01."});
			}
			if(registroPago.id_marca === undefined){
				registroPago.id_marca = factura.id_marca
			}
			if(registroPago.id_razon_social === undefined){
				registroPago.id_razon_social = factura.id_razon_social
			} else if(registroPago.id_razon_social !== factura.id_razon_social){
				alertas.push({ cxc: cxc, msg: "La factura de la cuenta por cobrar con tiene la misma razon social"})
			}
			marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'] });
			if(marca.pais.clave.toLowerCase() == "mx"){
				try {
					const cfid = factura.cfdi.xml
					const xml = await xmlToJSON(cfid)
					metodoPago = await db.sequelize.models.metodos_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['MetodoPago']},paranoid: false });
					if(registroPago.id_metodo_pago === undefined){
						registroPago.id_metodo_pago = metodoPago.id
					} else if(registroPago.id_metodo_pago !== metodoPago.id){
						return res.status(400).send({ status: false, msg: "Todas las cuentas por cobrar deber tener el mismo metodo de pago"});
					}
				} catch (error) {
					return res.status(400).send({ status: false, msg: "La factura con id: " + factura.id + " no se encuentra timbrada."});
				}
			}else{
				metodoPago = {clave: "N/A"}
			}
			if(registroPago.folio === undefined){
				const pagosMarca = await db.sequelize.models.pagos.findAll({
					where: {
						id_marca: marca.id
					},
					paranoid: false
				});
				const folio = marca.clave + "-" + (pagosMarca.length + 1)
				registroPago.folio = folio
			}
			const monedaCxc = factura.moneda.clave
			if(dataTimbrado.pagos.pago[monedaCxc] === undefined){
				dataTimbrado.pagos.pago[monedaCxc] = {
					FechaPago: moment(registroPago.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DDTHH:mm:ss'),
					FormaDePagoP: formaPago.clave,
					MonedaP: monedaPago.clave,
					TipoCambioP: 1,
					Monto: 0,
					DoctoRelacionados:[],
				}
			}
			let tipoCambioSelected = undefined
			const clienteRS = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: factura.id_razon_social},include: ['cliente']})
			const cliente = clienteRS.cliente;
			if(parametros.tipoCambioManual !== null && parametros.tipoCambioManual !== undefined && parametros.tipoCambioManual !== "" && parseFloat(parametros.tipoCambioManual) > 0 && cliente.can_tc_manual == true){
				tipoCambioSelected = {
					tipo_cambio: parseFloat(parametros.tipoCambioManual)
				}
			}else{
				//Se obtiene el tipo de cambio del dia
				let fechaString = moment(registroPago.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DD')
				let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
			
				let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
				if(doit !== true){
					return doit
				}
				tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
				if(tipoCambioSelected == undefined){
					return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
				}
			}
			//Se carga el tipo de cambio dependiendo si se paga con mxn o usd
			dataTimbrado.pagos.pago[monedaCxc].TipoCambioP = monedaPago.clave.toLowerCase() == 'mxn' ? 1 : tipoCambioSelected.tipo_cambio
			//Si la moneda del pago es distinta a la moneda del documento relacionado se actualiza el valor de la equivalencia
			let equivalencia = 1
			if(monedaCxc != monedaPago.clave){
				//Si la moneda del documento relacionado es mxn la equivalencia es el tipo de cambio
				equivalencia = tipoCambioSelected.tipo_cambio
				if(monedaCxc != "MXN"){
					//Si la moneda del documento relacionado es usd la equivalencia es el 1 / tipo de cambio
					equivalencia = parseFloat((parseFloat((1 / tipoCambioSelected.tipo_cambio))).toFixed(8))
				}
			}
			//Se calcula el total del pago en la moneda del documento relacionado
			registro.total = parseFloat(registro.total)
			
			var totalPagoMonedaCxC = parseFloat((registro.total * equivalencia).toFixed(decimalesTotales))
			var pagoExcedenteCxC = 0
			if(totalPagoMonedaCxC > saldoCxC){
				pagoExcedenteCxC = parseFloat((totalPagoMonedaCxC - saldoCxC).toFixed(decimalesTotales))
				totalPagoMonedaCxC = parseFloat((parseFloat(saldoCxC)).toFixed(decimalesTotales))
				registroPago.pagoTotal = parseFloat(registroPago.pagoTotal) + totalPagoMonedaCxC
			}else{
				registroPago.pagoTotal = parseFloat(registroPago.pagoTotal) + parseFloat((registro.total).toFixed(decimales))
			}
			//Se calcula el nuevo saldo de la cuenta por cobrar
			const nuevoSaldoCxC = parseFloat((saldoCxC - parseFloat((totalPagoMonedaCxC).toFixed(decimalesTotales))).toFixed(decimales))
			
			//Se calcula el total de la factura relacionada a la cuenta por cobrar
			var subtotalFactura = 0
			var impuestoFactura = 0
			var descuentoFactura = 0
			const ImpuestosDR = []
			for(const detalle of factura.factura_detalles){
				subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0)
				impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0)
				descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0)
			}
			const totalFactura = parseFloat(parseFloat((subtotalFactura ?? 0) + (impuestoFactura ?? 0) - (descuentoFactura ?? 0)).toFixed(2))
			//Se calcula el porcentajePagado = valor pagado / valor factura
			porcentajePagado = parseFloat(parseFloat(totalPagoMonedaCxC).toFixed(2))/totalFactura > 1 ? 1 : parseFloat(parseFloat(totalPagoMonedaCxC).toFixed(2))/totalFactura
			
			if(metodoPago.clave.toLowerCase() == "pue"){
				if(porcentajePagado !== 1 && parseFloat(saldoCxC).toFixed(2) != totalPagoMonedaCxC){
					let saldoPorPagar = parseFloat(parseFloat(saldoCxC).toFixed(2))
					if(monedaPago.clave == "MXN" && monedaCxc == 'USD'){
						saldoPorPagar = parseFloat(parseFloat(parseFloat(parseFloat(saldoCxC).toFixed(2)) * tipoCambioSelected.tipo_cambio).toFixed(2))
					}
					return res.status(400).send({ status: false, cxc: cxc, saldoCxC: saldoPorPagar,  msg: "El metodo de pago es PUE, por lo cual el pago debe ser la totalidad del saldo de la cuenta por cobrar."});
				}
			}
			let totalBaseImporte = 0
			for(const detalle of factura.factura_detalles){
				const haveImpuesto = parseFloat(detalle.impuesto ?? 0) > 0;
				
				
				let baseDR = parseFloat(parseFloat(((parseFloat(detalle.subtotal ?? 0)) - (parseFloat(detalle.descuento ?? 0))) * porcentajePagado).toFixed(2))
				const impuestoDR = !haveImpuesto ? 0 : parseFloat(parseFloat(((parseFloat(detalle.impuesto ?? 0)) * porcentajePagado)).toFixed(2))
				const totalAux = parseFloat(parseFloat((((parseFloat(detalle.subtotal ?? 0)) - (parseFloat(detalle.descuento ?? 0))) * porcentajePagado) + ((parseFloat(detalle.impuesto ?? impuestoCertificado ?? 0)) * porcentajePagado)).toFixed(2))
				if(totalAux - (baseDR + impuestoDR) > 0){
					baseDR = parseFloat(parseFloat(baseDR + totalAux - (baseDR + impuestoDR)).toFixed(2))
				}
				totalBaseImporte = totalBaseImporte + (baseDR + impuestoDR)
				if(ImpuestosDR.length == 0){
					ImpuestosDR.push({
						BaseDR: parseFloat(parseFloat(baseDR)) ,
						ImpuestoDR: "002",
						TipoFactorDR: "Tasa",
						TasaOCuotaDR: impuestoDR > 0 ? "0.160000" :"0.000000",
						ImporteDR: parseFloat(parseFloat(impuestoDR)),
					})
				}else{
					var index = -1
					const tasaOCuotaDR = impuestoDR > 0 ? "0.160000" :"0.000000"
					for (let i = 0; i < ImpuestosDR.length; i++) {
						const impuestoDR = ImpuestosDR[i];
						if(impuestoDR.TasaOCuotaDR == tasaOCuotaDR){
							index = i;
						}
					}
					if(index >= 0){
						ImpuestosDR[index].BaseDR = ImpuestosDR[index].BaseDR + parseFloat(parseFloat(baseDR))
						ImpuestosDR[index].ImporteDR = ImpuestosDR[index].ImporteDR + parseFloat(parseFloat(impuestoDR))
					} else{
						ImpuestosDR.push({
							BaseDR: parseFloat(parseFloat(baseDR)),
							ImpuestoDR: "002",
							TipoFactorDR: "Tasa",
							TasaOCuotaDR: impuestoDR > 0 ? "0.160000" :"0.000000",
							ImporteDR: parseFloat(parseFloat(impuestoDR))
						})
					}
				}
			}
			if(parseFloat(parseFloat(porcentajePagado).toFixed(2)) == 1 ){
				if(totalPagoMonedaCxC - parseFloat(parseFloat(totalBaseImporte).toFixed(2)) > 0){
					ImpuestosDR[0].BaseDR = parseFloat(parseFloat(ImpuestosDR[0].BaseDR + (totalPagoMonedaCxC - (parseFloat(parseFloat(totalBaseImporte).toFixed(2))))).toFixed(2))
				}
			}
			for(const impuetoDR of ImpuestosDR){
				if(parseFloat(parseFloat(impuetoDR.BaseDR* 0.16).toFixed(2)) != impuetoDR.ImporteDR && impuetoDR.TasaOCuotaDR =="0.160000"){
					impuetoDR.ImporteDR = parseFloat(parseFloat(impuetoDR.BaseDR* 0.16).toFixed(2))
				}
			}
			const pagosFacturacionCxc = await db.sequelize.models.pagos_facturacion.findAll({where:{id_cuenta_por_cobrar: registro.id_cuenta_por_cobrar}})
			const numParcialidad = pagosFacturacionCxc.length +1
			dataTimbrado.pagos.pago[monedaCxc].DoctoRelacionados.push({
				IdDocumento: factura.id_cfdi !== null? factura.cfdi.folio_fiscal: '',
				MonedaDR: monedaCxc,
				EquivalenciaDR: equivalencia,
				NumParcialidad: numParcialidad,
				ImpSaldoAnt: parseFloat((saldoCxC).toFixed(decimalesTotales)),
				ImpPagado: parseFloat((totalPagoMonedaCxC).toFixed(decimalesTotales)),
				ImpSaldoInsoluto: parseFloat((nuevoSaldoCxC).toFixed(decimalesTotales)),
				ObjetoImpDR: '02',
				ImpuestosDR: ImpuestosDR
			})
			registro.saldo_anterior = parseFloat((saldoCxC).toFixed(decimalesTotales))
			registro.saldo_nuevo = parseFloat((nuevoSaldoCxC).toFixed(decimalesTotales))
			registro.monto = parseFloat((totalPagoMonedaCxC).toFixed(decimalesTotales))
			registro.parcialidad = numParcialidad
			registro.tipo_cambio = tipoCambioSelected.tipo_cambio
			registro.id_usuario_registro = req.usuario.id
			registro.total = undefined
			pagosFacturacionToSave.push(registro)
			if( parseFloat((pagoExcedenteCxC / equivalencia).toFixed(decimalesTotales)) > 0){
				const subtotalPagoSaldoAFavor = parseFloat((pagoExcedenteCxC / equivalencia).toFixed(decimalesTotales))
				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social:registroPago.id_razon_social}});
				saldosAFavor.push({
					pago:{
						createdAt: moment().tz('America/Mexico_City'),
						id_cuenta_bancaria_interna: registroPago.id_cuenta_bancaria_interna,
						id_moneda: registroPago.id_moneda,
						referencia: registroPago.referencia,
						fecha_pago: registroPago.fecha_pago,
						id_usuario_registro: registroPago.id_usuario_registro,
						id_marca: registroPago.id_marca,
						id_metodo_pago: registroPago.id_metodo_pago,
						id_razon_social: registroPago.id_razon_social,
						subtotal:  subtotalPagoSaldoAFavor,
						impuesto: 0
					},
					id_cliente: clienteRazonSocial.id_cliente
				})
			}
			for(const impuestoDR of ImpuestosDR){
				if(dataBase[monedaCxc] === undefined){
					dataBase[monedaCxc] = {
						base0: 0,
						base16: 0,
						impuesto16: 0,
						equivalencia: equivalencia
					}
				}
				if(ImpuestosP.length == 0){
					if(impuestoDR.ImporteDR == "0.000000"){
						dataBase[monedaCxc].base0 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
					}else{
						dataBase[monedaCxc].base16 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
						dataBase[monedaCxc].impuesto16 = parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2))
					}
					ImpuestosP.push({
						BaseP: parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)),
						ImpuestoP: "002",
						TipoFactorP: "Tasa",
						TasaOCuotaP: impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000",
						ImporteP: parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)),
						equivalencia: equivalencia,
						moneda: monedaCxc
					})
				}else{
					var index = -1
					const tasaOCuotaP = impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000"
					for (let i = 0; i < ImpuestosP.length; i++) {
						const impuestoP = ImpuestosP[i];
						if(impuestoP.TasaOCuotaP == tasaOCuotaP && impuestoP.moneda == monedaCxc){
							index = i;
						}
					}
					if(index >= 0){
						ImpuestosP[index].BaseP = ImpuestosP[index].BaseP + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
						ImpuestosP[index].ImporteP = ImpuestosP[index].ImporteP + (parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)))
						if(impuestoDR.ImporteDR == "0.000000"){
							dataBase[monedaCxc].base0 = dataBase[monedaCxc].base0 + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
						}else{
							dataBase[monedaCxc].base16 = dataBase[monedaCxc].base16 + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
							dataBase[monedaCxc].impuesto16 = dataBase[monedaCxc].impuesto16 + (parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)))
						}
					} else{
						if(impuestoDR.ImporteDR == "0.000000"){
							dataBase[monedaCxc].base0 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
						}else{
							dataBase[monedaCxc].base16 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
							dataBase[monedaCxc].impuesto16 = parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2))
						}
						ImpuestosP.push({
							BaseP: parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)),
							ImpuestoP: "002",
							TipoFactorP: "Tasa",
							TasaOCuotaP: impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000",
							ImporteP: parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)),
							equivalencia: equivalencia,
							moneda: monedaCxc
						})
					}
				}
			}
			contador = contador +1
			if(contador == cxcs.length){
				for(const key in dataBase){
					let montoAux = 0
					for(const docRel of dataTimbrado.pagos.pago[key].DoctoRelacionados){
						montoAux = montoAux + docRel.ImpPagado
					}
					if(monedaPago.clave == "USD"){
						dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(parseFloat((parseFloat((dataBase[key].base0)) + parseFloat((dataBase[key].base16)) + parseFloat((dataBase[key].impuesto16))))))
						dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(dataTimbrado.pagos.pago[key].Monto / dataBase[key].equivalencia).toFixed(2))
						if(dataTimbrado.pagos.pago[key].Monto != montoAux){
							dataTimbrado.pagos.pago[key].Monto = montoAux
						}
						dataTimbrado.pagos.totales.MontoTotalPagos = dataTimbrado.pagos.totales.MontoTotalPagos + dataTimbrado.pagos.pago[key].Monto
	
						dataBase[key].base16 = parseFloat(parseFloat(dataBase[key].base16 / dataBase[key].equivalencia).toFixed(2))
						dataBase[key].base0 = parseFloat(parseFloat(dataBase[key].base0 / dataBase[key].equivalencia).toFixed(2))
						dataBase[key].impuesto16 = parseFloat(parseFloat(dataBase[key].impuesto16 / dataBase[key].equivalencia).toFixed(2))
	
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataBase[key].base16
						dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 + dataBase[key].impuesto16
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataBase[key].base0
					}else{
						dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(parseFloat((parseFloat((dataBase[key].base0)) + parseFloat((dataBase[key].base16)) + parseFloat((dataBase[key].impuesto16))))))
						if(dataTimbrado.pagos.pago[key].Monto != montoAux){
							dataTimbrado.pagos.pago[key].Monto = montoAux
						}
						dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(dataTimbrado.pagos.pago[key].Monto / dataBase[key].equivalencia).toFixed(2))
						dataTimbrado.pagos.totales.MontoTotalPagos = dataTimbrado.pagos.totales.MontoTotalPagos + dataTimbrado.pagos.pago[key].Monto
	
						dataBase[key].base16 = parseFloat(parseFloat(dataBase[key].base16 / dataBase[key].equivalencia).toFixed(2))
						dataBase[key].base0 = parseFloat(parseFloat(dataBase[key].base0 / dataBase[key].equivalencia).toFixed(2))
						dataBase[key].impuesto16 = parseFloat(parseFloat(dataBase[key].impuesto16 / dataBase[key].equivalencia).toFixed(2))
	
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataBase[key].base16
						dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 + dataBase[key].impuesto16
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataBase[key].base0
					}
				}
				if(monedaPago.clave == "USD"){
                    const tipoCambio = tipoCambioSelected.tipo_cambio;
					
                    dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 * tipoCambio).toFixed(6)))
                    dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 * tipoCambio).toFixed(6)))
                    dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 * tipoCambio).toFixed(6)))
                    dataTimbrado.pagos.totales.MontoTotalPagos = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.MontoTotalPagos * tipoCambio).toFixed(6)))

                    dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16.toFixed(2))
                    dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16.toFixed(2))
                    dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0.toFixed(2))
                    dataTimbrado.pagos.totales.MontoTotalPagos = parseFloat(dataTimbrado.pagos.totales.MontoTotalPagos.toFixed(2))
				}
				const validMontoTotal = convert((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16), 1, decimalesTotales)
				const keys = Object.keys(dataTimbrado.pagos.pago)
				if(keys.length == 1){
					const key = keys[0]
					const montoPago = monedaPago.clave == "USD" ? parseFloat(parseFloat((Math.round(((dataTimbrado.pagos.pago[key].Monto * tipoCambioSelected.tipo_cambio) + Number.EPSILON) * 100) / 100)).toFixed(2)) : dataTimbrado.pagos.pago[key].Monto
					if(validMontoTotal != dataTimbrado.pagos.totales.MontoTotalPagos && (validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos + 0.01) || validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos - 0.01)) && dataTimbrado.pagos.totales.MontoTotalPagos != montoPago){
						dataTimbrado.pagos.totales.MontoTotalPagos = validMontoTotal
					}
				}else{
					if(validMontoTotal != dataTimbrado.pagos.totales.MontoTotalPagos && (validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos + 0.01) || validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos - 0.01))){
						dataTimbrado.pagos.totales.MontoTotalPagos = validMontoTotal
					}
				}
	
	
				const auxiliarTotalPago = convert((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16), 1, decimalesTotales)
				const auxiliarSubtotalPago = convert((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0), 1, decimalesTotales)
				const auxiliarImpuestoPago = convert((dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16), 1, decimalesTotales)
		
				const porcentajeSubtotal = (auxiliarSubtotalPago) / auxiliarTotalPago
				const porcentajeImpuesto = (auxiliarImpuestoPago) / auxiliarTotalPago
				registroPago.subtotal = convert((porcentajeSubtotal * registroPago.pagoTotal), 1, decimales)
				registroPago.impuesto = convert((porcentajeImpuesto * registroPago.pagoTotal), 1, decimales)
			}
		}
		const cuentaBancaria = await db.sequelize.models.cuentas_bancarias_internas.findByPk(registroPago.id_cuenta_bancaria_interna, { paranoid: false });
		if((marca.id_dato_facturacion != cuentaBancaria.id_datos_facturacion)){
			return res.status(400).send({ status: true, msg: "La cuenta bancaria seleccionada debe tener los mismos datos de facturación que la marca seleccionada."});
		}
		if(cuentaBancaria.caja_chica == true){
			return res.status(400).send({ status: true, msg: "La cuenta bancaria seleccionada no debe de ser caja chica."});
		}
		if(cuentaBancaria.id_moneda != registroPago.id_moneda){
			return res.status(400).send({ status: true, msg: "La moneda del pago debe coincidir con la moneda de la cuenta bancaria seleccionada."});
		}
		for(const impuestoP of ImpuestosP){
			if(dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP == undefined){
				dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP = []
			}
			impuestoP.BaseP = convert(impuestoP.BaseP, impuestoP.equivalencia, decimalesTotales)
			impuestoP.ImporteP = convert(impuestoP.ImporteP, impuestoP.equivalencia, decimalesTotales)
			dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP.push(impuestoP)
		}
		const nuevoRegistro = await db.sequelize.models.pagos.create(registroPago);
		for(const saldoAFavor of saldosAFavor){
			const pagosMarca = await db.sequelize.models.pagos.findAll({
				where: {
					id_marca: saldoAFavor.pago.id_marca
				},
				paranoid: false
			});
			const folio = marca.clave + "-" + (pagosMarca.length + 1)
			saldoAFavor.pago.folio = folio
			const pagoSaldoAFavor = await db.sequelize.models.pagos.create(saldoAFavor.pago);
			const registroSaldoAFavor = {
				createdAt: moment().tz('America/Mexico_City'),
				id_cliente: saldoAFavor.id_cliente,
				id_pago: pagoSaldoAFavor.id,
				monto: saldoAFavor.pago.subtotal,
				id_usuario_registro: registroPago.id_usuario_registro
			}
			await db.sequelize.models.clientes_saldos_a_favor.create(registroSaldoAFavor);
		}
		
		for(const pagoFacturacion of pagosFacturacionToSave){
			pagoFacturacion.id_pago = nuevoRegistro.id
			await db.sequelize.models.pagos_facturacion.create(pagoFacturacion);
			const datosUpdateCxC = {
				saldo: parseFloat((parseFloat(pagoFacturacion.saldo_nuevo)).toFixed(2)),
				updatedAt: moment().tz('America/Mexico_City')
			}
			const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(pagoFacturacion.id_cuenta_por_cobrar);
			await cXc.update(datosUpdateCxC, { where: { id: cXc.id } });
		}
		const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(registroPago.id_razon_social, { include:['regimen_fiscal','uso_cfdi','forma_pago','metodo_pago','nacionalidad_timbrado'],paranoid: false });
		const alertasTimbrado = []
		if(razonSocialReceptor.nacionalidad_timbrado.clave.toLowerCase() == 'mx' && metodoPago.clave.toLowerCase() == "ppd" && /*fechaValidaTimbrar &&*/ marca.pais.clave.toLowerCase() == "mx"){
			for(const cxc of cxcs){
				const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(cxc.idCuentaPorCobrar);
				const factura = await db.sequelize.models.facturas.findByPk(cXc.id_factura, { include:['moneda','factura_detalles','cfdi'] });

				if(factura.id_cfdi == null && (factura.id_marca == 3 || factura.id_marca == 17)){
					return res.status(400).send({ validado: false, msg: "El pago no puede ser generado. La factura con referencia " + factura.referencia + " no se encuentra timbrada." });
				}
			}
			const { getDataDoc, timbrarPago } = require('./cfdis.controller')
			const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['regimen_fiscal'],paranoid: false });
			const findRelaciones = new Relaciones(['estado.pais.continente'],['estado.pais.continente'],db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			const dataRazonSocial = await db.sequelize.models.razones_sociales_domicilios.findOne({ where:{id_razon_social:registroPago.id_razon_social, tipo: 'F'}, include:['domicilio'],paranoid: false });
			const domicilioFiscalReceptor = await db.sequelize.models.domicilios.findByPk(dataRazonSocial.domicilio.id,{include: relaciones})
			var emisor = undefined;
			var receptor = undefined;
			const env = process.env.NODE_ENV;
			var cer
			var key
			var password
			if((env == 'development' || env == 'test')){
				emisor = {
					rfc: 'EKU9003173C9',
					nombre: 'ESCUELA KEMPER URGATE',
					regimenFiscal: '601',
				}
				receptor = {
					rfc: 'MASO451221PM4',
					nombre: 'MARIA OLIVIA MARTINEZ SAGAZ',
					domicilioFiscal: '80290',
					regimenFiscal: '612',
					usoCFDI: 'S01',
				}
				password = '12345678a'
				cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
				key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
			} else{
				emisor = {
					rfc: datoFacturacionEmisor.no_identificacion,
					nombre: datoFacturacionEmisor.razon_social,
					regimenFiscal: datoFacturacionEmisor.regimen_fiscal.clave,
				}
				receptor = {
					rfc: razonSocialReceptor.no_identificacion,
					nombre: razonSocialReceptor.razon_social,
					domicilioFiscal: domicilioFiscalReceptor.codigo_postal,
					regimenFiscal: razonSocialReceptor.regimen_fiscal.clave,
					usoCFDI: razonSocialReceptor.uso_cfdi.clave
				}
				cer = datoFacturacionEmisor.cer
				key = datoFacturacionEmisor.key
				password = datoFacturacionEmisor.password
			}
			dataTimbrado.certificado = {
				cer:cer,
				key:key,
				password: password,
				folio: registroPago.folio,
				lugarExpedicion: marca.domicilio.codigo_postal,
				tipoDeComprobante: "P"
			}
			dataTimbrado.emisor = emisor
			dataTimbrado.receptor = receptor
			dataTimbrado.env = env
			const getCFdi = await timbrarPago(dataTimbrado,nuevoRegistro.id,req.usuario,razonSocialReceptor,true)
			if(getCFdi.validado === false){
				sendMailErrorTimbradoPago(nuevoRegistro.id, getCFdi.msg)
				alertasTimbrado.push(getCFdi.msg)
			}
		}else{
			//if(!fechaValidaTimbrar){
			//	alertasTimbrado.push('Recuerda que el CFDI con complemento para la recepción de pagos debe emitirse a más tardar el quinto día natural del mes siguiente al que se recibió el pago.')
			//}
			if(!(razonSocialReceptor.nacionalidad_timbrado.clave.toLowerCase() == 'mx')){
				alertasTimbrado.push('La nacionalidad de timbrado de la razón social ligada al pago debe ser mexicana para timbrarlo.')
			}
			if(!(metodoPago.clave.toLowerCase() == "ppd")){
				alertasTimbrado.push('El pago no se timbra porque hay facturas con método de pago en PUE.')
			}
			if(!(marca.pais.clave.toLowerCase() == "mx")){
				alertasTimbrado.push('El país de la marca ligada al pago debe ser mexicana para timbrarlo.')
			}
		}
		sendMailPago(nuevoRegistro.id, req.usuario,[])
		const respuesta = { status: true, msg: "Elemento registrado correctamente", data:{id:nuevoRegistro.id}}
		respuesta.warnings = alertasTimbrado
		return res.status(200).send(respuesta);	
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	}
	
}

async function reTimbrarPago(req, res){
	try {
		const { id } = req.params;
		const parametros = req.body;
		if(!Number.isInteger(parseInt(id))){
			return res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		} 
		if(!Number.isInteger(parseInt(req.body.idFormaPago))){
			return res.status(400).send({status:false , msg: `El parametro idFormaPago debe ser int.` });
		} 
		const formaPago = await db.sequelize.models.formas_pago.findByPk(req.body.idFormaPago,{ paranoid: false });
		if(formaPago == null){
			return res.status(400).send({status:false , msg: `El registro idFormaPago: ${req.body.idFormaPago} no existe.` });
		}
		const parametrosRelaciones = [ 
			'cfdi.uso_cfdi',
			'cfdi.metodo_pago',
			'cfdi.forma_pago',
			'cfdi.motivo_cancelacion',
			'cuenta_bancaria_interna.moneda',
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
			'metodo_pago',
			'razon_social.pais.continente', 
			'razon_social.uso_cfdi',
			'razon_social.metodo_pago',
			'razon_social.forma_pago',
			'razon_social.razon_bloqueo',
			'razon_social.regimen_fiscal',
			'razon_social.moneda_credito' 
		]
		const findRelaciones = new Relaciones(parametrosRelaciones,parametrosRelaciones,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const pago = await db.sequelize.models.pagos.findByPk(id, {include:relaciones,paranoid: false});
		if(pago.cfdi != null){
			return res.status(400).send({ validado: false, msg: "El pago ya fue timbrado" });
		}


		const fechaPago = moment(pago.fecha_pago).tz('America/Mexico_City');
		const fechaLimiteTimbrado = fechaPago.clone().add(1, 'month').date(5).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }); 
		const now = moment().tz('America/Mexico_City')
		const fechaValidaTimbrar = now <= fechaLimiteTimbrado

		const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(pago.id_razon_social, { include:['regimen_fiscal','uso_cfdi','forma_pago','metodo_pago','nacionalidad_timbrado'],paranoid: false });
		if(razonSocialReceptor.nacionalidad_timbrado.clave.toLowerCase() == 'mx' && pago.metodo_pago.clave.toLowerCase() == "ppd" && /*fechaValidaTimbrar &&*/ pago.marca.pais.clave.toLowerCase() == "mx"){
			const { getDataDoc, timbrarPago } = require('./cfdis.controller')
			const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(pago.marca.id_dato_facturacion, { include:['regimen_fiscal'],paranoid: false });
			const findRelaciones = new Relaciones(['estado.pais.continente'],['estado.pais.continente'],db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			const dataRazonSocial = await db.sequelize.models.razones_sociales_domicilios.findOne({ where:{id_razon_social:pago.id_razon_social, tipo: 'F'}, include:['domicilio'],paranoid: false });
			const domicilioFiscalReceptor = await db.sequelize.models.domicilios.findByPk(dataRazonSocial.domicilio.id,{include: relaciones})
			
			const pagosFacturacion = await db.sequelize.models.pagos_facturacion.findAll({where:{id_pago:pago.id}, paranoid: false })
			if(pagosFacturacion.length < 1){
				return res.status(400).send({ status: false, msg: `El pago no tiene documentos relacionados`});
			}

			const decimales = 6
			const decimalesTotales = 2
			const monedaPago = pago.moneda
			const metodoPago = pago.metodo_pago
			const dataTimbrado = {
				pagos:{
					pago: {},
					totales: {
						TotalTrasladosBaseIVA16: 0,
						TotalTrasladosImpuestoIVA16: 0,
						TotalTrasladosBaseIVA0: 0,
						TotalTrasladosImpuestoIVA0: 0,
						MontoTotalPagos: 0
					}
				}
			}
			const marca = pago.marca
			var porcentajePagado
			const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(pago.id_razon_social, { include:['regimen_fiscal','uso_cfdi','forma_pago','metodo_pago','nacionalidad_timbrado'],paranoid: false });
			const ImpuestosP = []
			const ImpuestosPSave = []
			let contador = 0
			const dataBase = {}


			for(const pagoFacturacion of pagosFacturacion){
				const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(pagoFacturacion.id_cuenta_por_cobrar);
				const factura = await db.sequelize.models.facturas.findByPk(cXc.id_factura, { include:['moneda','factura_detalles','cfdi'] });
				if(factura.id_cfdi == null){
					return res.status(400).send({ validado: false, msg: "El pago no puede ser timbrado. La factura con referencia " + factura.referencia + " no se encuentra timbrada." });
				}
				const saldoCxC = parseFloat(pagoFacturacion.saldo_anterior)
				const monedaCxc = factura.moneda.clave
				if(dataTimbrado.pagos.pago[monedaCxc] === undefined){
					dataTimbrado.pagos.pago[monedaCxc] = {
						FechaPago: moment(pago.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DDTHH:mm:ss'),
						FormaDePagoP: formaPago.clave,
						MonedaP: monedaPago.clave,
						TipoCambioP: 1,
						Monto: 0,
						DoctoRelacionados:[],
					}
				}
				let tipoCambioSelected = undefined
				const clienteRS = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: factura.id_razon_social},include: ['cliente']})
				const cliente = clienteRS.cliente;
				if(parametros.tipoCambioManual !== null && parametros.tipoCambioManual !== undefined && parametros.tipoCambioManual !== "" && parseFloat(parametros.tipoCambioManual) > 0 && cliente.can_tc_manual == true){
					tipoCambioSelected = {
						tipo_cambio: parseFloat(parametros.tipoCambioManual)
					}
				}else{
					//Se obtiene el tipo de cambio del dia
					let fechaString = moment(pago.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DD')
					let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
				
					let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
					if(doit !== true){
						return doit
					}
					tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
					if(tipoCambioSelected == undefined){
						return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
					}
				}
				//Se carga el tipo de cambio dependiendo si se paga con mxn o usd
				dataTimbrado.pagos.pago[monedaCxc].TipoCambioP = monedaPago.clave.toLowerCase() == 'mxn' ? 1 : tipoCambioSelected.tipo_cambio
				//Si la moneda del pago es distinta a la moneda del documento relacionado se actualiza el valor de la equivalencia
				let equivalencia = 1
				if(monedaCxc != monedaPago.clave){
					//Si la moneda del documento relacionado es mxn la equivalencia es el tipo de cambio
					equivalencia = tipoCambioSelected.tipo_cambio
					if(monedaCxc != "MXN"){
						//Si la moneda del documento relacionado es usd la equivalencia es el 1 / tipo de cambio
						equivalencia = parseFloat((parseFloat((1 / tipoCambioSelected.tipo_cambio))).toFixed(8))
					}
				}
				//Se calcula el total del pago en la moneda del documento relacionado
				const total = parseFloat(pagoFacturacion.monto)
				
				var totalPagoMonedaCxC = total
				if(totalPagoMonedaCxC > saldoCxC && saldoCxC > 0){
					totalPagoMonedaCxC = parseFloat((parseFloat(saldoCxC)).toFixed(decimalesTotales))
				}
				//Se calcula el nuevo saldo de la cuenta por cobrar
				const nuevoSaldoCxC = parseFloat(pagoFacturacion.saldo_nuevo)
				
				//Se calcula el total de la factura relacionada a la cuenta por cobrar
				var subtotalFactura = 0
				var impuestoFactura = 0
				var descuentoFactura = 0
				const ImpuestosDR = []
				for(const detalle of factura.factura_detalles){
					subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0)
					impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0)
					descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0)
				}
				const totalFactura = parseFloat(parseFloat(subtotalFactura + impuestoFactura - descuentoFactura).toFixed(2))
				
				//Se calcula el porcentajePagado = valor pagado / valor factura
				porcentajePagado = parseFloat(parseFloat(totalPagoMonedaCxC).toFixed(2))/totalFactura > 1 ? 1 : parseFloat(parseFloat(totalPagoMonedaCxC).toFixed(2))/totalFactura
				if(metodoPago.clave.toLowerCase() == "pue"){
					if(porcentajePagado !== 1 && parseFloat(saldoCxC).toFixed(2) != totalPagoMonedaCxC){
						return res.status(400).send({ status: false, cxc: pagoFacturacion.id_cuenta_por_cobrar, saldoCxC: parseFloat(parseFloat(saldoCxC).toFixed(2)),  msg: "El metodo de pago es PUE, por lo cual el pago debe ser la totalidad del saldo de la cuenta por cobrar."});
					}
				}
				let totalBaseImporte = 0
				for(const detalle of factura.factura_detalles){
					const haveImpuesto = parseFloat(detalle.impuesto ?? 0) > 0;
					
					
					let baseDR = parseFloat(parseFloat(((parseFloat(detalle.subtotal ?? 0)) - (parseFloat(detalle.descuento ?? 0))) * porcentajePagado).toFixed(2))
					const impuestoDR = !haveImpuesto ? 0 : parseFloat(parseFloat(((parseFloat(detalle.impuesto ?? 0)) * porcentajePagado)).toFixed(2))
					const totalAux = parseFloat(parseFloat((((parseFloat(detalle.subtotal ?? 0)) - (parseFloat(detalle.descuento ?? 0))) * porcentajePagado) + ((parseFloat(detalle.impuesto ?? impuestoCertificado)) * porcentajePagado)).toFixed(2))
					if(totalAux - (baseDR + impuestoDR) > 0){
						baseDR = parseFloat(parseFloat(baseDR + totalAux - (baseDR + impuestoDR)).toFixed(2))
					}
					totalBaseImporte = totalBaseImporte + (baseDR + impuestoDR)
					if(ImpuestosDR.length == 0){
						ImpuestosDR.push({
							BaseDR: parseFloat(parseFloat(baseDR)) ,
							ImpuestoDR: "002",
							TipoFactorDR: "Tasa",
							TasaOCuotaDR: impuestoDR > 0 ? "0.160000" :"0.000000",
							ImporteDR: parseFloat(parseFloat(impuestoDR)),
						})
					}else{
						var index = -1
						const tasaOCuotaDR = impuestoDR > 0 ? "0.160000" :"0.000000"
						for (let i = 0; i < ImpuestosDR.length; i++) {
							const impuestoDR = ImpuestosDR[i];
							if(impuestoDR.TasaOCuotaDR == tasaOCuotaDR){
								index = i;
							}
						}
						if(index >= 0){
							ImpuestosDR[index].BaseDR = ImpuestosDR[index].BaseDR + parseFloat(parseFloat(baseDR))
							ImpuestosDR[index].ImporteDR = ImpuestosDR[index].ImporteDR + parseFloat(parseFloat(impuestoDR))
						} else{
							ImpuestosDR.push({
								BaseDR: parseFloat(parseFloat(baseDR)),
								ImpuestoDR: "002",
								TipoFactorDR: "Tasa",
								TasaOCuotaDR: impuestoDR > 0 ? "0.160000" :"0.000000",
								ImporteDR: parseFloat(parseFloat(impuestoDR))
							})
						}
					}
				}
				if(parseFloat(parseFloat(porcentajePagado).toFixed(2)) == 1 ){
					if(totalPagoMonedaCxC - parseFloat(parseFloat(totalBaseImporte).toFixed(2)) > 0){
						ImpuestosDR[0].BaseDR = parseFloat(parseFloat(ImpuestosDR[0].BaseDR + (totalPagoMonedaCxC - (parseFloat(parseFloat(totalBaseImporte).toFixed(2))))).toFixed(2))
					}
				}
				for(const impuetoDR of ImpuestosDR){
					if(parseFloat(parseFloat(impuetoDR.BaseDR* 0.16).toFixed(2)) != impuetoDR.ImporteDR && impuetoDR.TasaOCuotaDR =="0.160000"){
						impuetoDR.ImporteDR = parseFloat(parseFloat(impuetoDR.BaseDR* 0.16).toFixed(2))
					}
				}
				
				const numParcialidad = pagoFacturacion.parcialidad
				dataTimbrado.pagos.pago[monedaCxc].DoctoRelacionados.push({
					IdDocumento: factura.id_cfdi !== null? factura.cfdi.folio_fiscal: '',
					MonedaDR: monedaCxc,
					EquivalenciaDR: equivalencia,
					NumParcialidad: numParcialidad,
					ImpSaldoAnt: parseFloat(pagoFacturacion.saldo_anterior),
					ImpPagado: parseFloat(pagoFacturacion.monto),
					ImpSaldoInsoluto: parseFloat(pagoFacturacion.saldo_nuevo),
					ObjetoImpDR: '02',
					ImpuestosDR: ImpuestosDR
				})
				for(const impuestoDR of ImpuestosDR){
					if(dataBase[monedaCxc] === undefined){
						dataBase[monedaCxc] = {
							base0: 0,
							base16: 0,
							impuesto16: 0,
							equivalencia: equivalencia
						}
					}
					if(ImpuestosP.length == 0){
						if(impuestoDR.ImporteDR == "0.000000"){
							dataBase[monedaCxc].base0 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
						}else{
							dataBase[monedaCxc].base16 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
							dataBase[monedaCxc].impuesto16 = parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2))
						}
						ImpuestosP.push({
							BaseP: parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)),
							ImpuestoP: "002",
							TipoFactorP: "Tasa",
							TasaOCuotaP: impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000",
							ImporteP: parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)),
							equivalencia: equivalencia,
							moneda: monedaCxc
						})
					}else{
						var index = -1
						const tasaOCuotaP = impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000"
						for (let i = 0; i < ImpuestosP.length; i++) {
							const impuestoP = ImpuestosP[i];
							if(impuestoP.TasaOCuotaP == tasaOCuotaP && impuestoP.moneda == monedaCxc){
								index = i;
							}
						}
						if(index >= 0){
							ImpuestosP[index].BaseP = ImpuestosP[index].BaseP + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
							ImpuestosP[index].ImporteP = ImpuestosP[index].ImporteP + (parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)))
							if(impuestoDR.ImporteDR == "0.000000"){
								dataBase[monedaCxc].base0 = dataBase[monedaCxc].base0 + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
							}else{
								dataBase[monedaCxc].base16 = dataBase[monedaCxc].base16 + (parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)))
								dataBase[monedaCxc].impuesto16 = dataBase[monedaCxc].impuesto16 + (parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)))
							}
						} else{
							if(impuestoDR.ImporteDR == "0.000000"){
								dataBase[monedaCxc].base0 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
							}else{
								dataBase[monedaCxc].base16 = parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2))
								dataBase[monedaCxc].impuesto16 = parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2))
							}
							ImpuestosP.push({
								BaseP: parseFloat(parseFloat(impuestoDR.BaseDR).toFixed(2)),
								ImpuestoP: "002",
								TipoFactorP: "Tasa",
								TasaOCuotaP: impuestoDR.ImporteDR > 0 ? "0.160000" :"0.000000",
								ImporteP: parseFloat(parseFloat(impuestoDR.ImporteDR).toFixed(2)),
								equivalencia: equivalencia,
								moneda: monedaCxc
							})
						}
					}
				}
				contador = contador +1
				if(contador == pagosFacturacion.length){
					for(const key in dataBase){
						let montoAux = 0
						for(const docRel of dataTimbrado.pagos.pago[key].DoctoRelacionados){
							montoAux = montoAux + docRel.ImpPagado
						}
						if(monedaPago.clave == "USD"){
							dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(parseFloat((parseFloat((dataBase[key].base0)) + parseFloat((dataBase[key].base16)) + parseFloat((dataBase[key].impuesto16))))))
							dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(dataTimbrado.pagos.pago[key].Monto / dataBase[key].equivalencia).toFixed(2))
							if(dataTimbrado.pagos.pago[key].Monto != montoAux){
								dataTimbrado.pagos.pago[key].Monto = montoAux
							}
							dataTimbrado.pagos.totales.MontoTotalPagos = dataTimbrado.pagos.totales.MontoTotalPagos + dataTimbrado.pagos.pago[key].Monto
		
							dataBase[key].base16 = parseFloat(parseFloat(dataBase[key].base16 / dataBase[key].equivalencia).toFixed(2))
							dataBase[key].base0 = parseFloat(parseFloat(dataBase[key].base0 / dataBase[key].equivalencia).toFixed(2))
							dataBase[key].impuesto16 = parseFloat(parseFloat(dataBase[key].impuesto16 / dataBase[key].equivalencia).toFixed(2))
		
							dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataBase[key].base16
							dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 + dataBase[key].impuesto16
							dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataBase[key].base0
						}else{
							dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(parseFloat((parseFloat((dataBase[key].base0)) + parseFloat((dataBase[key].base16)) + parseFloat((dataBase[key].impuesto16))))))
							if(dataTimbrado.pagos.pago[key].Monto != montoAux){
								dataTimbrado.pagos.pago[key].Monto = montoAux
							}
							dataTimbrado.pagos.pago[key].Monto = parseFloat(parseFloat(dataTimbrado.pagos.pago[key].Monto / dataBase[key].equivalencia).toFixed(2))
							dataTimbrado.pagos.totales.MontoTotalPagos = dataTimbrado.pagos.totales.MontoTotalPagos + dataTimbrado.pagos.pago[key].Monto
		
							dataBase[key].base16 = parseFloat(parseFloat(dataBase[key].base16 / dataBase[key].equivalencia).toFixed(2))
							dataBase[key].base0 = parseFloat(parseFloat(dataBase[key].base0 / dataBase[key].equivalencia).toFixed(2))
							dataBase[key].impuesto16 = parseFloat(parseFloat(dataBase[key].impuesto16 / dataBase[key].equivalencia).toFixed(2))
		
							dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataBase[key].base16
							dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 + dataBase[key].impuesto16
							dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataBase[key].base0
						}
					}
					if(monedaPago.clave == "USD"){
						const tipoCambio = tipoCambioSelected.tipo_cambio;
						
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 * tipoCambio).toFixed(6)))
						dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 * tipoCambio).toFixed(6)))
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 * tipoCambio).toFixed(6)))
						dataTimbrado.pagos.totales.MontoTotalPagos = roundToTwoDecimals(parseFloat((dataTimbrado.pagos.totales.MontoTotalPagos * tipoCambio).toFixed(6)))

						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16.toFixed(2))
						dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16.toFixed(2))
						dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 = parseFloat(dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0.toFixed(2))
						dataTimbrado.pagos.totales.MontoTotalPagos = parseFloat(dataTimbrado.pagos.totales.MontoTotalPagos.toFixed(2))
					}
					const validMontoTotal = convert((dataTimbrado.pagos.totales.TotalTrasladosBaseIVA16 + dataTimbrado.pagos.totales.TotalTrasladosBaseIVA0 + dataTimbrado.pagos.totales.TotalTrasladosImpuestoIVA16), 1, decimalesTotales)
					const keys = Object.keys(dataTimbrado.pagos.pago)
					if(keys.length == 1){
						const key = keys[0]
						const montoPago = monedaPago.clave == "USD" ? parseFloat(parseFloat((Math.round(((dataTimbrado.pagos.pago[key].Monto * tipoCambioSelected.tipo_cambio) + Number.EPSILON) * 100) / 100)).toFixed(2)) : dataTimbrado.pagos.pago[key].Monto
						if((validMontoTotal != dataTimbrado.pagos.totales.MontoTotalPagos && (validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos + 0.01) || validMontoTotal == (dataTimbrado.pagos.totales.MontoTotalPagos - 0.01))  && dataTimbrado.pagos.totales.MontoTotalPagos != montoPago)){
							dataTimbrado.pagos.totales.MontoTotalPagos = validMontoTotal
						}
					}

				}
			}
			for(const impuestoP of ImpuestosP){
				if(dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP == undefined){
					dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP = []
				}
				impuestoP.BaseP = convert(impuestoP.BaseP, impuestoP.equivalencia, decimalesTotales)
				impuestoP.ImporteP = convert(impuestoP.ImporteP, impuestoP.equivalencia, decimalesTotales)
				dataTimbrado.pagos.pago[impuestoP.moneda].ImpuestosP.push(impuestoP)
			}

			var emisor = undefined;
			var receptor = undefined;
			const env = process.env.NODE_ENV;
			var cer
			var key
			var password
			if((env == 'development' || env == 'test')){
				emisor = {
					rfc: 'EKU9003173C9',
					nombre: 'ESCUELA KEMPER URGATE',
					regimenFiscal: '601',
				}
				receptor = {
					rfc: 'MASO451221PM4',
					nombre: 'MARIA OLIVIA MARTINEZ SAGAZ',
					domicilioFiscal: '80290',
					regimenFiscal: '612',
					usoCFDI: 'S01',
				}
				password = '12345678a'
				cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
				key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
			} else{
				emisor = {
					rfc: datoFacturacionEmisor.no_identificacion,
					nombre: datoFacturacionEmisor.razon_social,
					regimenFiscal: datoFacturacionEmisor.regimen_fiscal.clave,
				}
				receptor = {
					rfc: razonSocialReceptor.no_identificacion,
					nombre: razonSocialReceptor.razon_social,
					domicilioFiscal: domicilioFiscalReceptor.codigo_postal,
					regimenFiscal: razonSocialReceptor.regimen_fiscal.clave,
					usoCFDI: razonSocialReceptor.uso_cfdi.clave
				}
				cer = datoFacturacionEmisor.cer
				key = datoFacturacionEmisor.key
				password = datoFacturacionEmisor.password
			}
			dataTimbrado.certificado = {
				cer:cer,
				key:key,
				password: password,
				folio: pago.folio,
				lugarExpedicion: marca.domicilio.codigo_postal,
				tipoDeComprobante: "P"
			}
			dataTimbrado.emisor = emisor
			dataTimbrado.receptor = receptor
			dataTimbrado.env = env


			try {
				const getCFdi = await timbrarPago(dataTimbrado,pago.id,req.usuario,razonSocialReceptor,true)
				if(getCFdi.validado == true){
					return res.status(200).send({ validado: true, msg: "Pago timbrado" });
				}else{
					return res.status(400).send(getCFdi);
				}
			} catch (error) {
				return res.status(400).send({ status: false, msg: error.toString()});
			}
		} else{
			const alertasTimbrado = []
			//if(!fechaValidaTimbrar){
			//	alertasTimbrado.push('Recuerda que el CFDI con complemento para la recepción de pagos debe emitirse a más tardar el quinto día natural del mes siguiente al que se recibió el pago.')
			//}
			if(!(razonSocialReceptor.nacionalidad_timbrado.clave.toLowerCase() == 'mx')){
				alertasTimbrado.push('La nacionalidad de timbrado de la razón social ligada al pago debe ser mexicana para timbrarlo.')
			}
			if(!(pago.metodo_pago.clave.toLowerCase() == "ppd")){
				alertasTimbrado.push('El pago no se timbra porque hay facturas con método de pago en PUE.')
			}
			if(!(pago.marca.pais.clave.toLowerCase() == "mx")){
				alertasTimbrado.push('El país de la marca ligada al pago debe ser mexicana para timbrarlo.')
			}
			return res.status(400).send({ validado: false, msg: "El pago no requiere timbrado", warnings: alertasTimbrado });
		}
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	}
}

function roundToTwoDecimals(value) {
  return Number(Math.round(value + 'e+2') + 'e-2');
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['cfdi','cuenta_bancaria_interna', 'marca', 'moneda', 'metodo_pago', 'pagos_facturacion', 'razon_social', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cfdi: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion'
				],
				cuenta_bancaria_interna: [ 
					'cuenta_bancaria_interna.moneda',
					'cuenta_bancaria_interna.entidad_bancaria',
					'cuenta_bancaria_interna.dato_facturacion.pais.continente',
					'cuenta_bancaria_interna.dato_facturacion.nacionalidad_timbrado.continente',
					'cuenta_bancaria_interna.dato_facturacion.regimen_fiscal'
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
				razon_social: [ 
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito' 
				],
				all: [ 
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'cuenta_bancaria_interna.moneda',
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
					'metodo_pago',
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito' 
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.pagos.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 'domicilio.estado.pais.continente' ]
				const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones()
				const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.cuenta_bancaria_interna.dato_facturacion.id}, include:relacionesDomicilios})
				const domicilios = []
				for(const domicilio of domiciliosData){
					const e = domicilio.domicilio.toJSON()
					e.tipo = domicilio.tipo
					e.usuario_registro = undefined
					domicilios.push(e)
				}
				element.cuenta_bancaria_interna.dato_facturacion.domicilios = domicilios
				const listPagos = [
					'cuenta_por_cobrar.factura.marca.domicilio.estado',
					'cuenta_por_cobrar.factura.marca.pais',
					'cuenta_por_cobrar.factura.razon_social.pais.continente', 
					'cuenta_por_cobrar.factura.razon_social.uso_cfdi',
					'cuenta_por_cobrar.factura.razon_social.metodo_pago',
					'cuenta_por_cobrar.factura.razon_social.forma_pago',
					'cuenta_por_cobrar.factura.razon_social.razon_bloqueo',
					'cuenta_por_cobrar.factura.razon_social.regimen_fiscal',
					'cuenta_por_cobrar.factura.moneda',
					'cuenta_por_cobrar.factura.cfdi',
					'cuenta_por_cobrar.factura.oficina',
					'cuenta_por_cobrar.factura.factura_detalles.pedido_factura.certificado',
					'cuenta_por_cobrar.factura.factura_detalles.producto',
				]
				const findRelacionesPagos = new Relaciones(listPagos,listPagos,db.sequelize.models)
				const relacionesPagos =  await findRelacionesPagos.getRelaciones()
				element.pagos_facturacion = await db.sequelize.models.pagos_facturacion.findAll({where:{id_pago: element.id}, include:relacionesPagos})
				const archivos = await db.sequelize.models.pagos_archivos.findAll({where:{id_pago:element.id},include: ['archivo']})
				element.archivos = []
				for(const archivo of archivos){
					const data = archivo.toJSON()
					data.id_pago_archivo = data.id
					data.id = undefined
					data.id_carga_archivo = undefined
					data.id_pago = undefined
					data.id_usuario_registro = undefined
					data.createdAt = undefined
					data.updatedAt = undefined
					data.deletedAt = undefined
					element.archivos.push(data)
				}
				const clientes = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: element.id_razon_social},include: ['cliente']})
				if(clientes == null){
					element.cliente = null;
				}else{
					element.cliente = clientes.cliente;
				}
			}
			return res.status(200).send({ status: true, data: element});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function getXML(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {

		const registroEncontrado = await db.sequelize.models.pagos.findByPk(id, {include:['cfdi'],paranoid: false});
		if(registroEncontrado != null){
			if(registroEncontrado.id_cfdi !== null){
				return res.status(200).send({ status: true, data: registroEncontrado.cfdi.xml});
			}
			return res.status(400).send({ status: false, msg: "El registro no cuenta con cfdi" });
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
		const registroAEliminar = await db.sequelize.models.pagos.findByPk(id);
		if(registroAEliminar != null){
			const archivos = await db.sequelize.models.pagos_archivos.findAll({where: {id_pago:id}});
			for(const archivo of archivos){
				await archivo.destroy({ where: { id: archivo.id } })
			}
			let canDelete = true
			let pagosPosterirores = false
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.pagos.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(modelo.name == "pagos_facturacion"){
								for(const encontrado of encontrados){
									let pagosGenerados = await modelo.findAll({ where: {id_cuenta_por_cobrar:encontrado.id_cuenta_por_cobrar} });
									if(encontrado.parcialidad < pagosGenerados.length){
										canDelete = false
										pagosPosterirores = true
										modelosUtilizados.push(modelo.name)
									}
									const cXc = await db.sequelize.models.cuentas_por_cobrar.findByPk(encontrado.id_cuenta_por_cobrar);
									const datosUpdateCxC = {
										saldo: parseFloat((parseFloat(parseFloat(cXc.saldo) + parseFloat(encontrado.monto))).toFixed(2)) ,
										updatedAt: moment().tz('America/Mexico_City')
									}
									await cXc.update(datosUpdateCxC, { where: { id: cXc.id } });
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
			if(registroAEliminar.id_cfdi !== null){
				const { cancelarPago } = require('./cfdis.controller')
				const cancelarPagoData = await cancelarPago(id)
				if(cancelarPagoData.status != true){
					return res.status(400).send(cancelarPagoData);
				}
			}
			await registroAEliminar.destroy({ where: { id: id } })
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

function convert(cantidad, tipoCambio, decimales){
	return parseFloat((parseFloat(cantidad / tipoCambio)).toFixed(decimales))	
}

async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.pagos.rawAttributes);
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
					'cfdi.uso_cfdi',
					'cfdi.metodo_pago',
					'cfdi.forma_pago',
					'cfdi.motivo_cancelacion',
					'cuenta_bancaria_interna.moneda',
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
					'metodo_pago',
					'razon_social.pais.continente', 
					'razon_social.uso_cfdi',
					'razon_social.metodo_pago',
					'razon_social.forma_pago',
					'razon_social.razon_bloqueo',
					'razon_social.regimen_fiscal',
					'razon_social.moneda_credito' 
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}
		
		const docs = await db.sequelize.models.pagos.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		})

		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			const listRel = [ 'domicilio.estado.pais.continente' ];
			const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models);
			const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones();
			const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.cuenta_bancaria_interna.dato_facturacion.id}, include:relacionesDomicilios});
			const domicilios = [];
			for(const domicilio of domiciliosData){
				const e = domicilio.domicilio.toJSON();
				e.tipo = domicilio.tipo;
				e.usuario_registro = undefined;
				domicilios.push(e);
			}
			element.cuenta_bancaria_interna.dato_facturacion.domicilios = domicilios;
			const listPagos = [
				'cuenta_por_cobrar.factura.marca.domicilio.estado',
				'cuenta_por_cobrar.factura.marca.pais',
				'cuenta_por_cobrar.factura.razon_social.pais.continente', 
				'cuenta_por_cobrar.factura.razon_social.uso_cfdi',
				'cuenta_por_cobrar.factura.razon_social.metodo_pago',
				'cuenta_por_cobrar.factura.razon_social.forma_pago',
				'cuenta_por_cobrar.factura.razon_social.razon_bloqueo',
				'cuenta_por_cobrar.factura.razon_social.regimen_fiscal',
				'cuenta_por_cobrar.factura.moneda',
				'cuenta_por_cobrar.factura.cfdi',
				'cuenta_por_cobrar.factura.oficina',
				'cuenta_por_cobrar.factura.factura_detalles.pedido_factura.certificado',
				'cuenta_por_cobrar.factura.factura_detalles.producto',
			];
			const findRelacionesPagos = new Relaciones(listPagos,listPagos,db.sequelize.models);
			const relacionesPagos =  await findRelacionesPagos.getRelaciones();

			element.cliente = '';
			element.banco = '';
			element.importe = '';
			element.pagos_facturacion = await db.sequelize.models.pagos_facturacion.findAll({where:{id_pago: element.id}, include:relacionesPagos});
			if(element.pagos_facturacion.length > 0){
				element.fecha_aplicacion = element.createdAt.toISOString().slice(0, 19).replace('T', ' ');
				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({
					where: {
						id_razon_social: element.razon_social.id
					}
				});
				if(clienteRazonSocial != null){
					const cliente = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente);
					if(cliente != null){
						element.cliente = cliente.nombre;
					}
				}
				//const banco = await db.sequelize.models.entidades_bancarias.findByPk(element.cuenta_bancaria_interna.id_entidad_bancaria);
				//if(banco != null) element.banco = banco.nombre;
				element.banco = element.cuenta_bancaria_interna.alias
				const ultimoPago = orden == 'ASC' ? element.pagos_facturacion.length-1 : 0;
				const ulltimaFacturaDetalles = orden == 'ASC' ? element.pagos_facturacion[ultimoPago].cuenta_por_cobrar.factura.factura_detalles.length-1 : 0;
				const subtotal = parseFloat(element.pagos_facturacion[ultimoPago].cuenta_por_cobrar.factura.factura_detalles[ulltimaFacturaDetalles].subtotal);
				const impuesto = parseFloat(element.pagos_facturacion[ultimoPago].cuenta_por_cobrar.factura.factura_detalles[ulltimaFacturaDetalles].impuesto);
				const descuento = parseFloat(element.pagos_facturacion[ultimoPago].cuenta_por_cobrar.factura.factura_detalles[ulltimaFacturaDetalles].descuento);
				element.importe = subtotal + impuesto - descuento;
				data.push(element);
			}
		}
		
		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			const importe = parseFloat(parseFloat(parseFloat(elemento.subtotal) + parseFloat(elemento.impuesto)).toFixed(2))
			aux = {
				'Folio': elemento.folio,
				'Fecha de aplicación': elemento.fecha_aplicacion,
				'Fecha pago': moment(elemento.fecha_pago).tz('America/Mexico_City').format('YYYY-MM-DD'),
				'Importe': importe,
				'Moneda': elemento.moneda.clave,
				'Referencia': elemento.referencia,
				'Cliente': elemento.cliente,
				'Razón Social': elemento.razon_social.razon_social,
				'Creado por': elemento.usuario_registro.nombre,
				'Banco': elemento.banco
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Aplicaciones de ingreso';
		const namesSheets = [db.sequelize.models.pagos.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteOneSheet(res,req);
	} catch (error) {
		res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
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

		const registrosEncontrados = await db.sequelize.models.pagos_archivos.findAll({
			where: {
				id_pago: id,
				id_carga_archivo: parametros.idCargaArchivo,
				deletedAt: null
			}
		});
		registro.id_pago = id
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.id_pago == id && 
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
		const nuevoRegistro = await db.sequelize.models.pagos_archivos.create(registro);
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
		const registroAEliminar = await db.sequelize.models.pagos_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.pagos_archivos.name){
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

async function xmlToJSON(xmlString){
    const parser = new xml2js.Parser();
    var xmlJSON = undefined
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        xmlJSON = { status: false, msg: "Error al convertir XML a JSON", error: err.toString()};
      }
      xmlJSON = result
    });
    return xmlJSON
}

module.exports = {
	index,
	store,
	show,
	getXML,
	destroy,
	reTimbrarPago,
	exportar,
	cargarArchivo,
	eliminarArchivo
}
