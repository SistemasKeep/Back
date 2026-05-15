'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const ofac = require('../controllers/validaciones_ofac.controller');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { saveClienteDetalles } = require('./cliente_detalles.controller');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const path = require('path');
const fs = require('fs');
const { MailController } = require('./email.controller');
const { sendNotificacion } = require('./asignacion_marca_agente_cliente.controllers')
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { getAgenteO } = require('./marca_agentes_clientes.controller')

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.clientes.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	
	let showAllClientes = true
	if(req.usuario.id != 1){
		const relacionesUsuario = [{
			model: db.sequelize.models.roles,
			as: 'listRoles',
			through: {
				attributes: []
			},
		}]
		const usuarioConsulta = await db.sequelize.models.usuarios.findByPk(req.usuario.id,{ include: relacionesUsuario,paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] } });
		for(const role of usuarioConsulta.listRoles){
			if(role.id == 6){
				showAllClientes = false
			}
		}
	}
	if(!showAllClientes){
		const idsOficinasCliente = []
		const idsClientes = []
		const marcasAgentesOficinasUsuario = await db.sequelize.models.marca_agentes_oficinas.findAll({where:{[db.Sequelize.Op.or]: [{ id_agente_venta_1: req.usuario.id },{ id_agente_venta_2: req.usuario.id }]}})
		for(const marcaAgenteOficina of marcasAgentesOficinasUsuario){
			idsOficinasCliente.push({id: marcaAgenteOficina.id_oficina_cliente})
		}
		if(idsOficinasCliente.length == 0){
			idsOficinasCliente.push({id: -1})
		}
		const oficinasCliente = await db.sequelize.models.oficinas_cliente.findAll({where:{[db.Sequelize.Op.or]: idsOficinasCliente}})
		for(const oficinaCliente of oficinasCliente){
			idsClientes.push(oficinaCliente.id_cliente)
		}
		const marcasAgentesClientes = await db.sequelize.models.marca_agentes_clientes.findAll({where:{[db.Sequelize.Op.or]: [{ id_agente_venta_1: req.usuario.id },{ id_agente_venta_2: req.usuario.id }]}})
		for(const marcaAgenteCliente of marcasAgentesClientes){
			idsClientes.push(marcaAgenteCliente.id_cliente)
		}
		if(idsClientes.length == 0){
			idsClientes.push(-1)
		}
		filtro.id = {[db.Sequelize.Op.or]: idsClientes}
	}

	try {
		const perfilesValidos = [ 'fuente', 'detalles_cliente', 'categoria_cliente', 'tipo_cliente', 'estado', 'oficina_interno', 'oficinas_clientes','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				fuente: ['fuente'],
				detalles_cliente: ['detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.comisionista.proveedor.moneda','detalles_cliente.comisionista.proveedor.conceptos_presupuesto','detalles_cliente.comisionista.proveedor.marca.domicilio.estado.pais.continente','detalles_cliente.comisionista.proveedor.marca.pais.continente','detalles_cliente.comisionista.proveedor.marca.archivo','detalles_cliente.comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 'detalles_cliente.comisionista.proveedor.marca.dato_facturacion.pais.continente', 'detalles_cliente.comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','detalles_cliente.comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente','detalles_cliente.comisionista.proveedor.almacen.marca.pais.continente','detalles_cliente.comisionista.proveedor.almacen.marca.archivo','detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 'detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 'detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente','detalles_cliente.comisionista.proveedor.almacen.ubicacion_defecto','detalles_cliente.comisionista.proveedor.proveedor_tipo','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer'],
				categoria_cliente: ['categoria_cliente'],
				tipo_cliente: ['tipo_cliente'],
				estado: ['estado.pais.continente'],
				oficina_interno: ['oficina_interno'],
				oficinas_clientes: ['oficinas_clientes'],
				all: [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.clientes.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.clientes.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/clientes`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const relOficinas = ['oficina.contactos']
				const findRelOficinas = new Relaciones(relOficinas,relOficinas,db.sequelize.models)
				const relacionesOficinas = await findRelOficinas.getRelaciones()
				element.oficinas_clientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:element.id},include: relacionesOficinas})
				const relSaldosAFavor = ['pago']
				const findRelSaldosAFavor = new Relaciones(relSaldosAFavor,relSaldosAFavor,db.sequelize.models)
				const relacionesSaldosAFavor = await findRelSaldosAFavor.getRelaciones()
				element.saldos_a_favor = await db.sequelize.models.clientes_saldos_a_favor.findAll({where: {id_cliente:element.id},include: relacionesSaldosAFavor})


				const beneficiarios = []
				element.clientes_beneficiarios = undefined
				const offset_ = 0;
				const limit_ =  20;
				const clientesBeneficiarios = await db.sequelize.models.clientes_beneficiarios.findAll({
					page: 1,
					paginate: limit_,
					order: [['id', 'ASC']],
					where: {id_cliente:element.id},
					offset: offset_,
					limit: limit_
				})
				var relacionesBene = []
				const relBene = ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
				const findRelaciones = new Relaciones(relBene,relBene,db.sequelize.models)
				relacionesBene = await findRelaciones.getRelaciones()
				for(const cliente_beneficiario of clientesBeneficiarios){
					const beneficiario = await db.sequelize.models.beneficiarios.findByPk(cliente_beneficiario.id_beneficiario,{include: relacionesBene})
					if(beneficiario != null){
						beneficiarios.push(beneficiario)
					}
				}
				const razonesSociales = []
				const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({
					page: 1,
					paginate: limit_,
					order: [['id', 'ASC']],
					where: {id_cliente:element.id},
					offset: offset_,
					limit: limit_
				})
				var relacionesRS = []
				const relRS = ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio']
				const findRelacionesRS = new Relaciones(relRS,relRS,db.sequelize.models)
				relacionesRS = await findRelacionesRS.getRelaciones()
				for(const cliente_razon_social of clientesRazonesSociales){
					const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social,{include: relacionesRS})
					if(razonSocial != null){
						razonesSociales.push(razonSocial)
					}
				}
				element.beneficiarios = beneficiarios
				element.razones_sociales = razonesSociales
				if(razonesSociales.length > 0){
					element.razon_social = razonesSociales[0]
				} else{
					element.razon_social = null
				}
				if(razonesSociales.length > 0){
					const idsRS = []
					for(const rs of razonesSociales){
						idsRS.push(rs.id)
					}
					const whereFindFacturas = {
						where: {id_razon_social:{[db.Sequelize.Op.or]: idsRS}}
						,order: [['id', 'DESC']]
					}
					const facturas = await db.sequelize.models.facturas.findAll(whereFindFacturas);
					if(facturas.length > 0){
						element.fecha_ultima_factura = facturas[0].createdAt
					}else{
						element.fecha_ultima_factura = null
					}
				}else{
					element.fecha_ultima_factura = null
				}
				element.agentes_cliente = null
				const getRelaciones =  [ 'agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
				var relacionesAgentes = []
				const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
				relacionesAgentes = await findRelacionesAgentes.getRelaciones()
				var marca = await db.sequelize.models.marcas.findOne();
				const agentesClienteData = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:element.id, id_marca: marca.id}, include:relacionesAgentes,paranoid: false});
				if(agentesClienteData != null){
					const agentes = {
						agente_operativo: agentesClienteData.agente_operativo,
						agente_venta_1: agentesClienteData.agente_venta_1,
						agente_venta_2: agentesClienteData.agente_venta_2,
						inside_sales: agentesClienteData.inside_sales,
					}
					element.agentes_cliente = agentes
				}
				const oficinasClienteData = await db.sequelize.models.oficinas_cliente.findAll({where:{id_cliente:element.id}})
				const oficinasCliente = []
				for(const oficinaClientedata of oficinasClienteData){
					oficinasCliente.push({ id_oficina: oficinaClientedata.id_oficina })
				}
				element.contactos = []
				element.contacto = null
				if(oficinasCliente.length > 0){
					const filtro = {
						[db.Sequelize.Op.or]: oficinasCliente,
					}
					const contactosData = await db.sequelize.models.contactos.findAll({where:filtro,order: [['createdAt', 'ASC']]})
					if(contactosData.length > 0){
						element.contactos = contactosData
						element.contacto = contactosData[0]
					}
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

async function store(req, res){
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idTipoCliente', tipo:'model',model:db.sequelize.models.tipos_cliente},
							{campo:'idEstado', tipo:'model',model:db.sequelize.models.estados},
							{campo:'idFuente',tipo:'model',model:db.sequelize.models.fuentes},
							{campo:'nombre', tipo:'string',largo:255,textoCase:"up"}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'idOficinaInterno',tipo:'model',model:db.sequelize.models.oficinas},
								  {campo:'idCategoriaCliente', tipo:'model',model:db.sequelize.models.categorias_cliente},
								  {campo:'clienteProspecto',tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficinaInterno);
		if(oficina != null){
			if(oficina.is_interna == false){
				return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina interna." });
			}
		}

		const registrosEncontrados = await db.sequelize.models.clientes.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					id_tipo_cliente: parametros.idTipoCliente,
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre}%`
					},
					deletedAt: null
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.nombre.toLowerCase() == parametros.nombre.toLowerCase() &&
				   registro.id_tipo_cliente == parametros.idTipoCliente){
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

		//Validación de la OFAC
		const name = parametros.nombre;
		let datosEntidad = {
			nombre: name,
			pais: '',
			rfc: ''
		}

		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		let nuevoRegistro = undefined;

		if(entidadValidada.success){			
			if(entidadValidada.coincidencias.matches[name].length > 0){
				const entidades = entidadValidada.coincidencias.matches[name];
				let coincidenciaExacta = false;

				//verifica que el nombre se parezca
				for (let i = 0; i < entidades.length; i++) {
					const entidad = entidades[i];			
					const nombreOfac = await ManipuladorCadenas.quitarAcentos(entidad.fullName.toLowerCase());
					const nombreSist = await ManipuladorCadenas.quitarAcentos(datosEntidad.nombre.toLowerCase());

					if(nombreOfac == nombreSist){
						coincidenciaExacta = true;
					}
				}

				if(coincidenciaExacta == true){
					nuevoRegistro = entidadValidada.coincidencias.matches;
					return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: nuevoRegistro});
				}	
			}

			if(req.body.clienteDetalle != undefined && req.body.clienteDetalle != null && registro.cliente_prospecto == true){
				const nuevoRegistroClienteDetalles = await saveClienteDetalles(req.body.clienteDetalle, res, req.usuario);
					if(nuevoRegistroClienteDetalles != undefined){
					if(nuevoRegistroClienteDetalles.status != true){
						return res.status(400).send(nuevoRegistroClienteDetalles)
					}
					registro.id_detalle_cliente = nuevoRegistroClienteDetalles.data.id
				}else{
					return ''
				}
			}
			nuevoRegistro = await db.sequelize.models.clientes.create(registro);
			if(nuevoRegistro.cliente_prospecto == true){
				sendNotificacionAsignacionAgente(nuevoRegistro.id, req.usuario)
			}
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
		}else{
			res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
			return undefined;
		}

		
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
		const perfilesValidos = [ 'fuente', 'detalles_cliente', 'categoria_cliente', 'tipo_cliente', 'estado', 'oficina_interno', 'oficinas_clientes','all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				fuente: ['fuente'],
				detalles_cliente: ['detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.comisionista.proveedor.moneda','detalles_cliente.comisionista.proveedor.conceptos_presupuesto','detalles_cliente.comisionista.proveedor.marca.domicilio.estado.pais.continente','detalles_cliente.comisionista.proveedor.marca.pais.continente','detalles_cliente.comisionista.proveedor.marca.archivo','detalles_cliente.comisionista.proveedor.marca.dato_facturacion.regimen_fiscal', 'detalles_cliente.comisionista.proveedor.marca.dato_facturacion.pais.continente', 'detalles_cliente.comisionista.proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','detalles_cliente.comisionista.proveedor.almacen.marca.domicilio.estado.pais.continente','detalles_cliente.comisionista.proveedor.almacen.marca.pais.continente','detalles_cliente.comisionista.proveedor.almacen.marca.archivo','detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.regimen_fiscal', 'detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.pais.continente', 'detalles_cliente.comisionista.proveedor.almacen.marca.dato_facturacion.nacionalidad_timbrado.continente','detalles_cliente.comisionista.proveedor.almacen.ubicacion_defecto','detalles_cliente.comisionista.proveedor.proveedor_tipo','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer'],
				categoria_cliente: ['categoria_cliente'],
				tipo_cliente: ['tipo_cliente'],
				estado: ['estado.pais.continente'],
				oficina_interno: ['oficina_interno'],
				oficinas_clientes: ['oficinas_clientes'],
				all: [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.clientes.findByPk(id,{include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const relOficinas = ['oficina.contactos']
				const findRelOficinas = new Relaciones(relOficinas,relOficinas,db.sequelize.models)
				const relacionesOficinas = await findRelOficinas.getRelaciones()
				element.oficinas_clientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:element.id},include: relacionesOficinas})
				const relSaldosAFavor = ['pago']
				const findRelSaldosAFavor = new Relaciones(relSaldosAFavor,relSaldosAFavor,db.sequelize.models)
				const relacionesSaldosAFavor = await findRelSaldosAFavor.getRelaciones()
				element.saldos_a_favor = await db.sequelize.models.clientes_saldos_a_favor.findAll({where: {id_cliente:element.id},include: relacionesSaldosAFavor})


				const beneficiarios = []
				element.clientes_beneficiarios = undefined
				const offset_ = 0;
				const limit_ =  20;
				const clientesBeneficiarios = await db.sequelize.models.clientes_beneficiarios.findAll({
					page: 1,
					paginate: limit_,
					order: [['id', 'ASC']],
					where: {id_cliente:id},
					offset: offset_,
					limit: limit_
				})

				var relacionesBene = []
				const relBene = ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
				const findRelaciones = new Relaciones(relBene,relBene,db.sequelize.models)
				relacionesBene = await findRelaciones.getRelaciones()
				for(const cliente_beneficiario of clientesBeneficiarios){
					const beneficiario = await db.sequelize.models.beneficiarios.findByPk(cliente_beneficiario.id_beneficiario,{include: relacionesBene})
					if(beneficiario != null){
						beneficiarios.push(beneficiario)
					}
				}
				const razonesSociales = []
				const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({
					page: 1,
					paginate: limit_,
					order: [['id', 'ASC']],
					where: {id_cliente:id},
					offset: offset_,
					limit: limit_
				})

				var relacionesRS = []
				const relRS = ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio']
				const findRelacionesRS = new Relaciones(relRS,relRS,db.sequelize.models)
				relacionesRS = await findRelacionesRS.getRelaciones()
				for(const cliente_razon_social of clientesRazonesSociales){
					const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social,{include: relacionesRS})
					if(razonSocial != null){
						razonesSociales.push(razonSocial)
					}
				}
				element.beneficiarios = beneficiarios
				element.razones_sociales = razonesSociales
				if(razonesSociales.length > 0){
					element.razon_social = razonesSociales[0]
				} else{
					element.razon_social = null
				}
				if(razonesSociales.length > 0){
					const idsRS = []
					for(const rs of razonesSociales){
						idsRS.push(rs.id)
					}
					const whereFindFacturas = {
						where: {id_razon_social:{[db.Sequelize.Op.or]: idsRS}}
						,order: [['id', 'DESC']]
					}
					const facturas = await db.sequelize.models.facturas.findAll(whereFindFacturas);
					if(facturas.length > 0){
						element.fecha_ultima_factura = facturas[0].createdAt
					}else{
						element.fecha_ultima_factura = null
					}
				}else{
					element.fecha_ultima_factura = null
				}
				element.agentes_cliente = null
				const getRelaciones =  [ 'agente_operativo','agente_venta_1','agente_venta_2','inside_sales', 'marca' ]
				var relacionesAgentes = []
				const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
				relacionesAgentes = await findRelacionesAgentes.getRelaciones()
				const agentesData = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:id}, include:relacionesAgentes,paranoid: false});
				if(agentesData != null){
					const agentes = {
						agente_operativo: agentesData.agente_operativo,
						agente_venta_1: agentesData.agente_venta_1,
						agente_venta_2: agentesData.agente_venta_2,
						inside_sales: agentesData.inside_sales,
					}
					element.agentes_cliente = agentes
				}
				
				const oficinasClienteData = await db.sequelize.models.oficinas_cliente.findAll({where:{id_cliente:element.id}})
				const oficinasCliente = []
				for(const oficinaClientedata of oficinasClienteData){
					oficinasCliente.push({ id_oficina: oficinaClientedata.id_oficina })
				}
				element.contactos = []
				element.contacto = null
				if(oficinasCliente.length > 0){
					const filtro = {
						[db.Sequelize.Op.or]: oficinasCliente,
					}
					const contactosData = await db.sequelize.models.contactos.findAll({where:filtro,order: [['createdAt', 'ASC']]})
					if(contactosData.length > 0){
						element.contactos = contactosData
						element.contacto = contactosData[0]
					}
				}
			}
			return res.status(200).send({ status: true, data: element});
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
		
		const validosOpcionales = [{campo:'idTipoCliente', tipo:'model',model:db.sequelize.models.tipos_cliente},
								   {campo:'idEstado', tipo:'model',model:db.sequelize.models.estados},
								   {campo:'idDetalleCliente', tipo:'model',model:db.sequelize.models.cliente_detalles},
								   {campo:'idFuente',tipo:'model',model:db.sequelize.models.fuentes},
								   {campo:'nombre', tipo:'string',largo:255,textoCase:"up"},
								   {campo:'idOficinaInterno',tipo:'model',model:db.sequelize.models.oficinas},
								   {campo:'idCategoriaCliente', tipo:'model',model:db.sequelize.models.categorias_cliente},
								   {campo:'clienteProspecto',tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.clientes.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		const oficina = await db.sequelize.models.oficinas.findByPk(parametros.idOficinaInterno != undefined ? parametros.idOficinaInterno : registroAEditar.id_oficina_interno);
		if(oficina.is_interna == false){
			return res.status(400).send({ status: false, msg: "Tipo de oficina no válido; debe seleccionar una oficina interna." });
		}
		const wasProspecto = registroAEditar.cliente_prospecto === false
		const sinDetalles = registroAEditar.id_detalle_cliente == null && (parametros.clienteProspecto === true || registroAEditar.cliente_prospecto === true)
		if(parametros.clienteProspecto !== undefined){
			if(parametros.clienteProspecto !== true){
				datosUpdate.id_detalle_cliente = null
				parametros.idDetalleCliente = null
			}
		} else{
			if(registroAEditar.cliente_prospecto !== true){
				datosUpdate.id_detalle_cliente = null
				parametros.idDetalleCliente = null
			}
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.and]: {
					id_tipo_cliente: parametros.idTipoCliente != undefined ? parametros.idTipoCliente : registroAEditar.id_tipo_cliente,
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre}%`
					},
					deletedAt: null
				}
			}
		}
		const registrosEncontrados = await db.sequelize.models.clientes.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.nombre.toLowerCase() == (parametros.nombre != undefined ? parametros.nombre.toLowerCase() : registroAEditar.nombre.toLowerCase())) &&
					(registro.id_tipo_cliente == (parametros.idTipoCliente != undefined ? parametros.idTipoCliente : registroAEditar.id_tipo_cliente))) &&
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

		if(registroAEditar.id_detalle_cliente != null && registroAEditar.id_detalle_cliente != undefined && parametros.clienteProspecto !== false){
			datosUpdate.id_detalle_cliente = undefined;
		}

		if(parametros.idDetalleCliente !== null && parametros.idDetalleCliente !== undefined){
			const findIdDetalleCliente = {
				where: {
					[db.Sequelize.Op.and]: {
						id_detalle_cliente: parametros.idDetalleCliente
					}
				}
			}
			const regristroEncontradosIdDetalleCliente = await db.sequelize.models.clientes.findAll(findIdDetalleCliente);
			for(const reg of regristroEncontradosIdDetalleCliente){
				if(reg.id_detalle_cliente == parametros.idDetalleCliente && reg.id != id){
					return res.status(400).send({ status: false, msg: "Los detalles del cliente ya fueron asignados. Estos solo se pueden asignar a un cliente."});
				}
			}
		}

		//Validación de la OFAC
		const name = parametros.nombre != undefined ? parametros.nombre : registroAEditar.nombre;
		let datosEntidad = {
			nombre: name,
			pais: '',
			rfc: ''
		}
		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		
		if(entidadValidada.success){
			if(entidadValidada.coincidencias.matches[name].length > 0){
				const entidades = entidadValidada.coincidencias.matches[name];
				let coincidenciaExacta = false;

				//verifica que el nombre se parezca
				for (let i = 0; i < entidades.length; i++) {
					const entidad = entidades[i];			
					const nombreOfac = await ManipuladorCadenas.quitarAcentos(entidad.fullName.toLowerCase());
					const nombreSist = await ManipuladorCadenas.quitarAcentos(datosEntidad.nombre.toLowerCase());

					if(nombreOfac == nombreSist){
						coincidenciaExacta = true;
					}
				}

				if(coincidenciaExacta == true){
					const coincidencias = entidadValidada.coincidencias.matches;
					return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC", data: coincidencias});
				}	
			}

			const idClienteDetalle = registroAEditar.id_detalle_cliente == null ? datosUpdate.id_detalle_cliente : registroAEditar.id_detalle_cliente
			const marcasAgentesClientes = await db.sequelize.models.marca_agentes_clientes.findAll({
				where: {
					id_cliente: id,
					deletedAt: null
				}
			});
			for(const mac of marcasAgentesClientes){
				if(idClienteDetalle != null){
					if(mac.id_agente_operativo == null){
						const clienteDetalle = await db.sequelize.models.cliente_detalles.findByPk(idClienteDetalle)
						const idAgenteO = await getAgenteO(clienteDetalle.id_mediador_mercantil, mac.id_marca)
						if(idAgenteO != null){
							await mac.update({id_agente_operativo:idAgenteO}, { where: { id: mac.id } });
						}
					}
				}
			}
			
			await registroAEditar.update(datosUpdate, { where: { id: id } });
			return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
		}else{
			return res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
		}
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
		const registroAEliminar = await db.sequelize.models.clientes.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.clientes.name){
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
				tabla: db.sequelize.models.clientes.name.toUpperCase() ,
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
			
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito" });
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
		const registroARestaurar = await db.sequelize.models.clientes.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.clientes.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							id_tipo_cliente: registroARestaurar.id_tipo_cliente,
							nombre: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.nombre}%`
							},
							deletedAt: null
						}
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.nombre.toLowerCase() == registroARestaurar.nombre.toLowerCase()  &&
							registro.id_tipo_cliente == registroARestaurar.id_tipo_cliente) &&
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
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.clientes.name.toUpperCase(),
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
			tabla: db.sequelize.models.clientes.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.clientes.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud clientes" });
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
			if(asociacion.target.name == db.sequelize.models.clientes.name){
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


async function exportar(req, res) {
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.clientes.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	req.query.perfil = 'all';
	try {
		const perfilesValidos = ['all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}
		console.log(filtro)
		const docs = await db.sequelize.models.clientes.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		});

		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			const razonesSociales = [];
			const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:element.id}, order: [['id', 'ASC']]});
			var relacionesRS = [];
			const relRS = ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio'];
			const findRelacionesRS = new Relaciones(relRS,relRS,db.sequelize.models);
			relacionesRS = await findRelacionesRS.getRelaciones();
			for(const cliente_razon_social of clientesRazonesSociales){
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social,{include: relacionesRS});
				if(razonSocial != null){
					razonesSociales.push(razonSocial);
				}
			}
			element.razones_sociales = razonesSociales;
			if(razonesSociales.length > 0){
					element.razon_social = razonesSociales[0];
			} else{
					element.razon_social = null;
			}
			if(razonesSociales.length > 0){
				const idsRS = [];
				for(const rs of razonesSociales){
					idsRS.push(rs.id);
				}
				const whereFindFacturas = {
					where: {id_razon_social:{[db.Sequelize.Op.or]: idsRS}},
					order: [['id', 'DESC']]
				}
				const facturas = await db.sequelize.models.facturas.findAll(whereFindFacturas);
				if(facturas.length > 0){
					element.fecha_ultima_factura = moment(facturas[0].createdAt).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
				}else{
					element.fecha_ultima_factura = null;
				}
			}else{
				element.fecha_ultima_factura = null;
			}
			//var whereFindMarcas = {
			//	where: {
			//		nombre: {[db.Sequelize.Op.like]: `%keepro%`},
			//		deletedAt: null
			//	}
			//}
			element.agentes_cliente = null;
			const getRelaciones =  [ 'agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ];
			var relacionesAgentes = [];
			const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models);
			relacionesAgentes = await findRelacionesAgentes.getRelaciones();
			//var marca = await db.sequelize.models.marcas.findOne(whereFindMarcas);
			const agentesClienteData = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:element.id, id_marca: 1}, include:relacionesAgentes,paranoid: false});
			if(agentesClienteData != null){
				const agentes = {
					agente_operativo: agentesClienteData.agente_operativo != null ? agentesClienteData.agente_operativo.nombre : null,
					agente_venta_1: agentesClienteData.agente_venta_1 != null ? agentesClienteData.agente_venta_1.nombre : null,
					agente_venta_2: agentesClienteData.agente_venta_2 != null ? agentesClienteData.agente_venta_2.nombre : null,
					inside_sales: agentesClienteData.inside_sales != null ? agentesClienteData.inside_sales.nombre : null,
				}
				element.agentes_cliente = agentes;
			}else{
				const agentes = {
					agente_operativo: null,
					agente_venta_1: null,
					agente_venta_2: null,
					inside_sales: null
				};
				element.agentes_cliente = agentes;
			}
			const oficinasClienteData = await db.sequelize.models.oficinas_cliente.findAll({where:{id_cliente:element.id}});
			const oficinasCliente = [];
			for(const oficinaClientedata of oficinasClienteData){
				oficinasCliente.push({ id_oficina: oficinaClientedata.id_oficina })
			}
			element.contactos = [];
			element.contacto = null;
			if(oficinasCliente.length > 0){
				const filtro = {
					[db.Sequelize.Op.or]: oficinasCliente,
				}
				const contactosData = await db.sequelize.models.contactos.findAll({where:filtro,order: [['createdAt', 'ASC']]})
				if(contactosData.length > 0){
						element.contactos = contactosData
						element.contacto = contactosData[0]
				}
			}
			element.rfc = null;
			if(element.razones_sociales.length > 0){
				element.rfc = element.razones_sociales[0].no_identificacion;
			}

			element.telefono = null;
			element.email = null;
			if(element.contactos.length > 0){
				element.telefono = element.contactos[0].telefono;
				element.email = element.contactos[0].email;
			}

			element.clave = `KP-${element.id}`;
			element.estatus = 'Sin factura';
			element.dias_ultima_factura = null;
			if(element.fecha_ultima_factura != null){
				const fechaUltimaFactura = moment(element.fecha_ultima_factura).tz('America/Mexico_City');
				const fechaActual = moment().tz('America/Mexico_City');
				const diasUltimaFactura = fechaActual.diff(fechaUltimaFactura, 'days');
				
				element.dias_ultima_factura = diasUltimaFactura;
				if(diasUltimaFactura >= 60){
					element.estatus = 'Inactivo';
				}else if (diasUltimaFactura >= 30 && diasUltimaFactura < 60){
					element.estatus = 'Pasivo';
				}else if(diasUltimaFactura < 30){
					element.estatus = 'Activo';
				}
			}

			if (element.pais!=null) {
				element.pais = element.estado.pais.descripcion;
			element.estado = element.estado.descripcion;
			}
			element.agenteCxc = null;
			element.bloqueado = null;
			element.comentarios = null;
			if(element.detalles_cliente != null){
				element.agenteCxc = element.detalles_cliente.agente_credito_cobranza != null ? element.detalles_cliente.agente_credito_cobranza.nombre : null;
				element.bloqueado = element.detalles_cliente.bloqueado;
				element.comentarios = element.detalles_cliente.observaciones;
			}

			element.bloqueado = element.bloqueado == true ? 'Si' : 'No';
			element.fuente = element.fuente != null ? element.fuente.descripcion : null;
			const fechaCreacion = element.createdAt.toISOString().slice(0, 19).replace('T', ' ');
			element.fechaCreacion = fechaCreacion.split(' ')[0];

			element.eliminado = null;
			if(element.cliente_prospecto == false){
				element.eliminado = element.deletedAt != null ? 'Si' : 'No';
			}
			
			data.push(element);
		}
	
		//Se crean los encabezados
		const dataExcel = [];

		//se ordena la información de los clientes
		let aux;
		let clienteProspecto;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			if(elemento.cliente_prospecto == true){
				clienteProspecto = true;
				aux = {
					'Estatus': elemento.estatus != null ? elemento.estatus : '',
					'Clave': elemento.clave != null ? elemento.clave : '',
					'Nombre': elemento.nombre != null ? elemento.nombre : '',
					'RFC': elemento.rfc != null ? elemento.rfc : '',
					'Teléfono': elemento.telefono != null ? elemento.telefono : '',
					'Email': elemento.email != null ? elemento.email : '',
					'Fuente': elemento.fuente != null ? elemento.fuente : '',
					'inside sales': elemento.agentes_cliente.inside_sales != null ? elemento.agentes_cliente.inside_sales : '',
					'Agente 1': elemento.agentes_cliente.agente_venta_1 != null ? elemento.agentes_cliente.agente_venta_1 : '',
					'Agente 2': elemento.agentes_cliente.agente_venta_2 != null ? elemento.agentes_cliente.agente_venta_2 : '',
					'Ejecutivo CxC': elemento.agenteCxc != null ? elemento.agenteCxc : '',
					'Ejecutivo de operaciones': elemento.agentes_cliente.agente_operativo != null ? elemento.agentes_cliente.agente_operativo : '',
					'Fecha de Creación': elemento.fechaCreacion != null ? elemento.fechaCreacion : '',
					'Bloqueado': elemento.bloqueado != null ? elemento.bloqueado : '',
					'Comentarios': elemento.comentarios != null ? elemento.comentarios : '',
					'País': elemento.pais != null ? elemento.pais : '',
					'Estado': elemento.estado != null ? elemento.estado : '',
					'Días desde la última factura': elemento.dias_ultima_factura != null ? elemento.dias_ultima_factura : ''
				};
			}else{
				clienteProspecto = false;
				aux = {
					'Clave': elemento.clave != null ? elemento.clave : '',
					'Nombre': elemento.nombre != null ? elemento.nombre : '',
					'Estatus': elemento.estatus != null ? elemento.estatus : '',
					'Teléfono': elemento.telefono != null ? elemento.telefono : '',
					'Email': elemento.email != null ? elemento.email : '',
					'Fuente': elemento.fuente != null ? elemento.fuente : '',
					'inside sales': elemento.agentes_cliente.inside_sales != null ? elemento.agentes_cliente.inside_sales : '',
					'Agente 1': elemento.agentes_cliente.agente_venta_1 != null ? elemento.agentes_cliente.agente_venta_1 : '',
					'Agente 2': elemento.agentes_cliente.agente_venta_2 != null ? elemento.agentes_cliente.agente_venta_2 : '',
					'Eliminado': elemento.eliminado != null ? elemento.eliminado : '',
					'Fecha de Creación': elemento.fechaCreacion != null ? elemento.fechaCreacion : ''
				};
			}
			
			dataExcel.push(aux);
		}
		if(dataExcel.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte =  clienteProspecto == true ? 'Clientes' : 'Prospectos';
		const namesSheets = nombreReporte;
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteOneSheet(res,req);
	} catch (error) {
		return res.status(500).json({ success: false, msg: 'Error interno del servidor', error: error.toString()});

	}
}

