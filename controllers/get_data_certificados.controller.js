'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const { getPolizasDetalle } = require('../middlewares/getters');
const { getAtributo } = require('./atributos_keepro.controller');
const { getPolizaDetalle } = require('../middlewares/getters');
const { Filtros } = require('../middlewares/filtros');
const { xmlToJSON } = require('./facturacion_pdf.controller')


//GetClientes
async function indexClientes(req, res) {
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

	let clientes = [];
	let totalPages
	let nextPage
	let prevPage
	let fullUrl
	let nextPageUrl
	let prevPageUrl
	let totalCount
	if((req.usuario.es_autoemisor === true && req.usuario.es_mediador_mercantil !== true) || (req.usuario.es_colaborador === true && req.usuario.es_autoemisor === true)){
		const rel = [ 'detalles_cliente','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno'];
		const findRelaciones = new Relaciones(rel,rel,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const cliente = await db.sequelize.models.clientes.findByPk(req.usuario.id_cliente,{
			include: relaciones
		})
		return res.status(200).send({
			success: true,
			currentPage: 1,
			nextPage: null,
			prevPage: null,
			pages: 1,
			total: 1,
			data: [cliente]
		});
	} else if(req.usuario.es_proveedor === true){
		return res.status(200).send({
			success: true,
			currentPage: 1,
			nextPage: null,
			prevPage: null,
			pages: 1,
			total: 1,
			data: []
		});
	} else if(req.usuario.es_mediador_mercantil === true ){
		const filtro = {deletedAt: null};
		const busquedaLibre = {}
		filtro["$detalles_cliente.id_mediador_mercantil$"] = req.usuario.id_mediador_mercantil
		var busquedaLibreTxt = req.query.busquedaLibre;
		if (busquedaLibreTxt != undefined && busquedaLibreTxt != '') {
			busquedaLibre['nombre'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$categoria_cliente.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$categoria_cliente.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$tipo_cliente.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.pais.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.pais.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$oficina_interno.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			filtro[db.Sequelize.Op.or] = busquedaLibre;
		}
		const offset = (page - 1) * pageSize;
		const limit = pageSize;
		const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
		const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.clientes.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.body.keepro == 3){
				clientes.push({
					id: element.id,
					nombre: element.nombre,
					categoria_cliente: element.categoria_cliente === null ? "" : "(" + element.categoria_cliente.clave + ") " +element.categoria_cliente.descripcion,
					tipo_cliente: element.tipo_cliente.nombre,
				})
			}else{
				clientes.push(element)
			}
		}
		totalCount = await db.sequelize.models.clientes.count({
			paranoid: false,
			include: relaciones,
			where: filtro,
		});

		totalPages = Math.ceil(totalCount / pageSize);
		nextPage = page < totalPages ? page + 1 : null;
		prevPage = page > 1 ? page - 1 : null;
		fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getClientes` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/clientes`;
		nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		
	} else if(req.usuario.es_colaborador === true ){
		const filtro = {deletedAt: null};
		const busquedaLibre = {}
		var busquedaLibreTxt = req.query.busquedaLibre;
		if (busquedaLibreTxt != undefined && busquedaLibreTxt != '') {
			busquedaLibre['nombre'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$categoria_cliente.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$categoria_cliente.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$tipo_cliente.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.pais.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.pais.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$estado.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			busquedaLibre['$oficina_interno.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
			filtro[db.Sequelize.Op.or] = busquedaLibre;
		}
		const offset = (page - 1) * pageSize;
		const limit = pageSize;
		const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
		const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		
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
		filtro.cliente_prospecto = true
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

		clientes = await db.sequelize.models.clientes.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		totalCount = await db.sequelize.models.clientes.count({
			paranoid: false,
			include: relaciones,
			where: filtro,
		});

		totalPages = Math.ceil(totalCount / pageSize);
		nextPage = page < totalPages ? page + 1 : null;
		prevPage = page > 1 ? page - 1 : null;
		fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getClientes` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/clientes`;
		nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		
	} else{
		if(req.usuario.id == 1){
			const filtro = {deletedAt: null};
			const busquedaLibre = {}
			var busquedaLibreTxt = req.query.busquedaLibre;
			if (busquedaLibreTxt != undefined && busquedaLibreTxt != '') {
				busquedaLibre['nombre'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$categoria_cliente.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$categoria_cliente.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$tipo_cliente.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$estado.pais.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$estado.pais.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$estado.clave$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$estado.descripcion$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				busquedaLibre['$oficina_interno.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
				filtro[db.Sequelize.Op.or] = busquedaLibre;
			}
			const offset = (page - 1) * pageSize;
			const limit = pageSize;
			const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
			const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			clientes = await db.sequelize.models.clientes.findAll({
				paranoid: false,
				include: relaciones,
				order: [[campoOrden, orden]],
				where: filtro,
				offset,
				limit
			})
			totalCount = await db.sequelize.models.clientes.count({
				paranoid: false,
				include: relaciones,
				where: filtro,
			});

			totalPages = Math.ceil(totalCount / pageSize);
			nextPage = page < totalPages ? page + 1 : null;
			prevPage = page > 1 ? page - 1 : null;
			fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getClientes` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/clientes`;
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			
		}else{
			return res.status(200).json({ success: false, error: 'No se cuenta con ningún cliente asignado' });
		}
	}
	return res.status(200).send({
		success: true,
		currentPage: page,
		nextPage: nextPageUrl,
		prevPage: prevPageUrl,
		pages: totalPages,
		total: totalCount,
		data: clientes
	});
}

//GetOficinas
async function indexOficinas(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,);
	if(cliente == null){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no existe` });
	}
    if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} es prospecto` });
	}
	const filtro = await getFiltroOficinas(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {

		const docs = await db.sequelize.models.oficinas_cliente.findAll({
			paranoid: false,
			page: page || 1,
			include: [{
				model: db.sequelize.models.oficinas,
				as: 'oficina',
				attributes: ['nombre']
			}],
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.oficinas_cliente.count({
			paranoid: false,
			include: [{
				model: db.sequelize.models.oficinas,
				as: 'oficina',
				attributes: ['nombre']
			}],
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getOficinas` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/oficinas`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idCliente=${req.query.idCliente}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idCliente=${req.query.idCliente}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const data = []
		for (let index = 0; index < docs.length; index++) {
			const oficinaCliente = docs[index];
			if(req.query.keepro === 3){
				const oficina = await db.sequelize.models.oficinas.findByPk(oficinaCliente.id_oficina)
				data.push({
					id: oficina.id,
					nombre: oficina.nombre,
				})
			}else{
				data.push(await db.sequelize.models.oficinas.findByPk(oficinaCliente.id_oficina, {include: [{
					model: db.sequelize.models.usuarios,
					as: 'usuario_registro',
					attributes: {
						exclude: ['password','code_pass'] 
					}
				}]}))
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
async function getFiltroOficinas(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	filtro.id_cliente =  parametros.idCliente
	if (busquedaLibreTxt != undefined && busquedaLibreTxt != '') {
        filtro['$oficina.nombre$'] = { [db.Sequelize.Op.like]: `%${busquedaLibreTxt}%` };
    }
	return filtro;

}


//GetBeneficiarios
async function indexBeneficiarios(req, res) {
	const rutaData = req.originalUrl.split('/')
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.beneficiarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente);
	if(cliente == null){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no existe` });
	}
	if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} es prospecto` });
	}
	var bloqueados = req.query.bloqueados;
	const filtro = await getFiltroBeneficiarios(req.query);
	/*if(bloqueados == 'only'){
		filtro.bloqueado = true
	} else if(bloqueados == 'true'){
		filtro.bloqueado = {
			[db.Sequelize.Op.or]: [true, false, null]
		  }
	} else if(bloqueados == 'false' || bloqueados == undefined){
		filtro.bloqueado = {
			[db.Sequelize.Op.or]: [false, null]
		  }
	}*/
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		var filtroBeneficiarioCliente = {deletedAt: null};
		filtroBeneficiarioCliente.id_cliente =  req.query.idCliente
		const clientesBeneficiarios = await db.sequelize.models.clientes_beneficiarios.findAll({where: filtroBeneficiarioCliente})
		let beneficiariosIds = []
		for(const clienteBeneficiario of clientesBeneficiarios){
			beneficiariosIds.push(clienteBeneficiario.id_beneficiario)
		}
		if(beneficiariosIds.length == 0){
			beneficiariosIds = [-1]
		}
		filtro.id = {[db.Sequelize.Op.or]: beneficiariosIds}


		const all = ['pais_sat.continente', 'nacionalidad.continente', 'domicilio.estado.pais.continente']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.beneficiarios.findAll({
			paranoid: false,
			attributes: req.query.keepro !== 3 ? undefined : ['id', 'nombre', 'rfc'],
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.beneficiarios.count({
			paranoid: false,
			include:relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getBeneficiarios` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/beneficiarios`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idCliente=${req.query.idCliente}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idCliente=${req.query.idCliente}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro === 3 ){
				element.usuario_registro = undefined
				element.nacionalidad = undefined
				element.pais_sat = undefined
				element.domicilio = undefined
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
async function getFiltroBeneficiarios(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['clave'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['nombre'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['rfc'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['email'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}

		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}


//GetRazonesSociales
async function indexRazonesSociales(req, res) {
	const rutaData = req.originalUrl.split('/')
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	if(!Number.isInteger(parseInt(req.query.idOficina))){
		res.status(400).send({status:false , msg: `El parametro idOficina debe ser int.` });
		return false
	} 
	const filtro = await getFiltroRazonesSociales(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		var filtroOficinaCliente = {deletedAt: null};
		filtroOficinaCliente.id_oficina =  req.query.idOficina
		const oficinasRazonesSociales = await db.sequelize.models.oficinas_razones_sociales.findAll({where: filtroOficinaCliente})
		let razonesSocialesIDs = []
		for(const oficinaRazonSociale of oficinasRazonesSociales){
			razonesSocialesIDs.push(oficinaRazonSociale.id_razon_social)
		}
		if(razonesSocialesIDs.length == 0){
			razonesSocialesIDs = [-1]
		}
		filtro.id =  {[db.Sequelize.Op.or]: razonesSocialesIDs}
		const all =  ['pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.razones_sociales.findAll({
			paranoid: false,
			attributes: req.query.keepro !== 3 ? undefined : ['id', 'no_identificacion', 'razon_social'],
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.razones_sociales.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getRazonesSociales` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/razonesSociales`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficina=${req.query.idOficina}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficina=${req.query.idOficina}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const data = []
		for(const doc of docs){
			const razonSocialValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:doc.id, id_marca: 1}})
			let razonValidada = true
			if(razonSocialValidacion == null){
				const fechaCreacionRS = moment(doc.createdAt).tz('America/Mexico_City')
				const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
				if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
					razonValidada = false
				}
			} else{
				if((razonSocialValidacion.id_marca != 1) ){
					razonValidada = false
				} else{
					if(razonSocialValidacion.prevalidado !== true && razonSocialValidacion.validado !== true){
						const fechaCreacionRS = moment(doc.createdAt).tz('America/Mexico_City')
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
			const element = doc.toJSON()
			if(razonValidada === true){
				element.validada = true
			}else{
				element.validada = false
			}
			if(req.query.keepro === 3 ){
				element.usuario_registro = undefined
				element.pais = undefined
				element.uso_cfdi = undefined
				element.metodo_pago = undefined
				element.forma_pago = undefined
				element.razon_bloqueo = undefined
				element.regimen_fiscal = undefined
				element.moneda_credito = undefined
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
async function getFiltroRazonesSociales(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['no_identificacion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['razon_social'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetOficinaProductos
async function indexOficinasProductos(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	const parametros = req.query;
	/*let obligatorios = [{campo:'keepro', tipo:'number'}]
	if(parametros.keepro == 0){
		obligatorios.push({campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas})
	}
	//Se validan los paramtros obligatorios
	const registro = await Validaciones.validParametros(req, res,obligatorios,{});
	if(!registro){
		return '';
	}
	//Se verifica que el parametro keepro este entre el rango de 0 y 3
	if(parametros.keepro < 0 || parametros.keepro > 3){
		return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
	}*/
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(!Number.isInteger(parseInt(parametros.idOficina))){
		res.status(400).send({status:false , msg: `El parametro idOficina debe ser int.` });
		return false
	} 
	if(!Number.isInteger(parseInt(parametros.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,{include:['categoria_cliente']});
	if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} es prospecto` });
	}
	if(!Number.isInteger(parseInt(parametros.idBeneficiario))){
		res.status(400).send({status:false , msg: `El parametro idBeneficiario debe ser int.` });
		return false
	} 
	if(!Number.isInteger(parseInt(parametros.idRazonSocial))){
		res.status(400).send({status:false , msg: `El parametro idRazonSocial debe ser int.` });
		return false
	} 
	const filtro = await getFiltroOficinasProductos(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const all = ['producto.moneda_compra','producto.moneda_venta','producto.pais.continente','producto.tipo_cobertura','producto.archivo','marca_agente_oficina.marca.domicilio.estado.pais.continente','marca_agente_oficina.marca.pais.continente','marca_agente_oficina.marca.archivo','marca_agente_oficina.marca.dato_facturacion.regimen_fiscal', 'marca_agente_oficina.marca.dato_facturacion.pais.continente', 'marca_agente_oficina.marca.dato_facturacion.nacionalidad_timbrado.continente','marca_agente_oficina.agente_venta_1','marca_agente_oficina.agente_venta_2','marca_agente_oficina.oficina_cliente.cliente.tipo_cliente', 'marca_agente_oficina.oficina_cliente.cliente.estado.pais.continente', 'marca_agente_oficina.oficina_cliente.cliente.oficina_interno','marca_agente_oficina.oficina_cliente.oficina']

		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.oficinas_productos.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.oficinas_productos.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getOficinaProductos` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/servicios`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficina=${parametros.idOficina}&idCliente=${parametros.idCliente}&idBeneficiario=${parametros.idBeneficiario}&idRazonSocial=${parametros.idRazonSocial}&orden=${orden}` : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficina=${parametros.idOficina}&idCliente=${parametros.idCliente}&idBeneficiario=${parametros.idBeneficiario}&idRazonSocial=${parametros.idRazonSocial}&orden=${orden}` : null;
		const data = []
		for (let index = 0; index < docs.length; index++) {
			const oficinaProducto = docs[index];
			var whereFind = {
				where: {
					id_oficina_producto: oficinaProducto.id ,
					num_movimientos: {
						[db.Sequelize.Op.or]: {
							[db.Sequelize.Op.ne]: 0,
							[db.Sequelize.Op.is]: null 
						} 
					},
					fecha_vencimiento: {
					  [db.Sequelize.Op.or]: {
						[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
						[db.Sequelize.Op.is]: null 
					  }
					},
					deletedAt: null
				}
			}
			const registrosEncontrados = await db.sequelize.models.atributos_keepro.findAll(whereFind);
			const parametrosTipoCobertura = {idOficinaProducto:oficinaProducto.id}
			const isRC = await getIsRc(parametrosTipoCobertura)
			if(isRC){
				const atributosContendor = await getAtributosRc(parametrosTipoCobertura)
				var sumasValidas = 0
				for (let index = 0; index < atributosContendor.length; index++) {
					const atributo = atributosContendor[index];
					sumasValidas =  atributo.limite_inferior
					
				}
				var tipoCambio = await getTipoCambio();
				var sumaMxn = sumasValidas * tipoCambio
				var auxMxn = parseFloat(sumaMxn) - parseInt(sumaMxn)
				if(auxMxn < 0.1){
					sumaMxn = parseInt(sumaMxn)
				}else{
					sumaMxn = await round(sumasValidas * tipoCambio,6)
				}
				const validNacionalidadBeneficiario = await validarNacionalidadBeneficiario(oficinaProducto.id, parametros.idCliente, parametros.idBeneficiario)
				if(validNacionalidadBeneficiario.success != undefined){
					return res.status(400).json(validNacionalidadBeneficiario);
				}
				const validNacionalidadRazonSocial = await validarNacionalidadRazonSocial(oficinaProducto.id, parametros.idOficina, parametros.idRazonSocial)
				if(validNacionalidadRazonSocial.success != undefined){
					return res.status(400).json(validNacionalidadRazonSocial);
				}
				const categoriasClientesValidas = ["FREIGHT FORWARDERS","AGENTES ADUANALES","CO-LOADER"]
				const isValid = categoriasClientesValidas.includes(cliente.categoria_cliente.descripcion) && cliente.categoria_cliente.rc == true
				if(validNacionalidadBeneficiario == true && validNacionalidadRazonSocial == true && isValid == true){
					data.push({
						id:oficinaProducto.id,
						id_producto: oficinaProducto.id_producto,
						nombre: oficinaProducto.producto.tipo_cobertura.nombre,
						sumaValidaUSD:sumasValidas,
						sumaValidaMXN: sumaMxn
					})
				}
			}else{
				const validNacionalidadBeneficiario = await validarNacionalidadBeneficiario( oficinaProducto.id, parametros.idCliente, parametros.idBeneficiario)
				if(validNacionalidadBeneficiario.success != undefined){
					return res.status(400).json(validNacionalidadBeneficiario);
				}
				const validNacionalidadRazonSocial = await validarNacionalidadRazonSocial(oficinaProducto.id, parametros.idOficina, parametros.idRazonSocial)
				if(validNacionalidadRazonSocial.success != undefined){
					return res.status(400).json(validNacionalidadRazonSocial);
				}
				if(validNacionalidadBeneficiario == true && validNacionalidadRazonSocial == true){
					data.push({
						id:oficinaProducto.id,
						id_producto: oficinaProducto.id_producto,
						nombre: oficinaProducto.producto.tipo_cobertura.nombre,
					})
				}
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
async function getFiltroOficinasProductos(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	filtro['$marca_agente_oficina.oficina_cliente.id_oficina$'] =  parametros.idOficina
	filtro['$marca_agente_oficina.id_marca$'] = {[db.Sequelize.Op.or]: [1]}
	/*if(parametros.keepro == 0){
		filtro['$marca_agente_oficina.id_marca$'] = marca.id
		//filtro['$marca_agente_oficina.id_marca$'] = parametros.idMarca
	}else{
		filtro['$marca_agente_oficina.id_marca$'] = marca.id
	}*/
	filtro['$producto.tipo_cobertura.nombre$'] = {[db.Sequelize.Op.or]: [
		{[db.Sequelize.Op.like]: `%CARGA%`},
		{[db.Sequelize.Op.like]: `%CONTENEDOR%`},
		{[db.Sequelize.Op.like]: `%ULTIMA MILLA%`},
		{[db.Sequelize.Op.like]: `%RC%`},
	]}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$producto.tipo_cobertura.nombre$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetMonedas
async function indexMonedas(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}
	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	const filtro = await getFiltroMonedas(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		var filtoMarcaMoneda = {deletedAt: null};
		const marca = await db.sequelize.models.marcas.findByPk(req.query.idMarca);
		if(marca == null){
			res.status(400).send({ success: false, error: `Registro con id: idMarca = ${req.query.idMarca} no encontrado` });
			return false
		}

		filtoMarcaMoneda.id_marca = req.query.idMarca
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const monedasMarcas = await db.sequelize.models.marcas_monedas.findAll({
			paranoid: false,
			where: filtoMarcaMoneda,
		})


		var filtroProveedorMoneda = {deletedAt: null};
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(req.query.idOficinaProducto);
		if(oficinaProducto == null){
			if(req.query.keepro === 3){
				res.status(400).send({ success: false, error: `Registro con id: idServicio = ${req.query.idOficinaProducto} no encontrado` });
			}else{
				res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${req.query.idOficinaProducto} no encontrado` });
			}
			return false
		}
		const mao = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProducto.id_marca_agente_oficina);
		const oc = await db.sequelize.models.oficinas_cliente.findByPk(mao.id_oficina_cliente);
		const proveedores = await getProveedores(req.query.idOficinaProducto)
		filtroProveedorMoneda.id_proveedor = {[db.Sequelize.Op.or]: proveedores}

		const proveedoresMonedas = await db.sequelize.models.proveedores_monedas.findAll({
			paranoid: false,
			order: [['createdAt', orden]],
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


		const docs = await db.sequelize.models.monedas.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		
		const data = []
		const clavesMonedas = []
		for (let index = 0; index < docs.length; index++) {
			const monedaData = docs[index];
			if(!clavesMonedas.includes(monedaData.clave) && idsMonedaMarcas.includes(monedaData.id) && idsMonedaProveedor.includes(monedaData.id)){
				const element = monedaData.toJSON()
				if(req.query.keepro === 3 ){
					element.usuario_registro = undefined
					element.id_usuario_registro = undefined
					element.principal = undefined
					element.principal_extranjero = undefined
					element.createdAt = undefined
					element.updatedAt = undefined
					element.deletedAt = undefined
				}
				data.push(element)
				clavesMonedas.push(monedaData.clave)
			}
		}
		const totalCount = data.length;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getMonedas` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/monedas`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
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
async function getFiltroMonedas(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['clave'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

async function getTipoCambio(){
    let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
    let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')

	let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
    if(doit !== true){
        return doit
    }
    const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
        where: {
            fecha: {
                [db.Sequelize.Op.like]: fechaBusqueda
            },
            deletedAt: null
        }
    });
    const tipoCambioSelected = registrosEncontrados[0]
	return tipoCambioSelected.tipo_cambio
}


//GetMonedas
async function getAgentesClientes(req, res) {
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		return res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
	} 
	const cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente);
	if(cliente == null){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no existe` });
	}
	if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} es prospecto` });
	}
	try {
		const getRelaciones =  [ 'agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
		var relaciones = []
		const findRelaciones = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models)
		relaciones = await findRelaciones.getRelaciones()
		const registroEncontrado = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:req.query.idCliente}, include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			const respuesta = {
				agente_operativo: registroEncontrado.agente_operativo,
				agente_venta_1: registroEncontrado.agente_venta_1,
				agente_venta_2: registroEncontrado.agente_venta_2,
				inside_sales: registroEncontrado.inside_sales,
			}
			return res.status(200).send({ status: true, data: respuesta});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function round(numero,decimas) {
    numero = parseFloat(numero)
    return Number(numero.toFixed(decimas));
}

//GetTiposContenedores
async function indexTiposContenedores(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}
	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	const filtro = await getFiltroTiposContenedores(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const all = ['tipo_contenedor']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.atributos_keepro.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCountData = await db.sequelize.models.atributos_keepro.count({
			paranoid: false,
			include: relaciones,
			where: filtro,
			group: ['tipo_contenedor.descripcion'] 
		});
		const totalCount = totalCountData.length
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getTiposContenedores` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/tiposContenedores`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		}
		const data = []
		const tiposContenedor = []
		const tipoCambio = await getTipoCambio();
		for (let index = 0; index < docs.length; index++) {
			const atributoKeepro = docs[index];
			if(!tiposContenedor.includes(atributoKeepro.tipo_contenedor.descripcion)){
				tiposContenedor.push(atributoKeepro.tipo_contenedor.descripcion)
				const tipoContenedor = await db.sequelize.models.tipo_contenedor.findByPk(atributoKeepro.tipo_contenedor.id, {include: ['tamanios_contenedor']});
				var sumaMxn = atributoKeepro.limite_inferior * tipoCambio
				var auxMxn = parseFloat(sumaMxn) - parseInt(sumaMxn)
				if(auxMxn < 0.1){
					sumaMxn = parseInt(sumaMxn)
				}else{
					sumaMxn = await round(atributoKeepro.limite_inferior * tipoCambio,6)
				}
				data.push({
					id: atributoKeepro.tipo_contenedor.id,
					descripcion: atributoKeepro.tipo_contenedor.descripcion,
					sumasAseguradasUSD: [atributoKeepro.limite_inferior],
					sumasAseguradasMXN: [sumaMxn],
					tamanios_contenedor: tipoContenedor.tamanios_contenedor
				})
			}else{
				const indexTipoContenedor = tiposContenedor.indexOf(atributoKeepro.tipo_contenedor.descripcion)
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
		}
		if(req.query.keepro === 3){
			for(const element of data){
				const tamanios_contenedor = []
				for(const tamainio of element.tamanios_contenedor){
					tamanios_contenedor.push({
						id: tamainio.id,
						descripcion: tamainio.descripcion,
					})
				}
				element.tamanios_contenedor = tamanios_contenedor
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
async function getFiltroTiposContenedores(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var busquedaLibre = {}
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
	if(oficinaProducto == null){
		if(req.query.keepro === 3){
			return { success: false, error: `Registro con id: idServicio = ${parametros.idOficinaProducto} no encontrado` }
		}else{
			return { success: false, error: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado` }
		}
	}
	const producto = await db.sequelize.models.productos.findByPk(oficinaProducto.id_producto,{include:['tipo_cobertura']});
	if(producto.tipo_cobertura.nombre != "COBERTURA CONTENEDOR"){
		return { success: false, error: 'El oficinaProducto debe tener tipo de cobertura: COBERTURA CONTENEDOR', }
	}
	var filtro = {
		id_oficina_producto: oficinaProducto.id ,
		num_movimientos: {
			[db.Sequelize.Op.or]: {
				[db.Sequelize.Op.ne]: 0,
				[db.Sequelize.Op.is]: null 
			} 
		},
		fecha_vencimiento: {
		  [db.Sequelize.Op.or]: {
			[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
			[db.Sequelize.Op.is]: null 
		  }
		},
		deletedAt: null
	};
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$tipo_contenedor.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetCommodities
async function indexCommodities(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.commoditys.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}

	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	const filtro = await getFiltroCommodities(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(req.query.idOficinaProducto);
		if(oficinaProducto == null){
			if(req.query.keepro === 3){
				return res.status(400).send({ success: false, error: `Registro con id: idServicio = ${req.query.idOficinaProducto} no encontrado` })
			}else{
				return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${req.query.idOficinaProducto} no encontrado` })
			}
		}
		const producto = await db.sequelize.models.productos.findByPk(oficinaProducto.id_producto, {include: ['tipo_cobertura']});
		const isContenedor = producto.tipo_cobertura.nombre.includes("contenedor")
		if(isContenedor){
			return res.status(400).send({ success: false, error: 'El oficinaProducto no debe tener tipo de cobertura: COBERTURA CONTENEDOR', })
		}
		const polizasDetalles = await getPolizasDetalles(req.query.idOficinaProducto)
		var filtroPolizasCommodities = {deletedAt: null};
		filtroPolizasCommodities.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}

		const polizasCommodities = await db.sequelize.models.polizas_commoditys.findAll({where: filtroPolizasCommodities})
		const commoditiesIds = []
		for(const polizaCommoditie of polizasCommodities){
			commoditiesIds.push(polizaCommoditie.id_commodity)
		}
		if(commoditiesIds.length < 1){
			commoditiesIds.push(-1)
		}
		filtro.id = {[db.Sequelize.Op.or]: commoditiesIds}
		
		const all = ['categoria']

		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.commoditys.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.commoditys.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getCommodities` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/commodities`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		}
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro === 3){
				data.push({
					id: element.id,
					descripcion: element.descripcion,
					categoria: element.categoria.descripcion,
				})
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
async function getFiltroCommodities(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}

	
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['$categoria.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetModalidades
async function indexModalidades(req, res) {
	const rutaData = req.originalUrl.split('/')
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}

	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	const filtro = await getFiltroModalidades(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const all = ['modalidad_transporte']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.polizas_modalidades.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const tipoContenedor = req.query.tipoContenedor
		if(tipoContenedor !== null && tipoContenedor !== undefined && tipoContenedor != ""){
			const atributos = await db.sequelize.models.atributos_keepro.findAll({
				paranoid: false,
				include:['tipo_contenedor'],
				where: {
					id_tipo_contenedor: req.query.tipoContenedor,
					id_oficina_producto: req.query.idOficinaProducto
				},
			})
			if(atributos.length < 1){
				return res.status(400).send({ status: false, msg: "No hay registros válidos para el tipo de contenedor seleccionado."});
			}
		}
		const data = []
		const modalidades = []
		for (let index = 0; index < docs.length; index++) {
			const polizasModalidades = docs[index];
			if(tipoContenedor == 5 || tipoContenedor == 4){
				if(!modalidades.includes(polizasModalidades.modalidad_transporte.nombre) && polizasModalidades.modalidad_transporte.nombre == "AÉREO"){
					if(req.query.keepro === 3){
						data.push({
							id: polizasModalidades.modalidad_transporte.id,
							nombre: polizasModalidades.modalidad_transporte.nombre,
						})
					}else{
						data.push(polizasModalidades.modalidad_transporte)
					}
					modalidades.push(polizasModalidades.modalidad_transporte.nombre)
				}
			}else{
				if(!modalidades.includes(polizasModalidades.modalidad_transporte.nombre)){
					if(req.query.keepro === 3){
						data.push({
							id: polizasModalidades.modalidad_transporte.id,
							nombre: polizasModalidades.modalidad_transporte.nombre,
						})
					}else{
						data.push(polizasModalidades.modalidad_transporte)
					}
					modalidades.push(polizasModalidades.modalidad_transporte.nombre)
				}
			}
		}
		const totalCount = data.length
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getModalidades` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/modalidades`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
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
		console.log(error)
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}
async function getFiltroModalidades(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}

	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
	if(oficinaProducto == null){
		if(parametros.keepro === 3){
			return { success: false, error: `Registro con id: idServicio = ${parametros.idOficinaProducto} no encontrado` }
		}else{
			return { success: false, error: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado` }
		}
	}
	const polizasDetalles = await getPolizasDetalles(parametros.idOficinaProducto)
	filtro.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$modalidad_transporte.nombre$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetPaises
async function indexPaises(req, res) {
	const rutaData = req.originalUrl.split('/')
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.paises.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}

	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	if(req.query.idPaisOrigen !== undefined && req.query.idPaisOrigen != ""){
		if(!Number.isInteger(parseInt(req.query.idPaisOrigen))){
			return res.status(400).send({status:false , msg: `El parametro idPaisOrigen debe ser int.` });
		} 
	}
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(req.query.idOficinaProducto);
	if(oficinaProducto == null){
		if(req.query.keepro === 3){
			return res.status(400).send({ success: false, error: `Registro con id: idServicio = ${req.query.idOficinaProducto} no encontrado` })
		}else{
			return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${req.query.idOficinaProducto} no encontrado` })
		}
	}
	const filtro = await getFiltroPaises(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const polizasDetalles = await getPolizasDetalles(req.query.idOficinaProducto)
		var filtroAux = {deletedAt: null};
		filtroAux.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}
		const atributosKeepro = await db.sequelize.models.atributos_keepro.findAll({
			where:{
				id_oficina_producto: oficinaProducto.id
			}
		});

		const polizaPaises = await db.sequelize.models.polizas_paises.findAll({where: filtroAux})
		let paisesIds = []
		for(const polizaPais of polizaPaises){
			paisesIds.push(polizaPais.id_pais)
		}
		for(const ak of atributosKeepro){
			if(ak.id_pais_origen !== null){
				if(!paisesIds.includes(ak.id_pais_origen)){
					paisesIds.push(ak.id_pais_origen)
				}
			}
		}
		if(req.query.idPaisOrigen !== undefined && req.query.idPaisOrigen != ""){
			const paisOrigen = await db.sequelize.models.paises.findByPk(req.query.idPaisOrigen);
			if(paisOrigen == null){
				return res.status(400).send({ success: false, error: `Registro con id: idPaisOrigen = ${req.query.idPaisOrigen} no encontrado` })
			}
			const territorialidades = await getPolizasTerritorialidades(polizasDetalles)
			if(!territorialidades.includes(parseInt(req.query.idPaisOrigen))){
				paisesIds = paisesIds.filter(numero => numero !== parseInt(req.query.idPaisOrigen));
			}
			for(const ak of atributosKeepro){
				if(ak.id_pais_origen == ak.id_pais_destino && ak.id_pais_destino !== null){
					if(!paisesIds.includes(ak.id_pais_origen)){
						paisesIds.push(ak.id_pais_origen)
					}
				}
			}
		}
		if(paisesIds.length == 0){
			paisesIds = [-1]
		}
		filtro.id = {[db.Sequelize.Op.or]: paisesIds}
		const all = ['continente']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.paises.findAll({
			paranoid: false,
			attributes: req.query.keepro !== 3 ? undefined : ['id', 'id_continente', 'clave', 'descripcion'],
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		if(req.query.idPaisOrigen !== undefined && req.query.idPaisOrigen != ""){
			const polizasDetalles = await getPolizasDetalles(req.query.idOficinaProducto)
			const paisOrigen = await db.sequelize.models.paises.findByPk(req.query.idPaisOrigen);
			const paisesOrigen = await db.sequelize.models.polizas_paises.findAll({where:{id_pais:req.query.idPaisOrigen,id_poliza_detalle:{[db.Sequelize.Op.or]: polizasDetalles}}});
			for(const ak of atributosKeepro){
				if(ak.id_pais_origen !== null){
					if(!paisesOrigen.includes(ak.id_pais_origen)){
						paisesOrigen.push(ak.id_pais_origen)
					}
				}
			}
			if(paisesOrigen.length == 0){
				return res.status(400).send({status:false , msg: `El registro país de origen seleccionado (${paisOrigen.descripcion}) no pertenece a la póliza asignada.` });
			}
		}
		const totalCount = await db.sequelize.models.paises.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getPaises` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/paises`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		}
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro === 3 ){
				element.id_continente = undefined
				element.continente.id = undefined
				element.continente.id_usuario_registro = undefined
				element.continente.createdAt = undefined
				element.continente.updatedAt = undefined
				element.continente.deletedAt = undefined
				element.usuario_registro = undefined
				element.continente = undefined
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
async function getFiltroPaises(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	

	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['clave'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['$continente.nombre$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}


//GetPaisesBeneficiarios
async function getPaisesBeneficiarios(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.paises.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}

	const filtro = await getFiltroPaisesBeneficiarios(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		if(req.query.keepro == 3){
			req.query.perfil = 'all'
		}
		const perfilesValidos = ['continente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				continente: ['continente'],
				all: ['continente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}else{
			try {
				const relacionesValidas = ['continente' ]
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones();
			} catch (error) {
				relaciones = []
			}
		}
		
		const docs = await db.sequelize.models.paises.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.paises.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getPaisesBeneficiarios` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/nacionalidadesBeneficiario`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro == 3){
				data.push({
					id: element.id,
					clave: element.clave,
					descripcion: element.descripcion
				})
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
async function getFiltroPaisesBeneficiarios(parametros){
	if(parametros.keepro == 3){
		var busquedaLibreTxt = parametros.busquedaLibre;
		var filtro = {deletedAt: null};
		var busquedaLibre = {}
		
	
		if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
			busquedaLibre['clave'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
			busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
			busquedaLibre['$continente.nombre$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
			filtro[db.Sequelize.Op.or] = busquedaLibre;
		}
		return filtro;
	}else{
		var filtro
		try {
			filtro = JSON.parse(parametros.filter)
			if(filtro.and == undefined){
				filtro.and = [{ property: 'mostrar_beneficiario', value: true, operator: '==' }]
			} else{
				filtro.and.push({ property: 'mostrar_beneficiario', value: true, operator: '==' })
			}
		} catch (error) {
			filtro = {}
			filtro.and = [{ property: 'mostrar_beneficiario', value: true, operator: '==' }]
		}
		var eliminados = parametros.eliminados;
		const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
		return await Filter.get()
	}
}

//GetEstados
async function indexEstados(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.estados.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}

	if(!Number.isInteger(parseInt(req.query.idPais))){
		return res.status(400).send({status:false , msg: `El parametro idPais debe ser int.` });
	}
	const filtro = await getFiltroEstados(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {

		const docs = await db.sequelize.models.estados.findAll({
			paranoid: false,
			page: page || 1,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.estados.count({
			paranoid: false,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getEstados` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/estados`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&iPais=${req.query.iPais}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&iPais=${req.query.iPais}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro == 3){
				data.push({
					id: element.id,
					clave: element.clave,
					descripcion: element.descripcion
				})
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
async function getFiltroEstados(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	const pais = await db.sequelize.models.paises.findByPk(parametros.idPais);
	if(pais == null){
		return { success: false, error: `Registro con id: idPais = ${parametros.idPais} no encontrado` }
	}
	filtro.id_pais = parametros.idPais
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['clave'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetPuertosAeropuertos
async function indexPuertosAeropuertos(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.puertos_aeropuertos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}

	if(!Number.isInteger(parseInt(req.query.idModalidad))){
		return res.status(400).send({status:false , msg: `El parametro idModalidad debe ser int.` });
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}
	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(req.query.idOficinaProducto);
	if(oficinaProducto == null){
		if(req.query.keepro === 3){
			return res.status(400).send({ success: false, error: `Registro con id: idServicio = ${req.query.idOficinaProducto} no encontrado` })
		}else{
			return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${req.query.idOficinaProducto} no encontrado` })
		}
	}
	const polizasDetalles = await getPolizasDetalles(req.query.idOficinaProducto)
	const modalidades = await db.sequelize.models.polizas_modalidades.findAll({where:{id_poliza_detalle:polizasDetalles,id_modalidad:req.query.idModalidad},include: ['modalidad_transporte']})
	if(modalidades.length == 0){
		return res.status(400).send({status:false , msg: `Registro con id: idModalidad = ${req.query.idModalidad} no encontrado` });
	}
	const modalidadSelected = modalidades[0].modalidad_transporte

	const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidadSelected.nombre.toLowerCase());
	const modalidadValida = modalidadNombre == 'maritimo' || modalidadNombre == 'aereo';
	const isMaritimo = modalidadNombre == 'maritimo';
	if(!modalidadValida){
		return res.status(400).send({status:false , msg: `Modalidad no válida para la póliza asignada. Debe ser Marítimo o Aéreo.` });
	}
	const filtro = await getFiltroPuertosAeropuertos(req.query,isMaritimo);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const all = ['nacionalidad.continente']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.puertos_aeropuertos.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.puertos_aeropuertos.count({
			paranoid: false,
			include:relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getPuertosAeropuertos` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/puertosAeropuestos`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		}
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.keepro === 3){
				data.push({
					id: element.id,
					descripcion: element.descripcion
				})
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
async function getFiltroPuertosAeropuertos(parametros,isMaritimo){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	filtro.tipo = !isMaritimo
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$nacionalidad.continente.nombre$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['$nacionalidad.clave$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['$nacionalidad.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//ValidarNacionalidadBeneficiario
async function validarNacionalidadBeneficiario(idOficinaProducto, idCliente, idBeneficiario) {
	const filtro = await getFiltroNacionalidadesInteresAsegurado(idOficinaProducto);
	if(filtro.success !== undefined){
		return filtro
	}
	try {
		const all = ['pais']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docsNacionalidades = await db.sequelize.models.polizas_nacionalidades_interes_asegurado.findAll({
			paranoid: false,
			include:relaciones,
			where: filtro
		})
		
		const nacionalidades = []
		const paises = []
		for (let index = 0; index < docsNacionalidades.length; index++) {
			const polizasPaises = docsNacionalidades[index];
			if(!paises.includes(polizasPaises.pais.descripcion)){
				nacionalidades.push(polizasPaises.pais.id)
				paises.push(polizasPaises.pais.descripcion)
			}
		}
		const where = {id_cliente: idCliente, id_beneficiario: idBeneficiario}
		
		const docs = await db.sequelize.models.clientes_beneficiarios.findAll({
			paranoid: false,
			include: [{
				model: db.sequelize.models.beneficiarios,
				as: 'beneficiario',
				attributes: ['clave','nombre','rfc','email','id_nacionalidad', 'bloqueado']
			}],
			where: where
		})
		if(docs.length == 0){
			return { success: false, error: `Registro con id: idBeneficiario = ${idBeneficiario} no encontrado` };
		}
		const beneficiario = docs[0]
		if(beneficiario.beneficiario.bloqueado == true){
			return { success: false, error: `Beneficiario bloqueado` };
		}
		var isValid = nacionalidades.includes(beneficiario.beneficiario.id_nacionalidad)
		return isValid
		
	} catch (error) {
		return { success: false, error: 'Error interno del servidor', error: error.toString() }
	}
	
}
async function getFiltroNacionalidadesInteresAsegurado(idOficinaProducto){
	var filtro = {deletedAt: null};
	const polizasDetalles = await getPolizasDetalles(idOficinaProducto)
	filtro.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}

	return filtro;

}

//ValidarNacionalidadRazonSocial
async function validarNacionalidadRazonSocial(idOficinaProducto, idOficina, idRazonSocial) {
	const filtro = await getFiltroNacionalidadesRazonSocial(idOficinaProducto);
	if(filtro.success !== undefined){
		return filtro
	}
	try {
		const all = ['pais']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docsNacionalidades = await db.sequelize.models.polizas_nacionalidades_razones_sociales.findAll({
			paranoid: false,
			include:relaciones,
			where: filtro
		})
		
		const nacionalidades = []
		const paises = []
		for (let index = 0; index < docsNacionalidades.length; index++) {
			const polizasPaises = docsNacionalidades[index];
			if(!paises.includes(polizasPaises.pais.descripcion)){
				nacionalidades.push(polizasPaises.pais.id)
				paises.push(polizasPaises.pais.descripcion)
			}
		}
		
		const docs = await db.sequelize.models.oficinas_razones_sociales.findAll({
			paranoid: false,
			include: [{
				model: db.sequelize.models.razones_sociales,
				as: 'razon_social',
				attributes: ['no_identificacion','razon_social','id_pais']
			}],
			where: {id_oficina: idOficina, id_razon_social: idRazonSocial}
		})
		if(docs.length == 0){
			return { success: false, error: `Registro con id: idRazonSocial = ${idRazonSocial} no encontrado` }
		}
		const razonSocial = docs[0]
		var isValid = nacionalidades.includes(razonSocial.razon_social.id_pais)
		return isValid
		
	} catch (error) {
		return { success: false, error: 'Error interno del servidor', error: error.toString() }
	}
	
}
async function getFiltroNacionalidadesRazonSocial(idOficinaProducto){
	var filtro = {deletedAt: null};
	const polizasDetalles = await getPolizasDetalles(idOficinaProducto)
	filtro.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}
	return filtro;
}

//GetUbicacionBienes
async function indexUbicacionBienes(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	if(!Number.isInteger(parseInt(req.query.idModalidad))){
		return res.status(400).send({status:false , msg: `El parametro idModalidad debe ser int.` });
	}
	if(req.query.keepro === 3){
		req.query.idOficinaProducto = req.query.idServicio
	}
	if(!Number.isInteger(parseInt(req.query.idOficinaProducto))){
		if(req.query.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 

	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(req.query.idOficinaProducto);
	if(oficinaProducto == null){
		if(req.query.keepro === 3){
			return res.status(400).send({ success: false, error: `Registro con id: idServicio = ${req.query.idOficinaProducto} no encontrado` })
		}else{
			return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${req.query.idOficinaProducto} no encontrado` })
		}
	}
	const polizasDetalles = await getPolizasDetalles(req.query.idOficinaProducto)
	const modalidades = await db.sequelize.models.polizas_modalidades.findAll({where:{id_poliza_detalle:polizasDetalles,id_modalidad:req.query.idModalidad}})
	if(modalidades.length == 0){
		return res.status(400).send({status:false , msg: `Registro con id: idModalidad = ${req.query.idModalidad} no encontrado` });
	}
	const filtro = await getFiltroUbicacionBienes(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const all = ['modalidad_transporte','ubicacion_bienes']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.modalidades_ubicaciones.findAll({
			paranoid: false,
			page: page || 1,
			include:relaciones,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.modalidades_ubicaciones.count({
			paranoid: false,
			include:relaciones,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = req.query.keepro !== 3 ? `${req.protocol}://${req.get('host')}/api/keepro/getUbicacionBienes` : `${req.protocol}://${req.get('host')}/api/KeeproOpen/ubicaciones`;
		let nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		let prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idOficinaProducto=${req.query.idOficinaProducto}&orden=${orden}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		if(req.query.keepro === 3){
			nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
			prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&idServicio=${req.query.idOficinaProducto}&orden=${orden}&idModalidad=${req.query.idModalidad}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		}
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(element.ubicacion_bienes != null){
				if(req.query.keepro === 3){
					data.push({
						id: element.ubicacion_bienes.id,
						descripcion: element.ubicacion_bienes.descripcion
					})
				}else{
					data.push(element.ubicacion_bienes)
				}
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
async function getFiltroUbicacionBienes(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	filtro.id_modalidad = parametros.idModalidad
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$ubicacion_bienes.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//GetTiposBienes
async function indexTiposBienes(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	const filtro = await getFiltroTiposBienes(req.query);
	if(filtro.status !== undefined){
		return res.status(400).send({
			success: false,
			data: filtro
		});
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const docs = await db.sequelize.models.tipos_bienes.findAll({
			paranoid: false,
			page: page || 1,
			paginate: pageSize || 10,
			order: [['createdAt', orden]],
			where: filtro,
			offset,
			limit
		})
		const totalCount = await db.sequelize.models.tipos_bienes.count({
			paranoid: false,
			where: filtro
		});
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/keepro/getTiposBienes`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.busquedaLibre != '' && req.query.busquedaLibre != undefined) ? `&busquedaLibre=${req.query.busquedaLibre}`:'') : null;
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
async function getFiltroTiposBienes(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['descripcion'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

//IsDeducible
async function isDeducibleAtributo(req,res){
	const parametros = req.body;
	if(!Number.isInteger(parseInt(parametros.idOficinaProducto))){
		return res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
	}
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
	if(oficinaProducto == null){
		return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado` });
	}
	const isContenedor = await getIsContenedor(parametros)
	const isRC = await getIsRc(parametros)
	const atributoSelected = await getatributoKeeproFn(req, res,isContenedor,isRC);
	if(atributoSelected === undefined){
		return undefined
	}
	if(atributoSelected.success !== undefined || atributoSelected.status !== undefined){
		return res.status(400).send(atributoSelected)
	}
	const polizaDetalles = await getPolizaDetalles(parametros,atributoSelected);
	const isDeducible = await atributoIsDeducibleFn(parametros,atributoSelected,polizaDetalles,isContenedor);
	return res.status(200).send({
		success: true,
		isDeducible: isDeducible
	});
}

//CanRedondo
async function canRedondo(req,res){
	const parametros = req.body;
	if(!Number.isInteger(parseInt(parametros.idOficinaProducto))){
		return res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
	}
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
	if(oficinaProducto == null){
		return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado` });
	}
	if(!Number.isInteger(parseInt(parametros.idMoneda))){
		return res.status(400).send({status:false , msg: `El parametro idMoneda debe ser int.` });
	} 
	if(!Number.isInteger(parseInt(parametros.idBeneficiario))){
		return res.status(400).send({status:false , msg: `El parametro idBeneficiario debe ser int.` });
	} 
	const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
	if(moneda.clave.toLowerCase() != 'usd'){
		const tipoCambio = await getTipoCambio();
		parametros.sumaAsegurada = parseFloat(parseFloat(parametros.sumaAsegurada / tipoCambio).toFixed(2))
	}
	const isContenedor = await getIsContenedor(parametros)
	const isRC = await getIsRc(parametros)
	const atributoSelected = await getAtributoKeeproFn(req, res,isContenedor,isRC);
	if(atributoSelected === undefined){
		return undefined
	}
	if(atributoSelected.success !== undefined || atributoSelected.status !== undefined){
		return res.status(400).send(atributoSelected)
	}
	const polizaDetalles = await getPolizaDetalles(parametros,atributoSelected);
	
	const estadoDestinoAux = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino)
	const polizaTerritorialidad = await db.sequelize.models.poliza_territorialidad.findAll({where:{id_poliza_detalle:polizaDetalles.id, id_pais:estadoDestinoAux.id_pais}})
	return res.status(200).send({
		success: true,
		canRedondo: polizaDetalles.is_redondo === true && polizaTerritorialidad.length > 0
	});
}



//CanContratarRc
async function canContratarRc(req,res){
	const inicio = new Date() 
	const parametros = req.body;
	if(!Number.isInteger(parseInt(parametros.idRazonSocial))){
		return res.status(400).send({status:false , msg: `El parametro idRazonSocial debe ser int.` });
	}
	if(!Number.isInteger(parseInt(parametros.idRazonSocial))){
		return res.status(400).send({status:false , msg: `El parametro idatributoKeepro debe ser int.` });
	}
	if(!Number.isInteger(parseInt(parametros.idEstadoOrigen))){
		return res.status(400).send({status:false , msg: `El parametro idEstadoOrigen debe ser int.` });
	}
	if(!Number.isInteger(parseInt(parametros.idEstadoDestino))){
		return res.status(400).send({status:false , msg: `El parametro idEstadoDestino debe ser int.` });
	}
	if(!Number.isInteger(parseInt(parametros.idCommodity))){
		return res.status(400).send({status:false , msg: `El parametro idCommodity debe ser int.` });
	}
	const proveedores = await db.sequelize.models.proveedores.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%aig%`}}});
	if(proveedores.length != 1){
		return res.status(400).send({
			success: false,
			canContratarRc: false
		});
	}
	const tiposCobertura = await db.sequelize.models.tipos_cobertura.findAll({where:{nombre: {[db.Sequelize.Op.like]: `%rc%`}}});
	if(tiposCobertura.length != 1){
		return res.status(400).send({
			success: false,
			canContratarRc: false
		});
	}
	const tipoCobertura = tiposCobertura[0]
	const proveedor = proveedores[0]
	const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:tipoCobertura.id}};
	const polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
	if(polizaDetalle === null){
		return res.status(400).send({success: false,canContratarRc: false});
	}
	const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idAtributoKeepro);
	if(atributoKeepro === null){
		return res.status(400).send({ success: false, error: `Registro con id: idAtributoKeepro = ${parametros.idAtributoKeepro} no encontrado` });
	}
	const findRelaciones = new Relaciones(['marca_agente_oficina','producto.tipo_cobertura'],['marca_agente_oficina','producto.tipo_cobertura'],db.sequelize.models)
	const relaciones = await findRelaciones.getRelaciones();
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto,{include:relaciones});

	const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(oficinaProducto.marca_agente_oficina.id_oficina_cliente);
	const findRelacionesPoliza = new Relaciones(['nacionalidad'],['nacionalidad'],db.sequelize.models)
	const relacionesPoliza = await findRelacionesPoliza.getRelaciones();
	const proveedorPoliza = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor,{include:relacionesPoliza});

	if(proveedorPoliza === null){
		return res.status(400).send({ success: false, error: `Registro con id: atributoKeepro.id_proveedor = ${atributoKeepro.id_proveedor} no encontrado` });
	}
	const razonSocial = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
	if(razonSocial === null){
		return res.status(400).send({ success: false, error: `Registro con id: idRazonSocial = ${parametros.idRazonSocial} no encontrado` });
	}
	const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
	if(estadoOrigen === null){
		return res.status(400).send({ success: false, error: `Registro con id: idEstadoOrigen = ${parametros.idEstadoOrigen} no encontrado` });
	}
	const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);
	if(estadoDestino === null){
		return res.status(400).send({ success: false, error: `Registro con id: idEstadoDestino = ${parametros.idEstadoDestino} no encontrado` });
	}
	const idPaisOrigen = estadoOrigen.id_pais
	const idPaisDestino = estadoDestino.id_pais
	const paisOrigen = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:idPaisOrigen}});
	const paisDestino = await db.sequelize.models.polizas_paises.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_pais:idPaisDestino}});
	const commoditie = await db.sequelize.models.polizas_commoditys.findAll({where:{id_poliza_detalle:polizaDetalle.id,id_commodity:parametros.idCommodity}});
	if(commoditie.length < 1){
		return res.status(400).send({ success: false, error: `Registro con id: idCommodity = ${parametros.idCommodity} no encontrado` });
	}
	const findRelacionesCliente = new Relaciones(['categoria_cliente'],['categoria_cliente'],db.sequelize.models)
	const relacionesCliente = await findRelacionesCliente.getRelaciones();
	const cliente = await db.sequelize.models.clientes.findByPk(oficinaCliente.id_cliente,{include:relacionesCliente});
	const polizasNacionalidadesRazonesSociales = await getPolizasNacionalidadesRazonesSociales([polizaDetalle.id])
	const categoriasClientesValidas = ["FREIGHT FORWARDERS","AGENTES ADUANALES","CO-LOADER"]
	const isValid = proveedorPoliza.nacionalidad.clave == "MX" && 
					categoriasClientesValidas.includes(cliente.categoria_cliente.descripcion) && 
					cliente.categoria_cliente.rc && 
					paisOrigen !== null && 
					paisDestino !== null && 
					polizasNacionalidadesRazonesSociales.includes(razonSocial.id_pais)
	return res.status(200).send({
		success: true,
		canContratarRc: isValid
	});
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

//ValidarSumaAsegurada
async function validSumaAsegurada(req,res){
	const parametros = req.body;
	if(req.query.keepro === 3){
		parametros.idOficinaProducto = parametros.idServicio
		parametros.keepro = req.query.keepro
	}
	if(!Number.isInteger(parseInt(parametros.idOficinaProducto))){
		if(parametros.keepro === 3){
			res.status(400).send({status:false , msg: `El parametro idServicio debe ser int.` });
		}else{
			res.status(400).send({status:false , msg: `El parametro idOficinaProducto debe ser int.` });
		}
		return false
	} 

	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto);
	if(oficinaProducto == null){
		if(parametros.keepro === 3){
			return res.status(400).send({ success: false, error: `Registro con id: idServicio = ${parametros.idOficinaProducto} no encontrado` })
		}else{
			return res.status(400).send({ success: false, error: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado` })
		}
	}
	const isContenedor = await getIsContenedor(parametros)
	const isRC = await getIsRc(parametros)
	if(!isContenedor){
		if(!Number.isInteger(parseInt(parametros.idCommodity))){
			return res.status(400).send({status:false , msg: `El parametro idCommodity debe ser int.` });
		}
		if(!Number.isInteger(parseInt(parametros.idModalidad))){
			return res.status(400).send({status:false , msg: `El parametro idModalidad debe ser int.` });
		}
	}else{
		if(!Number.isInteger(parseInt(parametros.idTipoContenedor))){
			return res.status(400).send({status:false , msg: `El parametro idTipoContenedor debe ser int.` });
		}
	}
	if(parametros.idMoneda === undefined || parametros.idMoneda === null){
		return res.status(400).send({status:false , msg: `El parametro idMoneda no puede ser null.` });
	}
	if(!Number.isInteger(parseInt(parametros.idMoneda))){
		return res.status(400).send({status:false , msg: `El parametro idMoneda debe ser int.` });
	} 

	const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
	if(moneda === null){
		return res.status(400).send({ success: false, error: `Registro con id: idMoneda = ${parametros.idMoneda} no encontrado` })
	}
	var tipoCambio = 1
	let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
	const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
	if(tipoCambioSelected == undefined){
		return res.status(400).send({ status: false, msg: `Registro con id: idTipoCambioFuturo = ${parametros.idTipoCambioFuturo} no encontrado`});
	}
	if(moneda.clave != "USD"){
		tipoCambio = tipoCambioSelected.tipo_cambio
	}
	var sumaAsegurada = parametros.sumaAsegurada / tipoCambio
	const intSumaAseguradaAux = parseInt(sumaAsegurada);
	const floatSumaAseguradaAux = parseFloat(sumaAsegurada) - intSumaAseguradaAux
	if(floatSumaAseguradaAux < 1 && floatSumaAseguradaAux > 0.99){
		sumaAsegurada = parseInt(sumaAsegurada)  + 1 
	}else if(floatSumaAseguradaAux < 0.01){
		sumaAsegurada = parseInt(sumaAsegurada)
	}
	parametros.sumaAsegurada = sumaAsegurada

	var atributoSelected = await getatributoKeeproFn(req, res,isContenedor,isRC);
	if(atributoSelected === undefined){
		return undefined
	}
	if(atributoSelected.status == false){
		if(isContenedor){
			const atributosContendor = await getAtributosContenedor(parametros)
			if(atributosContendor.status === false){
				return res.status(400).send(atributosContendor)
			}
			const sumasValidas = []
			for (let index = 0; index < atributosContendor.length; index++) {
				const atributo = atributosContendor[index];
				if(!sumasValidas.includes(atributo.limite_inferior)){
					const intSumaAseguradaAux = parseInt(atributo.limite_inferior * tipoCambio);
					const floatSumaAseguradaAux = parseFloat(atributo.limite_inferior * tipoCambio) - intSumaAseguradaAux
					if(floatSumaAseguradaAux < 1 && floatSumaAseguradaAux > 0.99){
						sumasValidas.push(parseInt(atributo.limite_inferior * tipoCambio)  + 1 )
					}else{
						sumasValidas.push(atributo.limite_inferior * tipoCambio)
					}
				}
				
			}
			return res.status(400).send({ status: false, msg: "No existen tarifas con la suma asegurada seleccionada", sumasValidas: sumasValidas})
		}
		return res.status(400).send(atributoSelected)
	}
	if((atributoSelected.success !== undefined || atributoSelected.status !== undefined) && isContenedor){
		const sumasValidasArray = atributoSelected.sumasValidas
		const sumasValidasMoneda = []
		for(const sumaValida of sumasValidasArray){
			sumasValidasMoneda.push(parseFloat((parseFloat(sumaValida * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" })).match(/[0-9,.]+/)[0].replace(/,/g, '')))
		}
		atributoSelected.sumasValidas = sumasValidasMoneda
		return res.status(400).send(atributoSelected)
	} else if((atributoSelected.success === false || atributoSelected.status === false) && !isContenedor){
		return res.status(400).send(atributoSelected)
	}
	const polizaDetalles = await getPolizaDetalles(parametros,atributoSelected);
	
	//En caso de que el tipo de cobertura sea distinta a contenedor, se validan los limites del commoditie y del atributo
	if(!isContenedor){
		const modalidad = await db.sequelize.models.modalidades.findByPk(parametros.idModalidad);
		if(modalidad == null){
			return res.status(400).send({ success: false, error: `Registro con id: idModalidad = ${parametros.idModalidad} no encontrado` });
		}
		const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
		const limiteInferiorAtributo = atributoSelected.limite_inferior == 0 ? null : atributoSelected.limite_inferior
		const limiteSuperiorAtributo = atributoSelected.limite_superior == 0 ? null : atributoSelected.limite_superior
		const commoditieEncontrado = await db.sequelize.models.polizas_commoditys.findAll({where:{id_poliza_detalle:polizaDetalles.id,id_commodity:parametros.idCommodity}});
		if(commoditieEncontrado.length != 1){
			return res.status(400).send({ success: false, error: `Registro con id: idCommodity = ${parametros.idCommodity} no encontrado` });
		}
		const commoditieSeleccionado = commoditieEncontrado[0].toJSON()
		const limitesCommoditie = {
			'maritimo': commoditieSeleccionado.limite_maritimo,
			'aereo': commoditieSeleccionado.limite_aereo,
			'terrestre': commoditieSeleccionado.limite_terrestre,
			'ferroviario': commoditieSeleccionado.limite_ferroviario,

		}
		const sumaAseguradaUSD = parseFloat(parametros.sumaAsegurada)
		var limiteMaximo = polizaDetalles.limite_maximo
		var limiteMinimo = polizaDetalles.limite_minimo

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
		var limiteMaximoMoneda 
		var limiteMinimoMoneda 
		try {
			limiteMaximoMoneda = (limiteMaximo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" });
		} catch (error) {
			limiteMaximoMoneda = (polizaDetalles.limite_maximo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" });
		}
		try {
			limiteMinimoMoneda= (limiteMinimo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" });
		} catch (error) {
			limiteMinimoMoneda= (polizaDetalles.limite_minimo * tipoCambio).toLocaleString('es-US', { style: 'currency', currency: "USD" });
		}
		
		
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
		const sumaAseguradaUSD = parseFloat(parametros.sumaAsegurada)
		if(sumaAseguradaUSD != parseFloat(atributoSelected.limite_inferior)){
			return res.status(400).send({ status: false, msg: "La suma asegurada debe ser " + (parseFloat(atributoSelected.limite_inferior))});
		}
	}
	return res.status(200).send({ status: true, msg: "Suma asegurada válida"});
}

//auxiliares
async function getPolizasDetalles(idOficinaProducto){
    var polizaDetalle = undefined
    var oficinaProducto = undefined
    try {
        oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(idOficinaProducto, {include: ['producto']});
		const proveedores = await getProveedores(idOficinaProducto)
		const index = proveedores.indexOf(6);
		if (index !== -1) {
			proveedores.splice(index, 1);
		}
		if(proveedores.length == 0){
			proveedores.push(-523443)
		}
        var wherePoliza = {where:{id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
		wherePoliza.where.id_proveedor = {[db.Sequelize.Op.or]: proveedores}
        polizaDetalle =  await getPolizasDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
        
		if(polizaDetalle === undefined){
            return { status: false, msg: "No existe poliza vigente"}
        } else if(polizaDetalle === null){
            return { status: false, msg: "No existe poliza detalle vigente"}
        }
		const polizasdetalles = []
		for (let index = 0; index < polizaDetalle.length; index++) {
			const detallePoliza = polizaDetalle[index];
			if(!polizasdetalles.includes(detallePoliza.id)){
				polizasdetalles.push(detallePoliza.id)
			}
			
		}
		if(polizasdetalles.length == 0){
			polizasdetalles.push(-523443)
		}
        return polizasdetalles
    } catch (error) {
        return { status: false, msg: "No existe poliza vigente"}
    }
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
async function getProveedores(idOficinaProducto){
	const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(idOficinaProducto);
	var whereFind = {
		where: {
			id_oficina_producto: oficinaProducto.id ,
			num_movimientos: {
				[db.Sequelize.Op.or]: {
					[db.Sequelize.Op.ne]: 0,
					[db.Sequelize.Op.is]: null 
				} 
			},
			fecha_vencimiento: {
			  [db.Sequelize.Op.or]: {
				[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
				[db.Sequelize.Op.is]: null 
			  }
			},
			deletedAt: null
		}
	}

	const atributos = await db.sequelize.models.atributos_keepro.findAll(whereFind);
	const proveedores = []
	for (let index = 0; index < atributos.length; index++) {
		const atributo = atributos[index];
		if(!proveedores.includes(atributo.id_proveedor)){
			proveedores.push(atributo.id_proveedor)
		}
	}
	return proveedores
}

//AtributoIsDeducible
async function atributoIsDeducibleFn(parametros,atributoKeepro,polizaDetalles,isContenedor){
    if(polizaDetalles.can_deducible === false){
        return false
    }
    if(isContenedor){
		return atributoKeepro.is_deducible
	}else{
		const commoditie = await db.sequelize.models.polizas_commoditys.findOne({
			where: {
				[db.Sequelize.Op.and]: {
					id_poliza_detalle: polizaDetalles.id,
					id_commodity: parametros.idCommodity,
					deletedAt: null
				}
			}
		});
		if(commoditie == null){
			return false
		}
		return commoditie.is_sensible_robo !== true && atributoKeepro.is_deducible
	}
}
async function getatributoKeeproFn(req, res,isContenedor,isRC){
	const parametros = req.body;
	var registro = {}
	let obligatorios = [{campo:'idOficinaProducto', tipo:'model', model:db.sequelize.models.oficinas_productos},
						{campo:'sumaAsegurada', tipo:'number'}]
	if(parametros.idatributoKeepro == undefined){
		obligatorios.push({campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados})
		obligatorios.push({campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados})
	}
	if(!isContenedor){
		obligatorios.push({campo:'idCommodity', tipo:'model', model:db.sequelize.models.commoditys})
	}
	registro = await Validaciones.validParametros(req, res,obligatorios,registro);
	if(!registro){
		return undefined;
	}
	var sumaAsegurada = parametros.sumaAsegurada
	const atributoKeepro = await getatributoKeepro(parametros,isContenedor,sumaAsegurada)
	var atributoNoEncontrado = false
	try {
		if(atributoKeepro.status === true){
			atributoNoEncontrado = true
		}
	} catch (error) {
		if(atributoKeepro.success === true){
			atributoNoEncontrado = true
		}
	}
	
	if(atributoKeepro == null || atributoNoEncontrado){
		if(isContenedor){
			const atributosContendor = await getAtributosContenedor(parametros)
			if(atributosContendor.status === false){
				return res.status(400).send(atributosContendor)
			}
			const sumasValidas = []
			for (let index = 0; index < atributosContendor.length; index++) {
				const atributo = atributosContendor[index];
				if(!sumasValidas.includes(atributo.limite_inferior)){
					sumasValidas.push(atributo.limite_inferior)
				}
				
			}
			return { status: false, msg: "No existen tarifa con la suma asegurada seleccionada", sumasValidas: sumasValidas};
		} else if(isRC){
			const atributosContendor = await getAtributosRc(parametros)
			const sumasValidas = []
			for (let index = 0; index < atributosContendor.length; index++) {
				const atributo = atributosContendor[index];
				if(!sumasValidas.includes(atributo.limite_inferior)){
					sumasValidas.push(atributo.limite_inferior)
				}
				
			}
			return { status: false, msg: "No existen tarifa con la suma asegurada seleccionada", sumasValidas: sumasValidas};
		}
		return { status: false, msg: "No existe un atributo para el oficina producto seleccionado"};
	}
	return atributoKeepro
}
async function getatributoKeepro(parametros,isContenedor,sumaAsegurada) {
    if(parametros.idatributoKeepro !== undefined && parametros.idatributoKeepro !== null){
        const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idatributoKeepro, {include: ['tipo_contenedor']});
        if(atributoKeepro === undefined || atributoKeepro === null){
            return { success: false, error: `Registro con id: idatributoKeepro = ${parametros.idatributoKeepro} no encontrado` }
        }
        return atributoKeepro
    } else{
        var parametrosFindAtributo = {}
        const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
        const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);
        
        parametrosFindAtributo.idPaisOrigen = estadoOrigen.id_pais
        parametrosFindAtributo.idPaisDestino = estadoDestino.id_pais
        parametrosFindAtributo.idBeneficiario = parametros.idBeneficiario
        if(isContenedor){
            parametrosFindAtributo.idTipoContenedor = parametros.idTipoContenedor
        } else{
            parametrosFindAtributo.idCommodity = parametros.idCommodity
        }
        parametrosFindAtributo.sumaAsegurada = sumaAsegurada
        parametrosFindAtributo.idOficinaProducto = parametros.idOficinaProducto
        const idatributoKeepro = await getAtributo(parametrosFindAtributo)
		if(idatributoKeepro.status !== undefined){
			return idatributoKeepro
		}
        const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(idatributoKeepro.id, {include: ['tipo_contenedor']});
        return atributoKeepro
    }
}
async function getIsContenedor(parametros){
    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
    const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
    const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
    return cobertura.includes("contenedor")
}
async function getIsRc(parametros){
    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
    const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
    const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
    return cobertura.includes("rc")
}
async function getAtributosContenedor(parametros){
    	const idTipoContenedor = await db.sequelize.models.tipo_contenedor.findByPk(parametros.idTipoContenedor);
		if(idTipoContenedor == null){
			return { status: false, msg: "Registro con id: idTipoContenedor = " + parametros.idTipoContenedor + " no encontrado"}
		}
		var whereFind = {
			where: {
                id_oficina_producto: parametros.idOficinaProducto ,
                id_tipo_contenedor: parametros.idTipoContenedor,
				num_movimientos: {
					[db.Sequelize.Op.or]: {
						[db.Sequelize.Op.ne]: 0,
						[db.Sequelize.Op.is]: null 
					} 
				},
				fecha_vencimiento: {
				  [db.Sequelize.Op.or]: {
					[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
					[db.Sequelize.Op.is]: null 
				  }
				},
				deletedAt: null
			}
		}
		return await db.sequelize.models.atributos_keepro.findAll(whereFind);
}
async function getAtributosRc(parametros){
		var whereFind = {
			where: {
                id_oficina_producto: parametros.idOficinaProducto,
				num_movimientos: {
					[db.Sequelize.Op.or]: {
						[db.Sequelize.Op.ne]: 0,
						[db.Sequelize.Op.is]: null 
					} 
				},
				fecha_vencimiento: {
				  [db.Sequelize.Op.or]: {
					[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
					[db.Sequelize.Op.is]: null 
				  }
				},
				deletedAt: null
			}
		}
		return await db.sequelize.models.atributos_keepro.findAll(whereFind);
}
async function getPolizaDetalles(parametros,atributoKeepro){
    var polizaDetalle = undefined
    var oficinaProducto = undefined
    try {
        oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
        if(oficinaProducto === null){
            return { status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`};
        }
        const proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
        if(proveedor === null){
            return { status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no encontrado`}
        }
        const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
        polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
        if(polizaDetalle === undefined){
            return { status: false, msg: "No existe poliza vigente"}
        } else if(polizaDetalle === null){
            return { status: false, msg: "No existe poliza detalle vigente"}
        }
        return polizaDetalle
    } catch (error) {
        return { status: false, msg: "No existe poliza vigente"}
    }
}

async function getDataDraft(req,res){
	if(!Number.isInteger(parseInt(req.query.idatributoKeepro))){
		res.status(400).send({status:false , msg: `El parametro idatributoKeepro debe ser int.` });
		return false
	} 
	const filtro = await getFiltroDataDraft(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}

	const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(req.query.idatributoKeepro);
	if(atributoKeepro == null){
		return { success: false, error: `Registro con id: idatributoKeepro = ${req.query.idatributoKeepro} no encontrado` }
	}
	const polizasDetalles = await getPolizasDetalles(atributoKeepro.id_oficina_producto)
	const polizaDetalle = await db.sequelize.models.poliza_detalles.findByPk(polizasDetalles[0]);

	const polizaDetalleRc = await getPolizaRc()
	if(polizaDetalleRc.success !== undefined){
		return res.status(400).send(filtro)
	}
	const minimoVentaRc = polizaDetalleRc.minimo_venta
	const terminosCondicionesRC = polizaDetalleRc.liga_pdf_tyc
	const terminosCondiciones = polizaDetalle.liga_pdf_tyc
	
	try {
		const all = ['commoditie.categoria']
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.polizas_commoditys.findAll({
			paranoid: false,
			include:relaciones,
			where: filtro,
		})
		
		const data = []
		const commoditiesSTR = []
		for (let index = 0; index < docs.length; index++) {
			const polizasCommodities = docs[index];
			if(!commoditiesSTR.includes(polizasCommodities.commoditie.descripcion) && polizasCommodities.is_sensible_robo === true){
				data.push(polizasCommodities)
				commoditiesSTR.push(polizasCommodities.commoditie.descripcion)
			}
		}
		return res.status(200).send({
			success: true,
			terminosCondicionesRC: terminosCondicionesRC,
			terminosCondiciones: terminosCondiciones,
			minimoVentaRc: minimoVentaRc,
			commoditiesSensiblesTags: commoditiesSTR
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
}
async function getFiltroDataDraft(parametros){
	var busquedaLibreTxt = parametros.busquedaLibre;
	var filtro = {deletedAt: null};
	var busquedaLibre = {}

	const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idatributoKeepro, {include: ['oficina_producto']});
	if(atributoKeepro == null){
		return { success: false, error: `Registro con id: idatributoKeepro = ${parametros.idatributoKeepro} no encontrado` }
	}
	const producto = await db.sequelize.models.productos.findByPk(atributoKeepro.oficina_producto.id_producto, {include: ['tipo_cobertura']});
	const isContenedor = producto.tipo_cobertura.nombre.includes("contenedor")
	if(isContenedor){
		return { success: false, error: 'El atributoKeepro no debe tener tipo de cobertura: COBERTURA CONTENEDOR', }
	}
	const polizasDetalles = await getPolizasDetalles(atributoKeepro.id_oficina_producto)
	filtro.id_poliza_detalle = {[db.Sequelize.Op.or]: polizasDetalles}
	if(busquedaLibreTxt != undefined && busquedaLibreTxt != ''){
		busquedaLibre['$commoditie.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		busquedaLibre['$commoditie.categoria.descripcion$'] = {[db.Sequelize.Op.like]: `%${busquedaLibreTxt}%`}
		filtro[db.Sequelize.Op.or] = busquedaLibre;
	}
	return filtro;

}

async function getPolizaRc(){
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
            return { status: false, msg: "No existe poliza RC vigente"}
		}
		return polizaDetalle
}

//Get estado de cuenta
async function getEstadoCuenta(req, res) {
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_por_cobrar.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltroEstadoCuenta(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const all = [ 
			'factura.marca.domicilio.estado.pais',
			'factura.marca.pais',
			'factura.marca.dato_facturacion.regimen_fiscal', 
			'factura.marca.dato_facturacion.pais', 
			'factura.marca.dato_facturacion.nacionalidad_timbrado',
			'factura.razon_social.pais', 
			'factura.razon_social.uso_cfdi',
			'factura.razon_social.metodo_pago',
			'factura.razon_social.forma_pago',
			'factura.razon_social.razon_bloqueo',
			'factura.razon_social.regimen_fiscal',
			'factura.razon_social.moneda_credito',
			'factura.moneda',
			'factura.cfdi.uso_cfdi',
			'factura.cfdi.metodo_pago',
			'factura.cfdi.forma_pago',
			'factura.cfdi.motivo_cancelacion',
			'factura.oficina',
		 ]
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.cuentas_por_cobrar.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cuentas_por_cobrar.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		})

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cuentasPorCobrar`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		const totales = {
			saldo_usd: 0,
			saldo_vendico_usd: 0,
			saldo_mxn: 0,
			saldo_vendico_mxn: 0
		}
		for(const doc of docs){
			const element = {}
			const allCxc = [
				'factura.marca.domicilio.estado.pais',
				'factura.marca.pais',
				'factura.marca.dato_facturacion.regimen_fiscal', 
				'factura.marca.dato_facturacion.pais', 
				'factura.marca.dato_facturacion.nacionalidad_timbrado',
				'factura.razon_social.pais', 
				'factura.razon_social.uso_cfdi',
				'factura.razon_social.metodo_pago',
				'factura.razon_social.forma_pago',
				'factura.razon_social.razon_bloqueo',
				'factura.razon_social.regimen_fiscal',
				'factura.razon_social.moneda_credito',
				'factura.moneda',
				'factura.cfdi.uso_cfdi',
				'factura.cfdi.metodo_pago',
				'factura.cfdi.forma_pago',
				'factura.cfdi.motivo_cancelacion',
				'factura.oficina',
				'factura.factura_detalles.pedido_factura.certificado',
				'factura.factura_detalles.producto.moneda_compra',
				'factura.factura_detalles.producto.moneda_venta',
				'factura.factura_detalles.producto.pais',
				'factura.factura_detalles.producto.tipo_cobertura',
				'pagos.pago.cfdi',
				'pagos.pago.cuenta_bancaria_interna.moneda',
				'pagos.pago.cuenta_bancaria_interna.dato_facturacion',
				'pagos.pago.moneda',
				'pagos.pago.metodo_pago',
				'pagos.pago.razon_social.pais', 
				'pagos.pago.razon_social.uso_cfdi',
				'pagos.pago.razon_social.metodo_pago',
				'pagos.pago.razon_social.forma_pago',
				'pagos.pago.razon_social.razon_bloqueo',
				'pagos.pago.razon_social.regimen_fiscal',
				'pagos.pago.razon_social.moneda_credito' 
			]
			const findCxc = new Relaciones(allCxc,allCxc,db.sequelize.models)
			const relacionesCxc = await findCxc.getRelaciones()
			const cxc = await db.sequelize.models.cuentas_por_cobrar.findByPk(doc.id,{include: relacionesCxc})
			let fechaVencimiento = moment(cxc.fecha_vencimiento).tz('America/Mexico_City');
			let now = moment().tz('America/Mexico_City');
			now.hours(0).minutes(0).seconds(0).milliseconds(0);
			const diferenciaFechas = (fechaVencimiento - now) / (1000 * 3600 *24)

			//Se calcula el total de la factura relacionada a la cuenta por cobrar
			var subtotalFactura = 0
			var impuestoFactura = 0
			var descuentoFactura = 0
			for(const detalle of cxc.factura.factura_detalles){
				subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0)
				impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0)
				descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0)
			}
			const totalFactura = parseFloat((subtotalFactura + impuestoFactura - descuentoFactura).toFixed(2))
			let metodoPago = '';
			let formaPago = '';
			let showPDF = true;
			if(cxc.factura.id_cfdi == null){
				showPDF = false;
			}
			if(cxc.factura.id_cfdi != null){
				const cfdi = await db.sequelize.models.cfdis.findByPk(cxc.factura.id_cfdi, { attributes:['xml']});
				const xml = await xmlToJSON(cfdi.xml)
				metodoPago = await db.sequelize.models.metodos_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['MetodoPago']},paranoid: false });
				metodoPago = `(${metodoPago.clave}) ${metodoPago.descripcion}`
				formaPago = await db.sequelize.models.formas_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['FormaPago']},paranoid: false });
				formaPago = `(${formaPago.clave}) ${formaPago.descripcion}`
				
			}
			element.id_cuenta_por_cobrar = cxc.id
			element.id_factura = cxc.factura.id
			element.folio_factura = cxc.factura.folio
			try {
				element.referencia_interna = cxc.factura.referencia
			} catch (error) {
				element.referencia_interna = ''
			}
			try {
				element.referencia_cliente = cxc.factura.factura_detalles[0].pedido_factura.certificado.referencias ?? ''
			} catch (error) {
				element.referencia_cliente = ''
			}
			element.dias_credito = diferenciaFechas >= 0 ? diferenciaFechas : 0
			element.dias_vencimiento = diferenciaFechas * -1
			element.fecha_emision = moment(cxc.factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
			element.fecha_vencimiento = cxc.fecha_vencimiento
			element.monto_factura = totalFactura
			element.saldo = parseFloat(cxc.saldo)
			element.moneda = cxc.factura.moneda.clave
			element.saldo_vencido = diferenciaFechas >= 0 ? 0.00 : parseFloat(cxc.saldo)
			element.metodo_pago = metodoPago
			element.forma_pago = formaPago
			if(element.moneda.toUpperCase() == "MXN"){
				totales.saldo_mxn = totales.saldo_mxn + parseFloat(parseFloat(element.saldo).toFixed(2))
				totales.saldo_vendico_mxn = totales.saldo_vendico_mxn + parseFloat(parseFloat(element.saldo_vencido).toFixed(2))
			}else{
				totales.saldo_usd = totales.saldo_usd + parseFloat(parseFloat(element.saldo).toFixed(2))
				totales.saldo_vendico_usd = totales.saldo_vendico_usd + parseFloat(parseFloat(element.saldo_vencido).toFixed(2))
			}
			element.showFacturaPDF = showPDF;
			data.push(element)
		}
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			antiguedad_saldos: data,
			totales:totales
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltroEstadoCuenta(parametros){
	const filtro = {"or":[],"and":[]}
	const docs = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:parametros.idCliente},})
	for(const doc of docs){
		filtro.or.push({"property": "factura.id_razon_social","value": doc.id_razon_social,"operator": "=="})
	}
	filtro.and.push({"property": "saldo","value": 0,"operator": ">"})
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
	return await Filter.get()
}


//Get usuarios KeePro
async function getUsuariosKeePro(req, res) {
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.usuarios.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	var roles = req.query.roles;
	try {
		roles = JSON.parse(req.query.roles)
	} catch (error) {
		roles = []
	}
	const filtro = await getFiltroUsuariosKeePro(req.query);
	if(filtro.success !== undefined){
		return res.status(400).send(filtro)
	}
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const all = [ 'cliente.detalles_cliente.comisionista','cliente.detalles_cliente.mediador_mercantil','cliente.detalles_cliente.agente_credito_cobranza','cliente.detalles_cliente.agente_customer','oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ]
		const findRelaciones = new Relaciones(all,all,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		if(roles.length > 0){
			relaciones.push({
				model: db.sequelize.models.roles,
				as: 'listRoles', // Nombre del alias que utilizas en tu modelo
				through: {
					attributes: [] // No incluir atributos de la tabla intermedia
				},
				where: {
					id: {[db.Sequelize.Op.or]: roles}
				},
				required: true // Esto asegura que solo se devuelvan usuarios que tengan el rol
			})
		}

		const docs = await db.sequelize.models.usuarios.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			attributes: { exclude: ['password','code_pass', 'uuid'] },
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.usuarios.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		})

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/KeePro/getUsuariosKeePro`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON();
			const listRel = [ 'rol' ];
			const findRelacionesRoles = new Relaciones(listRel,listRel,db.sequelize.models);
			const relacionesUsuarioRol =  await findRelacionesRoles.getRelaciones();
			let roles = await db.sequelize.models.roles_usuarios.findAll({where:{id_usuario: element.id}, include:relacionesUsuarioRol})
			const rolesAsignados = roles.map(roleUsuario => roleUsuario.rol); 
			element.roles = rolesAsignados; 
			element.listRoles = undefined; 
			data.push(element)
		}
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data,
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltroUsuariosKeePro(parametros){
	const filtro = {"or":[],"and":[]}
	const oficinasClientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:parametros.idCliente},})
	const oficinas = []
	if(oficinasClientes.length < 1){
		return { success: false, msg: "El cliente no tiene oficinas asignadas" }
	}
	for(const oficinaCliente of oficinasClientes){
		oficinas.push(oficinaCliente.id_oficina)
	}
	const contactos = await db.sequelize.models.contactos.findAll({where: {id_oficina:{[db.Sequelize.Op.or]: oficinas}},})
	if(contactos.length < 1){
		return { success: false, msg: "El cliente no tiene contactos asignados" }
	}
	for(const contacto of contactos){
		if(contacto.es_usuario){
			filtro.or.push({"property": "email","value": contacto.email,"operator": "like"})
		}
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
	return await Filter.get()
}
//Get contactos cliente
async function getContactos(req, res) {
	if(!Number.isInteger(parseInt(req.query.idCliente))){
		res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
		return false
	} 
	try {
		const oficinasClientes = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente:req.query.idCliente},})
		const oficinas = []
		if(oficinasClientes.length < 1){
			return res.status(400).send({ success: false, msg: "El cliente no tiene oficinas asignadas" });
		}
		for(const oficinaCliente of oficinasClientes){
			oficinas.push(oficinaCliente.id_oficina)
		}
		const contactos = await db.sequelize.models.contactos.findAll({where: {id_oficina:{[db.Sequelize.Op.or]: oficinas}},})
		if(contactos.length < 1){
			return res.status(400).send({ success: false, msg: "El cliente no tiene contactos asignados" });
		}
		return res.status(200).send({
			success: true,
			data: contactos,
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}




async function getFiltroContactos(parametros){
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


async function getMarcaAgentesClientes(req, res){
	const parametros = req.query;
	if(!Number.isInteger(parseInt(parametros.idCliente)) || !Number.isInteger(parseInt(parametros.idMarca))){
		res.status(400).send({status:false , msg: `Los parámetros idCliente y idMarca deben ser int.`});
		return false;
	}

	const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
	if(cliente == null){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} no existe` });
	}
	if(cliente.cliente_prospecto !== true){
		return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${parametros.idCliente} es prospecto` });
	}
	
	try {
		const perfilesValidos = ['cliente', 'marca', 'agente_operativo', 'agente_venta_1', 'agente_venta_2', 'inside_sales', 'all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				agente_operativo: [ 'agente_operativo' ],
				agente_venta_1: [ 'agente_venta_1' ],
				agente_venta_2: [ 'agente_venta_2' ],
				inside_sales: [ 'inside_sales' ],
				all: [ 'cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno', 'marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}
		const registroEncontrado = await db.sequelize.models.marca_agentes_clientes.findOne({
			include: relaciones,
			paranoid: false,
			where: {
				id_cliente: parametros.idCliente,
				id_marca: parametros.idMarca
			}
		});
		
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}


async function indexAllRazonesSociales(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	
	const filtro = await getFiltroAllRazonesSociales(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	if(req.query.specialFilter !== undefined && req.query.specialFilter !== null){
		filtro[db.Sequelize.Op.and] = req.query.specialFilter;
	}

	try {
		const perfilesValidos = ['pais', 'nacionalidad_timbrado', 'datosFiscales', 'razones_sociales_domicilios', 'marca_preferente', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				pais: ['pais.continente'],
				marca_preferente: ['marca_preferente'],
				razones_sociales_domicilios: 'razones_sociales_domicilios.domicilio.estado.pais.continente',
				nacionalidad_timbrado: ['nacionalidad_timbrado.continente'],
				datosFiscales: ['uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito'],
				all: ['nacionalidad_timbrado',
					'nacionalidad_timbrado.continente',
					'pais',
					'usuario_registro',
					'pais.continente',
					 'uso_cfdi',
					 'metodo_pago',
					 'forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio.estado.pais.continente', 'marca_preferente']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.razones_sociales.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		});
		const dataFull = await db.sequelize.models.razones_sociales.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataFull;
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/razonesSociales`;
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

async function getFiltroAllRazonesSociales(parametros){
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


module.exports = {
	indexClientes,
	indexOficinas,
	indexRazonesSociales,
	indexBeneficiarios,
	indexOficinasProductos,
	indexMonedas,
	indexTiposContenedores,
	indexCommodities,
	indexModalidades,
	indexPaises,
	indexEstados,
	indexPuertosAeropuertos,
	indexUbicacionBienes,
	indexTiposBienes,
	isDeducibleAtributo,
	canRedondo,
	canContratarRc,
	validSumaAsegurada,
	round,
	getTipoCambio,
	getAgentesClientes,
	getPaisesBeneficiarios,
	getDataDraft,
	getEstadoCuenta,
	getUsuariosKeePro,
	getContactos,
	getMarcaAgentesClientes,
	getProveedores,
	indexAllRazonesSociales
}
