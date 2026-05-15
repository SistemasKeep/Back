'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { getPolizaDetalle, getPolizaDetalleAll } = require('../middlewares/getters');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { MailController } = require('./email.controller');
const fs = require('fs');
const path = require('path');
const { nuevaTarifa } = require('./notificacion_atributos_keepro.controllers')
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.atributos_keepro.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = [ 'proveedor', 'oficina_producto', 'moneda_compra', 'moneda_venta', 'beneficiario', 'commoditie','tipo_contenedor', 'pais_origen', 'pais_destino', 'all', 'allFind']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				oficina_producto: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo' ],
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				commoditie: ['commoditie.categoria'],
				tipo_contenedor: ['tipo_contenedor.tamanios_contenedor'],
				pais_origen: ['pais_origen.continente'],
				pais_destino: ['pais_destino.continente'],
				beneficiario: ['beneficiario.nacionalidad.continente','beneficiario.domicilio.estado.pais.continente'],
				all: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo','moneda_compra','moneda_venta','commoditie.categoria','tipo_contenedor','pais_origen.continente','pais_destino.continente','beneficiario.nacionalidad.continente','beneficiario.domicilio.estado.pais.continente' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			const findRelaciones = new Relaciones(['beneficiario'],['beneficiario'],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		filtro['\$beneficiario.bloqueado\$'] = {
			[db.Sequelize.Op.or]: [false, null]
		}

		const docs = await db.sequelize.models.atributos_keepro.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.atributos_keepro.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/atributosKeePro`;
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
		var polizaDetalle = undefined
		var oficinaProducto = undefined
		var oficinaCliente = undefined
		var tipoCobertura = undefined
		var proveedor = undefined
		try {
			oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ["marca_agente_oficina","producto"]});
			if(oficinaProducto === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`});
			}
			oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(oficinaProducto.marca_agente_oficina.id_oficina_cliente, {include: ['cliente']});
			proveedor = await db.sequelize.models.proveedores.findByPk(parametros.idProveedor, {include: ['proveedor_tipo']});
			if(proveedor === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no encontrado`});
			}
			if(proveedor.proveedor_tipo.descripcion.toLowerCase() != 'aseguradoras'){
				return res.status(400).send({ status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no es tipo 'ASEGURADORAS'`});
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
			return res.status(400).send({ status: false, msg: "No existe poliza vigente"});
		}
		const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
		const isContenedor = cobertura.includes("contenedor")
		const isRC = cobertura.includes("rc")
		if(isRC){
			const validProveedorRC = proveedor.nombre.split(" ")
			var isValid = false
			for (let index = 0; index < validProveedorRC.length; index++) {
				const palabra = validProveedorRC[index];
				if(palabra.toLowerCase() == "aig"){
					isValid = true
				}
				
			}
			if(!isValid){
				return res.status(400).send({ status: false, msg: `Para productos con tipo de cobertura ${tipoCobertura.nombre}, solo se admite el proveedor AIG.`})
			}
			parametros.idBeneficiario = undefined
			parametros.idCommodity = undefined
			parametros.idPaisOrigen = undefined
			parametros.idPaisDestino = undefined
			parametros.limiteInferior = polizaDetalle.limite_minimo
			parametros.limiteSuperior = polizaDetalle.limite_maximo
			parametros.fechaVencimiento = undefined
			parametros.numMovimientos = undefined
			parametros.tarifaCompraForzosa = true
			parametros.tarifaCompraEspecial = 0
			parametros.minimoCompraEspecial = parseFloat(polizaDetalle.minimo_compra)
			parametros.isDeducible = false
			parametros.tarifaFinalClienteDeducible = 0
			parametros.minimoVentaDeducible = 0
			parametros.tarifaMediadorDeducible = 0
			parametros.tarifaMediadorMercantil = 0
			parametros.minimoMediadorMercantil = 0
			parametros.descripcion = "SeguroRC"
			parametros.minimoMediadorMercantilDeducible = 0
			parametros.tarifaFinalCliente = 0
			const modenas = await db.sequelize.models.monedas.findAll();
			for (let index = 0; index < modenas.length; index++) {
				const moneda = modenas[index];
				if(moneda.clave == "USD"){
					parametros.idMonedaCompra = moneda.id
					parametros.idMonedaVenta = moneda.id
				}
			}
			parametros.minimoVenta = parseFloat(polizaDetalle.minimo_venta)
		}		
		
		if(parametros.tarifaCompraForzosa == undefined){
			parametros.tarifaCompraForzosa = false
		}
		if(parametros.isDeducible === true){
			parametros.isDeducible = parametros.isDeducible && polizaDetalle.can_deducible
		}
		if(parametros.isDeducible == undefined || parametros.isDeducible == false){
			parametros.isDeducible = false
			parametros.tarifaFinalClienteDeducible = 0.0
			parametros.minimoVentaDeducible = 0.0
			parametros.tarifaMediadorDeducible = 0.0
			parametros.minimoMediadorMercantilDeducible = 0.0
		}
		if(parametros.tarifaMediadorMercantil === null || parametros.tarifaMediadorMercantil === undefined){
			parametros.tarifaMediadorMercantil = 0
		}
		if(parametros.minimoMediadorMercantil === null || parametros.minimoMediadorMercantil === undefined){
			parametros.minimoMediadorMercantil = 0
		}
		let obligatorios = [{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
							{campo:'idOficinaProducto', tipo:'model', model:db.sequelize.models.oficinas_productos},
							{campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas},
							{campo:'idMonedaVenta', tipo:'model', model:db.sequelize.models.monedas},
							{campo:'tarifaFinalCliente', tipo:'number'},
							{campo:'tarifaMediadorMercantil', tipo:'number'},
							{campo:'minimoMediadorMercantil', tipo:'number'},
							{campo:'minimoVenta', tipo:'number'},
							{campo:'descripcion', tipo:'string',largo:100,textoCase:"up"},
							{campo:'tarifaCompraForzosa', tipo:'boolean'},
							{campo:'isDeducible', tipo:'boolean'}]
							
        const validosOpcionales = [{campo:'idBeneficiario', tipo:'modelRelacionado', model:db.sequelize.models.clientes_beneficiarios, where:{where:{id_cliente:oficinaCliente.cliente.id,id_beneficiario:parametros.idBeneficiario}}},
								  {campo:'idCommodity', tipo:'modelRelacionado', model:db.sequelize.models.polizas_commoditys, where:{where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}}},
								  {campo:'idPaisOrigen', tipo:'model', model:db.sequelize.models.paises},
								  {campo:'idPaisDestino', tipo:'model', model:db.sequelize.models.paises},
								  {campo:'limiteInferior', tipo:'number'},
								  {campo:'limiteSuperior', tipo:'number'},
								  {campo:'fechaVencimiento', tipo:'stringDateTime'},
								  {campo:'comisionExterna', tipo:'number'},
								  {campo:'comisionInterna', tipo:'number'},
								  {campo:'numMovimientos', tipo:'number'}]
								  
								  
		if(parametros.isDeducible == true){
			obligatorios.push({campo:'tarifaFinalClienteDeducible', tipo:'number'})
			obligatorios.push({campo:'minimoVentaDeducible', tipo:'number'})
			obligatorios.push({campo:'tarifaMediadorDeducible', tipo:'number'})
			obligatorios.push({campo:'minimoMediadorMercantilDeducible', tipo:'number'})
		}else{
			validosOpcionales.push({campo:'tarifaFinalClienteDeducible', tipo:'number'})
			validosOpcionales.push({campo:'minimoVentaDeducible', tipo:'number'})
			validosOpcionales.push({campo:'tarifaMediadorDeducible', tipo:'number'})
			validosOpcionales.push({campo:'minimoMediadorMercantilDeducible', tipo:'number'})
		}
		
		if(isContenedor){
			obligatorios.push({campo:'idTipoContenedor', tipo:'modelRelacionado', model:db.sequelize.models.polizas_tipo_contenedor, where:{where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor,suma_asegurada:parametros.limiteInferior}}})
			parametros.idCommodity = undefined
			if(parametros.limiteInferior != parametros.limiteSuperior){
				return res.status(400).send({ status: false, msg: "Los limites deben ser iguales para productos con tipo de poliza " + tipoCobertura.nombre});
			}
			const sumasValidas = []
			const tipoContenedorSumasAseguradas = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor}});
			if(tipoContenedorSumasAseguradas.length < 1){
				return res.status(400).send({ status: false, msg: "No hay registros válidos para el tipo de contenedor seleccionado."});
			}
			await tipoContenedorSumasAseguradas.forEach(tipoContenedorSumaValida => {
				sumasValidas.push(tipoContenedorSumaValida.suma_asegurada)
			});
			if(!sumasValidas.includes(parametros.limiteInferior)){
				return res.status(400).send({ status: false, msg: "Los limites proporcionados son inválidos.", limitesValidos:sumasValidas});
			}
		} else{
			parametros.idTipoContenedor = undefined
		}
		if(parametros.limiteInferior != undefined){
			if(parametros.limiteInferior > 80000000){
				parametros.limiteInferior = 80000000
			}
		}
		if(parametros.limiteSuperior != undefined){
			if(parametros.limiteSuperior > 80000000){
				parametros.limiteSuperior = 80000000
			}
		}

		if(parametros.tarifaCompraForzosa == true){
			obligatorios.push({campo:'tarifaCompraEspecial', tipo:'number'})
			obligatorios.push({campo:'minimoCompraEspecial', tipo:'number'})
		}else{
			validosOpcionales.push({campo:'tarifaCompraEspecial', tipo:'number'})
			validosOpcionales.push({campo:'minimoCompraEspecial', tipo:'number'})
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
		if(isRC){
			const findRelaciones = new Relaciones(['oficina_producto.producto.tipo_cobertura' ],['oficina_producto.producto.tipo_cobertura' ],db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			var whereFind = {
				where: {
					id_oficina_producto: parametros.idOficinaProducto,
					deletedAt: null
				},
				include: relaciones
			}
			whereFind.where['$oficina_producto.producto.tipo_cobertura.nombre$'] = {[db.Sequelize.Op.like]: `%rc%`}
			const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
			if(registrosEncontrados.length > 0){
				return res.status(400).send({ status: false, msg: "Registro existente. Solo se admite un atributo para los productos con el tipo de cobertura " + registrosEncontrados[0].oficina_producto.producto.tipo_cobertura.nombre});
			}
		}else{
			const whereFind = {
				where: {
					id_oficina_producto: parametros.idOficinaProducto,
					[db.Sequelize.Op.or]: {
						[db.Sequelize.Op.and]: {
							id_beneficiario: parametros.idBeneficiario != undefined ? parametros.idBeneficiario : null,
							id_commodity: parametros.idCommodity != undefined ? parametros.idCommodity : null,
							id_tipo_contenedor: parametros.idTipoContenedor != undefined ? parametros.idTipoContenedor : null,
							id_pais_origen: parametros.idPaisOrigen != undefined ? parametros.idPaisOrigen : null,
							id_pais_destino: parametros.idPaisDestino != undefined ? parametros.idPaisDestino : null
						},
					},
					deletedAt: null
				}
			}
	
	
	
			const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
			if(registrosEncontrados.length > 0){
				var regExistente = false
				await registrosEncontrados.forEach(registro => {
					if(registro.id_oficina_producto == parametros.idOficinaProducto &&
						((registro.id_beneficiario == parametros.idBeneficiario &&
						registro.id_commodity == parametros.idCommodity &&
						registro.id_tipo_contenedor == parametros.idTipoContenedor &&
						registro.id_pais_origen == parametros.idPaisOrigen &&
						registro.id_pais_destino == parametros.idPaisDestino))){
							const limiteInferior = parametros.limiteInferior != undefined ? parametros.limiteInferior : null
							const limiteSuperior = parametros.limiteSuperior != undefined ? parametros.limiteSuperior : null
							var limitesValidos = false
							if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
								if(limiteInferior > limiteSuperior){
									if(!regExistente){
										regExistente = true;
										res.status(400).send({ status: false, msg: "El limite inferior debe ser menor o igual al limite superior"});
									}
								}
								limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) || (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
							} else if(limiteInferior != null && registro.limite_inferior != null && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_inferior && limiteInferior > registro.limite_superior)
							} else if(limiteInferior != null  && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_superior)
							} else if(limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
								limitesValidos = (limiteSuperior < registro.limite_inferior && limiteSuperior < registro.limite_superior)
							} else if(limiteSuperior != null && registro.limite_inferior != null ){
								limitesValidos = (limiteSuperior < registro.limite_inferior)
							} else if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null){
								limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) 
							} else if(limiteInferior != null && limiteSuperior != null && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
							} else{
								limitesValidos = (limiteInferior != registro.limite_inferior) || (limiteSuperior != registro.limite_superior)
							}
							if(!regExistente && !limitesValidos){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
							}
					}
				});
				if(regExistente){
					return '';
				}
			}
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.atributos_keepro.create(registro);
		sendNotificacionNuevaTarifa(nuevoRegistro.id, req.usuario)
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
		const perfilesValidos = [ 'proveedor', 'oficina_producto', 'moneda_compra', 'moneda_venta', 'beneficiario', 'commoditie','tipo_contenedor', 'pais_origen', 'pais_destino', 'all', 'allFind']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				oficina_producto: [ 'oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo' ],
				moneda_compra: [ 'moneda_compra' ],
				moneda_venta: [ 'moneda_venta' ],
				commoditie: ['commoditie.categoria'],
				tipo_contenedor: ['tipo_contenedor.tamanios_contenedor'],
				pais_origen: ['pais_origen.continente'],
				pais_destino: ['pais_destino.continente'],
				beneficiario: ['beneficiario.nacionalidad.continente','beneficiario.domicilio.estado.pais.continente'],
				all: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo','oficina_producto.producto.moneda_compra','oficina_producto.producto.moneda_venta','oficina_producto.producto.pais.continente','oficina_producto.producto.tipo_cobertura','oficina_producto.producto.archivo','moneda_compra','moneda_venta','commoditie.categoria','tipo_contenedor','pais_origen.continente','pais_destino.continente','beneficiario.nacionalidad.continente','beneficiario.domicilio.estado.pais.continente' ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			const findRelaciones = new Relaciones(['beneficiario'],['beneficiario'],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const filtro = {};
		filtro['\$beneficiario.bloqueado\$'] = {
			[db.Sequelize.Op.or]: [false, null]
		}

		const registroEncontrado = await db.sequelize.models.atributos_keepro.findByPk(id, {include:relaciones,paranoid: false});
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
		const registroAEditar = await db.sequelize.models.atributos_keepro.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var polizaDetalle = undefined
		var oficinaProducto = undefined
		var oficinaCliente = undefined
		var tipoCobertura = undefined
		var cobertura = undefined
		var isContenedor = undefined
		var isRC = undefined
		const warnings = []
		try {
			const oficinaProductoAux = await db.sequelize.models.oficinas_productos.findByPk(registroAEditar.id_oficina_producto, {include: ['producto','marca_agente_oficina']});
			if(oficinaProductoAux === null){
				return res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${registroAEditar.id_oficina_producto} no encontrado`});
			}
			const tipoCoberturaAux = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProductoAux.producto.id_tipo_cobertura);
			const coberturaAux = tipoCoberturaAux.nombre.toLowerCase().split(" ");
			const isRCAux = coberturaAux.includes("rc")
			if(isRCAux){
				oficinaProducto = oficinaProductoAux
			}else{
				oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto != undefined ? parametros.idOficinaProducto :registroAEditar.id_oficina_producto, {include: ['producto','marca_agente_oficina']});
				if(oficinaProducto === null){
					return res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto != undefined ? parametros.idOficinaProducto :registroAEditar.id_oficina_producto} no encontrado`});
				}
			}
			tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
			cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
			isContenedor = cobertura.includes("contenedor")
			isRC = cobertura.includes("rc")
			oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(oficinaProducto.marca_agente_oficina.id_oficina_cliente, {include: ['cliente']});
			var proveedor = undefined
			if(isRC){
				proveedor = await db.sequelize.models.proveedores.findByPk(registroAEditar.id_proveedor, {include: ['proveedor_tipo']});
				if(proveedor === null){
					return res.status(400).send({ status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no encontrado`});
				}
			}else{
				proveedor = await db.sequelize.models.proveedores.findByPk(parametros.idProveedor != undefined ? parametros.idProveedor : registroAEditar.id_proveedor, {include: ['proveedor_tipo']});
				if(proveedor === null){
					return res.status(400).send({ status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no encontrado`});
				}
			}
			if(proveedor.proveedor_tipo.descripcion.toLowerCase() != 'aseguradoras'){
				return res.status(400).send({ status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no es tipo 'ASEGURADORAS'`});
			}
			const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
			polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
			if(polizaDetalle === undefined){
				return res.status(400).send({ status: false, msg: "No existe poliza vigente"});
			} else if(polizaDetalle === null){
				const polizasDetalles = await getPolizaDetalleAll(db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza)
				polizaDetalle = polizasDetalles[polizasDetalles.length -1]
				warnings.push("No existe poliza detalle vigente")
			}
		} catch (error) {
			return res.status(400).send({ status: false, msg: "No existe poliza vigente", error:error.toString()});
		}
		if(isRC){
			parametros.idBeneficiario = undefined
			parametros.idProveedor = undefined
			parametros.idCommodity = undefined
			parametros.idPaisOrigen = undefined
			parametros.idPaisDestino = undefined
			parametros.limiteInferior = polizaDetalle.limite_minimo
			parametros.limiteSuperior = polizaDetalle.limite_maximo
			parametros.fechaVencimiento = undefined
			parametros.numMovimientos = undefined
			parametros.tarifaCompraForzosa = true
			parametros.tarifaCompraEspecial = 0
			parametros.minimoCompraEspecial = parseFloat(polizaDetalle.minimo_compra)
			parametros.isDeducible = false
			parametros.tarifaFinalClienteDeducible = 0
			parametros.minimoVentaDeducible = 0
			parametros.tarifaMediadorDeducible = 0
			parametros.descripcion = "SeguroRC"
			parametros.minimoMediadorMercantilDeducible = 0
			parametros.tarifaFinalCliente = 0
			parametros.tarifaMediadorMercantil = 0
			parametros.minimoMediadorMercantil = 0
			const modenas = await db.sequelize.models.monedas.findAll();
			for (let index = 0; index < modenas.length; index++) {
				const moneda = modenas[index];
				if(moneda.clave == "USD"){
					parametros.idMonedaCompra = moneda.id
					parametros.idMonedaVenta = moneda.id
				}
			}
			parametros.minimoVenta = parseFloat(polizaDetalle.minimo_venta)
		}	
		var tipoContenedorCanNull = true
		if(isContenedor){
			parametros.idCommodity = undefined
			if(parametros.limiteInferior !== undefined || parametros.limiteSuperior !== undefined){
				if(parametros.limiteInferior != parametros.limiteSuperior){
					return res.status(400).send({ status: false, msg: "Los limites deben ser iguales para productos con tipo de poliza " + tipoCobertura.nombre});
				}
				const sumasValidas = []
				const tipoContenedorSumasAseguradas = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor != undefined ? parametros.idTipoContenedor :registroAEditar.id_tipo_contenedor}});
				if(tipoContenedorSumasAseguradas.length < 1){
					return res.status(400).send({ status: false, msg: "No hay registros válidos para el tipo de contenedor seleccionado."});
				}
				await tipoContenedorSumasAseguradas.forEach(tipoContenedorSumaValida => {
					sumasValidas.push(tipoContenedorSumaValida.suma_asegurada)
				});
				if(!sumasValidas.includes(parametros.limiteInferior)){
					return res.status(400).send({ status: false, msg: "Los limites proporcionados son inválidos.", limitesValidos:sumasValidas});
				}
			}
		}else{
			tipoContenedorCanNull = false
			parametros.idTipoContenedor = undefined
		}
		if(parametros.limiteInferior != undefined){
			if(parametros.limiteInferior > 80000000){
				parametros.limiteInferior = 80000000
			}
		}
		if(parametros.limiteSuperior != undefined){
			if(parametros.limiteSuperior > 80000000){
				parametros.limiteSuperior = 80000000
			}
		}

		if(parametros.tarifaCompraForzosa == undefined){
			parametros.tarifaCompraForzosa = false
		}
		if(parametros.isDeducible === true){
			parametros.isDeducible = parametros.isDeducible && polizaDetalle.can_deducible
		}
		if(parametros.isDeducible === false || (parametros.isDeducible === undefined && registroAEditar.is_deducible === false)){
			parametros.isDeducible = false
			parametros.tarifaFinalClienteDeducible = 0.0
			parametros.minimoVentaDeducible = 0.0
			parametros.tarifaMediadorDeducible = 0.0
			parametros.minimoMediadorMercantilDeducible = 0.0
		}
	
		const validosOpcionales = [{campo:'idProveedor', tipo:'model', model:db.sequelize.models.proveedores},
								   {campo:'idMonedaCompra', tipo:'model', model:db.sequelize.models.monedas},
								   {campo:'idMonedaVenta', tipo:'model', model:db.sequelize.models.monedas},
								   {campo:'tarifaFinalCliente', tipo:'number'},
								   {campo:'tarifaMediadorMercantil', tipo:'number'},
								   {campo:'minimoMediadorMercantil', tipo:'number'},
								   {campo:'minimoVenta', tipo:'number'},
								   {campo:'descripcion', tipo:'string',largo:100,textoCase:"up"},
								   {campo:'tarifaCompraForzosa', tipo:'boolean'},
								   {campo:'isDeducible', tipo:'boolean'},
								   {campo:'idBeneficiario', tipo:'modelRelacionado', canNull: true, model:db.sequelize.models.clientes_beneficiarios, where:{where:{id_cliente:oficinaCliente.cliente.id,id_beneficiario:parametros.idBeneficiario}}},
								   {campo:'idCommodity', tipo:'modelRelacionado', canNull: true, model:db.sequelize.models.polizas_commoditys, where:{where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}}},
								   {campo:'idTipoContenedor', tipo:'modelRelacionado',canNull: tipoContenedorCanNull, model:db.sequelize.models.polizas_tipo_contenedor, where:{where:{id_poliza_detalle:polizaDetalle.id,id_tipo_contenedor:parametros.idTipoContenedor,suma_asegurada:parametros.limiteInferior}}},
								   {campo:'idPaisOrigen', tipo:'model', model:db.sequelize.models.paises},
								   {campo:'idPaisDestino', tipo:'model', model:db.sequelize.models.paises},
								   {campo:'limiteInferior', tipo:'number', canNull: isContenedor ? false : true},
								   {campo:'limiteSuperior', tipo:'number', canNull: isContenedor ? false : true},
								   {campo:'fechaVencimiento', tipo:'stringDateTime', canNull: true},
								   {campo:'comisionExterna', tipo:'number'},
								   {campo:'comisionInterna', tipo:'number'},
								   {campo:'numMovimientos', tipo:'number', canNull: true},
								   {campo:'tarifaFinalClienteDeducible', tipo:'number'},
								   {campo:'minimoVentaDeducible', tipo:'number'},
								   {campo:'tarifaMediadorDeducible', tipo:'number'},
								   {campo:'minimoMediadorMercantilDeducible', tipo:'number'},
								   {campo:'tarifaCompraEspecial', tipo:'number'},
								   {campo:'minimoCompraEspecial', tipo:'number'}
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
		if(datosUpdate.fecha_vencimiento !== undefined && datosUpdate.fecha_vencimiento !== null){
			const fechaVencimiento = moment(datosUpdate.fecha_vencimiento).tz('America/Mexico_City')
			if(fechaVencimiento > polizaDetalle.fin_vigencia){
				return res.status(400).send({ status: false, msg: "La fecha de vencimiento del atributo no puede ser mayor que la fecha de fin de vigencia de la póliza."});
			}
		}
		if(isRC){
			const findRelaciones = new Relaciones(['oficina_producto.producto.tipo_cobertura' ],['oficina_producto.producto.tipo_cobertura' ],db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			var whereFind = {
				where: {
					id_oficina_producto: registroAEditar.id_oficina_producto,
					deletedAt: null
				},
				include: relaciones
			}
			whereFind.where['$oficina_producto.producto.tipo_cobertura.nombre$'] = {[db.Sequelize.Op.like]: `%rc%`}
			const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
			if(registrosEncontrados.length > 0){
				if(registrosEncontrados[0].id != id){
					return res.status(400).send({ status: false, msg: "Registro existente. Solo se admite un atributo para los productos con el tipo de cobertura " + registrosEncontrados[0].oficina_producto.producto.tipo_cobertura.nombre});	
				}
			}
		}else{
			var whereFind = {
				where: {
					[db.Sequelize.Op.or]: {
						id_oficina_producto: registroAEditar.id_oficina_producto,
						[db.Sequelize.Op.and]: {
							id_beneficiario: parametros.idBeneficiario != undefined ? parametros.idBeneficiario :registroAEditar.id_beneficiario,
							id_commodity: parametros.idCommodity != undefined ? parametros.idCommodity :registroAEditar.id_commodity,
							id_tipo_contenedor: parametros.idTipoContenedor != undefined ? parametros.idTipoContenedor :registroAEditar.id_tipo_contenedor,
							id_pais_origen: parametros.idPaisOrigen != undefined ? parametros.idPaisOrigen :registroAEditar.id_pais_origen,
							id_pais_destino: parametros.idPaisDestino != undefined ? parametros.idPaisDestino :registroAEditar.id_pais_destino
						}
					},
					deletedAt: null
				}
			}
			const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
			if(registrosEncontrados.length > 0){
				var regExistente = false
				await registrosEncontrados.forEach(registro => {
					if(registro.id != id &&
						registro.id_oficina_producto == (registroAEditar.id_oficina_producto) &&
						((registro.id_beneficiario == (parametros.idBeneficiario !== undefined ? parametros.idBeneficiario :registroAEditar.id_beneficiario) &&
						registro.id_commodity == (parametros.idCommodity !== undefined ? parametros.idCommodity :registroAEditar.id_commodity) &&
						registro.id_tipo_contenedor == (parametros.idTipoContenedor !== undefined ? parametros.idTipoContenedor :registroAEditar.id_tipo_contenedor) &&
						registro.id_pais_origen == (parametros.idPaisOrigen !== undefined ? parametros.idPaisOrigen :registroAEditar.id_pais_origen) &&
						registro.id_pais_destino == (parametros.idPaisDestino !== undefined ? parametros.idPaisDestino :registroAEditar.id_pais_destino)))){
							const limiteInferior = parametros.limiteInferior !== undefined ? parametros.limiteInferior :registroAEditar.limite_inferior
							const limiteSuperior = parametros.limiteSuperior !== undefined ? parametros.limiteSuperior :registroAEditar.limite_superior
							var limitesValidos = false
							if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
								if(limiteInferior > limiteSuperior){
									if(!regExistente){
										regExistente = true;
										res.status(400).send({ status: false, msg: "El limite inferior debe ser menor o igual al limite superior"});
									}
								}
								limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) || (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
							} else if(limiteInferior != null && registro.limite_inferior != null && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_inferior && limiteInferior > registro.limite_superior)
							} else if(limiteInferior != null  && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_superior)
							} else if(limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
								limitesValidos = (limiteSuperior < registro.limite_inferior && limiteSuperior < registro.limite_superior)
							} else if(limiteSuperior != null && registro.limite_inferior != null ){
								limitesValidos = (limiteSuperior < registro.limite_inferior)
							} else if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null){
								limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) 
							} else if(limiteInferior != null && limiteSuperior != null && registro.limite_superior != null){
								limitesValidos = (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
							} else{
								limitesValidos = (limiteInferior != registro.limite_inferior) || (limiteSuperior != registro.limite_superior)
							}
							if(!regExistente && !limitesValidos){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
							}
					}
				});
				if(regExistente){
					return '';
				}
			}
		}
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.atributos_keepro.name.toUpperCase() ,
			accion: 'EDICION',
			createdAt: moment().tz('America/Mexico_City')
		}
	
		//encriptación para actualizar
		const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEditar);
		registro2.encriptacion_previa = stringEncriptado;
		datosUpdate.id_oficina_producto = registroAEditar.id_oficina_producto
		const allData = [ 
			'oficina_producto.producto.tipo_cobertura',
			'oficina_producto.marca_agente_oficina.oficina_cliente.oficina',
			'oficina_producto.marca_agente_oficina.oficina_cliente.cliente',
			'proveedor',
			'beneficiario',
			'commoditie',
			'pais_origen',
			'pais_destino'
		]
		const findRelacionesAux = new Relaciones(allData,allData,db.sequelize.models)
		const relacionesAux = await findRelacionesAux.getRelaciones()
	
		const antes = await db.sequelize.models.atributos_keepro.findByPk(id, {include:relacionesAux,paranoid: false});
		const registrosActuales = await registroAEditar.update(datosUpdate, { where: { id: id } });
		sendNotificacionTarifaActualizada(antes,id, req.usuario)
		const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
		registro2.encriptacion_posterior = stringEncriptado2;
		const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
		
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
		const registroAEliminar = await db.sequelize.models.atributos_keepro.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.atributos_keepro.name){
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
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.atributos_keepro.name.toUpperCase() ,
				accion: 'ELIMINAR',
				createdAt: moment().tz('America/Mexico_City')
			}
			//encriptación para eliminar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEliminar);
			registro2.encriptacion_previa = stringEncriptado;

			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
			
			const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
			registro2.encriptacion_posterior = stringEncriptado2;
			const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
			
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
		const registroARestaurar = await db.sequelize.models.atributos_keepro.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll({
					where: {
						id_oficina_producto: registroARestaurar.id_oficina_producto,
						[db.Sequelize.Op.or]: {
							[db.Sequelize.Op.and]: {
								id_beneficiario: registroARestaurar.id_beneficiario,
								id_commodity: registroARestaurar.id_commodity,
								id_tipo_contenedor: registroARestaurar.id_tipo_contenedor,
								id_pais_origen: registroARestaurar.id_pais_origen,
								id_pais_destino: registroARestaurar.id_pais_destino
							},
						},
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(registro.id != id &&
							registro.id_oficina_producto == (registroARestaurar.id_oficina_producto) &&
							((registro.id_beneficiario == (registroARestaurar.id_beneficiario) &&
							registro.id_commodity == (registroARestaurar.id_commodity) &&
							registro.id_tipo_contenedor == (registroARestaurar.id_tipo_contenedor) &&
							registro.id_pais_origen == (registroARestaurar.id_pais_origen) &&
							registro.id_pais_destino == (registroARestaurar.id_pais_destino)))){
								const limiteInferior = registroARestaurar.limite_inferior
								const limiteSuperior = registroARestaurar.limite_superior
								var limitesValidos = false
								if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
									limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) || (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
								} else if(limiteInferior != null && registro.limite_inferior != null && registro.limite_superior != null){
									limitesValidos = (limiteInferior > registro.limite_inferior && limiteInferior > registro.limite_superior)
								} else if(limiteInferior != null  && registro.limite_superior != null){
									limitesValidos = (limiteInferior > registro.limite_superior)
								} else if(limiteSuperior != null && registro.limite_inferior != null && registro.limite_superior != null){
									limitesValidos = (limiteSuperior < registro.limite_inferior && limiteSuperior < registro.limite_superior)
								} else if(limiteSuperior != null && registro.limite_inferior != null ){
									limitesValidos = (limiteSuperior < registro.limite_inferior)
								} else if(limiteInferior != null && limiteSuperior != null && registro.limite_inferior != null){
									limitesValidos = (limiteInferior < registro.limite_inferior &&  limiteSuperior < registro.limite_inferior) 
								} else if(limiteInferior != null && limiteSuperior != null && registro.limite_superior != null){
									limitesValidos = (limiteInferior > registro.limite_superior && limiteSuperior > registro.limite_superior)
								} else{
									limitesValidos = (limiteInferior != registro.limite_inferior) || (limiteSuperior != registro.limite_superior)
								}
								if(!regExistente && !limitesValidos){
									regExistente = true;
									res.status(400).send({ status: false, msg: "Registro existente"});
								}
						}
					});
					if(regExistente){
						return '';
					}
				}
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.atributos_keepro.name.toUpperCase(),
					accion: 'RESTAURAR',
					createdAt: moment().tz('America/Mexico_City')
				}
				//encriptación para restaurar
				const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroARestaurar);
				registro2.encriptacion_previa = stringEncriptado;

				const registrosActuales = await registroARestaurar.restore();
				
				const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
				registro2.encriptacion_posterior = stringEncriptado2;
				const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
				
				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function findAtributo(req, res){
	const parametros = req.query;
	var atributoSelected = undefined
	try {
		if(parametros.idMoneda === undefined || parametros.idMoneda === null){
			return res.status(400).send({status:false , msg: `El parametro idMoneda no puede ser null.` });
		}
		if(!Number.isInteger(parseInt(parametros.idMoneda))){
			return res.status(400).send({status:false , msg: `El parametro idMoneda debe ser int.` });
		} 

		const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
		var tipoCambio = 1
		let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
		if(tipoCambioSelected == undefined){
			return res.status(400).send({ status: false, msg: `Registro con id: idTipoCambioFuturo = ${parametros.idTipoCambioFuturo} no encontrado`});
		}
		if(moneda.clave != "USD"){
			tipoCambio = tipoCambioSelected.tipo_cambio
			parametros.sumaAsegurada = parametros.sumaAsegurada / tipoCambio
			const intSumaAseguradaAux = parseInt(parametros.sumaAsegurada);
			const floatSumaAseguradaAux = parseFloat(parametros.sumaAsegurada) - intSumaAseguradaAux
			if(floatSumaAseguradaAux < 1 && floatSumaAseguradaAux > 0.99){
				parametros.sumaAsegurada = parseInt(parametros.sumaAsegurada)  + 1 
			}else if(floatSumaAseguradaAux < 0.01){
				parametros.sumaAsegurada = parseInt(parametros.sumaAsegurada)
			}
		}
		atributoSelected = await getAtributo(parametros)
		if(atributoSelected.status !== undefined){
			return res.status(400).send(atributoSelected);
		}
		if(parametros.isUpdating === 'true'){
			const registroAEditar = await db.sequelize.models.certificados.findByPk(parametros.idCertificado, { include:['detalle_certificado'] });
			const atributoKeeproAnterior = await db.sequelize.models.atributos_keepro.findByPk(registroAEditar.detalle_certificado[0].id_atributo_keepro);
			atributoSelected = await getAtributo(parametros,atributoKeeproAnterior.num_movimientos === 0 || atributoKeeproAnterior.fecha_vencimiento != null)
			if(atributoSelected.status !== undefined){
				return res.status(400).send(atributoSelected);
			}
		}
		const element = atributoSelected.toJSON()
		if(req.query.keepro === 3 ){
			element.id_proveedor = undefined 
			element.id_oficina_producto = undefined 
			element.id_moneda_compra = undefined 
			element.id_moneda_venta = undefined 
			element.id_beneficiario = undefined 
			element.id_commodity = undefined 
			element.id_tipo_contenedor = undefined 
			element.id_pais_origen = undefined 
			element.id_pais_destino = undefined 
			element.id_usuario_registro = undefined 
			element.descripcion = undefined 
			element.tarifa_compra_forzosa = undefined 
			element.is_deducible = undefined 
			element.limite_inferior = undefined 
			element.limite_superior = undefined 
			element.tarifa_final_cliente = undefined 
			element.tarifa_final_cliente_deducible = undefined 
			element.minimo_venta = undefined 
			element.tarifa_mediador_mercantil = undefined 
			element.minimo_mediador_mercantil = undefined 
			element.minimo_venta_deducible = undefined 
			element.tarifa_mediador_deducible = undefined 
			element.minimo_mediador_mercantil_deducible = undefined 
			element.tarifa_compra_especial = undefined 
			element.minimo_compra_especial = undefined 
			element.comision_externa = undefined 
			element.comision_interna = undefined 
			element.num_movimientos = undefined 
			element.fecha_vencimiento = undefined 
			element.createdAt = undefined 
			element.updatedAt = undefined 
			element.deletedAt = undefined 
		}
		return res.status(200).send({ status: true, atributo: element});

	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}


async function getAtributo(parametros, isUpdateFecha = false, isUpdateMov = false){
	try {
		if(parametros.idOficinaProducto === undefined || parametros.idOficinaProducto === null){
			if(parametros.keepro == 3){
				return {status:false , msg: `El parametro idServicio no puede ser null.` };
			}else{
				return {status:false , msg: `El parametro idOficinaProducto no puede ser null.` };
			}
		}
		if(!Number.isInteger(parseInt(parametros.idOficinaProducto))){
			if(parametros.keepro == 3){
				return {status:false , msg: `El parametro idServicio debe ser int.` };
			}else{
				return {status:false , msg: `El parametro idOficinaProducto debe ser int.` };
			}	
		} 
		var oficinaProducto = undefined
		var tipoCobertura = undefined
		try {
			oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
			if(oficinaProducto === null){
				if(parametros.keepro == 3){
					return { status: false, msg: `Registro con id: idServicio = ${parametros.idOficinaProducto} no encontrado`};
				}else{
					return { status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`};
				}	
			}
			tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
		} catch (error) {
			return { status: false, msg: "No existe poliza vigente"};
		}
		const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
		const isContenedor = cobertura.includes("contenedor")
		const parametrosValidos = ['idBeneficiario','idCommodity','idTipoContenedor','idPaisOrigen','idPaisDestino','sumaAsegurada']
		for(const parametroValido of parametrosValidos){
			if(parametros[parametroValido] === undefined || parametros[parametroValido] === ""){
				parametros[parametroValido] = null;
			}
		}
		if(isContenedor){
			if(!Number.isInteger(parseInt(parametros.idTipoContenedor))){
				return {status:false , msg: `El parametro idTipoContenedor debe ser int.` };
			} 
			if(Number.isNaN(parseFloat(parametros.sumaAsegurada / 1.0))){
				return {status:false , msg: `El parametro sumaAsegurada debe ser number.` };
			} 
			parametros.idCommodity = null
		} else{
			parametros.idTipoContenedor = null
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]: {
					id_oficina_producto: parametros.idOficinaProducto ,
					[db.Sequelize.Op.and]: {
						id_beneficiario: parametros.idBeneficiario,
						id_commodity: parametros.idCommodity,
						id_tipo_contenedor: parametros.idTipoContenedor,
						id_pais_origen: parametros.idPaisOrigen,
						id_pais_destino: parametros.idPaisDestino
					}
				},
				deletedAt: null
			}
		}
		if(!isUpdateMov){
			whereFind.where.num_movimientos = {
				[db.Sequelize.Op.or]: {
				[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
				[db.Sequelize.Op.is]: null 
				}
			}
		}
		if(!isUpdateFecha){
			whereFind.where.fecha_vencimiento = {
				[db.Sequelize.Op.or]: {
				[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
				[db.Sequelize.Op.is]: null 
				}
			}
		}
		const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			var error = undefined
			const atributosValidos = [];
			await registrosEncontrados.forEach(registro => {
				if(registro.id_oficina_producto == (parametros.idOficinaProducto) &&
					((((registro.id_beneficiario == (parametros.idBeneficiario)) || (registro.id_beneficiario == null)) &&
					((registro.id_commodity == (parametros.idCommodity)) || (registro.id_commodity == null)) &&
					((registro.id_tipo_contenedor == (parametros.idTipoContenedor)) || (registro.id_tipo_contenedor == null)) &&
					((registro.id_pais_origen == (parametros.idPaisOrigen)) || (registro.id_pais_origen == null)) &&
					((registro.id_pais_destino == (parametros.idPaisDestino)) || (registro.id_pais_destino == null))))){
						var sumaAsegurada = parametros.sumaAsegurada
						var limitesValidos = false
						if(isContenedor){
							if(sumaAsegurada == 0 || sumaAsegurada === null || sumaAsegurada === undefined){
								error = {status:false , msg: `El parametro sumaAsegurada no puede ser null.` }
								regExistente = true
							}
							limitesValidos = sumaAsegurada == registro.limite_inferior
						}else{
							if(registro.limite_inferior === 0){
								registro.limite_inferior = null
							}
							if(registro.limite_superior === 0){
								registro.limite_superior = null
							}
							if(!isNaN(parseFloat(registro.limite_inferior)) && !isNaN(parseFloat(registro.limite_superior))){
								limitesValidos = (sumaAsegurada >= registro.limite_inferior) && (sumaAsegurada <= registro.limite_superior)
							} else if(!isNaN(parseFloat(registro.limite_inferior)) && isNaN(parseFloat(registro.limite_superior))){
								limitesValidos = (sumaAsegurada >= registro.limite_inferior)
							} else if(isNaN(parseFloat(registro.limite_inferior)) && !isNaN(parseFloat(registro.limite_superior))){
								limitesValidos = (sumaAsegurada <= registro.limite_superior)
							} else{
								limitesValidos = true
							}
						}
						if( limitesValidos){
							atributosValidos.push(registro)
						}
				}
			});
			if(atributosValidos.length == 1){
				regExistente = true;
				return atributosValidos[0]
			}
			const puntosAtributos = []
			await atributosValidos.forEach(atributo => {
				let puntos = 0
				if((atributo.id_beneficiario == (parametros.idBeneficiario))){
					puntos = puntos +1
				}
				if((atributo.id_commodity == (parametros.idCommodity))){
					puntos = puntos +1
				}
				if((atributo.id_tipo_contenedor == (parametros.idTipoContenedor))){
					puntos = puntos +1
				}
				if((atributo.id_pais_origen == (parametros.idPaisOrigen))){
					puntos = puntos +1
				}
				if((atributo.id_pais_destino == (parametros.idPaisDestino))){
					puntos = puntos +1
				}

				const sumaAsegurada = parametros.sumaAsegurada
				var limitesValidos = false
				if(!isNaN(parseFloat(atributo.limite_inferior)) && !isNaN(parseFloat(atributo.limite_superior))){
					limitesValidos = (sumaAsegurada >= atributo.limite_inferior) && (sumaAsegurada <= atributo.limite_superior)
				} else if(!isNaN(parseFloat(atributo.limite_inferior)) && isNaN(parseFloat(atributo.limite_superior))){
					limitesValidos = (sumaAsegurada >= atributo.limite_inferior)
				} else if(isNaN(parseFloat(atributo.limite_inferior)) && !isNaN(parseFloat(atributo.limite_superior))){
					limitesValidos = (sumaAsegurada <= atributo.limite_superior)
				} else{
					limitesValidos = true
				}
				if(limitesValidos){
					puntos = puntos +1
				}
				puntosAtributos.push(puntos)
			});
			if(atributosValidos.length >1){
				const max = Math.max(...puntosAtributos);
				var itsSame = true
				puntosAtributos.forEach(puntos => {
					if(puntos != max){
						itsSame = false
					}
				});
				if(itsSame){
					const findAtributoNull = []
					await atributosValidos.forEach(atributo => {
						let puntos = 0
						if((atributo.id_beneficiario === (null))){
							puntos = puntos +1
						}
						if((atributo.id_commodity === (null))){
							puntos = puntos +1
						}
						if((atributo.id_tipo_contenedor === (null))){
							puntos = puntos +1
						}
						if((atributo.id_pais_origen === (null))){
							puntos = puntos +1
						}
						if((atributo.id_pais_destino === (null))){
							puntos = puntos +1
						}
						findAtributoNull.push(puntos)
					});
					const maxFindNull = Math.max(...findAtributoNull);
					const indexNull = findAtributoNull.indexOf(maxFindNull)

					const atributosReValidados = []
					await atributosValidos.forEach((atributo,index) => {
						if(index != indexNull){
							atributosReValidados.push(atributo)
						}
					});
					if(atributosReValidados.length > 0){
						return atributosReValidados[0]
					}

				}
				const index = puntosAtributos.indexOf(max)
				if(index != -1){
					regExistente = true;
					return atributosValidos[index]
				}
			}
			if(regExistente){
				return error;
			}
		}
		return { status: false, msg: "No se encontro registros" };
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()};
	} 
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
			tabla: db.sequelize.models.atributos_keepro.name.toUpperCase()
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
	const perfilesValidos = ['all'];
	var generarRelaciones = false;
	if(perfilesValidos.includes(req.query.perfil)){
		if(req.query.perfil == 'all'){
			generarRelaciones =  true;
		}
	}
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false;
	} 
    let reg = {};
	let registro = await db.sequelize.models.historicos.findByPk(id);

	if(registro === null){
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} 
	if(registro.tabla != db.sequelize.models.atributos_keepro.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud atributos_keepro" });
	} 
	let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
	reg.id = registro.id;
	reg.usuario_registro = {id: usuario.id, nombre: usuario.nombre};
	reg.accion = registro.accion;
	let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa);
	let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior);
	if(generarRelaciones){
		reg.encriptacion_previa = await getRelaciones(datosDesencriptadosPrevia);
		reg.encriptacion_posterior = await getRelaciones(datosDesencriptadosPosterior);
	}
	reg.encriptacion_previa = datosDesencriptadosPrevia;
	reg.encriptacion_posterior = datosDesencriptadosPosterior;
	reg.createdAt = registro.createdAt;
	return res.status(200).send({
		success: true,
		data: reg
	});
}