async function createProspectoCliente(req, res) {
	try {
		const parametros = req.body;
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idPais', tipo:'model',model:db.sequelize.models.paises},
							{campo:'idMarca', tipo:'model',model:db.sequelize.models.marcas},
							{campo:'idFuente',tipo:'model',model:db.sequelize.models.fuentes},
							{campo:'nombreSolicitante', tipo:'string',largo:255,textoCase:"up"},
							{campo:'apellidoPaterno', tipo:'string',largo:255,textoCase:"up"},
							{campo:'apellidoMaterno', tipo:'string',largo:255,textoCase:"up"},
							{campo:'email', tipo:'string',largo:255,textoCase:"up"},
							{campo:'telefono', tipo:'string',largo:255,textoCase:"up"},
							{campo:'empresa', tipo:'string',largo:255,textoCase:"up"},
							{campo:'puesto', tipo:'string',largo:255,textoCase:"up"}]
							
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const info = {
			'idMarca':parametros.idMarca,
		};

		let nombreCompleto = `${registro.nombre_solicitante} ${registro.apellido_paterno} ${registro.apellido_materno}`.trim();

		const registrosEncontrados = await db.sequelize.models.clientes.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					nombre: {
						[db.Sequelize.Op.like]: `%${nombreCompleto}%`
					},
					deletedAt: null
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.nombre.toLowerCase() == nombreCompleto.toLowerCase()){
					if(!regExistente){
						regExistente = true;
						info.subject = "Error en la Creación de Prospecto";
						sendMail('creacion_prospecto_no_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto },{nombre:'detallesError', contenido:"Registro existente"}],info);
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				}
			});
			if(regExistente){
				return '';
			}
		}

		//Validación de la OFAC
		const name = parametros.nombre;
		let datosEntidad = {
			nombre: name,
			pais: '',
			rfc: ''
		}

		const entidadValidada = await ofac.validarEntidad(datosEntidad);
		let nuevoCliente = undefined;

		if(entidadValidada.success){
			if(entidadValidada.coincidencias.matches[name].length > 0){
				if(entidadValidada.coincidencias.matches[name].length > 0){
					const entidades = entidadValidada.coincidencias.matches[name];
					let coincidenciaExacta = false;
	
					//verifica que el nombre se parezca
					for (let i = 0; i < entidades.length; i++) {
						const entidad = entidades[i];			
						const nombreOfac = await ManipuladorCadenas.quitarAcentos(entidad.fullName.toLowerCase());
						const nombreSist = await ManipuladorCadenas.quitarAcentos(datosEntidad.nombre.toLowerCase());
	
						if(nombreOfac == nombreSist){
							coincidenciaExacta = true;
						}
					}
	
					if(coincidenciaExacta == true){
						nuevoCliente = entidadValidada.coincidencias.matches;
						info.subject = "Error en la Creación de Prospecto";
						sendMail('creacion_prospecto_no_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto }, {nombre:'detallesError', contenido:"Se han encontrado coincidencias en la lista de sanciones de la OFAC"}],info);
						return res.status(200).send({ status: true, msg: "Se han encontrado coincidencias en la lista de sanciones de la OFAC"});
					}	
				}
			}
			
			const estadosEncontrados = await db.sequelize.models.estados.findAll({
				where: {
					id_pais: parametros.idPais, 
					deletedAt: null
				},
				order: [['createdAt', 'ASC']],
			});
		
			if(estadosEncontrados.length < 1){
				info.subject = "Error en la Creación de Prospecto";
				sendMail('creacion_prospecto_no_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto }, {nombre:'detallesError', contenido:"El país no tiene registros"}],info);
				return res.status(400).json({ success: false, error: 'Sin registros de País' });
			}
		
			const registroFuente = await db.sequelize.models.fuentes.findByPk(parametros.idFuente);
				
			let registroCliente = {
				nombre: nombreCompleto,
				id_tipo_cliente: 1,
				id_estado: estadosEncontrados[0].id,
				id_fuente: parametros.idFuente,
				cliente_prospecto: false
			}
		
			nuevoCliente = await db.sequelize.models.clientes.create(registroCliente);
			let oficinaCliente = {};
			let marcaAgenteOficina = {};
			
			oficinaCliente.id_cliente = nuevoCliente.id;
		
			let oficina = {
					nombre: `${nombreCompleto} ${estadosEncontrados[0].pais.descripcion}`
			}
		
			const nuevaOficina = await db.sequelize.models.oficinas.create(oficina);
		
			oficinaCliente.id_oficina = nuevaOficina.id;
			marcaAgenteOficina.id_cliente = oficinaCliente.id_cliente
			marcaAgenteOficina.id_marca = parametros.idMarca;

			const  nuevaOficinaCliente = await db.sequelize.models.oficinas_cliente.create(oficinaCliente);
		
			const contacto = {
		
					id_oficina: nuevaOficinaCliente.id_oficina,
					nombre: parametros.nombreSolicitante.toUpperCase(),
					apellido_materno: parametros.apellidoMaterno.toUpperCase(), 
					apellido_paterno: parametros.apellidoPaterno.toUpperCase() ,
					departemento: parametros.empresa.toUpperCase(),
					telefono: parametros.telefono.toUpperCase(),
					email: parametros.email.toUpperCase() ,
					puesto: parametros.puesto.toUpperCase(),
					manera_enviar: 'S',
					dia_envio: 1
			}
		
			const nuevoContacto = await db.sequelize.models.contactos.create(contacto);
			const nuevoMarcaAgenteOficina = await db.sequelize.models.marca_agentes_clientes.create(marcaAgenteOficina);
			
			info.subject = "Creación Automática de Prospecto: Exitosa";
			sendMail('creacion_prospecto_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto }, {nombre:'claveCliente', contenido:`KP-${nuevoCliente.id}`},  {nombre:'fuente', contenido:registroFuente.descripcion}],info);
				
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente"});
		}else{
			info.subject = "Error en la Creación de Prospecto";
			sendMail('creacion_prospecto_no_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto }, {nombre:'detallesError', contenido:"Error consultando a la OFAC"}],info);
			res.status(500).send({ status: false, msg: "Error consultando a la OFAC"});
			return undefined;
		}
	} catch (error) {
		info.subject = "Error en la Creación de Prospecto";
		sendMail('creacion_prospecto_no_exitosa',[{nombre:'nombreCliente',contenido: nombreCompleto }, {nombre:'detallesError', contenido:"Hubo un error en el sistema, por favor de contactar a un operativo"}],info);
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function sendMail(tpl,data,info){
	// Obtiene el ID del rol BRANCH MANAGER (branch manager)
	const bm = await db.sequelize.models.roles.findOne({ where: { id: 14 } });

	// Verifica si el rol HOC está presente en la base de datos
	if (!bm) {
		return { status: false, msg: "El rol BM no se encuentra en la base de datos" };
	}

	// Busca todos los usuarios con el rol bm
	const usuariosNotifiacion = await db.sequelize.models.roles_usuarios.findAll({
		where: { id_role: bm.id }
	});

	// Obtiene los correos electrónicos de los usuarios
	const correos = [];
	for (let i = 0; i < usuariosNotifiacion.length; i++) {
		let idUsuario = usuariosNotifiacion[i];
		let emailUsuario = await db.sequelize.models.usuarios.findOne({
			attributes: ['email'],
			where: { id: idUsuario.id_usuario }
		});

		if (emailUsuario && !correos.includes(emailUsuario.email)) {
			correos.push(emailUsuario.email);
		}
	}

	const rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `${tpl}.html`);
	var htmlContent = await fs.promises.readFile(rutaArchivoHTML, 'utf8');
	for (let index = 0; index < data.length; index++) {
		const campo = data[index];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}
	let mailOptions = {
		to: correos,
		subject: info.subject,
		html: htmlContent
	};
	const mainSender = new MailController(null, info.idMarca, mailOptions, true)
	mainSender.sendMail()
}

async function sendNotificacionCambioEstatusCliente() {
	const correosOperativos = [];
	const clientes = await db.sequelize.models.clientes.findAll({
		where: {
			cliente_prospecto: true,
			deletedAt: null
		}
	});
	if(clientes == null) return;

	for (let i = 0; i < clientes.length; i++) {
		const cliente = clientes[i];
		//obtiene todas las razones sociales del cliente
		const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({
			where: {
				id_cliente: cliente.id,
				deletedAt: null
			}
		});
		if(clientesRazonesSociales == null) continue;

		const idRazonesSociales = [];
		for (let j = 0; j < clientesRazonesSociales.length; j++) {
			const clienteRazonSocial = clientesRazonesSociales[j];
			idRazonesSociales.push(clienteRazonSocial.id);
		}
		if(idRazonesSociales.length <= 0) continue;
		const facturasCliente = await db.sequelize.models.facturas.findAll({
			where:{
				id_razon_social: {
					[db.Sequelize.Op.in]: idRazonesSociales
				},
				deletedAt: null,
			},
			order: [['createdAt', 'DESC']]
		});
		
		if(facturasCliente.length <= 0) continue;
		const fechaUltimaFactura = moment(facturasCliente[0].createdAt).tz('America/Mexico_City');
		const fechaActual = moment().tz('America/Mexico_City');
		const diasDiferencia = fechaActual.diff(fechaUltimaFactura, 'days');

		if(diasDiferencia == 50){
			//se obtienen todos los agentes del cliente
			const agentesCliente = await db.sequelize.models.marca_agentes_clientes.findAll({
				where: {
					id_cliente: cliente.id,
					deletedAt: null
				}
			});
			if (agentesCliente == null) continue;
			
			let ejecutivo = null;

			if(agentesCliente[0].id_agente_operativo != null){
				ejecutivo = await db.sequelize.models.usuarios.findByPk(agentesCliente[0].id_agente_operativo);
				correosOperativos.push(ejecutivo.email);
			}
			if(agentesCliente[0].id_agente_venta_1 != null){
				ejecutivo = await db.sequelize.models.usuarios.findByPk(agentesCliente[0].id_agente_venta_1);
				correosOperativos.push(ejecutivo.email);
			}
			if(agentesCliente[0].id_agente_venta_2 != null){
				ejecutivo = await db.sequelize.models.usuarios.findByPk(agentesCliente[0].id_agente_venta_2);
				correosOperativos.push(ejecutivo.email);
			}
			if(agentesCliente[0].id_inside_sales != null){
				ejecutivo = await db.sequelize.models.usuarios.findByPk(agentesCliente[0].id_inside_sales);
				correosOperativos.push(ejecutivo.email);
			}

			if(correosOperativos.length == 0) continue;
			//genera el cuerpo del correo
			let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `cliente_inactivo.html`);
			var htmlContent = fs.readFileSync(rutaArchivoHTML, 'utf8');
			const data = [
				{nombre:'idCliente', contenido: cliente.id},
				{nombre:'nombreCliente', contenido: cliente.nombre}
			];
			for (let j = 0; j < data.length; j++) {
				const campo = data[j];
				htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
			}
			for (let j = 0; j < correosOperativos.length; j++) {
				const correo = correosOperativos[j];
				let mailOptions = {
					to: correo,
					subject: `Cambio de estatus del cliente Clave cliente - ${cliente.nombre}`,
					html: htmlContent
				};
				const mainSender = new MailController(null, null, mailOptions, null);
				await mainSender.sendMail();
			}
		}
	}
	return;
}

async function sendNotificacionAsignacionAgente(idCliente, usuario){
	const all = [
		'detalles_cliente.agente_credito_cobranza',
		'detalles_cliente.agente_customer'
	]
    const findRelaciones = new Relaciones(all,all,db.sequelize.models)
	const relaciones = await findRelaciones.getRelaciones()
	const cliente = await db.sequelize.models.clientes.findByPk(idCliente,{
		include: relaciones,
	});
	const detalles = cliente.detalles_cliente
	const fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	if(detalles.id_agente_credito_cobranza != null){
		const agente = detalles.agente_credito_cobranza
		const notificacion = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: cliente.id,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuario.nombre,
			idMarca: '',
			idUsuario: usuario.id,
			correo:agente.email,
			asignado: true,
			ejecutivo: 'Ejecutivo de Crédito y Cobranza'
		}
		sendNotificacion(notificacion)
	}
	if(detalles.id_agente_customer != null){
		const agente = detalles.agente_customer
		const notificacion = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: cliente.id,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuario.nombre,
			idMarca: '',
			idUsuario: usuario.id,
			correo:agente.email,
			asignado: true,
			ejecutivo: 'Ejecutivo de Atención a Cliente'
		}
		sendNotificacion(notificacion)
	}
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos,
	exportar,
	createProspectoCliente,
	sendNotificacionCambioEstatusCliente
}
