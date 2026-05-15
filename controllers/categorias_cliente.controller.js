'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
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
	const camposModelo = Object.keys(db.sequelize.models.categorias_cliente.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.categorias_cliente.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.categorias_cliente.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/categoriasCliente`;
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
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'clave', tipo:'string',largo:100,textoCase:"up"},
							{campo:'descripcion', tipo:'string',largo:100,textoCase:"up"},
							{campo:'rc', tipo:'boolean'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const registrosEncontrados = await db.sequelize.models.categorias_cliente.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					descripcion: {
						[db.Sequelize.Op.like]: `%${parametros.descripcion}%`
					},
					clave: {
						[db.Sequelize.Op.like]: `%${parametros.clave}%`
					}
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.clave.toLowerCase() == parametros.clave.toLowerCase()) || 
				   (registro.descripcion.toLowerCase() == parametros.descripcion.toLowerCase())){
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
		const nuevoRegistro = await db.sequelize.models.categorias_cliente.create(registro);
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}
async function storeList(req, res){
	try {
		const categoriasCliente = [
			{clave:'FRE', descripcion:'FREIGHT FORWARDERS', rc:true},
			{clave:'ADU', descripcion:'AGENTES ADUANALES', rc:true},
			{clave:'TRA', descripcion:'TRANSPORTISTAS LOCALES', rc:false},
			{clave:'CROS',descripcion: 'CROSS BORDERS', rc:false},
			{clave:'CLD', descripcion:'CLIENTE DIRECTO', rc:false},
			{clave:'LNA', descripcion:'LINEA NAVIERA', rc:false},
			{clave:'CLL', descripcion:'CO-LOADER', rc:true},
			{clave:'OTR', descripcion:'OTROS', rc:true},

		]
		for (let index = 0; index < categoriasCliente.length; index++) {
			const categoriaCliente = categoriasCliente[index];
			const registrosEncontrados = await db.sequelize.models.categorias_cliente.findAll({
				where: {
					[db.Sequelize.Op.or]: {
						descripcion: {
							[db.Sequelize.Op.like]: `%${categoriaCliente.descripcion}%`
						},
						clave: {
							[db.Sequelize.Op.like]: `%${categoriaCliente.clave}%`
						}
					},
					deletedAt: null
				}
			});
			var regExistente = false
			if(registrosEncontrados.length > 0){
				await registrosEncontrados.forEach(registro => {
					if(registro.descripcion.toLowerCase() == categoriaCliente.descripcion.toLowerCase() || 
					   registro.clave.toLowerCase() == categoriaCliente.clave.toLowerCase()){
						if(!regExistente){
							regExistente = true;
						}
					}
				});
			}
			if(!regExistente){
				var registro = {
					clave: categoriaCliente.clave.toUpperCase(),
					descripcion: categoriaCliente.descripcion.toUpperCase(),
					rc: categoriaCliente.rc,
					id_usuario_registro: req.usuario.id,
					createdAt: moment().tz('America/Mexico_City'),
					updatedAt: moment().tz('America/Mexico_City')
				}
				const nuevoRegistro = await db.sequelize.models.categorias_cliente.create(registro);
			}
		}
		return res.status(200).send({ status: true, msg: "Elementos registrados correctamente"});
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
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const registroEncontrado = await db.sequelize.models.categorias_cliente.findByPk(id,{include: relaciones, paranoid: false });
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
	
		const validosOpcionales =[{campo:'clave',tipo:'string',textoCase:"up",largo:255},
								  {campo:'descripcion', tipo:'string',largo:100,textoCase:"up"},
								  {campo:'rc', tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		
		const registroAEditar = await db.sequelize.models.categorias_cliente.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]: {
					descripcion: {
						[db.Sequelize.Op.like]: `%${parametros.descripcion != undefined ? parametros.descripcion : registroAEditar.descripcion}%`
					},
					clave: {
						[db.Sequelize.Op.like]: `%${parametros.clave != undefined ? parametros.clave : registroAEditar.clave}%`
					}
				},
				deletedAt: null
			}
		}
		const registrosEncontrados = await db.sequelize.models.categorias_cliente.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.clave.toLowerCase() == (parametros.clave != undefined ? parametros.clave.toLowerCase() : registroAEditar.clave.toLowerCase())) ||
					(registro.descripcion.toLowerCase() == (parametros.descripcion != undefined ? parametros.descripcion.toLowerCase() : registroAEditar.descripcion.toLowerCase()))) &&
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
		const registroAEliminar = await db.sequelize.models.categorias_cliente.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.categorias_cliente.name){
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
			await registroAEliminar.destroy({ where: { id: id } });
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
		const registroARestaurar = await db.sequelize.models.categorias_cliente.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.categorias_cliente.findAll({
					where: {
						[db.Sequelize.Op.or]: {
							descripcion: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.descripcion}%`
							},
							clave: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.clave}%`
							}
						},
						deletedAt: null
					}
				});
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(((registro.clave.toLowerCase() == registroARestaurar.clave.toLowerCase()) ||
							(registro.descripcion.toLowerCase() == registroARestaurar.descripcion.toLowerCase())) && 
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
				await registroARestaurar.restore();
				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}


async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.categorias_cliente.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {
		
		const findRelaciones = new Relaciones([],[],db.sequelize.models);
		const relaciones = await findRelaciones.getRelaciones();
        
		
        const docs = await db.sequelize.models.categorias_cliente.findAll({
            paranoid: false,
            include: relaciones,
            order: [[campoOrden, orden]],
            where: filtro,
        });
            
        let idMarca = null;
		const elementos = [];
        for(const element of docs){
            elementos.push({
                'Clave': element.clave,
                'Descripción': element.descripcion,
                'RC': element.rc,
            });
        }
		if(elementos.length < 1){
			return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

        const nombreReporte = `categorias_clientes_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.categorias_cliente.name];
        const reporteCategoriaClientes = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        });
        return await reporteCategoriaClientes.gerReporteOneSheet(res,req);
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
	storeList,
	exportacion
}