async function getRelaciones(registro){
	const relaciones = [];
	//Se obtienen las relaciones BelongsTo
	for (const key in registro) {
		let arrayCampo = key.split("_");
		if(arrayCampo.length > 1 && arrayCampo.includes("id")){
			let nameRelacion = "";
			for (let index = 0; index < arrayCampo.length; index++) {
				const ler = arrayCampo[index];
				if(index == 1){
					nameRelacion = nameRelacion  + ler;
				} else if(index > 1){
					nameRelacion = nameRelacion  + "_" + ler;
				}
			}
			relaciones.push(nameRelacion)
		}
	}
	const Relaciones = new RelacionesHistorico(relaciones,db.sequelize.models,registro);
	registro = await Relaciones.getRelaciones();
	const relacionesBelongsTo = [];
	const foreignKeys = [];
	for (const modelo of Object.values(db.sequelize.models)) {
		let asociaciones = modelo.associations;
		for (const asociacion of Object.values(asociaciones)) {
			if(asociacion.target.name == db.sequelize.models.atributos_keepro.name){
				if(asociacion.associationType == 'BelongsTo'){
					if(!relacionesBelongsTo.includes(modelo.name)){
						relacionesBelongsTo.push(modelo.name);
						foreignKeys.push(asociacion.foreignKey);
					}
				}
			}
		}
	}
	const RelacionesBelongsTo = new RelacionesHistorico(relacionesBelongsTo,db.sequelize.models,registro,foreignKeys);
	return await RelacionesBelongsTo.getRelacionesBelongTo();
}

