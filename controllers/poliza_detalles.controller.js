'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.poliza_detalles.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['poliza', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				poliza: [
					'poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado.pais.continente',
					'poliza.tipo_cobertura',
				],
				all: [
					'poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado.pais.continente',
					'poliza.tipo_cobertura'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = [ 
					'poliza',
					'poliza.proveedor',
					'poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca',
					'poliza.proveedor.marca.domicilio',
					'poliza.proveedor.marca.domicilio.estado',
					'poliza.proveedor.marca.domicilio.estado.pais',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.almacen',
					'poliza.proveedor.almacen.marca',
					'poliza.proveedor.almacen.marca.domicilio',
					'poliza.proveedor.almacen.marca.domicilio.estado',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado',
					'poliza.proveedor.estado.pais',
					'poliza.proveedor.estado.pais.continente',
				]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.poliza_detalles.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})

		const dataDocs = await db.sequelize.models.poliza_detalles.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
		
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/polizaDetalles`;
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
		if(parametros.canDeducible === false || parametros.canDeducible === undefined || parametros.canDeducible === null){
			parametros.tarifaCompraDeducible = 0
			parametros.minimoCompraDeducible = 0
			parametros.tarifaVentaDeducible = 0
			parametros.minimoVentaDeducible = 0
			parametros.canDeducible = false
		}
		let obligatorios = [{campo:'idPoliza', tipo:'model', model:db.sequelize.models.polizas},
                            {campo:'noPoliza', tipo:'string', largo:255, textoCase:"up"},
							{campo:'ligaPdfTyc', tipo:'string', largo:255},
							{campo:'inicioVigencia', tipo:'stringDateTime'},
							{campo:'finVigencia', tipo:'stringDateTime'},
							{campo:'tarifaCompra', tipo:'number'},
							{campo:'minimoCompra', tipo:'number'},
							{campo:'tarifaVenta', tipo:'number'},
							{campo:'minimoVenta', tipo:'number'},
							{campo:'tarifaCompraDeducible', tipo:'number'},
							{campo:'minimoCompraDeducible', tipo:'number'},
							{campo:'tarifaVentaDeducible', tipo:'number'},
							{campo:'minimoVentaDeducible', tipo:'number'},
							{campo:'limiteMaximo', tipo:'number'},
							{campo:'limiteMinimo', tipo:'number'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'idTpl', tipo:'model', model:db.sequelize.models.tpls},
								  {campo:'isRedondo', tipo: 'boolean'},
								  {campo:'canDeducible', tipo: 'boolean'},
								  {campo:'tarifaCommoditie',  tipo:'boolean'},]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]

		const registrosEncontrados = await db.sequelize.models.poliza_detalles.findAll({
			where: {
				[db.Sequelize.Op.or]:{
					id_poliza: parametros.idPoliza,
					no_poliza: `%${parametros.noPoliza}%`,
				},
				deletedAt: null
			}
		});
		if(moment(registro.inicio_vigencia, 'YYYY-MM-DD HH:mm').isSameOrAfter(moment(registro.fin_vigencia, 'YYYY-MM-DD HH:mm'))){
			return res.status(400).send({ status: false, msg: "Fechas inválidas: inicioVigencia debe ser menor a finVigencia"});
		}
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.no_poliza.toLowerCase() == parametros.noPoliza.toLowerCase())){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				} else{
					if(!regExistente){
						const inicioVigencia = moment(parametros.inicioVigencia, 'YYYY-MM-DD HH:mm');
						const finVigencia = moment(parametros.finVigencia, 'YYYY-MM-DD HH:mm');
						const inicioVigenciaRegistro = moment(registro.inicio_vigencia, 'YYYY-MM-DD HH:mm');
						const finVigenciaRegistro = moment(registro.fin_vigencia, 'YYYY-MM-DD HH:mm');
						if((inicioVigencia.isSameOrAfter(inicioVigenciaRegistro) && inicioVigencia.isBefore(finVigenciaRegistro)) ||
						   (finVigencia.isAfter(inicioVigenciaRegistro) && finVigencia.isSameOrBefore(finVigenciaRegistro))){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		if(registro.is_redondo === undefined){
			registro.is_redondo = false
		}
		if(registro.can_deducible === undefined){
			registro.can_deducible = false
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.poliza_detalles.create(registro);
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
		const perfilesValidos = ['poliza', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				poliza: [
					'poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado.pais.continente',
					'poliza.tipo_cobertura'
				],
				all: ['poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 
					'poliza.proveedor.almacen.marca.dato_facturacion.pais.continente', 
					'poliza.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado.pais.continente',
					'poliza.tipo_cobertura'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [ 
					'poliza',
					'poliza.proveedor',
					'poliza.proveedor.moneda',
					'poliza.proveedor.conceptos_presupuesto',
					'poliza.proveedor.marca',
					'poliza.proveedor.marca.domicilio',
					'poliza.proveedor.marca.domicilio.estado',
					'poliza.proveedor.marca.domicilio.estado.pais',
					'poliza.proveedor.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.marca.pais',
					'poliza.proveedor.marca.pais.continente',
					'poliza.proveedor.marca.archivo',
					'poliza.proveedor.almacen',
					'poliza.proveedor.almacen.marca',
					'poliza.proveedor.almacen.marca.domicilio',
					'poliza.proveedor.almacen.marca.domicilio.estado',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais',
					'poliza.proveedor.almacen.marca.domicilio.estado.pais.continente',
					'poliza.proveedor.almacen.marca.pais',
					'poliza.proveedor.almacen.marca.pais.continente',
					'poliza.proveedor.almacen.marca.archivo',
					'poliza.proveedor.almacen.ubicacion_defecto',
					'poliza.proveedor.proveedor_tipo',
					'poliza.proveedor.estado',
					'poliza.proveedor.estado.pais',
					'poliza.proveedor.estado.pais.continente',
				]
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.poliza_detalles.findByPk(id, {include:relaciones,paranoid: false});
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
		const registroAEditar = await db.sequelize.models.poliza_detalles.findByPk(id);
		
		//return res.status(400).send({ status: false, msg: poliza });
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const fechaInicioVencimiento = moment(registroAEditar.inicio_vigencia).tz('America/Mexico_City')
		const fechaFinVencimiento = moment(registroAEditar.fin_vigencia).tz('America/Mexico_City')
		const fechaActual = moment().tz('America/Mexico_City')
		const polizaIsActiva = fechaActual >= fechaInicioVencimiento && fechaActual <= fechaFinVencimiento
		const poliza = await db.sequelize.models.polizas.findByPk(registroAEditar.id_poliza, { include:['proveedor', 'tipo_cobertura'],paranoid: false });
		if(poliza.proveedor.nombre.toLowerCase().includes("aig") && poliza.tipo_cobertura.nombre.toLowerCase().includes("rc") && polizaIsActiva){
			const datosUpdateAtributos = {}
			if(parametros.minimoVenta !== undefined && parseFloat(parametros.minimoVenta) != parseFloat(registroAEditar.minimo_venta)){
				datosUpdateAtributos.minimo_venta =  parseFloat(parametros.minimoVenta)
				datosUpdateAtributos.updatedAt = moment().tz('America/Mexico_City')
			}
			if(parametros.minimoCompra !== undefined && parseFloat(parametros.minimoCompra) != parseFloat(registroAEditar.minimo_compra)){
				datosUpdateAtributos.minimo_compra_especial =  parseFloat(parametros.minimoCompra)
				datosUpdateAtributos.updatedAt = moment().tz('America/Mexico_City')
			}
			if(datosUpdateAtributos.updatedAt !== undefined){
				const whereFind = {
					[db.Sequelize.Op.and]: {
						'$oficina_producto.producto.descripcion$': { [db.Sequelize.Op.and]: [ { [db.Sequelize.Op.like]: '%rc%' } ] }
					}
				}
				const findRelaciones = new Relaciones([ 'oficina_producto.producto' ],[ 'oficina_producto.producto' ],db.sequelize.models)
				const relaciones = await findRelaciones.getRelaciones()
				const atributos = await db.sequelize.models.atributos_keepro.findAll({ where: whereFind,  include:relaciones,paranoid: false });
				for(const atributo of atributos){
					if(atributo.oficina_producto.producto.descripcion.toLowerCase().includes('rc')){
						await atributo.update(datosUpdateAtributos, { where: { id: atributo.id } });
					}
				}
			}
		}
		if((parametros.canDeducible === false || parametros.canDeducible === undefined || parametros.canDeducible === null)){
			parametros.tarifaCompraDeducible = 0
			parametros.minimoCompraDeducible = 0
			parametros.tarifaVentaDeducible = 0
			parametros.minimoVentaDeducible = 0
			parametros.canDeducible = false
		}
	
		const validosOpcionales = [{campo:'idPoliza', tipo:'model', model:db.sequelize.models.polizas},
								   {campo:'noPoliza', tipo:'string', largo:255, textoCase:"up"},
								   {campo:'ligaPdfTyc', tipo:'string', largo:255},
								   {campo:'inicioVigencia', tipo:'stringDateTime'},
								   {campo:'finVigencia', tipo:'stringDateTime'},
								   {campo:'idTpl', tipo:'model', model:db.sequelize.models.tpls},
								   {campo:'tarifaCompra', tipo:'number'},
								   {campo:'minimoCompra', tipo:'number'},
								   {campo:'tarifaVenta', tipo:'number'},
								   {campo:'minimoVenta', tipo:'number'},
								   {campo:'tarifaCompraDeducible', tipo:'number'},
								   {campo:'minimoCompraDeducible', tipo:'number'},
								   {campo:'tarifaVentaDeducible', tipo:'number'},
								   {campo:'minimoVentaDeducible', tipo:'number'},
								   {campo:'limiteMaximo', tipo:'number'},
								   {campo:'limiteMinimo', tipo:'number'},
								   {campo:'isRedondo', tipo: 'boolean'},
								   {campo:'canDeducible', tipo: 'boolean'},
								   {campo:'tarifaCommoditie',  tipo:'boolean'},]
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
				[db.Sequelize.Op.or]:{
					id_poliza: parametros.idPoliza != undefined ? parametros.idPoliza : registroAEditar.id_poliza,
					no_poliza: `%${parametros.noPoliza != undefined ? parametros.noPoliza : registroAEditar.no_poliza}%`,
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.poliza_detalles.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.no_poliza.toLowerCase() == (parametros.noPoliza != undefined ? parametros.noPoliza.toLowerCase() : registroAEditar.no_poliza.toLowerCase()))) &&
				     registro.id != id){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
				} else{
					if(!regExistente){
						const inicioVigencia = moment(parametros.inicioVigencia != undefined ? parametros.inicioVigencia : registroAEditar.inicio_vigencia, 'YYYY-MM-DD HH:mm');
						const finVigencia = moment(parametros.finVigencia != undefined ? parametros.finVigencia : registroAEditar.fin_vigencia, 'YYYY-MM-DD HH:mm');
						const inicioVigenciaRegistro = moment(registro.inicio_vigencia, 'YYYY-MM-DD HH:mm');
						const finVigenciaRegistro = moment(registro.fin_vigencia, 'YYYY-MM-DD HH:mm');
						if(((inicioVigencia.isSameOrAfter(inicioVigenciaRegistro) && inicioVigencia.isBefore(finVigenciaRegistro)) ||
						   (finVigencia.isAfter(inicioVigenciaRegistro) && finVigencia.isSameOrBefore(finVigenciaRegistro))) &&
						   registro.id != id){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		if(moment(parametros.inicioVigencia != undefined ? parametros.inicioVigencia : registroAEditar.inicio_vigencia, 'YYYY-MM-DD HH:mm').isSameOrAfter(moment(parametros.finVigencia != undefined ? parametros.finVigencia : registroAEditar.fin_vigencia, 'YYYY-MM-DD HH:mm'))){
			return res.status(400).send({ status: false, msg: "Fechas inválidas: inicioVigencia debe ser menor a finVigencia"});
		}
		// registro de historico
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.poliza_detalles.name.toUpperCase(),
			accion: 'EDICION',
			createdAt: moment().tz('America/Mexico_City')
		}
		
		//encriptación para actualizar
		const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEditar);
		registro2.encriptacion_previa = stringEncriptado;

		const registrosActuales = await registroAEditar.update(datosUpdate, { where: { id: id } });
		
		const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
		registro2.encriptacion_posterior = stringEncriptado2;
		const  datosHistoricos = await db.sequelize.models.historicos.create(registro2);
		
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
		const registroAEliminar = await db.sequelize.models.poliza_detalles.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.poliza_detalles.name){
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
			// registro de historico
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.poliza_detalles.name.toUpperCase() ,
				accion: 'ELIMINAR',
				createdAt: moment().tz('America/Mexico_City')
			}

			//encriptación para eliminar
			const stringEncriptado = await CryptoMiddleware.encriptarJSON(registroAEliminar);
			registro2.encriptacion_previa = stringEncriptado;

			const registrosActuales = await registroAEliminar.destroy({ where: { id: id } });
			
			const stringEncriptado2 = await CryptoMiddleware.encriptarJSON(registrosActuales);
			registro2.encriptacion_posterior = stringEncriptado2;
			const datosHistoricos = await db.sequelize.models.historicos.create(registro2);
			
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
		const registroARestaurar = await db.sequelize.models.poliza_detalles.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.poliza_detalles.findAll({
					where: {
						[db.Sequelize.Op.or]:{
							id_poliza: registroARestaurar.id_poliza,
							no_poliza: `%${registroARestaurar.no_poliza}%`,
						},
						deletedAt: null
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(((registro.no_poliza.toLowerCase() == (registroARestaurar.no_poliza.toLowerCase()))) &&
							registro.id != id){
								if(!regExistente){
									regExistente = true;
									res.status(400).send({ status: false, msg: "Registro existente"});
								}
						} else{
							if(!regExistente){
								const inicioVigencia = moment(registroARestaurar.inicio_vigencia, 'YYYY-MM-DD HH:mm');
								const finVigencia = moment(registroARestaurar.fin_vigencia, 'YYYY-MM-DD HH:mm');
								const inicioVigenciaRegistro = moment(registro.inicio_vigencia, 'YYYY-MM-DD HH:mm');
								const finVigenciaRegistro = moment(registro.fin_vigencia, 'YYYY-MM-DD HH:mm');
								if(((inicioVigencia.isSameOrAfter(inicioVigenciaRegistro) && inicioVigencia.isBefore(finVigenciaRegistro)) ||
								   (finVigencia.isAfter(inicioVigenciaRegistro) && finVigencia.isSameOrBefore(finVigenciaRegistro))) &&
								   registro.id != id){
									regExistente = true;
									res.status(400).send({ status: false, msg: "Registro existente"});
								}
							}
						}
					});
					if(regExistente){
						return '';
					}
				}
				// registro de historico
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.poliza_detalles.name.toUpperCase(),
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
			tabla: db.sequelize.models.poliza_detalles.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.poliza_detalles.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud poliza_detalles" });
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
			if(asociacion.target.name == db.sequelize.models.poliza_detalles.name){
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


module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos
}
