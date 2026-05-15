'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { getPolizaDetalle } = require('../middlewares/getters');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const seedrandom = require('seedrandom');
const { getTotalesLocal } = require('./get_totales.controller') //getTipoCambio
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { Filtros } = require('../middlewares/filtros');
const { sendMailCertificado, sendMailDraft } = require('./certificados_mails.controllers');
const { facturar } = require('./facturacion.controller');
const { getTipoCambio , round, getProveedores } = require('./get_data_certificados.controller')
const { ReportesXLSX } = require('../middlewares/reportesXlsx')
const { MailController } = require('./email.controller');
const fs = require('fs');
const path = require('path');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { getAtributo } = require('./atributos_keepro.controller');
const { resLocal } = require('../middlewares/res_Local')

async function index(req, res) {
	if(req.query.keepro == 3){
		req.query.perfil = "all"
	}
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.certificados.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['all']
		var relaciones = []
		var relacionesRc = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
					'beneficiario.nacionalidad',
					'beneficiario.domicilio.estado', 
					'buque', 
					'cliente.detalles_cliente', 
					'tipo_contenedor', 
					'tamanio_contenedor',
					'commoditie.categoria', 
					'estado_origen.pais', 
					'estado_destino.pais', 
					'estado_destino_redondo.pais', 
					'marca', 
					'modalidad_transporte', 
					'moneda', 
					'oficina_razon_social', 
					'poliza_detalle', 
					'poliza', 
					'proveedor', 
					'puerto_aeropuerto_origen', 
					'puerto_aeropuerto_destino', 
					'tipo_bien', 
					'tipo_cambio_futuro',
					'ubicacion_bienes'  
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
			const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
			const findRelacionesRC = new Relaciones(rel,rel,db.sequelize.models)
			relacionesRc = await findRelacionesRC.getRelaciones()
		}

		const docs = await db.sequelize.models.certificados.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.certificados.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/certificados` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/operaciones`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const documentosFiltrados = []
		for(const registro of docs){
			let operacion = registro.toJSON()
			if(req.query.perfil  == 'all'){
				let whereFind = {
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:operacion.id,
							id_certificado_rc:operacion.id
						},
					},
					include: relacionesRc
				}
				let certificadosRc = await db.sequelize.models.certificados_rc.findAll(whereFind);
				if(certificadosRc.length == 1){
					let certificadoRc = certificadosRc[0]
					if(certificadoRc.id_certificado == operacion.id){
						operacion.certificado_rc = certificadoRc.certificado_rc
					} else{
						operacion.certificado = certificadoRc.certificado
					}
				}
				const parametrosDetalles = [ 'atributo'  ]
				const findRelaciones = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				let det_cer = await db.sequelize.models.detalle_certificados.findOne({
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:operacion.id,
						},
					},
					include: relaciones
				})
				if(det_cer != null){
					operacion.detalle_certificado = det_cer
				}
				const idOficina = operacion.oficina_razon_social.id_oficina
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(operacion.oficina_razon_social.id_razon_social);
				if(razonSocial != null){
					operacion.razon_social = razonSocial.toJSON()
					operacion.oficina_razon_social = undefined

					const razonSocialValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial.id, id_marca: operacion.id_marca}})
					let razonValidada = true
					if(razonSocialValidacion == null){
						try {
							const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
							const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
							if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
								razonValidada = false
							}
						} catch (error) {
							razonValidada = false
						}
					} else{
						if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
							razonValidada = false
						} else{
							if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
								const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
								const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
								if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
									razonValidada = false
								}
							}else{
								razonValidada = true
							}
						}
					}
					if(razonValidada === true){
						operacion.razon_social.validada = true
					}else{
						operacion.razon_social.validada = false
					}
				}
				operacion.factura = null
				operacion.cxc = null
				operacion.factura_pagada = null
				if(operacion.estatus === 'F'){
					const pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
					if(pedidoFactura !== null){
						let facturaDetalle
						const facturasDetalle = await db.sequelize.models.factura_detalles.findAll({where:{id_pedido_factura:pedidoFactura.id}})
						for(const facDetalle of facturasDetalle){
							const notaCredito = await db.sequelize.models.notas_credito.findOne({where:{id_factura:facDetalle.id_factura}})
							if(notaCredito === null){
								facturaDetalle = facDetalle
							}
						}
						if(facturaDetalle !== undefined){
							const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
							const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
							const factura = await db.sequelize.models.facturas.findByPk(facturaDetalle.id_factura, { include:relacionesFacturas})
							if(factura !== null){
								operacion.factura = factura
								const findRelacionesCxC = new Relaciones([],[],db.sequelize.models)
								const relacionesCxC = await findRelacionesCxC.getRelaciones()
								const cxc = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:factura.id}, include:relacionesCxC})
								if(cxc !== null){
									operacion.cxc = cxc
									operacion.factura_pagada = parseFloat(cxc.saldo) == 0
								}
							}
						}
					}
				}
				const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:idOficina, id_cliente: operacion.id_cliente}})
				const findRelacionesMAO = new Relaciones(['agente_venta_1', 'agente_venta_2'],['agente_venta_1', 'agente_venta_2'],db.sequelize.models)
				const relacionesMAO = await findRelacionesMAO.getRelaciones()
				const findRelacionesMAC = new Relaciones(['agente_operativo'],['agente_operativo'],db.sequelize.models)
				const relacionesMAC = await findRelacionesMAC.getRelaciones()
				const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: operacion.id_marca},include:relacionesMAO})
				let marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:operacion.id_cliente, id_marca: operacion.id_marca},include:relacionesMAC})
				if(marcaAgenteCliente == null){
					await db.sequelize.models.marca_agentes_clientes.create({
						id_cliente: operacion.id_cliente,
						id_marca: 1,
						createdAt: moment().tz('America/Mexico_City'),
						updatedAt: moment().tz('America/Mexico_City')
					});
					marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:operacion.id_cliente, id_marca: operacion.id_marca},include:relacionesMAC})
				}
				operacion.agente_venta_1 = marcaAgenteOficina.agente_venta_1
				operacion.agente_venta_2 = marcaAgenteOficina.agente_venta_2
				operacion.agente_operativo = marcaAgenteCliente.agente_operativo

				const findRelacionesHistorico = new Relaciones([],[],db.sequelize.models)
				const relacionesHistorico = await findRelacionesHistorico.getRelaciones()
				var busquedaHistorico = {
					where: {
						id_registro: operacion.id,
						tabla: db.sequelize.models.certificados.name.toUpperCase()
					},
					include: relacionesHistorico,
					order: [['createdAt','DESC']]
				}
				const historico = await db.sequelize.models.historicos.findAll(busquedaHistorico);
				operacion.usuario_modifico = null
				if(historico.length > 0){
					operacion.usuario_modifico = historico[0].usuario_registro
				}
				const findRelacionesArchivo = new Relaciones(['archivo','usuario_registro'],['archivo','usuario_registro'],db.sequelize.models)
				const relArchivo = await findRelacionesArchivo.getRelaciones()
				operacion.archivos_operacion = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_certificado:operacion.id},include:relArchivo})
				operacion.pedido_factura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
				const idsProveedoresNoPermitidos = [6,7,8]
				if(idsProveedoresNoPermitidos.includes(operacion.proveedor.id) && req.query.keepro != 0){
					operacion.copy_and_edit = false
				}else{
					operacion.copy_and_edit = true
				}
			}
			const fechaInicioCobertura = moment(moment(operacion.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City')
			const fechaCertifiacion = moment(moment(operacion.certifiedAt ?? operacion.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City')
			operacion.es_retroactivo = fechaInicioCobertura < fechaCertifiacion ? "Si" : "No"
			
			documentosFiltrados.push(operacion)
		}
		const data = []
		for(const operacion of documentosFiltrados){
			const element = operacion
			if(req.query.keepro === 3 ){
				const dataReturn = { id: element.id}
				dataReturn.no_operacion = element.no_operacion
				dataReturn.no_seguridad = element.no_seguridad
				dataReturn.tipo_cobertura = element.tipo_cobertura
				dataReturn.totalOperacion = {
					minimoVenta: operacion.detalle_certificado.minimo_venta,
					subTotal: operacion.detalle_certificado.subtotal,
					montoIva: operacion.detalle_certificado.monto_iva,
					importe: operacion.detalle_certificado.total
				}
				data.push(dataReturn)
			}else{
				data.push(element)
			}
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
	if(parametros.keepro == 3){
		const filtro = {
			id_cliente: parametros.idCliente,
			estatus: {
                [db.Sequelize.Op.ne]: "C", 
            },
			deletedAt: {
                [db.Sequelize.Op.eq]: null, 
            }
		}
		const busquedaLibre = {}
		const busquedaLibreTxt = parametros.busquedaLibre;
		if (busquedaLibreTxt !== undefined && busquedaLibreTxt !== null && busquedaLibreTxt != '') {
			busquedaLibre['no_operacion'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['no_seguridad'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['tipo_cobertura'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			filtro[db.Sequelize.Op.or] = busquedaLibre;
		}
		return filtro
	}else{
		var filtro
		try {
			filtro = JSON.parse(parametros.filter)
		} catch (error) {
			filtro = {or:[], and:[]}
		}
		const showCancelados = parametros.cancelados == "true" ? true : false;
		const showCanceladosOnly = parametros.cancelados == "only" ? true : false;
		if(showCanceladosOnly){
			if(filtro.and === undefined){
				filtro.and = {}
			}
			filtro.and.push( { property: 'estatus', value: "C", operator: '==' })
		}else if(!showCancelados){
			if(filtro.and === undefined){
				filtro.and = {}
			}
			filtro.and.push( { property: 'estatus', value: "C", operator: '!=' })
		}
		const Filter = new Filtros({filtros:filtro})
		return await Filter.get()
	}
}

async function store(req, res){
	try {
		const parametros = req.body;
		let fechaStringAux = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		let fechaBusqueda = moment(fechaStringAux).tz('America/Mexico_City')
	
		let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
		if(doit !== true){
			return doit
		}
		const tipoCambioSelectedAux = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaStringAux}});
		if(tipoCambioSelectedAux == null){
			return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
		}
		if(req.query.keepro == 3){
			parametros.idTipoBienes = 1
			parametros.idOficinaProducto = parametros.idServicio
			const copiaParametros = JSON.parse(JSON.stringify(parametros));
			copiaParametros.sumaAsegurada = parametros.idMoneda === 1 ? parseFloat(parseFloat(parametros.sumaAsegurada / tipoCambioSelectedAux.tipo_cambio).toFixed(2)) : parametros.sumaAsegurada
			const atributo =  await getAtributo(copiaParametros)
			if(atributo.status === false){
				if(atributo.msg == 'No se encontro registros'){
					return res.status(400).send({ status: false, msg: "No existen tarifas con la suma asegurada seleccionada."})
				}
				return res.status(400).send(atributo)
			}
			parametros.idAtributoKeePro = atributo.id
		}
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
			return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
		}
		parametros.idMarca = 1
		var atributoKeepro = undefined
		var polizaDetalle = undefined
		var oficinaProducto = undefined
		var oficinaCliente = undefined
		var tipoCobertura = undefined
		var proveedor = undefined
		var marcaAgenteOficina = undefined
		var cliente = undefined
		var oficina = undefined
		//Se obtiene la poliza detalle 
		try {
			cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente, {include: ['detalles_cliente']});
			if(cliente.cliente_prospecto !== true){
				return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
			}
			atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idAtributoKeePro);
			if(atributoKeepro === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idAtributoKeePro = ${parametros.idAtributoKeePro} no encontrado`});
			}
			oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: ['marca_agente_oficina','producto']});
			if(oficinaProducto === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`});
			}
			marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.marca_agente_oficina.id);
			oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente);
			oficina = await db.sequelize.models.oficinas.findByPk(oficinaCliente.id_oficina, {include: ['razones_sociales']})
			proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
			const idsProveedoresNoPermitidos = [6,7,8]
			if(idsProveedoresNoPermitidos.includes(proveedor.id) && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El proveedor seleccionado tiene restricciones para autoemisor por lo cual no se puede emitir esta operación. Por favor, comuníquese con su operativo para solicitarlo."});
			}
			const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
			polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
			if(polizaDetalle === undefined){
				return res.status(400).send({ status: false, msg: "No existe poliza vigente"});
			} else if(polizaDetalle === null){
				return res.status(400).send({ status: false, msg: "No existe poliza detalle vigente"});
			}
			tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
		} catch (error) {
			return res.status(400).send({ status: false, msg: "No existe poliza vigente", error:error.toString()});
		}
		//Generación de campos obligatorios y opcionales según el tipo de cobertura de la poliza
		if(parametros.keepro != 0 && parametros.keepro != 3){
			parametros.draftCertificado = false
		}
		try {
			var filtoMarcaMoneda = {deletedAt: null};
			filtoMarcaMoneda.id_marca = parametros.idMarca
			const monedasMarcas = await db.sequelize.models.marcas_monedas.findAll({
				paranoid: false,
				where: filtoMarcaMoneda,
			})

			var filtroProveedorMoneda = {deletedAt: null};
			const proveedores = await getProveedores(atributoKeepro.id_oficina_producto)
			filtroProveedorMoneda.id_proveedor = {[db.Sequelize.Op.or]: proveedores}

			const proveedoresMonedas = await db.sequelize.models.proveedores_monedas.findAll({
				paranoid: false,
				where: filtroProveedorMoneda,
			})
			const idsMonedaMarcas = []
			const idsMonedaProveedor = []
			for(const monedaMarca of monedasMarcas){
				idsMonedaMarcas.push(monedaMarca.id_moneda)
			}
			for(const monedaProveedor of proveedoresMonedas){
				idsMonedaProveedor.push(monedaProveedor.id_moneda)
			}
			let validMoneda = false
			if(idsMonedaMarcas.includes(parametros.idMoneda) && idsMonedaProveedor.includes(parametros.idMoneda)){
				validMoneda = true
			}
			if(!validMoneda){
				return res.status(400).send({ status: false, msg: `La moneda seleccionada no es válida.`});
			}
		} catch (error) {
			return res.status(400).send({ status: false, msg: `La moneda seleccionada no es válida.`});
		}
		const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
		const isContenedor = cobertura.includes("contenedor")
		const isRC = cobertura.includes("rc")
		if(tipoCambioSelectedAux == null){
			return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
		}
		parametros.idTipoCambioFuturo = tipoCambioSelectedAux.id
		let obligatorios = [{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
							{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
							{campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados},
							{campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados},
							{campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}}},
							{campo:'idBeneficiario', tipo:'modelRelacionado', model:db.sequelize.models.clientes_beneficiarios, where:{where:{id_cliente:oficinaCliente.id_cliente,id_beneficiario:parametros.idBeneficiario}}},
							{campo:'idTipoCambioFuturo', tipo:'model', model:db.sequelize.models.tipos_cambio_futuro},
							{campo:'idModalidad', tipo:'model', model:db.sequelize.models.modalidades},
							{campo:'idAtributoKeePro', tipo:'model', model:db.sequelize.models.atributos_keepro},
							{campo:'idMoneda', tipo:'modelRelacionado', model:db.sequelize.models.marcas_monedas, where:{where:{id_marca:parametros.idMarca,id_moneda:parametros.idMoneda}}},
							{campo:'idUbicacionesBienes', tipo:'model', model:db.sequelize.models.ubicaciones_bienes},
							{campo:'keepro', tipo:'number'},
							{campo:'ciudadOrigen', tipo:'string', textoCase:"up", largo:255},
							{campo:'ciudadDestino', tipo:'string', textoCase:"up", largo:255},
							{campo:'fechaInicioCobertura', tipo:'stringDate'}
	
		]
		const validosOpcionales =[{campo:'datosAdicionales', tipo:'string',largo:6000},
								  {campo:'ruta', tipo:'string',largo:255,textoCase:"up"},
								  {campo:'referencias', tipo:'string',largo:255,textoCase:"up"},
								  {campo:'ventaClienteFinal', tipo:'number'},
								  {campo:'deducible', tipo:'boolean'},
								  {campo:'redondo', tipo:'boolean'},
								  {campo:'draftCertificado', tipo:'boolean'},
								  {campo:'fechaFinCobertura', tipo:'stringDate'}
		]
		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
		if(razonSocialAux == null){
			return res.status(400).send({ status: false, msg: `La razón social no existe.`});
		}
		if(razonSocialAux.bloqueado == true){
			return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
		}

		const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:parametros.idRazonSocial,id_marca:parametros.idMarca}})
		let razonValidada = true
		if(razonesSocialesValidaciones == null){
			const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
			const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
			if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
				razonValidada = false
			}
		} else{
			if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
				const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
				const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
				if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
					razonValidada = false
				}
				const fechaCreacionRSV = moment(razonesSocialesValidaciones.createdAt).tz('America/Mexico_City')
				const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
				if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
					razonValidada = true
				}
			}else{
				razonValidada = true
			}
		}

		let marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:parametros.idCliente, id_marca: 1}})
		if(marcaAgenteCliente == null){
			await db.sequelize.models.marca_agentes_clientes.create({
				id_cliente: parametros.idCliente,
				id_marca: 1,
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			});
		}
		if(!razonValidada){
			return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
		}
		const beneficiario = await db.sequelize.models.beneficiarios.findByPk(parametros.idBeneficiario)
		if(beneficiario.bloqueado == true){
			return res.status(400).send({ status: false, msg: "El Beneficiario se encuentra bloqueado" });
		}
		if(cliente.detalles_cliente.bloqueado === true){
			return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
		}
		if(cliente.detalles_cliente.autoemisor != true && parametros.keepro != 0){
			const fechaCreacionCliente = moment(cliente.detalles_cliente.createdAt).tz('America/Mexico_City')
			const fechalimiteUsoCliente = fechaCreacionCliente.add(24, 'hours');
			if(fechalimiteUsoCliente < moment().tz('America/Mexico_City')){
				return res.status(400).send({ status: false, msg: "El cliente no tiene acceso al autoemisor"});
			}
		}

		if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
		}
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
		if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
			if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
			}
			if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
			}
		}
		const archivos = parametros.archivos ?? []
        const env = process.env.NODE_ENV;
		if(parametros.keepro === 0 && parametros.draftCertificado === true && env == '__producction__'){
			if(parametros.archivos === undefined){
				return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
			}
			
			if(archivos.length < 1 && Array.isArray(archivos)){
				return res.status(400).send({status:false , msg: `El parametro archivos no debe estar vacío.` });
			}
			if(archivos.length < 2){
				return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
			}
			for(const archivo of archivos){
				const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(archivo);
				if(registroEncontrado === null){
					return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
				}
			}
			const documentosEncontrados = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_carga_archivo: {[db.Sequelize.Op.or]: archivos}}});
			
			if(documentosEncontrados.length > 0){
				return res.status(400).send({ status: false, msg: `Uno o mas documentos ya fue utilizado para un certificado previo, es importante suba nuevos documentos.`});
			}
		}
		//Se valida que el tipo de cambio sea el del dia de hoy 
		const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
		var tipoCambio = 1
		let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findByPk(parametros.idTipoCambioFuturo);
		if(tipoCambioSelected == null){
			return res.status(400).send({ status: false, msg: `Registro con id: idTipoCambioFuturo = ${parametros.idTipoCambioFuturo} no encontrado`});
		}
		if(tipoCambioSelected.fecha != fechaString){
			return res.status(400).send({ status: false, msg: `El tipo de cambio seleccionado debe ser el de hoy`});
		}
		if(moneda.clave != "USD"){
			tipoCambio = tipoCambioSelected.tipo_cambio
		}
		if(isContenedor){
			const sumaBusqueda = parseFloat(parseFloat(parametros.sumaAsegurada / tipoCambio).toFixed(2))
			obligatorios.push({campo:'idTipoContenedor', tipo:'modelRelacionado', model:db.sequelize.models.polizas_tipo_contenedor, where:{where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor,suma_asegurada:sumaBusqueda}}})
			obligatorios.push({campo:'idTamanioContenedor', tipo:'model', model:db.sequelize.models.tamanios_contenedor})
			obligatorios.push({campo:'numContenedor', tipo:'string',largo:11,textoCase:"up"})
			parametros.idCommodity = undefined
			parametros.idTipoBienes = undefined
		} else{
			obligatorios.push({campo:'idCommodity', tipo:'modelRelacionado', canNull: true, model:db.sequelize.models.polizas_commoditys, where:{where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}}})
			obligatorios.push({campo:'descripcionCarga', tipo:'string', largo:1000})
			obligatorios.push({campo:'idTipoBienes', tipo:'model', model:db.sequelize.models.tipos_bienes})
			parametros.idTipoContenedor = undefined
		}
		//Generación de campos obligatorios según la modalidad de transporte
		const modalidad = await db.sequelize.models.modalidades.findByPk(parametros.idModalidad);
		const tipoContenedorAux = await db.sequelize.models.tipo_contenedor.findByPk(parametros.idTipoContenedor);
		const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
		const isMaritimo = modalidadNombre == 'maritimo';
		const isAereo = modalidadNombre == 'aereo';
		if(isContenedor && (parametros.idTipoContenedor == 4 || parametros.idTipoContenedor == 5) && !isAereo){
			return res.status(400).send({ status: false, msg: "Para el tipo de contenedor seleccionado (" + tipoContenedorAux.descripcion + "), la modalidad debe ser aérea."});
		}
		if(isMaritimo){
			parametros.idBuque = 1
			obligatorios.push({campo:'idBuque', tipo:'model', model:db.sequelize.models.buques})
			validosOpcionales.push({campo:'numViaje', tipo:'string',largo:255,textoCase:"up"})
		} else{
			parametros.idBuque == undefined
		}
		if(isMaritimo || isAereo){
			obligatorios.push({campo:'idPuertoAeropuertoOrigen', tipo:'model', model:db.sequelize.models.puertos_aeropuertos})
			obligatorios.push({campo:'idPuertoAeropuertoDestino', tipo:'model', model:db.sequelize.models.puertos_aeropuertos})
		}
		if(!isMaritimo && !isAereo){
			parametros.idPuertoAeropuertoOrigen = undefined
			parametros.idPuertoAeropuertoDestino = undefined
			parametros.numViaje = undefined
		}
		//Se validan los paramtros obligatorios
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		//Si la poliza detalles permite viaje redondo y el cliente envia el parametro redondo como true, se agrega el parametro obligatorio idEstadoDesitnoRedondo y ciudadRedondo
		const estadoDestinoAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino)
		const polizaTerritorialidad = await db.sequelize.models.poliza_territorialidad.findAll({where:{id_poliza_detalle:polizaDetalle.id, id_pais:estadoDestinoAux.id_pais}})
		if(parametros.redondo === true && polizaDetalle.is_redondo === true && polizaTerritorialidad.length > 0){

			obligatorios.push({campo:'idEstadoDestinoRedondo', tipo:'model', model:db.sequelize.models.estados})
			obligatorios.push({campo:'ciudadDestinoRedondo', tipo:'string', textoCase:"up", largo:255})
		}else{
			parametros.redondo = false
		}
		//Se validan los paramtros obligatorios
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		
		//valida que el buque seleccionado no tenga más de 20 o 25 años 
		if(isMaritimo){
			const buque = await db.sequelize.models.buques.findByPk(parametros.idBuque, {include: ['tipo_buque']});
			const anioActual = moment().year();
			const diferenciaEnAños = anioActual - buque.anio_construccion;
			let antiguedadPermitida = 25;

			if(buque.tipo_buque == null){
				return res.status(400).send({ status: false, msg: `El buque no tiene un tipo de buque asignado o este se encuentra eliminado`});
			}

			//si es granelero permite mayor o igual a 20 años
			if(buque.tipo_buque.id == 2){
				antiguedadPermitida = 20;
			}
			
			if(diferenciaEnAños >= antiguedadPermitida){
				return res.status(400).send({ status: false, msg: `El buque ha rebasado el límite de temporalidad asignado.`});
			}
		}

		const oficinaRazonSocial = await db.sequelize.models.oficinas_razones_sociales.findOne({where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}})
		registro.id_oficina_razon_social = oficinaRazonSocial.id
		registro.id_razon_social = undefined
		const razonSocial = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
		const polizasNacionalidadesRazonesSociales = await getPolizasNacionalidadesRazonesSociales([polizaDetalle.id])
		if(!polizasNacionalidadesRazonesSociales.includes(razonSocial.id_pais)){
			return res.status(400).send({ status: false, msg: `La nacionalidad de la razón social es incorrecta para la póliza asignada.`});
		}
		const atributosKeepro = await db.sequelize.models.atributos_keepro.findAll({
			where:{
				id: parametros.idAtributoKeePro
			}
		});
		const territorialidadesValidas = await getPolizasTerritorialidades([polizaDetalle.id])
		for(const ak of atributosKeepro){
			if(ak.id_pais_origen == ak.id_pais_destino && ak.id_pais_destino !== null){
				if(!territorialidadesValidas.includes(ak.id_pais_origen)){
					territorialidadesValidas.push(ak.id_pais_origen)
				}
			}
		}
		const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen)
		const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino)
		if(estadoDestino.id_pais ==  estadoOrigen.id_pais && !territorialidadesValidas.includes(estadoOrigen.id_pais)){
			return res.status(400).send({ status: false, msg: `El país del estado destino seleccionado es incorrecto para la póliza asignada`});
		}
		const polizasNacionalidadesInteresAsegurado = await getPolizasNacionalidadesInteresAsegurado([polizaDetalle.id])
		if(!polizasNacionalidadesInteresAsegurado.includes(beneficiario.id_nacionalidad)){
			return res.status(400).send({ status: false, msg: `La nacionalidad del interés asegurado es incorrecta para la póliza asignada.`});
		}
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		if(registro.deducible == undefined || registro.deducible == null){
			registro.deducible = false
		}
		//Se verifica que el parametro keepro este entre el rango de 0 y 3
		if(parametros.keepro < 0 || parametros.keepro > 3){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
		}

		const inicioVigencia = moment(parametros.fechaInicioCobertura).tz('America/Mexico_City');
		const fechaHoyString = moment().tz('America/Mexico_City').format('YYYY-MM-DD');
		var fechaHoy = moment(fechaHoyString).tz('America/Mexico_City')
		if((parametros.keepro == 0) && inicioVigencia < fechaHoy){
			registro.retroactividad = true;
		}else{
			registro.retroactividad = false;
		} 
		if(registro.retroactividad){
			fechaHoy = fechaHoy.subtract(5, 'days')
		}
		//validar fecha_inicio y fecha_fin
		if (inicioVigencia < fechaHoy) {
			return res.status(400).send({
				status: false,
				msg: "La fecha de inicio no puede ser menor que la fecha actual"
			});
		}
		if(parametros.fechaFinCobertura != undefined && parametros.fechaFinCobertura != null){
			const finVigencia = moment(parametros.fechaFinCobertura).tz('America/Mexico_City');
			//validar fecha_inicio y fecha_fin
			if (finVigencia < inicioVigencia) {
				return res.status(400).send({
					status: false,
					msg: "La fecha de inicio no puede ser mayor que a la fecha fin"
				});
			}
			registro.fecha_fin_cobertura = finVigencia.format('YYYY-MM-DD')
		}else{
			registro.fecha_fin_cobertura = null
		}
		registro.fecha_inicio_cobertura = inicioVigencia.format('YYYY-MM-DD')
		//Si el atributo permite que sea deducible y el cliente envia el parametro deducible como true, se almacena el campo de deducible como true
		if(parametros.deducible === true && atributoKeepro.is_deducible === true){
			parametros.deducible = true
		} else{
			parametros.deducible = false
		}
		//Se valida que el estado destino redondo tenga nacionalidad mexicana, en caso de que sea redondo el viaje
		if(parametros.redondo === true){
			const estadoDestinoRedondo = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestinoRedondo, {include: ['pais']});
			const nombrePaisDestinoRedondo = await ManipuladorCadenas.quitarAcentos(estadoDestinoRedondo.pais.descripcion.toLowerCase());
			if(nombrePaisDestinoRedondo != "mexico"){
				return res.status(400).send({ status: false, msg: `El país del estado destino redondo debe ser México`});
			}
		}
		//Se valida el tamaño de contenedor seleccionado, en caso de ser contenedor el tipo de poliza
		if(isContenedor){
			const tipoContenedor = await db.sequelize.models.tipo_contenedor.findByPk(parametros.idTipoContenedor, {include: ['tamanios_contenedor']});
			var tamanioValido = false
			await tipoContenedor.tamanios_contenedor.forEach(tamanioContenedor => {
				if(!tamanioValido){
					if(tamanioContenedor.id == parametros.idTamanioContenedor){
						tamanioValido = true
					}
				}
			});
			if(!tamanioValido){
				return res.status(400).send({ status: false, msg: `Registro con id: idTamanioContenedor = ${parametros.idTamanioContenedor} no encontrado`});
			}
			const numViaje = registro.num_contenedor
			if(!await validNumContenedor(numViaje)){
				return res.status(400).send({ status: false, msg: 'El número de contenedor debe tener exactamente 11 caracteres: 4 letras mayúsculas seguidas de 7 números (Ejemplo: ABCD1234567).'});
			}
		}
		//Se valida el si es puerto/aeropuerto, si la modalidad de transprote es puerto o aeropuerto
		if(isMaritimo || isAereo){
			const puertoAeropuertoOrigen = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoOrigen);
			if(!isAereo == puertoAeropuertoOrigen.tipo){
				return res.status(400).send({ status: false, msg: "El registro idPuertoAeropuertoOrigen debe ser" + (isMaritimo ? " puerto": "aeropuerto")});
			}
			const puertoAeropuertoDestino = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoDestino);
			if(!isAereo == puertoAeropuertoDestino.tipo){
				return res.status(400).send({ status: false, msg: "El registro idPuertoAeropuertoDestino debe ser" + (isMaritimo ? " puerto": "aeropuerto")});
			}
		}
		//En caso de que el tipo de cobertura sea distinta a contenedor, se validan los limites del commoditie y del atributo
		if(!isContenedor){
			const limiteInferiorAtributo = atributoKeepro.limite_inferior == 0 ? null : atributoKeepro.limite_inferior
			const limiteSuperiorAtributo = atributoKeepro.limite_superior == 0 ? null : atributoKeepro.limite_superior
			const commoditieEncontrado = await db.sequelize.models.polizas_commoditys.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}});
			const commoditieSeleccionado = commoditieEncontrado[0].toJSON()
			const limitesCommoditie = {
				'maritimo': commoditieSeleccionado.limite_maritimo,
				'aereo': commoditieSeleccionado.limite_aereo,
				'terrestre': commoditieSeleccionado.limite_terrestre,
				'ferroviario': commoditieSeleccionado.limite_ferroviario,
	
			}
			
			var sumaAseguradaUSD = parametros.sumaAsegurada /tipoCambio
			const intSumaAseguradaAux = parseInt(sumaAseguradaUSD);
			const floatSumaAseguradaAux = parseFloat(sumaAseguradaUSD) - intSumaAseguradaAux
			if(floatSumaAseguradaAux < 1 && floatSumaAseguradaAux > 0.99){
				sumaAseguradaUSD = parseInt(sumaAseguradaUSD)  + 1 
			}else if(floatSumaAseguradaAux < 0.01){
				sumaAseguradaUSD = parseInt(sumaAseguradaUSD)
			}
			var limiteMaximo = polizaDetalle.limite_maximo
			var limiteMinimo = polizaDetalle.limite_minimo

			if(sumaAseguradaUSD < limiteMinimo){
				const limiteMinimoTexto = (limiteMinimo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" });
				const mensajeErrorSumaMinima = "La suma asegurado debe ser mayor o igual a " + limiteMinimoTexto
				return res.status(400).send({ status: false, msg: mensajeErrorSumaMinima + " " + moneda.clave});
			}
	
			if(parseFloat(limitesCommoditie[modalidadNombre]) !== NaN){
				limiteMaximo = limitesCommoditie[modalidadNombre]
			}
	
			if(parseFloat(limiteSuperiorAtributo) !== NaN){
				if(limiteSuperiorAtributo > limiteMaximo){
					limiteMaximo = limiteSuperiorAtributo
				}
			}
			if(parseFloat(limiteInferiorAtributo) !== NaN){
				if(limiteInferiorAtributo < limiteMinimo){
					limiteMinimo = limiteInferiorAtributo
				}
			}
			var limiteMaximoMoneda = (limiteMaximo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: moneda.clave });
			var limiteMinimoMoneda = (limiteMinimo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: moneda.clave });
			
			if(limiteMaximo < sumaAseguradaUSD){
				let mensaje = "La suma asegurada debe ser menor o igual a "
				if(isRC){
					mensaje = "La suma asegurada debe ser "
				}
				return res.status(400).send({ status: false, msg: mensaje + limiteMaximoMoneda + " " + moneda.clave});
			}
			if(limiteMinimo > sumaAseguradaUSD){
				let mensaje = "La suma asegurado debe ser mayor o igual a "
				if(isRC){
					mensaje = "La suma asegurada debe ser "
				}
				return res.status(400).send({ status: false, msg: mensaje + limiteMinimoMoneda + " " + moneda.clave});
			}
		}else{
			registro.suma_asegurada = atributoKeepro.limite_inferior * tipoCambio
		}
		const noOperacion = await genNoOperacion(marcaAgenteOficina.clave,parametros.idRazonSocial,oficina);
		registro.tipo_cobertura = tipoCobertura.nombre
		registro.keepro = parametros.keepro
		registro.keepro_last_edit = parametros.keepro
		registro.suma_asegurada = parametros.sumaAsegurada
		registro.id_poliza = polizaDetalle.id_poliza
		registro.id_detalle_poliza = polizaDetalle.id
		registro.estatus = 'N'
		registro.no_operacion = noOperacion
		registro.no_aleatorieo = await getNumAleatorio('no_aleatorieo')
		registro.id_proveedor = atributoKeepro.id_proveedor

		//si el proveedor es cargox, se almacena el número de seguridad que se ingresa manualmente
		/*const idsProveedoresNoPermitidos = [6,7,8]
		if(parametros.keepro == 0 &&  idsProveedoresNoPermitidos.includes(registro.id_proveedor)){
			if(parametros.noSeguridad == null){
				return res.status(400).send({ status: false, msg: `El número de seguridad es obligatorio`});
			}
			if(typeof(parseInt(parametros.noSeguridad)) != "number"){
				return res.status(400).send({ status: false, msg: `El campo número de seguridad solo debe incluir números`});
			}
			registro.no_seguridad = parseInt(parametros.noSeguridad);
		}else{
			registro.no_seguridad = await getNumAleatorio('no_seguridad');
		}*/
		registro.no_seguridad = await getNumAleatorio('no_seguridad');
	
		req.body.idOficinaProducto =  atributoKeepro.id_oficina_producto
		const parametrosTotales = req.body;
		const totales = await getTotalesLocal(parametrosTotales,req, res)
		if(totales === undefined){
			return ''
		} else if(totales.status !== true){
			return res.status(400).send(totales)
		}
		registro.tipo_operacion = totales.tramoEmbarge
		registro.tramo_embarque = totales.tramoEmbarge == 'Nacional' ? 'Nacional' : 'Internacional'
	
	
		registro.id_usuario_registro = req.usuario.id
		if(parametros.haveRc == true && !isContenedor && !isRC){
			registro.have_rc = await validRcDraft(registro,razonSocial.id_pais)
		}
		if(registro.draft_certificado  == true){
			const atributoAux = await db.sequelize.models.atributos_keepro.findByPk(atributoKeepro.id);
			if(atributoAux.num_movimientos != null){
				if(atributoAux.num_movimientos < 1){
					return res.status(400).send({ status: false, msg: "No se puede generar el certificado, ya que la tarifa cargada ha llegado al límite de movimientos permitidos. Por favor, contacte a su operativo."});
				}
			}
			registro.certifiedAt = moment().tz('America/Mexico_City')
			if(isMaritimo){
				const buque = await db.sequelize.models.buques.findByPk(registro.id_buque,{ paranoid: false });
				if(buque.nombre.toLowerCase() != "por definir"){
					const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
					const fechaHace30Dias = moment().tz('America/Mexico_City').subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss');
					var whereFind = {
						where: {
							id_detalle_poliza: registro.id_detalle_poliza,
							draft_certificado: true,
							id_buque: registro.id_buque,
							certifiedAt: {
								[db.Sequelize.Op.and]: [
									{ [db.Sequelize.Op.gte]: fechaHace30Dias },
									{ [db.Sequelize.Op.lte]: fechaActual }      
								]
							},
							deletedAt: null
						}
					}
					const moneda = await db.sequelize.models.monedas.findByPk(registro.id_moneda);
					var tipoCambio = 1
					if(moneda.clave == "MXN"){
						const tipoCambioCertificado = await db.sequelize.models.tipos_cambio_futuro.findByPk(registro.id_tipo_cambio_futuro);
						tipoCambio = tipoCambioCertificado.tipo_cambio
					}
					const registrosEncontrados = await db.sequelize.models.certificados.findAll(whereFind);
					var sumaAseguradaUltimos30Dias = registro.suma_asegurada / tipoCambio
					for (let index = 0; index < registrosEncontrados.length; index++) {
						const certificado = registrosEncontrados[index];
						let monedaCertificado = await db.sequelize.models.monedas.findByPk(certificado.id_moneda);
						var tipoCambio = 1
						if(monedaCertificado.clave == "MXN"){
							let tipoCambioCerti = await db.sequelize.models.tipos_cambio_futuro.findByPk(certificado.id_tipo_cambio_futuro);
							tipoCambio = tipoCambioCerti.tipo_cambio
						}
						let sumaCertificado = certificado.suma_asegurada / tipoCambio
						sumaAseguradaUltimos30Dias = sumaAseguradaUltimos30Dias + sumaCertificado
					}
					if(sumaAseguradaUltimos30Dias > 2000000){
						return res.status(400).send({ status: false, msg: 'No se puede generar el certificar ya que el buque supera el limite de aseguramiento', sumaAseguradaUltimos30Dias:sumaAseguradaUltimos30Dias });
					}
				}
			}
			if(atributoAux.num_movimientos != null){
				await atributoAux.update({num_movimientos: atributoAux.num_movimientos - 1}, { where: { id: atributoAux.id } });
			}
		}

		const nuevoRegistro = await db.sequelize.models.certificados.create(registro);
		if(parametros.keepro === 0 && parametros.draftCertificado === true){
			for(const archivo of archivos){
				let registroDocs = {
					createdAt: moment().tz('America/Mexico_City'),
					id_carga_archivo: archivo,
					id_certificado: nuevoRegistro.id,
					id_usuario_registro: req.usuario.id
				}
				await db.sequelize.models.certificados_documentos_operaciones.create(registroDocs);
			}
		}
		const registroDetalles = {
			id_certificado: nuevoRegistro.id,
			id_atributo_keepro: atributoKeepro.id,
			id_usuario_registro: req.usuario.id,
			tarifa_final_cliente: totales.tarifaVentaCliente,
			minimo_venta: totales.minimoVenta,
			tarifa_mediador: totales.tarifaMediadorMercantil,
			minimo_mediador: totales.minimoMediador,
			subtotal: totales.subTotal,
			monto_iva: totales.montoIva,
			porcentaje_iva: totales.iva,
			descuento_porcentaje: totales.descuento,
			descuento_monto: totales.montoDescuento,
			total: totales.total,
			retencion_porcentaje: totales.retencion,
			retencion_monto: totales.montoRetencion,
			subtotal_sobreventa: totales.sobreVenta,
			tarifa_compra: totales.tarifaCompraFinal,
			minimo_compra: totales.minimoCompra,
			costo_compra: totales.costoCompra,
			profit: totales.profit,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
	
		}
		const certificado = nuevoRegistro.toJSON()
		const detalleCertificado = await storeDetalles(registroDetalles)
		certificado.detalle_certificado = detalleCertificado.toJSON()
		const dataReturn = {id:nuevoRegistro.id}
		if(req.query.keepro === 3 ){
			dataReturn.no_operacion = certificado.no_operacion
			dataReturn.no_seguridad = certificado.no_seguridad
			dataReturn.tipo_cobertura = certificado.tipo_cobertura
			dataReturn.totalOperacion = {
				minimoVenta: totales.minimoVenta,
				subTotal: totales.subTotal,
				montoIva: totales.montoIva,
				importe: totales.total
			}
		}
		res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: dataReturn });

		if(registro.draft_certificado == true){
			await facturar(nuevoRegistro.id,nuevoRegistro.id_cliente,req.usuario,parametros.facturar)
		}
		if(registro.have_rc  == true && registro.draft_certificado  == true){
			await certificadoRc(nuevoRegistro.toJSON(),detalleCertificado.toJSON(),req);
		}
		sendMailCertificado(nuevoRegistro.id, req.usuario)
		return null
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function certificadoRc(certificado,registroDetallesCertificado,req){
	try {
		const proveedores = await db.sequelize.models.proveedores.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%aig%`}}});
		if(proveedores.length != 1){
			return { success: false, canContratarRc: false }
		}
		const tiposCobertura = await db.sequelize.models.tipos_cobertura.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%rc%`}}});
		if(tiposCobertura.length != 1){
			return { success: false, canContratarRc: false }
		}
		const tipoCobertura = tiposCobertura[0]
		const proveedor = proveedores[0]
		const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:tipoCobertura.id}};
		const polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
		if(polizaDetalle === null){
			return { success: false, canContratarRc: false }
		}
		const idCertificado = certificado.id
		certificado.id = undefined
		certificado.tipo_cobertura = tipoCobertura.nombre
		certificado.draft_certificado = true
		certificado.keepro = certificado.keepro_last_edit
		certificado.keepro_last_edit = certificado.keepro_last_edit
		certificado.suma_asegurada = polizaDetalle.limite_minimo
		certificado.id_poliza = polizaDetalle.id_poliza
		certificado.id_detalle_poliza = polizaDetalle.id
		certificado.estatus = 'N'
		certificado.no_operacion = certificado.no_operacion + "-RCD2DL"
		certificado.no_aleatorieo = await getNumAleatorio('no_aleatorieo')
		certificado.no_seguridad = await getNumAleatorio('no_seguridad')
		certificado.id_proveedor = proveedor.id
		certificado.certifiedAt = moment().tz('America/Mexico_City')
		certificado.createdAt = moment().tz('America/Mexico_City')
		certificado.have_rc = false
		certificado.id_estado_destino_redondo = undefined
		certificado.redondo = false
		certificado.deducible = false
		certificado.detalle_certificado = undefined
		const certificadoValid = await db.sequelize.models.certificados.findByPk(idCertificado,{include:['oficina_razon_social']});
		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(certificadoValid.oficina_razon_social.id_razon_social, {include: ['regimen_fiscal']})
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
		if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
			if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
			}
			if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
			}
		}
		
		const nuevoRegistro = await db.sequelize.models.certificados.create(certificado);
		const tipoCambioFuturo = await db.sequelize.models.tipos_cambio_futuro.findByPk(certificado.id_tipo_cambio_futuro);
		const moneda = await db.sequelize.models.monedas.findByPk(certificado.id_moneda)
		var tipoCambio = 1;
		if(moneda.clave == "MXN"){
			tipoCambio = tipoCambioFuturo.tipo_cambio
		}
		const registroDetalles = {
			id_certificado: nuevoRegistro.id,
			id_atributo_keepro: null,
			id_usuario_registro: registroDetallesCertificado.id_usuario_registro,
			tarifa_final: 0,
			minimo_venta: parseFloat(polizaDetalle.minimo_venta),
			tarifa_mediador: 0,
			minimo_mediador: 0,
			subtotal: parseFloat(polizaDetalle.minimo_venta) * tipoCambio,
			monto_iva: ((parseFloat(polizaDetalle.minimo_venta) * registroDetallesCertificado.porcentaje_iva) / 100) * tipoCambio,
			porcentaje_iva: registroDetallesCertificado.porcentaje_iva,
			descuento_porcentaje: 0,
			descuento_monto: 0,
			total: (parseFloat(polizaDetalle.minimo_venta) + ((parseFloat(polizaDetalle.minimo_venta) * registroDetallesCertificado.porcentaje_iva) / 100)) * tipoCambio,
			retencion_porcentaje: 0,
			retencion_monto: 0,
			subtotal_sobreventa: 0,
			tarifa_compra: 0,
			minimo_compra: parseFloat(polizaDetalle.minimo_compra),
			costo_compra: (parseFloat(polizaDetalle.minimo_compra)) * tipoCambio,
			profit: (parseFloat(polizaDetalle.minimo_venta) - parseFloat(polizaDetalle.minimo_compra)) * tipoCambio,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
	
		}
		const certificadoRC = nuevoRegistro.toJSON()
		const detalleCertificado = await storeDetalles(registroDetalles)
		const registroCertificadosRc = {
			id_certificado: idCertificado,
			id_certificado_rc: certificadoRC.id,
			createdAt: moment().tz('America/Mexico_City'),
		}
		const nuevoRegistroCertificadoRC = await db.sequelize.models.certificados_rc.create(registroCertificadosRc);
		sendMailCertificado(certificadoRC.id, req.usuario)
		facturar(nuevoRegistro.id,nuevoRegistro.id_cliente,req.usuario)
		return undefined
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	} 
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
		var relacionesRc = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 'beneficiario.nacionalidad', 'beneficiario.domicilio.estado',  'buque', 'cliente.detalles_cliente', 'tipo_contenedor', 'tamanio_contenedor','commoditie.categoria', 'estado_origen.pais', 'estado_destino.pais', 'estado_destino_redondo.pais', 'marca', 'modalidad_transporte', 'moneda', 'oficina_razon_social', 'poliza_detalle', 'poliza', 'proveedor', 'puerto_aeropuerto_origen', 'puerto_aeropuerto_destino', 'tipo_bien', 'tipo_cambio_futuro','ubicacion_bienes'  ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
			const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
			const findRelacionesRC = new Relaciones(rel,rel,db.sequelize.models)
			relacionesRc = await findRelacionesRC.getRelaciones()
		}
		
		const data = []
		const tiposContenedor = []
		const tipoCambio = await getTipoCambio();
		const registroEncontrado = await db.sequelize.models.certificados.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			let operacion = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
				const findRelaciones = new Relaciones(rel,rel,db.sequelize.models)
				relacionesRc = await findRelaciones.getRelaciones()
				let whereFind = {
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:operacion.id,
							id_certificado_rc:operacion.id
						},
					},
					include: relacionesRc
				}
				let certificadosRc = await db.sequelize.models.certificados_rc.findAll(whereFind);
				if(certificadosRc.length == 1){
					let certificadoRc = certificadosRc[0]
					if(certificadoRc.id_certificado == operacion.id){
						operacion.certificado_rc = certificadoRc.certificado_rc
					} else{
						operacion.certificado = certificadoRc.certificado
					}
				}
				const idOficina = operacion.oficina_razon_social.id_oficina
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(operacion.oficina_razon_social.id_razon_social);
				const oficina = await db.sequelize.models.oficinas.findByPk(operacion.oficina_razon_social.id_oficina);
				if(razonSocial != null){
					operacion.razon_social = razonSocial.toJSON()
					operacion.oficina = oficina
					operacion.oficina_razon_social = undefined

					const razonSocialValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial.id, id_marca: operacion.id_marca}, include:[{all:true}]})
					let razonValidada = true
					if(razonSocialValidacion == null){
						try {
							const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
							const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
							if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
								razonValidada = false
							}
						} catch (error) {
							razonValidada = false
						}
					} else{
						if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
							razonValidada = false
						} else{
							if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
								const fechaCreacionRS = moment(razonSocial.createdAt).tz('America/Mexico_City')
								const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
								if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
									razonValidada = false
								}
								const fechaCreacionRSV = moment(razonSocialValidacion.createdAt).tz('America/Mexico_City')
								const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
								if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
									razonValidada = true
								}
							}else{
								razonValidada = true
							}
						}
					}
					if(razonValidada === true){
						operacion.razon_social.validada = true
					}else{
						operacion.razon_social.validada = false
					}
				}
				const paisOrigen = operacion.estado_origen.pais
				operacion.pais_origen = paisOrigen
				operacion.estado_origen.pais = undefined


				const paisDestino = operacion.estado_destino.pais
				operacion.pais_destino = paisDestino
				operacion.estado_destino.pais = undefined

				
				const parametrosDetalles = [ 'atributo'  ]
				const findRelacionesDetalles = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
				const relaciones = await findRelacionesDetalles.getRelaciones()
				let det_cer = await db.sequelize.models.detalle_certificados.findOne({
					where:{
						[db.Sequelize.Op.or]: {
							id_certificado:operacion.id,
						},
					},
					include: relaciones
				})

				var id_atributo_keepro = 0;
			
				if(det_cer != null){
					operacion.detalle_certificado = det_cer
				
					if(operacion.tipo_contenedor != null){
						id_atributo_keepro = operacion.detalle_certificado.id_atributo_keepro;
						const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(id_atributo_keepro)
			
						if(!tiposContenedor.includes(operacion.tipo_contenedor.descripcion)){
							tiposContenedor.push(operacion.tipo_contenedor.descripcion)
							var sumaMxn = atributoKeepro.limite_inferior * tipoCambio
							var auxMxn = parseFloat(sumaMxn) - parseInt(sumaMxn)
							if(auxMxn < 0.1){
								sumaMxn = parseInt(sumaMxn)
							}else{
								sumaMxn = await round(atributoKeepro.limite_inferior * tipoCambio,6)
							}
							data.push({
								id: operacion.tipo_contenedor.id,
								id_usuario_registro:  operacion.tipo_contenedor.id_usuario_registro,
								descripcion: operacion.tipo_contenedor.descripcion,
								createdAt: operacion.tipo_contenedor.createdAt,
								updatedAt: operacion.tipo_contenedor.updatedAt,
								deletedAt: operacion.tipo_contenedor.deletedAt,
								sumasAseguradasUSD: [atributoKeepro.limite_inferior],
								sumasAseguradasMXN: [sumaMxn],
								tamanios_contenedor: operacion.tipo_contenedor.tamanios_contenedor
							
							})
						}else{
							const indexTipoContenedor = tiposContenedor.indexOf(operacion.tipo_contenedor.descripcion)
							if(!data[indexTipoContenedor].sumasAseguradasUSD.includes(atributoKeepro.limite_inferior)){
								data[indexTipoContenedor].sumasAseguradasUSD.push(atributoKeepro.limite_inferior)
							}
							var sumaMxn = atributoKeepro.limite_inferior * tipoCambio
							var auxMxn = parseFloat(sumaMxn) - parseInt(sumaMxn)
							if(auxMxn < 0.1){
								sumaMxn = parseInt(sumaMxn)
							}else{
								sumaMxn = await round(atributoKeepro.limite_inferior * tipoCambio,6)
							}
							if(!data[indexTipoContenedor].sumasAseguradasMXN.includes(sumaMxn)){
								data[indexTipoContenedor].sumasAseguradasMXN.push(sumaMxn)
							}
						}
						operacion.tipo_contenedor = data;
					}
					
				}

				operacion.factura = null
				operacion.cxc = null
				operacion.factura_pagada = null
				if(operacion.estatus === 'F'){
					const pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
					if(pedidoFactura !== null){
						let facturaDetalle
						const facturasDetalle = await db.sequelize.models.factura_detalles.findAll({where:{id_pedido_factura:pedidoFactura.id}})
						for(const facDetalle of facturasDetalle){
							const notaCredito = await db.sequelize.models.notas_credito.findOne({where:{id_factura:facDetalle.id_factura}})
							if(notaCredito === null){
								facturaDetalle = facDetalle
							}
						}
						if(facturaDetalle !== undefined){
							const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
							const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
							const factura = await db.sequelize.models.facturas.findByPk(facturaDetalle.id_factura, { include:relacionesFacturas})
							if(factura !== null){
								operacion.factura = factura
								const findRelacionesCxC = new Relaciones([],[],db.sequelize.models)
								const relacionesCxC = await findRelacionesCxC.getRelaciones()
								const cxc = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:factura.id}, include:relacionesCxC})
								if(cxc !== null){
									operacion.cxc = cxc
									operacion.factura_pagada = parseFloat(cxc.saldo) == 0
								}
							}
						}
					}
				}
				const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:idOficina, id_cliente: operacion.id_cliente}})
				const findRelacionesMAO = new Relaciones(['agente_venta_1', 'agente_venta_2'],['agente_venta_1', 'agente_venta_2'],db.sequelize.models)
				const relacionesMAO = await findRelacionesMAO.getRelaciones()
				const findRelacionesMAC = new Relaciones(['agente_operativo'],['agente_operativo'],db.sequelize.models)
				const relacionesMAC = await findRelacionesMAC.getRelaciones()
				const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: operacion.id_marca},include:relacionesMAO})
				const marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:operacion.id_cliente, id_marca: operacion.id_marca},include:relacionesMAC})
				operacion.agente_venta_1 = marcaAgenteOficina.agente_venta_1
				operacion.agente_venta_2 = marcaAgenteOficina.agente_venta_2
				operacion.agente_operativo = marcaAgenteCliente.agente_operativo

				const findRelacionesHistorico = new Relaciones([],[],db.sequelize.models)
				const relacionesHistorico = await findRelacionesHistorico.getRelaciones()
				var busquedaHistorico = {
					where: {
						id_registro: operacion.id,
						tabla: db.sequelize.models.certificados.name.toUpperCase()
					},
					include: relacionesHistorico,
					order: [['createdAt','DESC']]
				}
				const historico = await db.sequelize.models.historicos.findAll(busquedaHistorico);
				operacion.usuario_modifico = null
				if(historico.length > 0){
					operacion.usuario_modifico = historico[0].usuario_registro
				}
				const findRelacionesArchivo = new Relaciones(['archivo','usuario_registro'],['archivo','usuario_registro'],db.sequelize.models)
				const relArchivo = await findRelacionesArchivo.getRelaciones()
				operacion.archivos_operacion = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_certificado:operacion.id},include:relArchivo})
				operacion.pedido_factura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
				const fechaInicioCobertura = moment(moment(operacion.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City')
				const fechaCertifiacion = moment(moment(operacion.certifiedAt ?? operacion.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City')
				operacion.es_retroactivo = fechaInicioCobertura < fechaCertifiacion ? "Si" : "No"
			}
			let element
			if(req.query.keepro === 3 ){
				const dataReturn = { id: operacion.id}
				dataReturn.no_operacion = operacion.no_operacion
				dataReturn.no_seguridad = operacion.no_seguridad
				dataReturn.totalOperacion = {
					minimoVenta: operacion.detalle_certificado.minimo_venta,
					subTotal: operacion.detalle_certificado.subtotal,
					montoIva: operacion.detalle_certificado.monto_iva,
					importe: operacion.detalle_certificado.total
				}
				element = dataReturn
			}else{
				element = operacion
			}
			const idsProveedoresNoPermitidos = [6,7,8]
			if(idsProveedoresNoPermitidos.includes(element.proveedor.id) && req.query.keepro != 0){
				element.copy_and_edit = false
			}else{
				element.copy_and_edit = true
			}
			return res.status(200).send({ status: true, data: element});

		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function updateApi(req, res){
	const parametros = req.body;
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false;
		} 
		const registroAEditar = await db.sequelize.models.certificados.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const isContenedor = registroAEditar.tipo_cobertura.includes("contenedor")
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')};
	
		const validosOpcionales = [
			{campo:'datosAdicionales', tipo:'string',largo:6000, canNull: true},
			{campo:'ruta', tipo:'string',largo:255,textoCase:"up", canNull: true},
			{campo:'referencias', tipo:'string',largo:255,textoCase:"up", canNull: true}
		];
		if(!isContenedor){
			validosOpcionales.push({campo:'descripcionCarga', tipo:'string', largo:1000, canNull: true})
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res);
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0];
		seEdita = dataValidarOpcionales[1];
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const parametros = req.body;
	if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
		return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
	}
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	var registro = {
		updatedAt: moment().tz('America/Mexico_City')
	}
	try {
		const registroAEditar = await db.sequelize.models.certificados.findByPk(id, { include:['oficina_razon_social','detalle_certificado','oficina_razon_social'] });
		if(registroAEditar != null){
			const idsProveedoresNoPermitidos = [6,7,8]
			if(idsProveedoresNoPermitidos.includes(registroAEditar.id_proveedor) && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El proveedor seleccionado tiene restricciones para autoemisor por lo cual no se puede emitir esta operación. Por favor, comuníquese con su operativo para solicitarlo."});
			}
			const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(registroAEditar.oficina_razon_social.id_razon_social)
			if(razonSocialAux.bloqueado == true){
				return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
			}
			const beneficiario = await db.sequelize.models.beneficiarios.findByPk(registroAEditar.id_beneficiario,{paranoid: false});
			if(beneficiario.bloqueado == true){
				return res.status(400).send({ status: false, msg: "El Beneficiario se encuentra bloqueado" });
			}

			const cliente = await db.sequelize.models.clientes.findByPk(registroAEditar.id_cliente, { include:['detalles_cliente'] })
			if(cliente.detalles_cliente.bloqueado === true){
				return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
			}
			if(cliente.detalles_cliente.autoemisor != true && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El cliente no tiene acceso al autoemisor"});
			}

			let obligatorios = [{campo:'keepro', tipo:'number'}]
			//Se validan los paramtros obligatorios
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			//Se verifica que el parametro keepro este entre el rango de 0 y 3
			if(parametros.keepro < 0 || parametros.keepro > 3){
				return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
			}
			//Se verifica que el certificado no este bloqueado
			if(registroAEditar.estatus == "B"){
				return res.status(400).send({ status: false, msg: "La operación se encuentra bloqueada." });
			}
			//Se verifica que el certificado no este cancelado
			if(registroAEditar.estatus == "C"){
				return res.status(400).send({ status: false, msg: "La operación se encuentra cancelada." });
			}
			//Validar que la fecha de certificacion sea maximo 5 dias antes del dia actual
			if(registroAEditar.draft_certificado && parametros.keepro != 0){
				const fechaCertificado = moment(registroAEditar.certifiedAt).tz('America/Mexico_City').add(120, 'hours');
				const fechaActual = moment().tz('America/Mexico_City');
				if(fechaCertificado<fechaActual){
					return res.status(400).send({
						status: false,
						msg: "No se puede editar el certificado ya que la fecha en que se certifico no puede ser menor que la fecha actual"
					});
				}

			}
			//Si la operacion es draft o se edita desde operaciones, se puede editar TODO, al igual que se recalculan los totales
			if(!registroAEditar.draft_certificado || (parametros.keepro === 0 && registroAEditar.estatus != 'F')){
				return updateFull(registroAEditar,req, res)
			}

			const validosOpcionales =[{campo:'referencias', tipo:'string',largo:255,textoCase:"up"},
									  {campo:'ventaClienteFinal', tipo:'number'}]
			const modalidad = await db.sequelize.models.modalidades.findByPk(registroAEditar.id_modalidad);
			const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
			const isMaritimo = modalidadNombre == 'maritimo';
			if(isMaritimo){
				parametros.idBuque = 1
				validosOpcionales.push({campo:'idPuertoAeropuertoDestino', tipo:'model', model:db.sequelize.models.puertos_aeropuertos})
				validosOpcionales.push({campo:'idBuque', tipo:'model', model:db.sequelize.models.buques})
				validosOpcionales.push({campo:'numViaje', tipo:'string',largo:255,textoCase:"up"})
			}
			if(parametros.keepro == 0 && registroAEditar.draft_certificado == true){
				const atributoKeeproAux = await db.sequelize.models.atributos_keepro.findByPk(registroAEditar.detalle_certificado[0].id_atributo_keepro);
				const oficinaProductoAux = await db.sequelize.models.oficinas_productos.findByPk(atributoKeeproAux.id_oficina_producto, {include: [{ all: true } ]});
				const tipoCoberturaAux = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProductoAux.producto.id_tipo_cobertura, {include: [{ all: true } ]});
				const coberturaAux = tipoCoberturaAux.nombre.toLowerCase().split(" ");
				const isContenedorAux = coberturaAux.includes("contenedor")
				if(!isContenedorAux){
					validosOpcionales.push({campo:'descripcionCarga', tipo:'string', largo:1000})
				}
				validosOpcionales.push({campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados})
				validosOpcionales.push({campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados})
				validosOpcionales.push({campo:'ciudadOrigen', tipo:'string', textoCase:"up", largo:255})
				validosOpcionales.push({campo:'ciudadDestino', tipo:'string', textoCase:"up", largo:255})
				validosOpcionales.push({campo:'fechaInicioCobertura', tipo:'stringDate'})
				validosOpcionales.push({campo:'datosAdicionales', tipo:'string',largo:6000})
				validosOpcionales.push({campo:'ruta', tipo:'string',largo:255,textoCase:"up"})
				validosOpcionales.push({campo:'referencias', tipo:'string',largo:255,textoCase:"up"})
				validosOpcionales.push({campo:'idUbicacionesBienes', tipo:'model', model:db.sequelize.models.ubicaciones_bienes})
				const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeeproAux.id_oficina_producto);
				const atributosKeepro = await db.sequelize.models.atributos_keepro.findAll({
					where:{
						id: parametros.idAtributoKeePro
					}
				});
				if(parametros.idEstadoOrigen !== null && parametros.idEstadoOrigen !== undefined && parametros.idEstadoOrigen !== ""){
					const estadoOrigenAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
					const polizasPaises = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:registroAEditar.id_detalle_poliza,id_pais:estadoOrigenAux.id_pais}});
					for(const ak of atributosKeepro){
						if(ak.id_pais_origen !== null){
							if(!polizasPaises.includes(ak.id_pais_origen)){
								polizasPaises.push(ak.id_pais_origen)
							}
						}
					}
					if(polizasPaises.length == 0){
						return res.status(400).send({ status: false, msg: "No se puede editar el certificado, ya que el país de origen no está permitido por la póliza."});
					}
				}
				if(parametros.idEstadoDestino !== null && parametros.idEstadoDestino !== undefined && parametros.idEstadoDestino !== ""){
					const estadoDestinoAux2 = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);
					const polizasPaises = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:registroAEditar.id_detalle_poliza,id_pais:estadoDestinoAux2.id_pais}});
					for(const ak of atributosKeepro){
						if(ak.id_pais_origen !== null){
							if(!polizasPaises.includes(ak.id_pais_destino)){
								polizasPaises.push(ak.id_pais_destino)
							}
						}
					}
					if(polizasPaises.length == 0){
						return res.status(400).send({ status: false, msg: "No se puede editar el certificado, ya que el país de destino no está permitido por la póliza."});
					}
				}
				const territorialidadesValidas = await getPolizasTerritorialidades([registroAEditar.id_detalle_poliza])
				for(const ak of atributosKeepro){
					if(ak.id_pais_origen == ak.id_pais_destino && ak.id_pais_destino !== null){
						if(!territorialidadesValidas.includes(ak.id_pais_origen)){
							territorialidadesValidas.push(ak.id_pais_origen)
						}
					}
				}
				const estadoOrigenAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen !== null && parametros.idEstadoOrigen !== undefined && parametros.idEstadoOrigen !== "" ? parametros.idEstadoOrigen: registroAEditar.id_estado_origen)
				const estadoDestinoAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino !== null && parametros.idEstadoDestino !== undefined && parametros.idEstadoDestino !== "" ? parametros.idEstadoDestino: registroAEditar.id_estado_destino)
				if(estadoDestinoAux.id_pais ==  estadoOrigenAux.id_pais && !territorialidadesValidas.includes(estadoOrigenAux.id_pais)){
					return res.status(400).send({ status: false, msg: `El país del estado destino seleccionado es incorrecto para la póliza asignada`});
				}
				if(parametros.fechaInicioCobertura !== null && parametros.fechaInicioCobertura !== undefined && parametros.fechaInicioCobertura !== ""){
					if(parametros.fechaInicioCobertura != registroAEditar.fecha_inicio_cobertura){
						const inicioVigencia = moment(parametros.fechaInicioCobertura).tz('America/Mexico_City');
						const fechaHoyString = moment().tz('America/Mexico_City').format('YYYY-MM-DD');
						var fechaHoy = moment(fechaHoyString).tz('America/Mexico_City');
						if(fechaHoy > inicioVigencia){
							registro.retroactividad = true
						}else{
							registro.retroactividad = false
						}
						if(registro.retroactividad){
							fechaHoy = fechaHoy.subtract(5, 'days')
						}

						//validar fecha_inicio y fecha_fin
						if (inicioVigencia < fechaHoy) {
							return res.status(400).send({
								status: false,
								msg: "La fecha de inicio no puede ser menor que la fecha actual"
							});
						}
						if(registroAEditar.fecha_fin_cobertura != null){
							const finVigencia = moment(registroAEditar.fecha_fin_cobertura).tz('America/Mexico_City');
							//validar fecha_inicio y fecha_fin
							if (finVigencia < inicioVigencia) {
								return res.status(400).send({
									status: false,
									msg: "La fecha de inicio no puede ser mayor que a la fecha fin"
								});
							}
						}
					}
				}

			}
			const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
			if(dataValidarOpcionales == undefined){
				return undefined;
			}
			registro = dataValidarOpcionales[0]
			//Se valida el si es puerto/aeropuerto, si la modalidad de transprote es puerto o aeropuerto
			if(isMaritimo){
				if(parametros.idPuertoAeropuertoOrigen !== undefined){
					const puertoAeropuertoOrigen = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoOrigen);
					if(isMaritimo == puertoAeropuertoOrigen.tipo){
						return res.status(400).send({ status: false, msg: "El registro idPuertoAeropuertoOrigen debe ser" + (isMaritimo ? " puerto": "aeropuerto")});
					}
				}

				//valida que el buque seleccionado no tenga más de 20 o 25 años 
				const buque = await db.sequelize.models.buques.findByPk(parametros.idBuque, {include: ['tipo_buque']});
				const anioActual = moment().year();
				const diferenciaEnAños = anioActual - buque.anio_construccion;
				let antiguedadPermitida = 25;

				if(buque.tipo_buque == null){
					return res.status(400).send({ status: false, msg: `El buque no tiene un tipo de buque asignado o este se encuentra eliminado`});
				}

				//si es granelero permite mayor o igual a 20 años
				if(buque.tipo_buque.id == 2){
					antiguedadPermitida = 20;
				}
				
				if(diferenciaEnAños >= antiguedadPermitida){
					return res.status(400).send({ status: false, msg: `El buque ha rebasado el límite de temporalidad asignado.`});
				}
			}
			const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(registroAEditar.detalle_certificado[0].id_atributo_keepro);
			const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: [{ all: true } ]});
			const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura, {include: [{ all: true } ]});

			const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
			const isContenedor = cobertura.includes("contenedor")
			const isRC = cobertura.includes("rc")
			const have_rcAntes = registroAEditar.have_rc ?? false;
			if(parametros.haveRc === true && !isContenedor && !isRC){
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(registroAEditar.oficina_razon_social.id_razon_social);
				registro.id_proveedor = registroAEditar.id_proveedor
				registro.id_estado_origen = registroAEditar.id_estado_origen
				registro.id_estado_destino = registroAEditar.id_estado_destino
				registro.id_commodity = registroAEditar.id_commodity
				registro.id_cliente = registroAEditar.id_cliente
				registro.have_rc = await validRcDraft(registro,razonSocial.id_pais)
			} else if(parametros.haveRc !== undefined && registroAEditar.draft_certificado === false) {
				registro.have_rc = false
			}
			registro.keepro = registroAEditar.keepro
			registro.keepro_last_edit = parametros.keepro
			
			const registroAntes = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await registroAEditar.update(registro, { where: { id: registroAEditar.id } });
			const registroDespues = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await genHistorio(req,registroAEditar.id,db.sequelize.models.certificados,'EDICION',registroAntes,registroDespues)

			if(registro.have_rc  == true && registroAEditar.draft_certificado == true && have_rcAntes === false){
				const nuevoRegistro = await db.sequelize.models.certificados.findByPk(id);
				const detalleCertificado = await db.sequelize.models.detalle_certificados.findOne({where:{id_certificado:nuevoRegistro.id}});
				await certificadoRc(nuevoRegistro.toJSON(),detalleCertificado.toJSON(),req);
			}
			if(registroAEditar.draft_certificado == true){
				sendMailCertificado(registroAEditar.id, req.usuario)
			}else{
				sendMailDraft(registroAEditar.id, req.usuario)
			}

			return res.status(200).send({ status: true, msg: "Elemento editado correctamente"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function updateDates(req, res){
	const parametros = req.body;
	if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
		return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
	}
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	var registro = {}
	try {
		const registroAEditar = await db.sequelize.models.certificados.findByPk(id, { include:['oficina_razon_social','detalle_certificado','oficina_razon_social'] });
		if(registroAEditar != null){
			let obligatorios = [{campo:'keepro', tipo:'number'}]
			//Se validan los paramtros obligatorios
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			//Se verifica que el parametro keepro este entre el rango de 0 y 3
			if(parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
			}
			//Se verifica que el certificado no este bloqueado
			if(registroAEditar.estatus == "B"){
				return res.status(400).send({ status: false, msg: "La operación se encuentra bloqueada." });
			}
			//Se verifica que el certificado no este cancelado
			if(registroAEditar.estatus == "C"){
				return res.status(400).send({ status: false, msg: "La operación se encuentra cancelada." });
			}

			const validosOpcionales =[{campo:'createdAt', tipo:'stringDateFullTime'}]
			if(registroAEditar.draft_certificado == true){
				validosOpcionales.push({campo:'certifiedAt', tipo:'stringDateFullTime'})
			}
			const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
			if(dataValidarOpcionales == undefined){
				return undefined;
			}
			registro = dataValidarOpcionales[0]
			const dataUpdate = {}
			if(registro.created_at !== null && registro.created_at !== undefined && registro.created_at !== ""){
				dataUpdate.createdAt = moment(registro.created_at).tz('America/Mexico_City')
				dataUpdate.updatedAt = moment().tz('America/Mexico_City')
			}
			if(registroAEditar.draft_certificado == true && (registro.certified_at !== null && registro.certified_at !== undefined && registro.certified_at !== "")){
				dataUpdate.certifiedAt = moment(registro.certified_at).tz('America/Mexico_City')
				dataUpdate.updatedAt = moment().tz('America/Mexico_City')
			}
			const registroAntes = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await registroAEditar.update(dataUpdate, { where: { id: registroAEditar.id } });
			const registroDespues = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await genHistorio(req,registroAEditar.id,db.sequelize.models.certificados,'EDICION',registroAntes,registroDespues)

			return res.status(200).send({ status: true, msg: "Elemento editado correctamente"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function updateFull(registroAEditar,req, res){
	try {
		const parametros = req.body;
		var registro = {
			updatedAt: moment().tz('America/Mexico_City')
		}

		try {
			parametros.idMarca = 1
		} catch (error) {
			parametros.idMarca = undefined
		}
		var atributoKeepro = undefined
		var polizaDetalle = undefined
		var oficinaProducto = undefined
		var oficinaCliente = undefined
		var tipoCobertura = undefined
		var proveedor = undefined
		var marcaAgenteOficina = undefined
		var cliente = undefined
		var oficina = undefined
		//Se obtiene la poliza detalle 
		try {
			cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
			if(cliente.cliente_prospecto !== true){
				return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
			}
			atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idAtributoKeePro);
			if(atributoKeepro === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idAtributoKeePro = ${parametros.idAtributoKeePro} no encontrado`});
			}
			oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: ['marca_agente_oficina','producto']});
			if(oficinaProducto === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`});
			}
			const atributoKeeproAnterior = await db.sequelize.models.atributos_keepro.findByPk(registroAEditar.detalle_certificado[0].id_atributo_keepro);
			if(atributoKeeproAnterior.num_movimientos === 0 || atributoKeeproAnterior.fecha_vencimiento != null){
				const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
				const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);

				atributoKeepro = await getAtributo({
					idOficinaProducto: oficinaProducto.id,
					idBeneficiario: parametros.idBeneficiario,
					idCommodity: parametros.idCommodity,
					idTipoContenedor: parametros.idTipoContenedor,
					idPaisOrigen: estadoOrigen.id_pais,
					idPaisDestino: estadoDestino.id_pais,
					sumaAsegurada: parametros.sumaAsegurada,
					idMoneda: parametros.idMoneda,
				}, atributoKeeproAnterior.num_movimientos === 0 || atributoKeeproAnterior.fecha_vencimiento != null)
				if(atributoKeepro.status !== undefined){
					return res.status(400).send(atributoSelected);
				}
			}
			marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.marca_agente_oficina.id);
			oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente);
			//oficina = await db.sequelize.models.oficinas.findByPk(oficinaCliente.id_oficina)
			proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
			const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
			polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
			if(polizaDetalle === undefined){
				return res.status(400).send({ status: false, msg: "No existe poliza vigente"});
			} else if(polizaDetalle === null){
				return res.status(400).send({ status: false, msg: "No existe poliza detalle vigente"});
			}
			tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
		} catch (error) {
			return res.status(400).send({ status: false, msg: "No existe poliza vigente", error:error.toString()});
		}

		try {
			var filtoMarcaMoneda = {deletedAt: null};
			filtoMarcaMoneda.id_marca = parametros.idMarca
			const monedasMarcas = await db.sequelize.models.marcas_monedas.findAll({
				paranoid: false,
				where: filtoMarcaMoneda,
			})

			var filtroProveedorMoneda = {deletedAt: null};
			const proveedores = await getProveedores(atributoKeepro.id_oficina_producto)
			filtroProveedorMoneda.id_proveedor = {[db.Sequelize.Op.or]: proveedores}

			const proveedoresMonedas = await db.sequelize.models.proveedores_monedas.findAll({
				paranoid: false,
				where: filtroProveedorMoneda,
			})
			const idsMonedaMarcas = []
			const idsMonedaProveedor = []
			for(const monedaMarca of monedasMarcas){
				idsMonedaMarcas.push(monedaMarca.id_moneda)
			}
			for(const monedaProveedor of proveedoresMonedas){
				idsMonedaProveedor.push(monedaProveedor.id_moneda)
			}
			let validMoneda = false
			if(idsMonedaMarcas.includes(parametros.idMoneda) && idsMonedaProveedor.includes(parametros.idMoneda)){
				validMoneda = true
			}
			if(!validMoneda){
				return res.status(400).send({ status: false, msg: `La moneda seleccionada no es válida.`});
			}
		} catch (error) {
			return res.status(400).send({ status: false, msg: `La moneda seleccionada no es válida.`});
		}
		//Generación de campos obligatorios y opcionales según el tipo de cobertura de la poliza
		const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
		const isContenedor = cobertura.includes("contenedor")
		const isRC = cobertura.includes("rc")
		let fechaStringAux = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		let fechaBusqueda = moment(fechaStringAux).tz('America/Mexico_City')
	
		let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
		if(doit !== true){
			return doit
		}
		const tipoCambioSelectedAux = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaStringAux}});
		if(tipoCambioSelectedAux == null){
			return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
		}
		parametros.idTipoCambioFuturo = tipoCambioSelectedAux.id
		let obligatorios = [{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
							{campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados},
							{campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados},
							{campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}}},
							{campo:'idBeneficiario', tipo:'modelRelacionado', model:db.sequelize.models.clientes_beneficiarios, where:{where:{id_cliente:oficinaCliente.id_cliente,id_beneficiario:parametros.idBeneficiario}}},
							{campo:'idTipoCambioFuturo', tipo:'model', model:db.sequelize.models.tipos_cambio_futuro},
							{campo:'idModalidad', tipo:'model', model:db.sequelize.models.modalidades},
							{campo:'idAtributoKeePro', tipo:'model', model:db.sequelize.models.atributos_keepro},
							{campo:'idMoneda', tipo:'modelRelacionado', model:db.sequelize.models.marcas_monedas, where:{where:{id_marca:parametros.idMarca,id_moneda:parametros.idMoneda}}},
							{campo:'idUbicacionesBienes', tipo:'model', model:db.sequelize.models.ubicaciones_bienes},
							{campo:'keepro', tipo:'number'},
							{campo:'ciudadOrigen', tipo:'string', textoCase:"up", largo:255},
							{campo:'ciudadDestino', tipo:'string', textoCase:"up", largo:255},
        ]
		if(registroAEditar.draft_certificado != true){
			obligatorios.push({campo:'fechaInicioCobertura', tipo:'stringDate'})
		}
        const validosOpcionales =[{campo:'datosAdicionales', canNull:true, tipo:'string',largo:6000},
								  {campo:'ruta', canNull:true, tipo:'string',largo:600,textoCase:"up"},
								  {campo:'referencias', canNull:true, tipo:'string',largo:600,textoCase:"up"},
								  {campo:'ventaClienteFinal', canNull:true, tipo:'number'},
								  {campo:'deducible', tipo:'boolean'},
								  {campo:'redondo', tipo:'boolean'},
								  {campo:'fechaFinCobertura', tipo:'stringDate'}
        ]
		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
		if(razonSocialAux == null){
			return res.status(400).send({ status: false, msg: `La razón social no existe.`});
		}
		const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:parametros.idRazonSocial,id_marca:parametros.idMarca}})
		let razonValidada = true
		if(razonesSocialesValidaciones == null){
			const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
			const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
			if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
				razonValidada = false
			}
		} else{
			if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
				const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
				const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
				if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
					razonValidada = false
				}
				const fechaCreacionRSV = moment(razonesSocialesValidaciones.createdAt).tz('America/Mexico_City')
				const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
				if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
					razonValidada = true
				}
			}else{
				razonValidada = true
			}
		}
		if(!razonValidada){
			return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
		}
		if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
		}
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
		if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
			if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
			}
			if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
			}
		}
		//Se valida que el tipo de cambio sea el del dia de hoy 
		const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
		var tipoCambio = 1
		let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findByPk(parametros.idTipoCambioFuturo);
		if(tipoCambioSelected == undefined){
			return res.status(400).send({ status: false, msg: `Registro con id: idTipoCambioFuturo = ${parametros.idTipoCambioFuturo} no encontrado`});
		}
		if(tipoCambioSelected.fecha != fechaString){
			return res.status(400).send({ status: false, msg: `El tipo de cambio seleccionado debe ser el de hoy`});
		}
		if(moneda.clave != "USD"){
			tipoCambio = tipoCambioSelected.tipo_cambio
		}
		if(parametros.sumaAsegurada === undefined || parametros.sumaAsegurada === null){
			parametros.sumaAsegurada = parseFloat(registroAEditar.suma_asegurada)
		}

		if(isContenedor){
			const sumaBusqueda = parseFloat(parseFloat(parametros.sumaAsegurada / tipoCambio).toFixed(2))
			obligatorios.push({campo:'idTipoContenedor', tipo:'modelRelacionado', model:db.sequelize.models.polizas_tipo_contenedor, where:{where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor,suma_asegurada:sumaBusqueda}}})
			obligatorios.push({campo:'idTamanioContenedor', tipo:'model', model:db.sequelize.models.tamanios_contenedor})
			obligatorios.push({campo:'numContenedor', tipo:'string',largo:11,textoCase:"up"})
			parametros.idCommodity = undefined
			registro.id_commodity = null
			registro.descripcion_carga = null
			parametros.idTipoBienes = undefined
		} else{
			obligatorios.push({campo:'idCommodity', tipo:'modelRelacionado', canNull: true, model:db.sequelize.models.polizas_commoditys, where:{where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}}})
			obligatorios.push({campo:'descripcionCarga', tipo:'string', largo:1000})
			obligatorios.push({campo:'idTipoBienes', tipo:'model', model:db.sequelize.models.tipos_bienes})
			parametros.idTipoContenedor = undefined
			registro.id_tipo_contenedor = null
			registro.id_tamanio_contenedor = null
			registro.num_contenedor = null
		}
		//Generación de campos obligatorios según la modalidad de transporte
		const modalidad = await db.sequelize.models.modalidades.findByPk(parametros.idModalidad);
		const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
		const isMaritimo = modalidadNombre == 'maritimo';
		const isAereo = modalidadNombre == 'aereo';
		if(isMaritimo){
			parametros.idBuque = 1
			obligatorios.push({campo:'idBuque', tipo:'model', model:db.sequelize.models.buques})
			validosOpcionales.push({campo:'numViaje', tipo:'string',largo:255,textoCase:"up"})
		} else{
			registro.id_buque = null
			parametros.idBuque == undefined
		}
		if(isMaritimo || isAereo){
			obligatorios.push({campo:'idPuertoAeropuertoOrigen', tipo:'model', model:db.sequelize.models.puertos_aeropuertos})
			obligatorios.push({campo:'idPuertoAeropuertoDestino', tipo:'model', model:db.sequelize.models.puertos_aeropuertos})
		}
		if(!isMaritimo && !isAereo){
			parametros.idPuertoAeropuertoOrigen = undefined
			parametros.idPuertoAeropuertoDestino = undefined
			parametros.numViaje = undefined
			registro.id_puerto_aeropuerto_origen = null
			registro.id_puerto_aeropuerto_destino = null
			registro.num_viaje = null
		}
		//Se validan los paramtros obligatorios
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		//Si la poliza detalles permite viaje redondo y el cliente envia el parametro redondo como true, se agrega el parametro obligatorio idEstadoDesitnoRedondo y ciudadRedondo
		const estadoDestinoAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino)
		const polizaTerritorialidad = await db.sequelize.models.poliza_territorialidad.findAll({where:{id_poliza_detalle:polizaDetalle.id, id_pais:estadoDestinoAux.id_pais}})

		if(parametros.redondo === true && polizaDetalle.is_redondo === true && polizaTerritorialidad.length > 0){

			obligatorios.push({campo:'idEstadoDestinoRedondo', tipo:'model', model:db.sequelize.models.estados})
			obligatorios.push({campo:'ciudadDestinoRedondo', tipo:'string', textoCase:"up", largo:255})
		}else{
			registro.redondo = false
			parametros.redondo = false
		}
		//Se validan los paramtros obligatorios
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		//valida que el buque seleccionado no tenga más de 20 o 25 años 
		if(isMaritimo){
			const buque = await db.sequelize.models.buques.findByPk(parametros.idBuque, {include: ['tipo_buque']});
			const anioActual = moment().year();
			const diferenciaEnAños = anioActual - buque.anio_construccion;
			let antiguedadPermitida = 25;

			if(buque.tipo_buque == null){
				return res.status(400).send({ status: false, msg: `El buque no tiene un tipo de buque asignado o este se encuentra eliminado`});
			}

			//si es granelero permite mayor o igual a 20 años
			if(buque.tipo_buque.id == 2){
				antiguedadPermitida = 20;
			}
			
			if(diferenciaEnAños >= antiguedadPermitida){
				return res.status(400).send({ status: false, msg: `El buque ha rebasado el límite de temporalidad asignado.`});
			}
		}

		const oficinaRazonSocial = await db.sequelize.models.oficinas_razones_sociales.findOne({where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}})
		registro.id_oficina_razon_social = oficinaRazonSocial.id
		registro.id_razon_social = undefined
		//Se validan los parametros opcionales
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		//Se verifica que el parametro keepro este entre el rango de 0 y 3
		if(parametros.keepro < 0 || parametros.keepro > 3){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
		}
		if(parametros.keepro != 0){
			registro.retroactividad = false
		}

		const estadoOrigenAux = await db.sequelize.models.estados.findByPk(registro.id_estado_origen);
		const estadoDestinoAux2 = await db.sequelize.models.estados.findByPk(registro.id_estado_destino);
		if(atributoKeepro.id_pais_origen == null){
			const polizasPaises = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:estadoOrigenAux.id_pais}});
			if(polizasPaises.length == 0){
				return res.status(400).send({ status: false, msg: "No se puede generar el certificado, ya que el país de origen no está permitido por la póliza."});
			}
		}
		if(atributoKeepro.id_pais_destino == null){
			const polizasPaises = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:estadoDestinoAux2.id_pais}});
			if(polizasPaises.length == 0){
				return res.status(400).send({ status: false, msg: "No se puede generar el certificado, ya que el país de destino no está permitido por la póliza."});
			}
		}
		const inicioVigencia = moment(parametros.fechaInicioCobertura).tz('America/Mexico_City');
		if(registroAEditar.draft_certificado != true){
			const fechaHoyString = moment().tz('America/Mexico_City').format('YYYY-MM-DD');
			var fechaHoy = moment(fechaHoyString).tz('America/Mexico_City');
			if(fechaHoy > inicioVigencia){
				registro.retroactividad = true
			}else{
				registro.retroactividad = false
			}
			
			if(registro.retroactividad && parametros.keepro === 0){
				fechaHoy = fechaHoy.subtract(5, 'days')
			}

			//validar fecha_inicio y fecha_fin
			if (inicioVigencia < fechaHoy) {
				return res.status(400).send({
					status: false,
					msg: "La fecha de inicio no puede ser menor que la fecha actual"
				});
			}
		}
		if(parametros.fechaFinCobertura != undefined && parametros != null){
			const finVigencia = moment(parametros.fechaFinCobertura).tz('America/Mexico_City');
			//validar fecha_inicio y fecha_fin
			if (finVigencia < inicioVigencia) {
				return res.status(400).send({
					status: false,
					msg: "La fecha de inicio no puede ser mayor que a la fecha fin"
				});
			}
		}else{
			registro.fecha_fin_cobertura = null
		}
		//Si el atributo permite que sea deducible y el cliente envia el parametro deducible como true, se almacena el campo de deducible como true
		if(parametros.deducible === true && atributoKeepro.is_deducible === true){
			parametros.deducible = true
		} else{
			registro.deducible = false
			parametros.deducible = false
		}
		//Se valida que el estado destino redondo tenga nacionalidad mexicana, en caso de que sea redondo el viaje
		if(parametros.redondo === true){
			const estadoDestinoRedondo = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestinoRedondo, {include: ['pais']});
			const nombrePaisDestinoRedondo = await ManipuladorCadenas.quitarAcentos(estadoDestinoRedondo.pais.descripcion.toLowerCase());
			if(nombrePaisDestinoRedondo != "mexico"){
				return res.status(400).send({ status: false, msg: `El país del estado destino redondo debe ser México`});
			}
		}else{
			registro.estado_destino_redondo = null
		}
		//Se valida el tamaño de contenedor seleccionado, en caso de ser contenedor el tipo de poliza
		if(isContenedor){
			const tipoContenedor = await db.sequelize.models.tipo_contenedor.findByPk(parametros.idTipoContenedor, {include: ['tamanios_contenedor']});
			var tamanioValido = false
			await tipoContenedor.tamanios_contenedor.forEach(tamanioContenedor => {
				if(!tamanioValido){
					if(tamanioContenedor.id == parametros.idTamanioContenedor){
						tamanioValido = true
					}
				}
			});
			if(!tamanioValido){
				return res.status(400).send({ status: false, msg: `Registro con id: idTamanioContenedor = ${parametros.idTamanioContenedor} no encontrado`});
			}
			const numViaje = registro.num_contenedor
			if(!await validNumContenedor(numViaje)){
				return res.status(400).send({ status: false, msg: 'El número de contenedor debe tener exactamente 11 caracteres: 4 letras mayúsculas seguidas de 7 números (Ejemplo: ABCD1234567).'});
			}
		}
		//Se valida el si es puerto/aeropuerto, si la modalidad de transprote es puerto o aeropuerto
		if(isMaritimo || isAereo){
			const puertoAeropuertoOrigen = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoOrigen);
			if(!isAereo == puertoAeropuertoOrigen.tipo){
				return res.status(400).send({ status: false, msg: "El registro idPuertoAeropuertoOrigen debe ser" + (isMaritimo ? " puerto": "aeropuerto")});
			}
			const puertoAeropuertoDestino = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoDestino);
			if(!isAereo == puertoAeropuertoDestino.tipo){
				return res.status(400).send({ status: false, msg: "El registro idPuertoAeropuertoDestino debe ser" + (isMaritimo ? " puerto": "aeropuerto")});
			}
		}
		
		//En caso de que el tipo de cobertura sea distinta a contenedor, se validan los limites del commoditie y del atributo
		if(!isContenedor){
			const limiteInferiorAtributo = atributoKeepro.limite_inferior == 0 ? null : atributoKeepro.limite_inferior
			const limiteSuperiorAtributo = atributoKeepro.limite_superior == 0 ? null : atributoKeepro.limite_superior
			const commoditieEncontrado = await db.sequelize.models.polizas_commoditys.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}});
			const commoditieSeleccionado = commoditieEncontrado[0].toJSON()
			const limitesCommoditie = {
				'maritimo': commoditieSeleccionado.limite_maritimo,
				'aereo': commoditieSeleccionado.limite_aereo,
				'terrestre': commoditieSeleccionado.limite_terrestre,
				'ferroviario': commoditieSeleccionado.limite_ferroviario,

			}
			
			var limiteMaximo = polizaDetalle.limite_maximo
			var limiteMinimo = polizaDetalle.limite_minimo

			if(parseFloat(limitesCommoditie[modalidadNombre]) !== NaN){
				limiteMaximo = limitesCommoditie[modalidadNombre]
			}

			if(parseFloat(limiteSuperiorAtributo) !== NaN){
				if(limiteSuperiorAtributo > limiteMaximo){
					limiteMaximo = limiteSuperiorAtributo
				}
			}
			if(parseFloat(limiteInferiorAtributo) !== NaN){
				if(limiteInferiorAtributo < limiteMinimo){
					limiteMinimo = limiteInferiorAtributo
				}
			}
			var limiteMaximoMoneda = (limiteMaximo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: moneda.clave });
			var limiteMinimoMoneda = (limiteMinimo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: moneda.clave });
			
			const sumaAseguradaUSD = parametros.sumaAsegurada /tipoCambio
			if(limiteMaximo < sumaAseguradaUSD){
				let mensaje = "La suma asegurada debe ser menor o igual a "
				if(isRC){
					mensaje = "La suma asegurada debe ser "
				}
				return res.status(400).send({ status: false, msg: mensaje + limiteMaximoMoneda});
			}
			if(limiteMinimo > sumaAseguradaUSD){
				let mensaje = "La suma asegurado debe ser mayor o igual a "
				if(isRC){
					mensaje = "La suma asegurada debe ser "
				}
				return res.status(400).send({ status: false, msg: mensaje + limiteMinimoMoneda});
			}
		}else{
			registro.suma_asegurada = atributoKeepro.limite_inferior * tipoCambio
		}
		const have_rcAntes = registroAEditar.have_rc ?? false;
		if(parametros.haveRc === true && !isContenedor && !isRC){
			const razonSocial = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
			registro.id_proveedor = atributoKeepro.id_proveedor
			registro.have_rc = await validRcDraft(registro,razonSocial.id_pais)
		} else if(parametros.haveRc !== undefined && registroAEditar.draft_certificado === false) {
			registro.have_rc = false
		}
		registro.tipo_cobertura = tipoCobertura.nombre
		registro.keepro = registroAEditar.keepro
		registro.keepro_last_edit = parametros.keepro
		registro.suma_asegurada = parametros.sumaAsegurada
		registro.proveedor = proveedor.id
		registro.id_poliza = polizaDetalle.id_poliza
		registro.id_detalle_poliza = polizaDetalle.id
		registro.estatus = 'N'
		registro.id_proveedor = atributoKeepro.id_proveedor

		req.body.idOficinaProducto =  atributoKeepro.id_oficina_producto

		const parametrosTotales = req.body;
		const totales = await getTotalesLocal(parametrosTotales,req, res)
		if(totales === undefined){
			return ''
		} else if(totales.status !== true){
			return res.status(400).send(totales)
		}
		registro.tipo_operacion = totales.tramoEmbarge
		registro.tramo_embarque = totales.tramoEmbarge == 'Nacional' ? 'Nacional' : 'Internacional'




		const registroDetalles = {
			id_certificado: registroAEditar.id,
			id_atributo_keepro: atributoKeepro.id,
			id_usuario_registro: req.usuario.id,
			tarifa_final_cliente: totales.tarifaVentaCliente,
			minimo_venta: totales.minimoVenta,
			tarifa_mediador: totales.tarifaMediadorMercantil,
			minimo_mediador: totales.minimoMediador,
			subtotal: totales.subTotal,
			monto_iva: totales.montoIva,
			porcentaje_iva: totales.iva,
			descuento_porcentaje: totales.descuento,
			descuento_monto: totales.montoDescuento,
			total: totales.total,
			retencion_porcentaje: totales.retencion,
			retencion_monto: totales.montoRetencion,
			subtotal_sobreventa: totales.sobreVenta,
			tarifa_compra: totales.tarifaCompraFinal,
			minimo_compra: totales.minimoCompra,
			costo_compra: totales.costoCompra,
			profit: totales.profit,
			updatedAt: moment().tz('America/Mexico_City')

		}
		const detallesAEditarList = await db.sequelize.models.detalle_certificados.findAll({where:{id_certificado:registroAEditar.id}});
		const detallesAEditar = await db.sequelize.models.detalle_certificados.findByPk(detallesAEditarList[0].id);
		const detalleCertificado = await updateDetalles(req,detallesAEditar,registroDetalles)

		const registroAntes = await db.sequelize.models.certificados.findByPk(registroAEditar.id,{include:['detalle_certificado']});
		await registroAEditar.update(registro, { where: { id: registroAEditar.id } });
		const registroDespues = await db.sequelize.models.certificados.findByPk(registroAEditar.id,{include:['detalle_certificado']});
		await genHistorio(req,registroAEditar.id,db.sequelize.models.certificados,'EDICION',registroAntes,registroDespues)

		if(registro.have_rc  == true && registroAEditar.draft_certificado == true && have_rcAntes === false){
			const nuevoRegistro = await db.sequelize.models.certificados.findByPk(registroAEditar.id);
			const detalleCertificado = await db.sequelize.models.detalle_certificados.findOne({where:{id_certificado:nuevoRegistro.id}});
			await certificadoRc(nuevoRegistro.toJSON(),detalleCertificado.toJSON(),req);
		}
		if(registroAEditar.draft_certificado == true){
			sendMailCertificado(registroAEditar.id, req.usuario)
		}else{
			sendMailDraft(registroAEditar.id, req.usuario)
		}
		const certificado = registroAEditar.toJSON()
		certificado.detalle_certificado = detalleCertificado.toJSON()
		return res.status(200).send({ status: true, msg: "Elemento editado correctamente"});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function cancelar(req,res){
	const parametros = req.body;
	if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
		return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
	}
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		var registro = {
			updatedAt: moment().tz('America/Mexico_City')
		}
		const registroACancelar = await db.sequelize.models.certificados.findByPk(id, { include:['oficina_razon_social'] });
		if(registroACancelar != null){
			const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(registroACancelar.oficina_razon_social.id_razon_social)
			if(razonSocialAux.bloqueado == true){
				return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
			}
			const beneficiario = await db.sequelize.models.beneficiarios.findByPk(registroACancelar.id_beneficiario,{paranoid: false});
			if(beneficiario.bloqueado == true){
				return res.status(400).send({ status: false, msg: "El Beneficiario se encuentra bloqueado" });
			}
			const cliente = await db.sequelize.models.clientes.findByPk(registroACancelar.id_cliente, { include:['detalles_cliente'] });
			if(cliente.detalles_cliente.bloqueado === true){
				return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
			}
			if(cliente.detalles_cliente.autoemisor != true && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El cliente no tiene acceso al autoemisor"});
			}

			if(registroACancelar.deletedAt != null){
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			if(registroACancelar.estatus == 'C'){
				return res.status(400).send({ status: false, msg: "Registro ya cancelado" });
			}
			if(registroACancelar.estatus == 'F'){
				const pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({ where: {
					id_certificado: registroACancelar.id
				}});
				if(pedidoFactura !== null){
					if(pedidoFactura.estatus == 'F'){
						return res.status(400).send({ status: false, msg: "Certificado facturado" });
					}
				}
			}
			let obligatorios = [{campo:'keepro', tipo:'number'}]
			//Se validan los paramtros obligatorios
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			//Se verifica que el parametro keepro este entre el rango de 0 y 3
			if(parametros.keepro < 0 || parametros.keepro > 3){
				return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
			}
			if(registroACancelar.draft_certificado){
				if(parametros.keepro != 0){
					return res.status(400).send({
						status: false,
						msg: "No se permite cancelar documentos desde autoemisor"
					});
				}
				registro.estatus = "C"
			}else{
				registro.estatus = "C"
			}

			const pedidosFactura = await db.sequelize.models.pedidos_factura.findAll({where:{
				id_certificado: id
			}});
			for(const pedido of pedidosFactura){
				await pedido.destroy({ where: { id: pedido.id } });
			}
			const registroAntes = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await registroACancelar.update(registro, { where: { id: registroACancelar.id } });
			const registroDespues = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
			await genHistorio(req,registroACancelar.id,db.sequelize.models.certificados,'CANCELAR',registroAntes,registroDespues)
			return res.status(200).send({ status: true, msg: "Elemento cancelado correctamente"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function certificarDraft(req,res){
	const parametros = req.body;
	if(req.usuario.fecha_terminos_condiciones == null && parametros.keepro != 0){
		return res.status(400).send({ status: false, msg: "Para generar operaciones, es necesario aceptar los términos y condiciones de la plataforma"});
	}
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	try {
		var registro = {
			updatedAt: moment().tz('America/Mexico_City'),
			certifiedAt: moment().tz('America/Mexico_City')
		}
		const registroAEditar = await db.sequelize.models.certificados.findByPk(id,{include:['detalle_certificado']});
		if(registroAEditar != null){
			const rolesUsuario = await db.sequelize.models.roles_usuarios.findOne({where:{id_role: 132, id_usuario: req.usuario.id}});
			if(rolesUsuario != null){
				return res.status(400).send({ status: false, msg: "No se permite certificar." });
			}
			const idsProveedoresNoPermitidos = [6,7,8]
			if(idsProveedoresNoPermitidos.includes(registroAEditar.id_proveedor) && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El proveedor seleccionado tiene restricciones para autoemisor por lo cual no se puede emitir esta operación. Por favor, comuníquese con su operativo para solicitarlo."});
			}
			const beneficiario = await db.sequelize.models.beneficiarios.findByPk(registroAEditar.id_beneficiario,{paranoid: false});
			if(beneficiario.bloqueado == true){

				return res.status(400).send({ status: false, msg: "El Beneficiario se encuentra bloqueado" });
			}
			const cliente = await db.sequelize.models.clientes.findByPk(registroAEditar.id_cliente, { include:['detalles_cliente'] });
			if(cliente.detalles_cliente.bloqueado === true){
				return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
			}
			if(cliente.detalles_cliente.autoemisor != true && parametros.keepro != 0){
				return res.status(400).send({ status: false, msg: "El cliente no tiene acceso al autoemisor"});
			}
			const certificadoAux = await db.sequelize.models.certificados.findByPk(id,{include:['oficina_razon_social']});
			const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(certificadoAux.oficina_razon_social.id_razon_social, {include: ['regimen_fiscal']})
			if(razonSocialAux.bloqueado == true){
				return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
			}
			const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
			if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
				if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
					return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
				}
				if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
					return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
				}
			}
			let obligatorios = [{campo:'keepro', tipo:'number'}]
			//Se validan los paramtros obligatorios
			registro = await Validaciones.validParametros(req, res,obligatorios,registro);
			if(!registro){
				return '';
			}
			//Se verifica que el parametro keepro este entre el rango de 0 y 3
			if(parametros.keepro < 0 || parametros.keepro > 3){
				return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
			}
			const modalidad = await db.sequelize.models.modalidades.findByPk(registroAEditar.id_modalidad);
			const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
			const isMaritimo = modalidadNombre == 'maritimo';
			const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
			const fechaSalida = moment(registroAEditar.fecha_inicio_cobertura).tz('America/Mexico_City');
			var fechaActualSoloDia = moment().tz('America/Mexico_City').startOf('day');
			const fechaHace30Dias = moment().tz('America/Mexico_City').subtract(30, 'days').format('YYYY-MM-DD HH:mm:ss');
			if(registroAEditar.draft_certificado){
				return res.status(400).send({ status: false, msg: 'La operación ya es certificado' });
			}
			if(registroAEditar.retroactividad && parametros.keepro === 0){
				fechaActualSoloDia = fechaActualSoloDia.subtract(5, 'days')
			}
			if(fechaSalida<fechaActualSoloDia  && parametros.keepro != 0){
				return res.status(400).send({
					status: false,
					msg: "No se puede certificar ya que la fecha de inicio no puede ser menor que la fecha actual"
				});
			}
			const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(registroAEditar.detalle_certificado[0].id_atributo_keepro);
			if(atributoKeepro.num_movimientos != null){
				if(atributoKeepro.num_movimientos < 1){
					return res.status(400).send({ status: false, msg: "No se puede generar el certificado, ya que la tarifa cargada ha llegado al límite de movimientos permitidos. Por favor, contacte a su operativo."});
				}
			}
			if(isMaritimo){
				const buque = await db.sequelize.models.buques.findByPk(registroAEditar.id_buque,{ paranoid: false });
				if(buque.nombre.toLowerCase() != "por definir"){
					var whereFind = {
						where: {
							id_detalle_poliza: registroAEditar.id_detalle_poliza,
							draft_certificado: true,
							id_buque: registroAEditar.id_buque,
							certifiedAt: {
								[db.Sequelize.Op.and]: [
									{ [db.Sequelize.Op.gte]: fechaHace30Dias },
									{ [db.Sequelize.Op.lte]: fechaActual }      
								]
							},
							deletedAt: null
						}
					}
					const moneda = await db.sequelize.models.monedas.findByPk(registroAEditar.id_moneda);
					var tipoCambio = 1
					if(moneda.clave == "MXN"){
						const tipoCambioCertificado = await db.sequelize.models.tipos_cambio_futuro.findByPk(registroAEditar.id_tipo_cambio_futuro);
						tipoCambio = tipoCambioCertificado.tipo_cambio
					}
					const registrosEncontrados = await db.sequelize.models.certificados.findAll(whereFind);
					var sumaAseguradaUltimos30Dias = registroAEditar.suma_asegurada / tipoCambio
					for (let index = 0; index < registrosEncontrados.length; index++) {
						const certificado = registrosEncontrados[index];
						let monedaCertificado = await db.sequelize.models.monedas.findByPk(certificado.id_moneda);
						var tipoCambio = 1
						if(monedaCertificado.clave == "MXN"){
							let tipoCambioCerti = await db.sequelize.models.tipos_cambio_futuro.findByPk(certificado.id_tipo_cambio_futuro);
							tipoCambio = tipoCambioCerti.tipo_cambio
						}
						let sumaCertificado = certificado.suma_asegurada / tipoCambio
						sumaAseguradaUltimos30Dias = sumaAseguradaUltimos30Dias + sumaCertificado
					}
					if(sumaAseguradaUltimos30Dias > 2000000){
						return res.status(400).send({ status: false, msg: 'No se puede certificar ya que el buque supera el limite de aseguramiento', sumaAseguradaUltimos30Dias:sumaAseguradaUltimos30Dias });
					}
				}
			}
			if(atributoKeepro.num_movimientos != null){
				await atributoKeepro.update({num_movimientos: atributoKeepro.num_movimientos - 1}, { where: { id: atributoKeepro.id } });
			}
			registro.id_usuario_registro = req.usuario.id
			registro.draft_certificado = true
			registro.keepro_last_edit = parametros.keepro
			const env = process.env.NODE_ENV;
			if(parametros.keepro === 0 && env == '__producction__'){
				if(parametros.archivos === undefined){
					return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
				}
				const archivos = parametros.archivos ?? []
				if(archivos.length < 1 && Array.isArray(archivos)){
					return res.status(400).send({status:false , msg: `El parametro archivos no debe estar vacío.` });
				}
				if(archivos.length < 2){
					return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
				}
				for(const archivo of archivos){
					const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(archivo);
					if(registroEncontrado === null){
						return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos dos documentos para poder certificar.`});
					}
				}
				const documentosEncontrados = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_carga_archivo: {[db.Sequelize.Op.or]: archivos}}});
				
				if(documentosEncontrados.length > 0){
					return res.status(400).send({ status: false, msg: `Uno o mas documentos ya fue utilizado para un certificado previo, es importante suba nuevos documentos.`});
				}
				for(const archivo of archivos){
					let registroDocs = {
						createdAt: moment().tz('America/Mexico_City'),
						id_carga_archivo: archivo,
						id_certificado:registroAEditar.id ,
						id_usuario_registro: req.usuario.id
					}
					await db.sequelize.models.certificados_documentos_operaciones.create(registroDocs);
				}
			}
			
			const registroAntes = await db.sequelize.models.certificados.findByPk(registroAEditar.id,{include:['detalle_certificado']});
			await registroAEditar.update(registro, { where: { id: registroAEditar.id } });
			const registroDespues = await db.sequelize.models.certificados.findByPk(registroAEditar.id,{include:['detalle_certificado']});
			res.status(200).send({ status: true, msg: "Draft certificado" });
			await genHistorio(req,registroAEditar.id,db.sequelize.models.certificados,'CERTIFICADO',registroAntes,registroDespues)
			sendMailCertificado(id, req.usuario)
			await facturar(registroAEditar.id,registroAEditar.id_cliente,req.usuario)
			if(registroAEditar.have_rc){
				const registroCertificadosRc = await certificadoRc(registroAEditar.toJSON(),registroAEditar.detalle_certificado[0].toJSON(),req)
				if(registroCertificadosRc !== undefined){
					return res.status(200).send(registroCertificadosRc);
				}
			}
			return null
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function genNoOperacion(claveMarcaAgenteOficina,idRazonSocial,oficina){
	var claveRazonSocial = undefined
	await oficina.razones_sociales.forEach((oficinaRazonSocial,index) => {
		if(oficinaRazonSocial.id_razon_social == idRazonSocial){
			claveRazonSocial = (index +1)
		}
	});
	const auxClave = claveMarcaAgenteOficina.split("-")
	const claveOficina = auxClave[0] + "-" + auxClave[1] + "-" + (Number.isInteger(parseInt(auxClave[2])) ? ManipuladorCadenas.obtenerLetra(auxClave[2]) : auxClave[2])
	var noOperacion = claveOficina + "-" + ManipuladorCadenas.obtenerLetra(claveRazonSocial)

	var whereFind = {
		where: {
			no_operacion: {[db.Sequelize.Op.like]: `%${noOperacion}%`}
		},paranoid: false
	}
	const registrosEncontrados = await db.sequelize.models.certificados.findAll(whereFind);
	var countOperaciones = 0;
	for(const registro of registrosEncontrados){
		const listNoOperacion = registro.no_operacion.split("-")
		if(!listNoOperacion.includes('RCD2DL')){
			countOperaciones = countOperaciones +1
		}
	}
	noOperacion = noOperacion + "-" + (countOperaciones +1)
	return noOperacion
}

async function getNumAleatorio(data){
    const fechaActualMillis = moment().tz('America/Mexico_City').valueOf();
	const rng = seedrandom(fechaActualMillis.toString() + data); 
	let numeroAleatorio = '';

    for (let i = 0; i < 17; i++) {
        const digito = Math.floor(rng() * 10);
        numeroAleatorio += digito.toString();
    }

    return numeroAleatorio;
}

async function validNumContenedor(cadena){
    const formatoValido = /^[A-Z]{4}\d{7}$/;
	return formatoValido.test(cadena)
}

async function storeDetalles(registro){
	const nuevoRegistro = await db.sequelize.models.detalle_certificados.create(registro);
	return nuevoRegistro;
}

async function updateDetalles(req,registroAEditar,registro){
	await registroAEditar.update(registro, { where: { id: registroAEditar.id } });
	return registroAEditar;
}

async function genHistorio(req,idRegistro,modelo,accion,registroAEditar,registrosActuales){
	// registro de historico
	var registro2 = {
		id_usuario_registro: req.usuario.id,
		id_registro: parseInt(idRegistro),
		tabla: modelo.name.toUpperCase(),
		accion: accion,
		createdAt: moment().tz('America/Mexico_City')
	}
	
	//encriptación para actualizar
	const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEditar);
	registro2.encriptacion_previa = stringEncriptado;

	const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
	registro2.encriptacion_posterior = stringEncriptado2;
	await db.sequelize.models.historicos.create(registro2);
}

async function indexHistoricos(req, res) {
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    const filtro = await getFiltro(req.query);

	var whereFind = {
		where: {
			id_registro: id,
			tabla: db.sequelize.models.certificados.name.toUpperCase()
		}
	}
	const registrosEncontrados = await db.sequelize.models.historicos.findAll(whereFind);
	const data = []
	for (let index = 0; index < registrosEncontrados.length; index++) {
		let reg = {}
		const registro = registrosEncontrados[index];
		let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
		reg.id = registro.id
		reg.usuario_registro = {id: usuario.id, nombre: usuario.nombre}
		reg.accion = registro.accion
		let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa)
		let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior)
		reg.encriptacion_previa = datosDesencriptadosPrevia
		reg.encriptacion_posterior = datosDesencriptadosPosterior
		reg.createdAt = registro.createdAt
		data.push(reg)
	}
	return res.status(200).send({
		success: true,
		total: data.length,
		data: data
	});
}

async function showHistoricos(req, res) {
	const { id } = req.params;
	const perfilesValidos = ['all']
	var generarRelaciones = false
	if(perfilesValidos.includes(req.query.perfil)){
		if(req.query.perfil == 'all'){
			generarRelaciones =  true 
		}
	}
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    let reg = {}
	let registro = await db.sequelize.models.historicos.findByPk(id);

	if(registro === null){
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} 
	if(registro.tabla != db.sequelize.models.certificados.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud certificados" });
	} 
	let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
	reg.id = registro.id
	reg.usuario_registro = {id: usuario.id, nombre: usuario.nombre}
	reg.accion = registro.accion
	let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa)
	let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior)
	if(generarRelaciones){
		reg.encriptacion_previa = await getRelaciones(datosDesencriptadosPrevia)
		reg.encriptacion_posterior = await getRelaciones(datosDesencriptadosPosterior)
	}
	reg.encriptacion_previa = datosDesencriptadosPrevia
	reg.encriptacion_posterior = datosDesencriptadosPosterior
	reg.createdAt = registro.createdAt
	return res.status(200).send({
		success: true,
		data: reg
	});
}

async function getRelaciones(registro){
	const relaciones = []
	//Se obtienen las relaciones BelongsTo
	for (const key in registro) {
		let arrayCampo = key.split("_")
		if(arrayCampo.length > 1 && arrayCampo.includes("id")){
			let nameRelacion = ""
			for (let index = 0; index < arrayCampo.length; index++) {
				const ler = arrayCampo[index];
				if(index == 1){
					nameRelacion = nameRelacion  + ler
				} else if(index > 1){
					nameRelacion = nameRelacion  + "_" + ler
				}
				
			}
			relaciones.push(nameRelacion)
		}
	}
	const RelaccionHistorico = new RelacionesHistorico(relaciones,db.sequelize.models,registro)
	registro = await RelaccionHistorico.getRelaciones()
	const relacionesBelongsTo = []
	const foreignKeys = []
	for (const modelo of Object.values(db.sequelize.models)) {
		let asociaciones = modelo.associations
		for (const asociacion of Object.values(asociaciones)) {
			if(asociacion.target.name == db.sequelize.models.certificados.name){
				if(asociacion.associationType == 'BelongsTo'){
					if(!relacionesBelongsTo.includes(modelo.name)){
						relacionesBelongsTo.push(modelo.name)
						foreignKeys.push(asociacion.foreignKey)
					}
				}
			}
		}
	}
	const RelacionesBelongsTo = new RelacionesHistorico(relacionesBelongsTo,db.sequelize.models,registro,foreignKeys)
	return await RelacionesBelongsTo.getRelacionesBelongTo()
}

async function getPolizasTerritorialidades(polizasDetalles){
    const docs = await db.sequelize.models.poliza_territorialidad.findAll({
		where: {id_poliza_detalle:{[db.Sequelize.Op.or]: polizasDetalles}}
	})
	const paisesValidosRepetir = []
	for (let index = 0; index < docs.length; index++) {
		const territorialidad = docs[index];
		if(!paisesValidosRepetir.includes(territorialidad.id_pais)){
			paisesValidosRepetir.push(territorialidad.id_pais)
		}
	}
	return paisesValidosRepetir
}

async function getPolizasNacionalidadesInteresAsegurado(polizasDetalles){
    const docs = await db.sequelize.models.polizas_nacionalidades_interes_asegurado.findAll({
		where: {id_poliza_detalle:{[db.Sequelize.Op.or]: polizasDetalles}}
	})
	const paisesValidosRepetir = []
	for (let index = 0; index < docs.length; index++) {
		const territorialidad = docs[index];
		if(!paisesValidosRepetir.includes(territorialidad.id_pais)){
			paisesValidosRepetir.push(territorialidad.id_pais)
		}
	}
	return paisesValidosRepetir
}

async function getPolizasNacionalidadesRazonesSociales(polizasDetalles){
    const docs = await db.sequelize.models.polizas_nacionalidades_razones_sociales.findAll({
		where: {id_poliza_detalle:{[db.Sequelize.Op.or]: polizasDetalles}}
	})
	const paisesValidosRepetir = []
	for (let index = 0; index < docs.length; index++) {
		const territorialidad = docs[index];
		if(!paisesValidosRepetir.includes(territorialidad.id_pais)){
			paisesValidosRepetir.push(territorialidad.id_pais)
		}
	}
	return paisesValidosRepetir
}

async function validRcDraft(registro,idPaisRazonSocial){
	const proveedores = await db.sequelize.models.proveedores.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%aig%`}}});
	if(proveedores.length != 1){
		return false
	}
	const tiposCobertura = await db.sequelize.models.tipos_cobertura.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%rc%`}}});
	if(tiposCobertura.length != 1){
		return false
	}
	const tipoCobertura = tiposCobertura[0]
	const proveedor = proveedores[0]
	const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:tipoCobertura.id}};
	const polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
	if(polizaDetalle === null){
		return false
	}
	const proveedorPoliza = await db.sequelize.models.proveedores.findByPk(registro.id_proveedor,{include:['nacionalidad']});
	if(proveedorPoliza === null){
		return false
	}
	const estadoOrigen = await db.sequelize.models.estados.findByPk(registro.id_estado_origen);
	if(estadoOrigen === null){
		return false
	}
	const estadoDestino = await db.sequelize.models.estados.findByPk(registro.id_estado_destino);
	if(estadoDestino === null){
		return false
	}
	const idPaisOrigen = estadoOrigen.id_pais
	const idPaisDestino = estadoDestino.id_pais
	const paisOrigen = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:idPaisOrigen}});
	if(paisOrigen === null){
		return false
	}
	const paisDestino = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:idPaisDestino}});
	if(paisDestino === null){
		return false
	}
	const commoditie = await db.sequelize.models.polizas_commoditys.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_commodity:registro.id_commodity}});
	if(commoditie === null){
		return false
	}
	const cliente = await db.sequelize.models.clientes.findByPk(registro.id_cliente,{include:['categoria_cliente']});
	if(cliente === null){
		return false
	}
	if(cliente.cliente_prospecto !== true){
		return false
	}
	const polizasNacionalidadesRazonesSociales = await getPolizasNacionalidadesRazonesSociales([polizaDetalle.id])
	if(!polizasNacionalidadesRazonesSociales.includes(idPaisRazonSocial)){
		return false
	}
	const categoriasClientesValidas = ["FREIGHT FORWARDERS","AGENTES ADUANALES","CO-LOADER"]
	const isValid = proveedorPoliza.nacionalidad.clave == "MX" && categoriasClientesValidas.includes(cliente.categoria_cliente.descripcion) && cliente.categoria_cliente.rc == true
	return isValid
}


async function exportacion(req, res) {
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.certificados.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltroExportacion(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	if(req.query.keepro < 0 || req.query.keepro > 3 || req.query.keepro === undefined || req.query.keepro === null){
		return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
	}
	let filtros
	let tipoDocumento
	try {
		filtros = JSON.parse(req.query.filter)
	} catch (error) {
		filtros = {or:[], and:[]}
	}
	if(req.query.keepro == 0){
        for(const key in filtros){
            for(const filtro of filtros[key]){
                if(filtro.property == 'draft_certificado'){
					tipoDocumento = filtro.value == true
                }
            }
        }
	}
	try {
		req.query.perfil = 'all'
		const perfilesValidos = ['all']
		var relaciones = []
		var relacionesRc = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
					'beneficiario', 
					'buque', 
					'cliente', 
					'tipo_contenedor', 
					'tamanio_contenedor',
					'commoditie.categoria', 
					'estado_origen.pais', 
					'estado_destino.pais', 
					'estado_destino_redondo.pais', 
					'marca', 
					'modalidad_transporte', 
					'moneda', 
					'oficina_razon_social', 
					'poliza_detalle', 
					'poliza', 
					'proveedor', 
					'puerto_aeropuerto_origen', 
					'puerto_aeropuerto_destino', 
					'tipo_bien', 
					'tipo_cambio_futuro',
					'ubicacion_bienes'  
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
			const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
			const findRelacionesRC = new Relaciones(rel,rel,db.sequelize.models)
			relacionesRc = await findRelacionesRC.getRelaciones()
		}

		const totalRegistros = await db.sequelize.models.certificados.count({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
		})
		const maximoRegistro = 8000

		if(totalRegistros > maximoRegistro){
			const pageSize = maximoRegistro;
			let totalPaginas = parseInt(totalRegistros / pageSize)
			let aux = parseFloat(totalRegistros / pageSize) - totalPaginas
			if(aux > 0){
				totalPaginas ++
			}
			for (let index = 1; index <= totalPaginas; index++) {
				const page = index;
				const offset = (page - 1) * pageSize;
				const limit = pageSize;
				const respuesta = resLocal();
				if (index == 1) res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
				await ejecutarReporte(respuesta,req,relaciones,filtro,relacionesRc,tipoDocumento,campoOrden,orden,pageSize,offset,limit,false)
			}
		}else{
			const pageSize = maximoRegistro;
			const page = 1;
			const offset = (page - 1) * pageSize;
			const limit = pageSize;
			await ejecutarReporte(res,req,relaciones,filtro,relacionesRc,tipoDocumento,campoOrden,orden,pageSize,offset,limit,true)
		}


		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function ejecutarReporte(res,req,relaciones,filtro,relacionesRc,tipoDocumento,campoOrden,orden,pageSize,offset,limit,retornar) {
	try {
		const docs = await db.sequelize.models.certificados.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
			paginate: pageSize || 10,
			offset,
			limit
		})
		
		const documentosFiltrados = []
		for(const registro of docs){
			if(true){
				let operacion = registro.toJSON()
				if(req.query.perfil  == 'all'){
					let whereFind = {
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:operacion.id,
								id_certificado_rc:operacion.id
							},
						},
						include: relacionesRc
					}
					let certificadosRc = await db.sequelize.models.certificados_rc.findAll(whereFind);
					if(certificadosRc.length == 1){
						let certificadoRc = certificadosRc[0]
						if(certificadoRc.id_certificado == operacion.id){
							operacion.certificado_rc = certificadoRc.certificado_rc
							operacion.certificado = null
						} else{
							operacion.certificado_rc = null
							operacion.certificado = certificadoRc.certificado
						}
					}
					const parametrosDetalles = [ 'atributo'  ]
					const findRelaciones = new Relaciones(parametrosDetalles,parametrosDetalles,db.sequelize.models)
					const relaciones = await findRelaciones.getRelaciones()
					let det_cer = await db.sequelize.models.detalle_certificados.findAll({
						where:{
							[db.Sequelize.Op.or]: {
								id_certificado:operacion.id,
							},
						},
						include: relaciones
					})
					if(det_cer.length > 0){
						operacion.detalle_certificado = det_cer
					}else{
						operacion.detalle_certificado = []
					}
					const idOficina = operacion.oficina_razon_social.id_oficina
					const razonSocial = await db.sequelize.models.razones_sociales.findByPk(operacion.oficina_razon_social.id_razon_social);
					if(razonSocial != null){
						operacion.razon_social = razonSocial
						operacion.oficina_razon_social = undefined
					}
					operacion.factura = null
					operacion.cxc = null
					operacion.factura_pagada = null
					if(operacion.estatus === 'F'){
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
						if(pedidoFactura !== null){
							let facturaDetalle
							const facturasDetalle = await db.sequelize.models.factura_detalles.findAll({where:{id_pedido_factura:pedidoFactura.id}})
							for(const facDetalle of facturasDetalle){
								const notaCredito = await db.sequelize.models.notas_credito.findOne({where:{id_factura:facDetalle.id_factura}})
								if(notaCredito === null){
									facturaDetalle = facDetalle
								}
							}
							if(facturaDetalle !== undefined){
								const findRelacionesFacturas = new Relaciones([  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],[  'marca', 'razon_social', 'moneda', 'cfdi', 'oficina', 'factura_detalles' ],db.sequelize.models)
								const relacionesFacturas = await findRelacionesFacturas.getRelaciones()
								const factura = await db.sequelize.models.facturas.findByPk(facturaDetalle.id_factura, { include:relacionesFacturas})
								if(factura !== null){
									operacion.factura = factura
									const findRelacionesCxC = new Relaciones([],[],db.sequelize.models)
									const relacionesCxC = await findRelacionesCxC.getRelaciones()
									const cxc = await db.sequelize.models.cuentas_por_cobrar.findOne({where:{id_factura:factura.id}, include:relacionesCxC})
									if(cxc !== null){
										operacion.cxc = cxc
										operacion.factura_pagada = parseFloat(cxc.saldo) == 0
									}
								}
							}
						}
					}
					const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:idOficina, id_cliente: operacion.id_cliente}})
					const findRelacionesMAO = new Relaciones(['agente_venta_1', 'agente_venta_2'],['agente_venta_1', 'agente_venta_2'],db.sequelize.models)
					const relacionesMAO = await findRelacionesMAO.getRelaciones()
					const findRelacionesMAC = new Relaciones(['agente_operativo'],['agente_operativo'],db.sequelize.models)
					const relacionesMAC = await findRelacionesMAC.getRelaciones()
					if(oficinaCliente != null){
						let marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: operacion.id_marca},include:relacionesMAO})
						if(marcaAgenteOficina == null){
							marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: 3},include:relacionesMAO})
						}
						operacion.agente_venta_1 = marcaAgenteOficina == null ? null : marcaAgenteOficina.agente_venta_1
						operacion.agente_venta_2 = marcaAgenteOficina == null ? null : marcaAgenteOficina.agente_venta_2
					}
					let marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:operacion.id_cliente, id_marca: operacion.id_marca},include:relacionesMAC})
					if(marcaAgenteCliente == null){
						marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:operacion.id_cliente, id_marca: 3},include:relacionesMAC})
					}
					operacion.agente_operativo = marcaAgenteCliente == null ? null : marcaAgenteCliente.agente_operativo

					const findRelacionesHistorico = new Relaciones([],[],db.sequelize.models)
					const relacionesHistorico = await findRelacionesHistorico.getRelaciones()
					var busquedaHistorico = {
						where: {
							id_registro: operacion.id,
							tabla: db.sequelize.models.certificados.name.toUpperCase()
						},
						include: relacionesHistorico,
						order: [['createdAt','DESC']]
					}
					const historico = await db.sequelize.models.historicos.findAll(busquedaHistorico);
					operacion.usuario_modifico = null
					if(historico.length > 0){
						operacion.usuario_modifico = historico[0].usuario_registro
					}
					const findRelacionesArchivo = new Relaciones(['archivo','usuario_registro'],['archivo','usuario_registro'],db.sequelize.models)
					const relArchivo = await findRelacionesArchivo.getRelaciones()
					operacion.archivos_operacion = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_certificado:operacion.id},include:relArchivo})
					operacion.pedido_factura = await db.sequelize.models.pedidos_factura.findOne({where:{id_certificado:operacion.id}})
				}

				documentosFiltrados.push(operacion)
			}
		}
		const elementos = []
		let idMarca 
		for(const documento of documentosFiltrados){
			if(idMarca === undefined){
				idMarca = documento.id_marca
			}
			let operacionOk = true
			if(documento.cliente == null){
				operacionOk = false
			}
			if(documento.marca == null || documento.beneficiario == null || documento.proveedor == null || documento.detalle_certificado.length == 0){
				operacionOk = false
			}
			const sumaAseguradaMoneda = (parseFloat(documento.suma_asegurada))
			let sumaAseguradaUSD
			let sumaAseguradaUSDINT
			const cobertura = documento.tipo_cobertura.toLowerCase().split(" ");
			const isRC = cobertura.includes("rc")
			if(documento.moneda.clave != 'USD' && !isRC){
				sumaAseguradaUSD = parseFloat((parseFloat(sumaAseguradaMoneda)/parseFloat(documento.tipo_cambio_futuro.tipo_cambio)).toFixed(6))
			} else{
				sumaAseguradaUSD = parseFloat(sumaAseguradaMoneda)
			}

			if(req.query.keepro != 0 && operacionOk == true){
				const elemento = {
					"Nombre de la póliza": documento.poliza.nombre,
					"Aseguradora": documento.proveedor.nombre,
					"Número de póliza": documento.poliza_detalle.no_poliza,
					"Número de certificado": documento.no_seguridad,
					"Número de referencia": documento.no_operacion,
					"Nombre del cliente": documento.cliente.nombre,
					"Razón social": documento.razon_social.razon_social,
					"Referencia del solicitante": documento.referencias ?? '',
					"Nombre del beneficiario": documento.beneficiario.nombre,
					"Creado por": documento.usuario_registro.nombre,
					"Modificado por": documento.usuario_modifico  !== undefined && documento.usuario_modifico !== null ? documento.usuario_modifico.nombre : "",
					"Medio emisión": documento.keepro === 0 ? "Operaciones" : documento.keepro === 1 ? "Autoemisor Web": documento.keepro === 2 ? "Autoemisor App": documento.keepro === 3 ? "Autoemisor Api": "",
					"Fecha de creación DRAFT": moment(documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Fecha de reserva": documento.certifiedAt != null ? moment(documento.certifiedAt).tz('America/Mexico_City').format('YYYY-MM-DD') : "N/A",
					"Fecha de salida": moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Retroactividad":  moment(moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') < moment(moment(documento.certifiedAt ?? documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') ? "Si" : "No",
					"Moneda de suma asegurada": documento.moneda.clave,
					"Suma asegurada": ManipuladorCadenas.formatMoney(documento.suma_asegurada),
					"Suma asegurada USD": ManipuladorCadenas.formatMoney(sumaAseguradaUSD),
					"Tipo de Cambio": ManipuladorCadenas.formatMoney(documento.tipo_cambio_futuro.tipo_cambio),
					"Tarifa de venta": ManipuladorCadenas.formatTarifa(documento.detalle_certificado[0].tarifa_final_cliente),
					"Mínimo de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].minimo_venta),
					"Moneda de venta": documento.moneda.clave,
					"Subtotal de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].subtotal),
					"Impuesto de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].monto_iva),
					"Total de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].total),
					"Tipo de cobertura": documento.tipo_cobertura,
					"Tipo de contenedor": documento.tipo_contenedor !== null && documento.tipo_contenedor !== undefined ? documento.tipo_contenedor.descripcion : "",
					"Número de contenedor": documento.num_contenedor !== null && documento.num_contenedor !== undefined ? documento.num_contenedor : "",
					"Modalidad de transporte":  documento.modalidad_transporte.nombre,
					"Bienes asegurados": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.descripcion : "",
					"Categoria de los bienes asegurados": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.categoria.descripcion : "",
					"Descripción de mercancía": documento.descripcion_carga !== undefined && documento.descripcion_carga !== null ? documento.descripcion_carga : "",
					"Datos adicionales": documento.datos_adicionales !== undefined && documento.datos_adicionales !== null ? documento.datos_adicionales : "",
					"País Origen": documento.estado_origen.pais.descripcion,
					"País Destino": documento.estado_destino.pais.descripcion,
					"Está facturada": documento.factura != null ? "Si" : "NO",
					"Factura pagada": documento.cxc !== null && documento.cxc !==  undefined ? parseFloat(documento.cxc.saldo) > 0 ? "No" : "Si" : "N/A",
				}
				elementos.push(elemento)
			} else if(!tipoDocumento && operacionOk == true){
				const elemento = {
					"id": documento.id,
					"Nombre de la póliza": documento.poliza.nombre,
					"Número de póliza": documento.poliza_detalle.no_poliza,
					"Número de certificado": documento.no_seguridad,
					"Referencia del solicitante": documento.referencias ?? '',
					"Creado por": documento.usuario_registro.nombre,
					"Modificado por": documento.usuario_registro.nombre, //documento.usuario_modifico  !== undefined && documento.usuario_modifico !== null ? documento.usuario_modifico.nombre : "",
					"Número de referencia": documento.no_operacion,
					//"Póliza de Responsabilidad Civil Contratada": documento.have_rc == true ? "Si" : "No",
					"Fecha de reserva": moment(documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Fecha de salida": moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Retroactividad":  moment(moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') < moment(moment(documento.certifiedAt ?? documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') ? "Si" : "No",
					"Tipo de Cambio": ManipuladorCadenas.formatMoney(documento.tipo_cambio_futuro.tipo_cambio),
					"Subtotal de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].subtotal),
					"Moneda de venta": documento.moneda.clave,
					"Impuesto de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].monto_iva),
					"Total de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].total),
					"Suma asegurada": ManipuladorCadenas.formatMoney(documento.suma_asegurada),
					"Tarifa de venta": ManipuladorCadenas.formatTarifa(documento.detalle_certificado[0].tarifa_final_cliente),
					"Mínimo de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].minimo_venta),
					"Tipo de cobertura": documento.tipo_cobertura,
					"Descripción de seguro": documento.detalle_certificado[0].atributo.descripcion,
					"Tipo de contenedor": documento.tipo_contenedor !== null && documento.tipo_contenedor !== undefined ? documento.tipo_contenedor.descripcion : "",
					"Tamaño de contenedor": documento.tamanio_contenedor !== null && documento.tamanio_contenedor !== undefined ? documento.tamanio_contenedor.descripcion : "",
					"Nombre del asegurado": documento.beneficiario.nombre,
					"Asegurado principal": documento.marca.nombre,
					"Tarifa de compra": ManipuladorCadenas.formatTarifa(documento.detalle_certificado[0].tarifa_compra),
					"Minimo de compra": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].minimo_compra),
					"Moneda de Compra": documento.moneda.clave,
					"Subtotal de compra": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].costo_compra),
					"Impuesto de compra": documento.proveedor.id_nacionalidad == 92 ? ManipuladorCadenas.formatMoney(parseFloat(documento.detalle_certificado[0].costo_compra) * 0.16) : ManipuladorCadenas.formatMoney(0),
					"Total de compra": ManipuladorCadenas.formatMoney(parseFloat(documento.detalle_certificado[0].costo_compra) + (documento.proveedor.id_nacionalidad == 92 ? (parseFloat(documento.detalle_certificado[0].costo_compra) * 0.16) : 0)) ,
					"Modalidad de transporte":  documento.modalidad_transporte.nombre,
					"Bien asegurado": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.descripcion : "",
					"Categoria del bien asegurado": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.categoria.descripcion : "",
					"Aseguradora": documento.proveedor.nombre,
					"Descripción de mercancía": documento.descripcion_carga !== undefined && documento.descripcion_carga !== null ? documento.descripcion_carga : "",
					"Datos adicionales": documento.datos_adicionales !== undefined && documento.datos_adicionales !== null ? documento.datos_adicionales : "",
					"Medio emisión": documento.keepro === 0 ? "Operaciones" : documento.keepro === 1 ? "Autoemisor Web": documento.keepro === 2 ? "Autoemisor App": documento.keepro === 3 ? "Autoemisor Api": "",
					"País origen": documento.estado_origen.pais.descripcion,
					"País Destino": documento.estado_destino.pais.descripcion,
					"Agente de ventas 1": documento.agente_venta_1 !== null && documento.agente_venta_1 !== undefined ? documento.agente_venta_1.nombre : "",
					"Agente de ventas 2": documento.agente_venta_2 !== null && documento.agente_venta_2 !== undefined ? documento.agente_venta_2.nombre : "",
					"Agente de operaciones": documento.agente_operativo !== null && documento.agente_operativo !== undefined ? documento.agente_operativo.nombre : "",
					"Clave cliente": documento.cliente.id,
					"Nombre del cliente": documento.cliente.nombre,
					"Razón social": documento.razon_social.razon_social,
					"Subtotal de sobreventa": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].subtotal_sobreventa),
					//"Deducible 0": documento.poliza_detalle.can_deducible == true ? documento.deducible == true ? "Si": "No" : "N/A",
					"Profit": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].profit)
				}
				elementos.push(elemento)
			}else if(documento.detalle_certificado.length > 0 && operacionOk == true){
				const nombreProveedor = await ManipuladorCadenas.quitarAcentos(documento.proveedor.nombre.toLowerCase());
				const nombreProveedorList = nombreProveedor.split(" ")
				const canMonitoreoActivo = nombreProveedorList.includes('chubb') && !nombreProveedorList.includes('panama') && sumaAseguradaUSDINT >= 200000
				const elemento = {
					"id": documento.id,
					"Nombre de la póliza": documento.poliza.nombre,
					"Aseguradora": documento.proveedor.nombre,
					"Número de póliza": documento.poliza_detalle.no_poliza,
					"Número de certificado": documento.no_seguridad,
					"Número de referencia": documento.no_operacion,
					"Nombre del cliente": documento.cliente.nombre,
					"Razón social": documento.razon_social.razon_social,
					//"Referencia del solicitante": documento.referencias ?? '',
					"Nombre del beneficiario": documento.beneficiario.nombre,
					"Agente de ventas I": documento.agente_venta_1 !== null && documento.agente_venta_1 !== undefined ? documento.agente_venta_1.nombre : "",
					"Agente de ventas II": documento.agente_venta_2 !== null && documento.agente_venta_2 !== undefined ? documento.agente_venta_2.nombre : "",
					"Agente de operaciones": documento.agente_operativo !== null && documento.agente_operativo !== undefined ? documento.agente_operativo.nombre : "",
					"Creado por": documento.usuario_registro.nombre,
					"Modificado por": documento.usuario_modifico  !== undefined && documento.usuario_modifico !== null ? documento.usuario_modifico.nombre : "",
					"Medio emisión": documento.keepro === 0 ? "Operaciones" : documento.keepro === 1 ? "Autoemisor Web": documento.keepro === 2 ? "Autoemisor App": documento.keepro === 3 ? "Autoemisor Api": "",
					"Fecha de creación DRAFT": moment(documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Fecha de creación CERTIFICADO": documento.certifiedAt != null ? moment(documento.certifiedAt).tz('America/Mexico_City').format('YYYY-MM-DD') : "N/A",
					"Fecha de salida": moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD'),
					"Retroactividad":  moment(moment(documento.fecha_inicio_cobertura).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') < moment(moment(documento.certifiedAt ?? documento.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')).tz('America/Mexico_City') ? "Si" : "No",
					"Moneda de suma asegurada": documento.moneda.clave,
					"Suma asegurada": ManipuladorCadenas.formatMoney(documento.suma_asegurada),
					"Suma asegurada USD": ManipuladorCadenas.formatMoney(sumaAseguradaUSD),
					"Tipo de Cambio": ManipuladorCadenas.formatMoney(documento.tipo_cambio_futuro.tipo_cambio),
					"Tarifa de venta": ManipuladorCadenas.formatTarifa(documento.detalle_certificado[0].tarifa_final_cliente),
					"Mínimo de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].minimo_venta),
					"Moneda de venta": documento.moneda.clave,
					"Subtotal de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].subtotal),
					"Impuesto de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].monto_iva),
					"Total de venta": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].total),
					"Tarifa de compra": ManipuladorCadenas.formatTarifa(documento.detalle_certificado[0].tarifa_compra),
					"Minimo de compra": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].minimo_compra),
					"Moneda de Compra": documento.moneda.clave,
					"Subtotal de compra": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].costo_compra),
					"Impuesto de compra": documento.proveedor.id_nacionalidad == 92 ? ManipuladorCadenas.formatMoney(parseFloat(documento.detalle_certificado[0].costo_compra) * 0.16) : ManipuladorCadenas.formatMoney(0),
					"Total de compra": ManipuladorCadenas.formatMoney(parseFloat(documento.detalle_certificado[0].costo_compra) + (documento.proveedor.id_nacionalidad == 92 ? (parseFloat(documento.detalle_certificado[0].costo_compra) * 0.16) : 0)) ,
					"Subtotal de sobreventa": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].subtotal_sobreventa),
					"Moneda de Profit": documento.moneda.clave,
					"Profit": ManipuladorCadenas.formatMoney(documento.detalle_certificado[0].profit),
					"Tipo de cobertura": documento.tipo_cobertura,
					"Descripción de seguro": documento.detalle_certificado[0].atributo.descripcion,
					"Tipo de contenedor": documento.tipo_contenedor !== null && documento.tipo_contenedor !== undefined ? documento.tipo_contenedor.descripcion : "",
					"Número de contenedor": documento.num_contenedor !== null && documento.num_contenedor !== undefined ? documento.num_contenedor : "",
					"Modalidad de transporte":  documento.modalidad_transporte.nombre,
					"Bienes asegurados": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.descripcion : "",
					"Categoria de los bienes asegurados": documento.commoditie !== null && documento.commoditie !== undefined ? documento.commoditie.categoria.descripcion : "",
					"Descripción de mercancía": documento.descripcion_carga !== undefined && documento.descripcion_carga !== null ? documento.descripcion_carga : "",
					"Datos adicionales": documento.datos_adicionales !== undefined && documento.datos_adicionales !== null ? documento.datos_adicionales : "",
					"País Origen": documento.estado_origen.pais.descripcion,
					"País Destino": documento.estado_destino.pais.descripcion,
					"Está facturada": documento.factura != null ? "Si" : "NO",
					"Factura pagada": documento.cxc !== null && documento.cxc !==  undefined ? parseFloat(documento.cxc.saldo) > 0 ? "No" : "Si" : "N/A",
				}
				elementos.push(elemento)
			}
		}

		if(elementos.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
		}
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
		
		const nombreReporte = `${tipoDocumento !== null && tipoDocumento !== undefined ? tipoDocumento == true ? "cetificados" : "draft" : "operaciones" }_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
		const namesSheets = [db.sequelize.models.certificados.name]
		const reporteCertificados = new ReportesXLSX({
			nombreReporte:nombreReporte,
			elementos:elementos,
			namesSheets:namesSheets, 
			idMarca:idMarca
		})

		return await reporteCertificados.gerReporteOneSheet(res,req,retornar)
	} catch (error) {
	}
}


async function getFiltroExportacion(parametros){
	var filtros
	try {
		filtros = JSON.parse(parametros.filter)
	} catch (error) {
		filtros = {or:[], and:[]}
	}
	const showCancelados = parametros.cancelados == "true" ? true : false;
	const showCanceladosOnly = parametros.cancelados == "only" ? true : false;
	if(showCanceladosOnly){
		filtros.and.push( { property: 'estatus', value: "C", operator: '==' })
	}else if(!showCancelados){
		filtros.and.push( { property: 'estatus', value: "C", operator: '!=' })
	}
	if(parametros.keepro == 0){
        let encontrado = false
        for(const key in filtros){
            for(const filtro of filtros[key]){
                if(filtro.property == 'draft_certificado'){
                    encontrado = true
                }
            }
        }
        if(!encontrado){
			return { success: false, error: `Se debe agregar el filtro con propiedad draft_certificado: true => para listar Certificados; false: => para listar Draft` }
        }
	}
	const Filter = new Filtros({filtros:filtros})
	return await Filter.get()
}

async function findCertificado(req, res){
	const { noAleatorio } = req.params;
	try {
		const perfilesValidos = [  'beneficiario', 'buque', 'cliente', 'tipo_contenedor', 'tamanio_contenedor','commoditie.categoria', 'estado_origen.pais', 'estado_destino.pais', 'estado_destino_redondo.pais', 'marca', 'modalidad_transporte', 'moneda', 'oficina_razon_social', 'poliza_detalle', 'poliza', 'proveedor', 'puerto_aeropuerto_origen', 'puerto_aeropuerto_destino', 'tipo_bien', 'tipo_cambio_futuro','ubicacion_bienes'  ]
		var relaciones = []
		var relacionesRc = []
		const findRelaciones = new Relaciones(perfilesValidos,perfilesValidos,db.sequelize.models)
		relaciones = await findRelaciones.getRelaciones()
		const rel = ['certificado_rc.detalle_certificado','certificado.detalle_certificado']
		const findRelacionesRC = new Relaciones(rel,rel,db.sequelize.models)
		relacionesRc = await findRelacionesRC.getRelaciones()
		
		const registroEncontrado = await db.sequelize.models.certificados.findOne({where:{no_aleatorieo:noAleatorio,draft_certificado:true},include:relaciones});
		if(registroEncontrado != null){
			let operacion = registroEncontrado.toJSON()
			const data = {
				no_operacion: operacion.no_operacion,
				fecha_emision: moment(operacion.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
				bien_asegurado: operacion.commoditie.descripcion,
				beneficiario: operacion.beneficiario.nombre,
				suma_asegurada: ManipuladorCadenas.formatMoney(operacion.suma_asegurada,2),
				moneda: operacion.moneda.clave,
				pais_origen: operacion.estado_origen.pais.descripcion,
				ciudad_origen: operacion.ciudad_origen,
				pais_destino: operacion.estado_destino.pais.descripcion,
				ciudad_destino: operacion.ciudad_destino
			}
			return res.status(200).send({ status: true, data: data});
		}
		return res.status(400).send({ status: false, msg: "El certificado que está validando hasta el momento NO se encuentra en nuestro registro de operaciones. Comuníquese por favor de manera INMEDIATA con su ejecutivo comercial o de operaciones, +52 (33) 1983 8086, emisiones@keepro.com, contact@keepro.com, para volver a validar directamente con nuestra área de operaciones y confirmarle si se trata de una falla en nuestro menú de validación del sitio web o probablemente esté siendo víctima de algún posible fraude." });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportarDraftsPorVencer(req, res) {
	let dataExcel = await getDraftsPorVencer();
	if(dataExcel == null) return res.status(400).send({ status: false, msg: "No hay drafts por vencer"});
	dataExcel = dataExcel.dataReporte;
	const reporte = new ReportesXLSX({
		nombreReporte: 'Draft por vencer',
		elementos: dataExcel,
		namesSheets: 'Draft por vencer', 
		idMarca: null
	});
		
	return await reporte.gerReporteOneSheet(res,req);
}

async function sendDraftsPorVencer() {
	let dataExcel = await getDraftsPorVencer();
	if(dataExcel == null) return;
	const correos = dataExcel.correos;
	dataExcel = dataExcel.dataReporte;
	const reporte = new ReportesXLSX({
		nombreReporte: 'Draft por vencer',
		elementos: dataExcel,
		namesSheets: 'Draft por vencer', 
		idMarca: null
	});

	const reporteBuffer = await reporte.getExcelBuffer();

	const attachments = [];
    attachments.push({
        filename: 'Drafts por vencer.xlsx',
        content: reporteBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

	//genera el cuerpo del correo
    let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `draft_por_vencer.html`);
    var htmlContent = fs.readFileSync(rutaArchivoHTML, 'utf8');
	
	let mailOptions = {
		to: correos,
		subject: 'DRAFTS POR VENCER Y SIN CERTIFICAR',
		html: htmlContent,
		attachments: attachments
	};
	const mainSender = new MailController(null, null, mailOptions, null,true,true);
	await mainSender.sendMail();
    return true;
}

async function getDraftsPorVencer() {
	//3 días posteriores a la fecha actual
	const fechaVencimiento = moment().tz('America/Mexico_City').add(3, 'days').format('YYYY-MM-DD');
	const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD');
	
	const draftPorVencer = await db.sequelize.models.certificados.findAll({
		where: {
			draft_certificado: false,
			deletedAt: null,
			fecha_inicio_cobertura: {
				[db.Sequelize.Op.lte]: fechaVencimiento,
				[db.Sequelize.Op.gte]: fechaActual,
			}
		}
	});
	if(draftPorVencer == null) return null;

	const dataExcel = [];
	const correos = [];
	for (let i = 0; i < draftPorVencer.length; i++) {
		const draft = draftPorVencer[i];
		let agenteOperativo = "";
		const cliente = await db.sequelize.models.clientes.findByPk(draft.id_cliente);
		const creadoPor = await db.sequelize.models.usuarios.findByPk(draft.id_usuario_registro);
		const mac = await db.sequelize.models.marca_agentes_clientes.findOne({
			where: {
				id_cliente: draft.id_cliente,
				id_marca: 3,
				deletedAt: null
			}
		});
		if(mac != null){
			const usr = await db.sequelize.models.usuarios.findByPk(mac.id_agente_operativo);
			if(usr != null)  agenteOperativo = usr.nombre;
		}

		const aux = {
			"Clave de cliente": `KP-${cliente.id}`,
			"Nombre de cliente": cliente.nombre,
			"No Operación": draft.no_operacion,
			"Creado por": creadoPor.nombre,
			"Agente operativo": agenteOperativo,
			"Fecha de inicio de cobertura": draft.fecha_inicio_cobertura
		};
		dataExcel.push(aux);
		
		const marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where: {id_cliente: cliente.id}});
		const operativo = await db.sequelize.models.usuarios.findByPk(marcaAgenteCliente.id_agente_operativo);
		if(!correos.includes(operativo.email)){
			correos.push(operativo.email);
		}
	}
	return {dataReporte: dataExcel, correos: correos};
}


async function sendDraftPendienteCertificar(){
	//3 días posteriores a la fecha actual
	const fechaVencimiento = moment().tz('America/Mexico_City').add(3, 'days').format('YYYY-MM-DD');
	const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD');

	const draftPorVencer = await db.sequelize.models.certificados.findAll({
		where: {
			draft_certificado: false,
			deletedAt: null,
			fecha_inicio_cobertura: {
				[db.Sequelize.Op.lte]: fechaVencimiento,
				[db.Sequelize.Op.gte]: fechaActual,
			}
		}
	});
	if(draftPorVencer == null) return null;

	for (let i = 0; i < draftPorVencer.length; i++) {
		const correos = [];
		const draft = draftPorVencer[i];
		const creadoPor = await db.sequelize.models.usuarios.findByPk(draft.id_usuario_registro);
		const marcaAgenteCliente = await db.sequelize.models.marca_agentes_clientes.findOne({where: {id_cliente: draft.id_cliente}});
		const operativo = await db.sequelize.models.usuarios.findByPk(marcaAgenteCliente.id_agente_operativo);
		correos.push(operativo.email, creadoPor.email);

		//genera el cuerpo del correo
		let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `draft_pendiente_certificar_cliente.html`);
		var htmlContent = fs.readFileSync(rutaArchivoHTML, 'utf8');
		const data = [{nombre:'fechaInicioCobertura', contenido: draft.fecha_inicio_cobertura}];
		for (let j = 0; j < data.length; j++) {
			const campo = data[j];
			htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
		}

		let mailOptions = {
			to: correos,
			subject: `DRAFT PENDIENTE DE CERTIFICAR // ${draft.no_operacion}`,
			html: htmlContent
		};
		const mainSender = new MailController(null, null, mailOptions, null);
		await mainSender.sendMail();
	}
	return; 
}

async function cargarArchivo(req, res){
	const parametros = req.body;
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		}
		const archivos = parametros.archivos ?? []; 

		if(archivos.length < 1 && Array.isArray(archivos)){
			return res.status(400).send({status:false , msg: `El parametro archivos no debe estar vacío.` });
		}
		
		for(const archivo of archivos){
			const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(archivo);
			if(registroEncontrado === null){
				return res.status(400).send({ status: false, msg: `Es obligatorio adjuntar al menos un documento que si exista`});
			}
		}
		const documentosEncontrados = await db.sequelize.models.certificados_documentos_operaciones.findAll({where:{id_certificado: id ,id_carga_archivo: {[db.Sequelize.Op.or]: archivos}}});
				
		if(documentosEncontrados.length > 0){
			return res.status(400).send({ status: false, msg: `Uno o mas documentos ya fue utilizado en este certificado`});
		}

		const nuevosRegistrosIds = []; 
		for(const archivo of archivos){
			let registroDocs = {
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City'),
				id_carga_archivo: archivo,
				id_certificado:id ,
				id_usuario_registro: req.usuario.id
			}
			const nuevoRegistro = await db.sequelize.models.certificados_documentos_operaciones.create(registroDocs);
			nuevosRegistrosIds.push(nuevoRegistro.id);

		}
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevosRegistrosIds}});
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
		const registroAEliminar = await db.sequelize.models.certificados_documentos_operaciones.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.certificados_documentos_operaciones.name){
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
	store,
	show,
	update,
	cancelar,
	certificarDraft,
	indexHistoricos,
	showHistoricos,
	exportacion,
	findCertificado,
	exportarDraftsPorVencer,
	sendDraftsPorVencer,
	sendDraftPendienteCertificar,
	cargarArchivo,
	eliminarArchivo,
	updateDates,
	updateApi
}