async function createExportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.atributos_keepro.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);
	const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");

    try {
		req.query.perfil = 'all';
        const perfilesValidos = ['all'];
        var relaciones = [];
        if(perfilesValidos.includes(req.query.perfil)){
            const parametrosRelaciones = {
                all: [ 
					'proveedor.marca.dato_facturacion.regimen_fiscal',
					'proveedor.marca.dato_facturacion.pais.continente',
					'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'proveedor.proveedor_tipo','proveedor.proveedor_grupo',
					'oficina_producto.producto.pais.continente',
					'oficina_producto.producto.tipo_cobertura',
					'oficina_producto.producto.archivo',
					'oficina_producto.marca_agente_oficina.marca',
					'oficina_producto.marca_agente_oficina.agente_venta_1',
					'oficina_producto.marca_agente_oficina.agente_venta_2',
					'oficina_producto.marca_agente_oficina.oficina_cliente.cliente.tipo_cliente',  
					'oficina_producto.marca_agente_oficina.oficina_cliente.oficina',
					'moneda_compra','moneda_venta',
					'commoditie.categoria',
					'tipo_contenedor',
					'pais_origen.continente',
					'pais_destino.continente',
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
            relaciones = await findRelaciones.getRelaciones();
        }
		
        const docs = await db.sequelize.models.atributos_keepro.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: {
				[db.Sequelize.Op.or]: [
					{
						fecha_vencimiento: {
							[db.Sequelize.Op.lt]: currentDate,
						},
					},
					{
						num_movimientos: 0,
					},
				],
				...filtro,
			},
        });
            
        let idMarca = null;
		const elementos = [];
        for(const element of docs){
			const marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_marca:1, id_cliente:element.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente}});
			elementos.push({
                'Clave Cliente': element.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente,
                'Nombre Cliente': element.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,
                'Agente Operaciones': marcaAgentesClienteAux ? marcaAgentesClienteAux.agente_operativo.nombre : "",
                'Agente Keepro 1 (Oficina)': element.oficina_producto.marca_agente_oficina.agente_venta_1 ? element.oficina_producto.marca_agente_oficina.agente_venta_1.nombre : '',
				'Agente Keepro 2 (Oficina)': element.oficina_producto.marca_agente_oficina.agente_venta_2 ? element.oficina_producto.marca_agente_oficina.agente_venta_2.nombre : '' ,
				'Clave Oficina':  element.oficina_producto.marca_agente_oficina.clave,
				'Nombre Oficina':element.oficina_producto.marca_agente_oficina.oficina_cliente.oficina.nombre,
				'Clave Servicio': element.oficina_producto.producto.clave,
				'Tipo de Cobertura': element.oficina_producto.producto.tipo_cobertura.nombre,
				'Descripción del Servicio': element.descripcion,
				'Tarifa Venta Final Cliente': element.tarifa_final_cliente,
				'Minimo Venta': element.minimo_venta,
				'Fecha Vencimiento': element.fecha_vencimiento ? element.fecha_vencimiento : "N/A",
				'Proveedor': element.proveedor.nombre,
            });
        }
        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        return {dataReporte: elementos};
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
    }
      
}
async function exportacion(req,res) {
	let dataExcel = await createExportacion(req,res);
	dataExcel = dataExcel.dataReporte;
	const nombreReporte = `tarifas_vencidas_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
	const namesSheets = [db.sequelize.models.atributos_keepro.name];
	const reporteTarifasVencidas = new ReportesXLSX({
		nombreReporte:nombreReporte,
		elementos: dataExcel,
		namesSheets:namesSheets, 
		idMarca:null
	});

	return await reporteTarifasVencidas.gerReporteOneSheet(res,req);
}

async function sendReporte() {
   
	let dataExcel = await getExportacion();
	if(!dataExcel.dataReporte || dataExcel.dataReporte.length === 0) return;
	dataExcel = dataExcel.dataReporte;

	const ejecutivoOperacion = await db.sequelize.models.roles.findOne({
		where: { id: 4 }
	});
	
	if (!ejecutivoOperacion) {
		return { status: false, msg: "El rol EJECUTIVO DE OPERACIONES no se encuentra en la base de datos" };
	}
	
	const usuariosNotificacion = await db.sequelize.models.roles_usuarios.findAll({
		where: { id_role: ejecutivoOperacion.id }
	});
	
	const correos = await Promise.all(
		usuariosNotificacion.map(async ({ id_usuario }) => {
			const { email } = await db.sequelize.models.usuarios.findOne({
				attributes: ['email'],
				where: { id: id_usuario }
			});
			return email;
		})
	);
	
	const nombreReporte = `tarifas_no_vigentes${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
	const namesSheets = [db.sequelize.models.atributos_keepro.name];
	const reporteTarifasVencidas = new ReportesXLSX({
		nombreReporte:nombreReporte,
		elementos: dataExcel,
		namesSheets:namesSheets, 
		idMarca:null
	});

	const reporteBuffer = await reporteTarifasVencidas.getExcelBuffer();

	const attachments = [];
	attachments.push({
		filename: 'Tarifas_No_Vigentes.xlsx',
		content: reporteBuffer,
		contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});

	//genera el cuerpo del correo
	let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `tarifas_no_vigentes.html`);
	var htmlContent = fs.readFileSync(rutaArchivoHTML, 'utf8');
	
	let mailOptions = {
		to: correos,
		subject: 'TARIFAS NO VIGENTES',
		html: htmlContent,
		attachments: attachments
	};
	const mainSender = new MailController(null, null, mailOptions, null);
	await mainSender.sendMail();

	return true;
}

