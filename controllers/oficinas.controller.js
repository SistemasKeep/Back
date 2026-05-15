'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const { Relaciones } = require('../middlewares/relaciones');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.oficinas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.oficinas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.oficinas.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		

		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/oficinas`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente'
				 ]
				const findRelacionesOficinaClientes = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesOficinaClientes =  await findRelacionesOficinaClientes.getRelaciones()
				element.oficinas_cliente = await db.sequelize.models.oficinas_cliente.findAll({where:{id_oficina: element.id}, include:relacionesOficinaClientes})
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
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'nombre', tipo:'string',largo:255,textoCase:"up"},{campo:'isInterna', tipo:'boolean'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.oficinas.create(registro);
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
		const findRel = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRel.getRelaciones()
		const registroEncontrado = await db.sequelize.models.oficinas.findByPk(id,{ paranoid: false, include: relaciones });
		if(registroEncontrado != null){
			const element = registroEncontrado.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente'
				 ]
				const findRelacionesOficinaClientes = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesOficinaClientes =  await findRelacionesOficinaClientes.getRelaciones()
				element.oficinas_cliente = await db.sequelize.models.oficinas_cliente.findAll({where:{id_oficina: element.id}, include:relacionesOficinaClientes})
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
	
		const validosOpcionales = [{campo:'nombre', tipo:'string',largo:255,textoCase:"up"},{campo:'isInterna', tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}	
		const registroAEditar = await db.sequelize.models.oficinas.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		if(parametros.isInterna !== undefined && parametros.isInterna !== null){
			if(registroAEditar.is_interna != parametros.isInterna){
				if(parametros.isInterna){
					const contactos = await db.sequelize.models.contactos.findAll({where:{id_oficina:id},paranoid: false})
					const oficinasCliente = await db.sequelize.models.oficinas_cliente.findAll({where:{id_oficina:id},paranoid: false})
					const oficinasRazonesSociales = await db.sequelize.models.oficinas_razones_sociales.findAll({where:{id_oficina:id},paranoid: false})
					if(contactos.length > 0 || oficinasCliente.length > 0 || oficinasRazonesSociales.length > 0){
						return res.status(400).send({ status: false, msg: "La oficina no puede ser interna, ya que tiene asignados contactos, clientes o razones sociales." });
					}
				}else{
					const clientes = await db.sequelize.models.clientes.findAll({where:{id_oficina_interno:id},paranoid: false})
					const usuarios = await db.sequelize.models.usuarios.findAll({where:{id_oficina:id},paranoid: false})
					if(clientes.length > 0 || usuarios.length > 0){
						return res.status(400).send({ status: false, msg: "La oficina no puede dejar de ser interna, ya que tiene asignado usuario o cliente." });
					}
				}
			}
		}


		// registro de historial
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.oficinas.name.toUpperCase(),
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
		const registroAEliminar = await db.sequelize.models.oficinas.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.oficinas.name){
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

			// registro de historial
			var registro2 = {
				id_usuario_registro: req.usuario.id,
				id_registro: parseInt(id),
				tabla: db.sequelize.models.oficinas.name.toUpperCase() ,
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
		const registroARestaurar = await db.sequelize.models.oficinas.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){

				// registro de historial
				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.oficinas.name.toUpperCase(),
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
			tabla: db.sequelize.models.oficinas.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.oficinas.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud oficinas" });
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
			if(asociacion.target.name == db.sequelize.models.oficinas.name){
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

async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.oficinas.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {

		const addRel = new Relaciones([],[],db.sequelize.models);
		const relaciones = await addRel.getRelaciones();
		
        const docs = await db.sequelize.models.oficinas.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        });

		const data = [];
        for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente'
				 ]
				const findRelacionesOficinaClientes = new Relaciones(listRel,listRel,db.sequelize.models);
				const relacionesOficinaClientes =  await findRelacionesOficinaClientes.getRelaciones();
				element.oficinas_cliente = await db.sequelize.models.oficinas_cliente.findAll({where:{id_oficina: element.id}, include:relacionesOficinaClientes});
			}
			data.push(element)
        }
 
        let idMarca = null;
		const elementos = [];
        for(const element of data){
            
            elementos.push({
                'Nombre': element.nombre,
                'Eliminado': element.deletedAt == null ? "NO" : "SI",
            });
        }
		if(elementos.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

        const nombreReporte = `oficinas_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.oficinas.name];
        const reporteOficinas = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        });
        return await reporteOficinas.gerReporteOneSheet(res,req);
    } catch (error) {
		return res.status(500).json({ success: false, msg: 'Error interno del servidor', error: error.toString() });
	}
      
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

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	indexHistoricos,
	showHistoricos,
	exportacion
}
