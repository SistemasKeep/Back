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
	const camposModelo = Object.keys(db.sequelize.models.permisos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.permisos.findAll({
			paranoid: false,
			include: relaciones,
			page: page || 1,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
		const dataDocs = await db.sequelize.models.permisos.count({
		    paranoid: false,
		    where: filtro
		});		

		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/permisos`;
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

async function listPermisos(req,res){
	const permisos = await getNamePermisos();
	return res.status(200).send({ status: true, permisos: permisos});
}

async function getNamePermisos(){
	const permisos = [ 'NEW_USER', 'MAIL_FACTURA_PROVEEDOR']
	for (const modelo of Object.values(db.sequelize.models)) {
		if(modelo.name.toUpperCase() != "CERTIFICADOS_RC" && modelo.name.toUpperCase() != "DETALLE_CERTIFICADOS"){
			permisos.push(modelo.name.toUpperCase())
		}
	}
	permisos.sort();
	return permisos;
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
		let obligatorios = [
            {campo:'name', tipo:'string', largo:255, textoCase:"up"},
            {campo:'displayName', tipo:'string', largo:255, textoCase:"up"},
            {campo:'descripcion', tipo:'string', largo:255, textoCase:"up"},
            {campo:'tipo', tipo:'enum', largo:1, textoCase:"up",  enum: ['C', 'L', 'A', 'E', 'R', 'M']}
		]
		const permisos = await getNamePermisos();
		if(!permisos.includes(parametros.name) && parametros.tipo != 'M'){
			return res.status(400).send({ status: false, msg: "El nombre del permiso es inválido."});
		}
		const permisosTipo = [ "C", "L", "A", "E", "R", "M" ]
		if(!permisosTipo.includes(parametros.tipo)){
			return res.status(400).send({ status: false, msg: "El campo tipo debe ser uno de los siguientes: C,L,A,E,R,M. Por favor, proporcione un valor válido."});
		}
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const registrosEncontrados = await db.sequelize.models.permisos.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					name: {
						[db.Sequelize.Op.like]: `%${parametros.name}%`
					},
                    tipo: {
						[db.Sequelize.Op.like]: `%${parametros.tipo}%`
					}
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(registro.name.toLowerCase() == parametros.name.toLowerCase() && registro.tipo.toLowerCase() == parametros.tipo.toLowerCase()){
					regExistente = true;
					res.status(400).send({ status: false, msg: "El nombre o clave del permiso ya se encuentra registrado"});
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id;
		const nuevoRegistro = await db.sequelize.models.permisos.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	}
}

async function storeList(req,res){
	const permisosTipo = [
		{type:"C", do: "CREAR"},
		{type:"L", do: "LEER"},
		{type:"A", do: "ACTUALIZAR"},
		{type:"E", do: "ELIMINAR"},
		{type:"R", do: "RESTAURAR"},
		{type:"M", do: "ACCEDER AL MODULO"}
	]

	const onlyM = [
		'MAIL_FACTURA_PROVEEDOR', 
		'PROSPECTOS',
		'INTRANET',
		'HELPDESK',
		'KEEPRO',
		'DOCUMENTOS_CLIENTE',
		'DOCUMENTOS_PROVEEDOR',
		'ESTADO_CUENTA_AUTOEMISOR',
		'BENEFICIARIOS_AUTOEMISOR',
	]
	for (const permiso of onlyM) {
		const registrosEncontrados = await db.sequelize.models.permisos.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					name: {
						[db.Sequelize.Op.like]: `%${permiso}%`
					},
					tipo: {
						[db.Sequelize.Op.like]: `%M%`
					}
				}
			}
		});
		var continuar = true
		if(registrosEncontrados.length > 0){
			await registrosEncontrados.forEach(registro => {
				if(registro.name.toLowerCase() == permiso.toLowerCase() && registro.tipo.toLowerCase() == "m"){
					continuar = false;
				}
			});
		}
		if(continuar){
			let registroPermiso = {
				name: permiso,
				display_name: `ACCEDER AL MODULO ${permiso.replace(/_/g, " ")}`,
				descripcion: `PERMISO PARA ACCEDER AL MODULO ${permiso.replace(/_/g, " ")}`,
				tipo: "M",
				createdAt: moment().tz('America/Mexico_City')
			}
			await db.sequelize.models.permisos.create(registroPermiso);
		}
	}
	const onlyC = ['MAIL_FACTURA_PROVEEDOR']
	for (const permiso of onlyC) {
		const registrosEncontrados = await db.sequelize.models.permisos.findAll({
			where: {
				[db.Sequelize.Op.and]: {
					name: {
						[db.Sequelize.Op.like]: `%${permiso}%`
					},
					tipo: {
						[db.Sequelize.Op.like]: `%C%`
					}
				}
			}
		});
		var continuar = true
		if(registrosEncontrados.length > 0){
			await registrosEncontrados.forEach(registro => {
				if(registro.name.toLowerCase() == permiso.toLowerCase() && registro.tipo.toLowerCase() == "c"){
					continuar = false;
				}
			});
		}
		if(continuar){
			let registroPermiso = {
				name: permiso,
				display_name: `CREAR ${permiso.replace(/_/g, " ")}`,
				descripcion: `PERMISO PARA CREAR ${permiso.replace(/_/g, " ")}`,
				tipo: "C",
				createdAt: moment().tz('America/Mexico_City')
			}
			await db.sequelize.models.permisos.create(registroPermiso);
		}
	}

	const permisos = await getNamePermisos();
	for (const permiso of permisos) {
		for (const permisoTipo of permisosTipo) {
			const registrosEncontrados = await db.sequelize.models.permisos.findAll({
				where: {
					[db.Sequelize.Op.and]: {
						name: {
							[db.Sequelize.Op.like]: `%${permiso}%`
						},
						tipo: {
							[db.Sequelize.Op.like]: `%${permisoTipo.type}%`
						}
					}
				}
			});
			var continuar = true
			if(registrosEncontrados.length > 0){
				await registrosEncontrados.forEach(registro => {
					if(registro.name.toLowerCase() == permiso.toLowerCase() && registro.tipo.toLowerCase() == permisoTipo.type.toLowerCase()){
						continuar = false;
					}
				});
			}
			if(continuar){
				let registroPermiso = {
					name: permiso,
					display_name: `${permisoTipo.do} ${permiso.replace(/_/g, " ")}`,
					descripcion: `PERMISO PARA ${permisoTipo.do} ${permiso.replace(/_/g, " ")}`,
					tipo: permisoTipo.type,
					createdAt: moment().tz('America/Mexico_City')
				}
				await db.sequelize.models.permisos.create(registroPermiso);
			}
		}
	}
	return res.status(200).send({ status: true, msg: "Elemento registrado correctamente"});
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
				all: []
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = []
				
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}
		const registroEncontrado = await db.sequelize.models.permisos.findByPk(id,{include:relaciones,paranoid: false});
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
	
		const validosOpcionales = [
            {campo:'name', tipo:'string', largo:255, textoCase:"up"},
            {campo:'displayName', tipo:'string', largo:255, textoCase:"up"},
            {campo:'descripcion', tipo:'string', largo:255, textoCase:"up"},
            {campo:'tipo', tipo:'enum', largo:1, textoCase:"up", enum: ['C', 'L', 'A', 'E', 'R', 'M']}
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
		if(parametros.name != undefined && parametros.name != null){
			const permisos = await getNamePermisos();
			if(!permisos.includes(parametros.name)){
				return res.status(400).send({ status: false, msg: "El nombre del permiso es inválido."});
			}
		}
		
		const registroAEditar = await db.sequelize.models.permisos.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.and]: {
					name: {
						[db.Sequelize.Op.like]: `%${parametros.name != undefined ? parametros.name : registroAEditar.name}%`
					},
                    tipo: {
						[db.Sequelize.Op.like]: `%${parametros.tipo != undefined ? parametros.tipo : registroAEditar.tipo}%`
					}
				},
                [db.Sequelize.Op.and]: {
                    deletedAt: null
                }
			}
		}
		const registrosEncontrados = await db.sequelize.models.permisos.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.name.toLowerCase() == (parametros.name != undefined ? parametros.name.toLowerCase() : registroAEditar.name.toLowerCase()) &&
                    registro.tipo.toLowerCase() == (parametros.tipo != undefined ? parametros.tipo.toLowerCase() : registroAEditar.tipo.toLowerCase())) && 
                    registro.id != id)
                    {
						regExistente = true;
						res.status(400).send({ status: false, msg: "El nombre o clave del permiso ya se encuentra registrado"});
			        }
			});
			if(regExistente){
				return '';
			}
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
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
		const registroAEliminar = await db.sequelize.models.permisos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.permisos.name){
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

async function restaurar(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroARestaurar = await db.sequelize.models.permisos.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.permisos.findAll({
					where: {
						[db.Sequelize.Op.and]: {
							name: registroARestaurar.name,
                            tipo: registroARestaurar.tipo
						},
                        [db.Sequelize.Op.and]: {
                            deletedAt: null
                        }
					}
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((registro.name.toLowerCase() == registroARestaurar.name.toLowerCase() && registro.tipo.toLowerCase() == registroARestaurar.tipo.toLowerCase()) &&
							registro.id != id){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
						}
					});
					if(regExistente){
						return '';
					}
				}
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

async function exportar(req, res) {
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.permisos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.permisos.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		});

		const dataExcel = [];
		let aux;
		for (let i = 0; i < docs.length; i++) {
			let elemento = docs[i];
			aux = {
				'Nombre': elemento.name,
				'Descripción': elemento.descripcion,
				'Grupo': elemento.tipo
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
		}
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
		
		const nombreReporte = 'Permisos';
		const namesSheets = [db.sequelize.models.permisos.name];
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
	update,
	destroy,
	restaurar,
	listPermisos,
	storeList,
	exportar
}