async function getExportacion() {
	const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
	var relaciones = [];
	const parametrosRelaciones = {
		all: [ 
			'proveedor.marca.dato_facturacion.regimen_fiscal',
			'proveedor.marca.dato_facturacion.pais.continente',
			'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
			'proveedor.proveedor_tipo','proveedor.proveedor_grupo',
			'oficina_producto.producto.pais.continente',
			'oficina_producto.producto.tipo_cobertura',
			'oficina_producto.producto.archivo',
			'oficina_producto.marca_agente_oficina.marca',
			'oficina_producto.marca_agente_oficina.agente_venta_1',
			'oficina_producto.marca_agente_oficina.agente_venta_2',
			'oficina_producto.marca_agente_oficina.oficina_cliente.cliente.tipo_cliente',  
			'oficina_producto.marca_agente_oficina.oficina_cliente.oficina',
			'moneda_compra','moneda_venta',
			'commoditie.categoria',
			'tipo_contenedor',
			'pais_origen.continente',
			'pais_destino.continente',
		]
	}
    const findRelaciones = new Relaciones(parametrosRelaciones['all'],parametrosRelaciones['all'],db.sequelize.models);
    relaciones = await findRelaciones.getRelaciones();
		
	const docs = await db.sequelize.models.atributos_keepro.findAll({
		paranoid: false,
		include: relaciones,
		order: [['id', 'ASC']],
		where: {
			[db.Sequelize.Op.or]: [
				{
					fecha_vencimiento: {
						[db.Sequelize.Op.lt]: currentDate,
					},
				},
				{
					num_movimientos: 0,
				},
			],
		},
	});
            
	const elementos = [];
	for(const element of docs){
		const marcaAgentesClienteAux = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_marca:1, id_cliente:element.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente}});
		elementos.push({
			'Clave Cliente': element.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente,
			'Nombre Cliente': element.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,
			'Agente Operaciones': marcaAgentesClienteAux ? marcaAgentesClienteAux.agente_operativo.nombre : "",
			'Agente Keepro 1 (Oficina)': element.oficina_producto.marca_agente_oficina.agente_venta_1 ? element.oficina_producto.marca_agente_oficina.agente_venta_1.nombre : '',
			'Agente Keepro 2 (Oficina)': element.oficina_producto.marca_agente_oficina.agente_venta_2 ? element.oficina_producto.marca_agente_oficina.agente_venta_2.nombre : '' ,
			'Clave Oficina':  element.oficina_producto.marca_agente_oficina.clave,
			'Nombre Oficina':element.oficina_producto.marca_agente_oficina.oficina_cliente.oficina.nombre,
			'Clave Servicio': element.oficina_producto.producto.clave,
			'Tipo de Cobertura': element.oficina_producto.producto.tipo_cobertura.nombre,
			'Descripción del Servicio': element.descripcion,
			'Tarifa Venta Final Cliente': element.tarifa_final_cliente,
			'Minimo Venta': element.minimo_venta,
			'Fecha Vencimiento': element.fecha_vencimiento ? element.fecha_vencimiento : "N/A",
			'Proveedor': element.proveedor.nombre,
		});
	}

	return {dataReporte: elementos};
}

async function getFiltroExportacion(parametros){
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

async function sendNotificacionNuevaTarifa(idAtributo, usuario){
	const allData = [ 
		'oficina_producto.producto.tipo_cobertura',
		'oficina_producto.marca_agente_oficina.oficina_cliente.oficina',
		'oficina_producto.marca_agente_oficina.oficina_cliente.cliente',
		'oficina_producto.marca_agente_oficina.marca',
		'proveedor',
		'beneficiario',
		'commoditie',
		'pais_origen',
		'pais_destino'
	]
	const findRelaciones = new Relaciones(allData,allData,db.sequelize.models)
	const relaciones = await findRelaciones.getRelaciones()

	const atributoSelected = await db.sequelize.models.atributos_keepro.findByPk(idAtributo, {include:relaciones,paranoid: false});
	const emails = await getMailsAgentes(atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente,atributoSelected.oficina_producto.marca_agente_oficina.id_marca,atributoSelected.oficina_producto.id_marca_agente_oficina)
	const data = {
		email: emails,
		idUsuario: usuario.id,
		idMarca: atributoSelected.oficina_producto.marca_agente_oficina.id_marca,
		nombreServicio: atributoSelected.oficina_producto.producto.tipo_cobertura.nombre,
		nombreOficina: atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.oficina.nombre,
		nombreCliente: atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,
		nombreMarcaCliente: "(" + atributoSelected.oficina_producto.marca_agente_oficina.marca.clave + ") " + atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,
		nombreProveedor: atributoSelected.proveedor.nombre,
		tarifaClienteFinal: atributoSelected.tarifa_final_cliente == null ? 0 : atributoSelected.tarifa_final_cliente,
		minimoVenta: atributoSelected.minimo_venta == null ? 0 : atributoSelected.minimo_venta,
		nombreBeneficiario: atributoSelected.beneficiario == null ? '' : atributoSelected.beneficiario.nombre,
		nombreCommodity: atributoSelected.commoditie == null ? '' : atributoSelected.commoditie.descripcion,
		nombrePaisOrigen: atributoSelected.pais_origen == null ? '' : atributoSelected.pais_origen.descripcion,
		nombrePaisDestino: atributoSelected.pais_destino == null ? '' : atributoSelected.pais_destino.descripcion,
		limiteSuperior: atributoSelected.limite_superior == null || atributoSelected.limite_superior == 0 ? '' : "USD " + ManipuladorCadenas.formatMoney(atributoSelected.limite_superior,2),
		limiteInferior: atributoSelected.limite_inferior == null || atributoSelected.limite_inferior == 0 ? '' : "USD " + ManipuladorCadenas.formatMoney(atributoSelected.limite_inferior,2),
		usoLimitado: atributoSelected.num_movimientos == null ? '' : 'Si',
		fechaVencimiento: atributoSelected.fecha_vencimiento == null ? '' : moment(atributoSelected.fecha_vencimiento).format("DD-MM-YYYY") + " a las " + moment(atributoSelected.fecha_vencimiento).format("HH:mm:ss")
	}
	nuevaTarifa(data)
}

async function sendNotificacionTarifaActualizada(antes,idAtributo, usuario){
	const allData = [ 
		'oficina_producto.producto.tipo_cobertura',
		'oficina_producto.marca_agente_oficina.oficina_cliente.oficina',
		'oficina_producto.marca_agente_oficina.oficina_cliente.cliente',
		'oficina_producto.marca_agente_oficina.marca',
		'proveedor',
		'beneficiario',
		'commoditie',
		'pais_origen',
		'pais_destino'
	]
	const findRelaciones = new Relaciones(allData,allData,db.sequelize.models)
	const relaciones = await findRelaciones.getRelaciones()

	const atributoSelected = await db.sequelize.models.atributos_keepro.findByPk(idAtributo, {include:relaciones,paranoid: false});
	const emails = await getMailsAgentes(atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.id_cliente,atributoSelected.oficina_producto.marca_agente_oficina.id_marca,atributoSelected.oficina_producto.id_marca_agente_oficina)
	const data = {
		email: emails,
		idUsuario: usuario.id,
		fechaCambio:  moment(atributoSelected.updatedAt).format("DD-MM-YYYY"),
		horaCambio:  moment(atributoSelected.updatedAt).format("HH:mm:ss"),
		idMarca: atributoSelected.oficina_producto.marca_agente_oficina.marca,
		nombreServicio: atributoSelected.oficina_producto.producto.tipo_cobertura.nombre,
		nombreOficina: atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.oficina.nombre,
		nombreCliente:  atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,
		nombreMarcaCliente: "(" + atributoSelected.oficina_producto.marca_agente_oficina.marca.clave + ") " + atributoSelected.oficina_producto.marca_agente_oficina.oficina_cliente.cliente.nombre,




		nombreProveedorDespues: atributoSelected.proveedor.nombre,
		tarifaClienteFinalDespues: atributoSelected.tarifa_final_cliente == null ? 0 : atributoSelected.tarifa_final_cliente,
		minimoVentaDespues: atributoSelected.minimo_venta == null ? 0 : atributoSelected.minimo_venta,
		nombreBeneficiarioDespues: atributoSelected.beneficiario == null ? 'No asignado' : atributoSelected.beneficiario.nombre,
		nombreCommodityDespues: atributoSelected.commoditie == null ? 'No asignado' : atributoSelected.commoditie.descripcion,
		nombrePaisOrigenDespues: atributoSelected.pais_origen == null ? 'No asignado' : atributoSelected.pais_origen.descripcion,
		nombrePaisDestinoDespues: atributoSelected.pais_destino == null ? 'No asignado' : atributoSelected.pais_destino.descripcion,
		limiteSuperiorDespues: atributoSelected.limite_superior == null || atributoSelected.limite_superior == 0 ? 'No asignado' :  "USD " + ManipuladorCadenas.formatMoney(atributoSelected.limite_superior,2),
		limiteInferiorDespues: atributoSelected.limite_inferior == null || atributoSelected.limite_inferior == 0 ? 'No asignado' :  "USD " + ManipuladorCadenas.formatMoney(atributoSelected.limite_inferior,2),
		usoLimitadoDespues: atributoSelected.num_movimientos == null ? 'No' : 'Si',
		fechaVencimientoDespues: atributoSelected.fecha_vencimiento == null ? 'No asignado' : moment(atributoSelected.fecha_vencimiento).format("DD-MM-YYYY"),
		horaVencimientoDespues: atributoSelected.fecha_vencimiento == null ? '' : " a las " + moment(atributoSelected.fecha_vencimiento).format("HH:mm:ss"),





		nombreProveedorAntes: antes.proveedor.nombre,
		tarifaClienteFinalAntes: antes.tarifa_final_cliente == null ? 0 : antes.tarifa_final_cliente,
		minimoVentaAntes: antes.minimo_venta == null ? 0 : antes.minimo_venta,
		nombreBeneficiarioAntes: antes.beneficiario == null ? 'No asignado' : antes.beneficiario.nombre,
		nombreCommodityAntes: antes.commoditie == null ? 'No asignado' : antes.commoditie.descripcion,
		nombrePaisOrigenAntes: antes.pais_origen == null ? 'No asignado' : antes.pais_origen.descripcion,
		nombrePaisDestinoAntes: antes.pais_destino == null ? 'No asignado' : antes.pais_destino.descripcion,
		limiteSuperiorAntes: antes.limite_superior == null || antes.limite_superior == 0 ? 'No asignado' : "USD " + ManipuladorCadenas.formatMoney(antes.limite_superior,2),
		limiteInferiorAntes: antes.limite_inferior == null || antes.limite_inferior == 0 ? 'No asignado' : "USD " + ManipuladorCadenas.formatMoney(antes.limite_inferior,2),
		usoLimitadoAntes: antes.num_movimientos == null ? 'No' : 'Si',
		fechaVencimientoAntes: antes.fecha_vencimiento == null ? 'No asignado' : moment(antes.fecha_vencimiento).format("DD-MM-YYYY"),
		horaVencimientoAntes: antes.fecha_vencimiento == null ? '' : " a las " + moment(antes.fecha_vencimiento).format("HH:mm:ss"),
	}
	nuevaTarifa(data,true)
}

async function getMailsAgentes(idCliente,idMarca,idMAO) {

	const usuariosNotificacion = await db.sequelize.models.roles_usuarios.findAll({
		where: { id_role: 56 }
	});
	
	const emails = await Promise.all(
		usuariosNotificacion.map(async ({ id_usuario }) => {
			const { email } = await db.sequelize.models.usuarios.findOne({
				attributes: ['email'],
				where: { id: id_usuario }
			});
			return email;
		})
	);
	const relCliente = [ 
		'detalles_cliente.agente_credito_cobranza',
		'detalles_cliente.agente_customer'
	]
	const findRelCliente = new Relaciones(relCliente,relCliente,db.sequelize.models)
	const relacionesCliente = await findRelCliente.getRelaciones()
	const cliente = await db.sequelize.models.clientes.findByPk(idCliente, { include:relacionesCliente });
	if(cliente.detalles_cliente != null){
		if(cliente.detalles_cliente.agente_credito_cobranza != null){
			emails.push(cliente.detalles_cliente.agente_credito_cobranza.email)
		}
		if(cliente.detalles_cliente.agente_customer != null){
			if(!emails.includes(cliente.detalles_cliente.agente_customer.email)){
				emails.push(cliente.detalles_cliente.agente_customer.email)
			}
		}
	}
	const marcaAgentesCliente = await db.sequelize.models.marca_agentes_clientes.findAll({
		where: {
			id_cliente: idCliente,
			id_marca: idMarca,
			deletedAt: null
		},
		include: ['agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
	});
	for(const mac of marcaAgentesCliente){
		if(mac.agente_operativo != null){
			if(!emails.includes(mac.agente_operativo.email)){
				emails.push(mac.agente_operativo.email)
			}
		}
		if(mac.agente_venta_1 != null){
			if(!emails.includes(mac.agente_venta_1.email)){
				emails.push(mac.agente_venta_1.email)
			}
		}
		if(mac.agente_venta_2 != null){
			if(!emails.includes(mac.agente_venta_2.email)){
				emails.push(mac.agente_venta_2.email)
			}
		}
		if(mac.inside_sales != null){
			if(!emails.includes(mac.inside_sales.email)){
				emails.push(mac.inside_sales.email)
			}
		}
	}
	const marcaAgentesOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(idMAO,{
		include: ['agente_venta_1','agente_venta_2','inside_sales' ]
	});
	if(marcaAgentesOficina != null){
		if(marcaAgentesOficina.agente_venta_1 != null){
			if(!emails.includes(marcaAgentesOficina.agente_venta_1.email)){
				emails.push(marcaAgentesOficina.agente_venta_1.email)
			}
		}
		if(marcaAgentesOficina.agente_venta_2 != null){
			if(!emails.includes(marcaAgentesOficina.agente_venta_2.email)){
				emails.push(marcaAgentesOficina.agente_venta_2.email)
			}
		}
		if(marcaAgentesOficina.inside_sales != null){
			if(!emails.includes(marcaAgentesOficina.inside_sales.email)){
				emails.push(marcaAgentesOficina.inside_sales.email)
			}
		}
	}
	return emails
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	findAtributo,
	getAtributo,
	indexHistoricos,
	showHistoricos,
	exportacion,
	sendReporte
}
