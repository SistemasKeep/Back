'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { RelacionesHistorico } = require('../middlewares/relacionesHistorico');
const { Filtros } = require('../middlewares/filtros');
const path = require('path');
const fs = require('fs').promises;
const { MailController } = require('./email.controller');	
const { sendNotificacion } = require('./asignacion_marca_agente_cliente.controllers')
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.marca_agentes_oficinas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	try {
		const perfilesValidos = ['oficina_cliente', 'marca', 'agente_venta_1', 'agente_venta_2', 'inside_sales', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina_cliente: ['oficina_cliente.cliente.tipo_cliente', 'oficina_cliente.cliente.estado.pais.continente', 'oficina_cliente.cliente.oficina_interno', 'oficina_cliente.oficina'],
				marca: ['marca.domicilio.estado.pais.continente','marca.pais.continente','marca.archivo', 'marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente'],
				agente_venta_1: ['agente_venta_1'],
				agente_venta_2: ['agente_venta_2'],
				inside_sales: [ 'inside_sales' ],
				all: [ 'marca.domicilio.estado.pais.continente', 'marca.pais.continente', 'marca.archivo',  'marca.dato_facturacion.regimen_fiscal',  'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','agente_venta_1','agente_venta_2','oficina_cliente.cliente.tipo_cliente', 'oficina_cliente.cliente.estado.pais.continente', 'oficina_cliente.cliente.oficina_interno','oficina_cliente.oficina','inside_sales']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		

		const docs = await db.sequelize.models.marca_agentes_oficinas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.marca_agentes_oficinas.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/marcaAgentesOficinas`;
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
		let obligatorios = [
            {campo:'idOficinaCliente', tipo:'model', model:db.sequelize.models.oficinas_cliente},
			{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
		]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'reasignadoAv1', tipo:'boolean'},
            					  {campo:'reasignadoAv2', tipo:'boolean'},
								  {campo:'grupoWhatsapp', tipo:'stringWhatsApp', largo:255},
								  {campo:'idAgenteVenta1', tipo:'model', model:db.sequelize.models.usuarios},
								  {campo:'idAgenteVenta2', tipo:'model', model:db.sequelize.models.usuarios},
								  {campo:'idInsideSales', tipo:'model',model:db.sequelize.models.usuarios}
        ]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca);
		const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(parametros.idOficinaCliente);
		const parametrosRelacion = ['oficina_cliente']
		const findRelaciones = new Relaciones(parametrosRelacion,parametrosRelacion,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const totalCount = await db.sequelize.models.marca_agentes_oficinas.count({
			paranoid: false,
			include: relaciones,
			where: {
				["$oficina_cliente.id_cliente$"]: oficinaCliente.id_cliente
			}
		});
		const clave = marca.clave + "-" + oficinaCliente.id_cliente + "-" + ManipuladorCadenas.obtenerLetra(totalCount +1)
		registro.clave = clave
		const registrosEncontrados = await db.sequelize.models.marca_agentes_oficinas.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					id_oficina_cliente: parametros.idOficinaCliente,
					id_marca: parametros.idMarca,
					clave: {
						[db.Sequelize.Op.like]: `%${clave}%`
					}
				},
				[db.Sequelize.Op.and]: {
					deletedAt: null
				}
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((registro.clave.toLowerCase() == clave.toLowerCase()) ||
				   (registro.id_oficina_cliente == parametros.idOficinaCliente &&
					registro.id_marca == parametros.idMarca)){
						if(!regExistente){
							if(!regExistente){
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
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.marca_agentes_oficinas.create(registro);
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
		const perfilesValidos = ['oficina_cliente', 'marca', 'agente_venta_1', 'agente_venta_2', 'inside_sales', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				oficina_cliente: [
					'oficina_cliente.cliente.tipo_cliente', 
					'oficina_cliente.cliente.estado.pais.continente', 
					'oficina_cliente.cliente.oficina_interno', 
					'oficina_cliente.oficina'
				],
				inside_sales: [ 'inside_sales' ],
				marca: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.productos',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				agente_venta_1: [
					'agente_venta_1'
				],
				agente_venta_2: [
					'agente_venta_2'
				],
				all: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.productos',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'agente_venta_1',
					'agente_venta_2',
					'oficina_cliente.cliente.tipo_cliente', 
					'oficina_cliente.cliente.estado.pais.continente', 
					'oficina_cliente.cliente.oficina_interno', 
					'oficina_cliente.oficina',
					'inside_sales'
				]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.marca_agentes_oficinas.findByPk(id,{include:relaciones,paranoid: false});
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
            {campo:'idOficinaCliente', tipo:'model', model:db.sequelize.models.oficinas_cliente},
		    {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
		    {campo:'idAgenteVenta1', tipo:'model', model:db.sequelize.models.usuarios, canNull: true},
            {campo:'idAgenteVenta2', tipo:'model', model:db.sequelize.models.usuarios, canNull: true},
            {campo:'reasignadoAv1', tipo:'boolean'},
            {campo:'reasignadoAv2', tipo:'boolean'},
			{campo:'grupoWhatsapp', tipo:'stringWhatsApp', largo:255},
			{campo:'idInsideSales', tipo:'model',model:db.sequelize.models.usuarios, canNull: true}
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
		const antes = await db.sequelize.models.marca_agentes_oficinas.findByPk(id);
		const registroAEditar = await db.sequelize.models.marca_agentes_oficinas.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind = {
			where: {
				[db.Sequelize.Op.or]: {
					id_oficina_cliente: parametros.idOficinaCliente != undefined ? parametros.idOficinaCliente : registroAEditar.id_oficina_cliente,
                    id_marca: parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca,
					clave: {
						[db.Sequelize.Op.like]: `%${registroAEditar.clave}%`
					},
				},
				[db.Sequelize.Op.and]: {
					deletedAt: null
				}
			},

		}
		const registrosEncontrados = await db.sequelize.models.marca_agentes_oficinas.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.clave.toLowerCase() == (registroAEditar.clave.toLowerCase()))||
				    ((registro.id_oficina_cliente == (parametros.idOficinaCliente != undefined ? parametros.idOficinaCliente : registroAEditar.id_oficina_cliente)) && 
					(registro.id_marca == (parametros.idMarca != undefined ? parametros.idMarca : registroAEditar.id_marca))))&&
					(registro.id != id)){
						if(!regExistente){
							if(!regExistente){
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
		const datoOficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(registroAEditar.id_oficina_cliente);
		const datoOficina = await db.sequelize.models.oficinas.findByPk(datoOficinaCliente.id_oficina,{attributes: { exclude: ['password','code_pass', 'uuid'] }});
		const fecha =  moment(datosUpdate.updatedAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss");
		
		if(datosUpdate.id_agente_venta_1 != undefined && antes.id_agente_venta_1 != datosUpdate.id_agente_venta_1){
			const usuario = await db.sequelize.models.usuarios.findByPk(datosUpdate.id_agente_venta_1,{attributes: { exclude: ['password','code_pass', 'uuid'] }});
			const info = await generarInfo(req.usuario.id, usuario.email, registroAEditar.id_marca);
			sendMail('correo_asignacion_oficina',[{nombre:'nombreAgente',contenido: usuario.nombre.toUpperCase()}, {nombre:'nombreOficina', contenido: datoOficina.nombre}, {nombre:'claveOficina', contenido: registroAEditar.clave}, {nombre:'fechaAsignacion', contenido: fecha},{nombre:'nombreUsuarioRegistro', contenido: req.usuario.nombre},{nombre:'lavelTitle',contenido:'Reasignación'},{nombre:'asignadoRe',contenido:'reasignado'},{nombre:'rolAgente',contenido:'Agente de Ventas 1'}],info);
		}
		if(datosUpdate.id_agente_venta_2 != undefined && antes.id_agente_venta_2 != datosUpdate.id_agente_venta_2){
			const usuario = await db.sequelize.models.usuarios.findByPk(datosUpdate.id_agente_venta_2,{attributes: { exclude: ['password','code_pass', 'uuid'] }});
			const info = await generarInfo(req.usuario.id, usuario.email, registroAEditar.id_marca);
			sendMail('correo_asignacion_oficina',[{nombre:'nombreAgente',contenido: usuario.nombre.toUpperCase()}, {nombre:'nombreOficina', contenido: datoOficina.nombre}, {nombre:'claveOficina', contenido: registroAEditar.clave}, {nombre:'fechaAsignacion', contenido: fecha},{nombre:'nombreUsuarioRegistro', contenido: req.usuario.nombre},{nombre:'lavelTitle',contenido:'Reasignación'},{nombre:'asignadoRe',contenido:'reasignado'},{nombre:'rolAgente',contenido:'Agente de Ventas 2'}],info);
		}
		if(datosUpdate.id_inside_sales != undefined && antes.id_inside_sales != datosUpdate.id_inside_sales){
			const usuario = await db.sequelize.models.usuarios.findByPk(datosUpdate.id_inside_sales,{attributes: { exclude: ['password','code_pass', 'uuid'] }});
			const info = await generarInfo(req.usuario.id, usuario.email, registroAEditar.id_marca);
			sendMail('correo_asignacion_oficina',[{nombre:'nombreAgente',contenido: usuario.nombre.toUpperCase()}, {nombre:'nombreOficina', contenido: datoOficina.nombre}, {nombre:'claveOficina', contenido: registroAEditar.clave}, {nombre:'fechaAsignacion', contenido: fecha},{nombre:'nombreUsuarioRegistro', contenido: req.usuario.nombre},{nombre:'lavelTitle',contenido:'Reasignación'},{nombre:'asignadoRe',contenido:'reasignado'},{nombre:'rolAgente',contenido:'Inside Sales'}],info);
		}

		//registro de historial
		var registro2 = {
			id_usuario_registro: req.usuario.id,
			id_registro: parseInt(id),
			tabla: db.sequelize.models.marca_agentes_oficinas.name.toUpperCase() ,
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
		res.status(200).send({ status: true, msg: "Registro editado con éxito"});
		if(registrosActuales.id_marca == 3){
			const relacionesGet = [ 'marca', 'oficina_cliente','oficinas_productos']
			const findRelaciones = new Relaciones(relacionesGet,relacionesGet,db.sequelize.models)
			const relaciones = await findRelaciones.getRelaciones()
			const agenteMarcaOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(id,{include:relaciones});
			const categoriasClientesValidas = ["FREIGHT FORWARDERS","AGENTES ADUANALES","CO-LOADER"]
			const oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(agenteMarcaOficina.id_oficina_cliente);
			const findRelacionesCliente = new Relaciones(['categoria_cliente'],['categoria_cliente'],db.sequelize.models)
			const relacionesCliente = await findRelacionesCliente.getRelaciones();
			const cliente = await db.sequelize.models.clientes.findByPk(oficinaCliente.id_cliente,{include:relacionesCliente});
			const isValid = categoriasClientesValidas.includes(cliente.categoria_cliente.descripcion) && cliente.categoria_cliente.rc == true
			if(isValid){
				let haveRC = false
				for(const oficinaProducto of agenteMarcaOficina.oficinas_productos){
					if(oficinaProducto.id_producto == 4){
						haveRC = true
					}
				}
				if(!haveRC){
					var data = {
						id_usuario_registro: req.usuario.id,
						createdAt: moment().tz('America/Mexico_City'),
						id_producto: 4,
						  id_marca_agente_oficina: agenteMarcaOficina.id,
					}
			
					const oficinaProducto = await db.sequelize.models.oficinas_productos.create(data);
					const wherePoliza = {where:{id_proveedor: 1342,id_tipo_cobertura:4}};
					const polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
					if(polizaDetalle !== undefined && polizaDetalle !== null){
						const parametrosData = {}
						parametrosData.id_proveedor = 1342
						parametrosData.id_oficina_producto = oficinaProducto.id
						parametrosData.limite_inferior = polizaDetalle.limite_minimo
						parametrosData.limite_superior = polizaDetalle.limite_maximo
						parametrosData.tarifa_compra_forzosa = true
						parametrosData.tarifa_compra_especial = 0
						parametrosData.minimo_compra_especial = parseFloat(polizaDetalle.minimo_compra)
						parametrosData.is_deducible = false
						parametrosData.tarifa_mediador_mercantil = 0
						parametrosData.minimo_mediador_mercantil = 0
						parametrosData.descripcion = "SeguroRC"
						parametrosData.tarifa_final_cliente = 0
						parametrosData.id_moneda_compra = 2
						parametrosData.id_moneda_venta = 2
						parametrosData.minimo_venta = parseFloat(polizaDetalle.minimo_venta)
						parametrosData.id_usuario_registro = req.usuario.id
						await db.sequelize.models.atributos_keepro.create(parametrosData);
					}
				}
			}
		}
		return null
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}
async function sendMail(tpl,data,info){
	const rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `${tpl}.html`);
	var htmlContent = await fs.readFile(rutaArchivoHTML, 'utf8');
	for (let index = 0; index < data.length; index++) {
		const campo = data[index];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}
	let mailOptions = {
		to: [info.email],
		subject: 'Reasignación de Oficina',
		html: htmlContent
	};
	const mainSender = new MailController(info.idUsuario, info.idMarca, mailOptions, true)
	mainSender.sendMail()
}

async function generarInfo(usuario, email, marca) {
    return {
        'idUsuario': usuario,
        'idMarca': marca,
        'email': email,
    };
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.marca_agentes_oficinas.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.marca_agentes_oficinas.name){
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
				tabla: db.sequelize.models.marca_agentes_oficinas.name.toUpperCase() ,
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
		const registroARestaurar = await db.sequelize.models.marca_agentes_oficinas.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.marca_agentes_oficinas.findAll({
					where: {
						[db.Sequelize.Op.or]: {
							id_oficina_cliente: registroARestaurar.id_oficina_cliente,
							id_marca: registroARestaurar.id_marca,
							clave: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.clave}%`
							},
						},
						[db.Sequelize.Op.and]: {
							deletedAt: null
						}
					}
				});
	
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(((registro.clave.toLowerCase() == registroARestaurar.clave.toLowerCase()) ||
							registro.id_oficina_cliente == registroARestaurar.id_oficina_cliente &&
							registro.id_marca == registroARestaurar.id_marca) &&
							registro.id != id){
								if(!regExistente){
									if(!regExistente){
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

				var registro2 = {
					id_usuario_registro: req.usuario.id,
					id_registro: parseInt(id),
					tabla: db.sequelize.models.marca_agentes_oficinas.name.toUpperCase(),
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
			tabla: db.sequelize.models.marca_agentes_oficinas.name.toUpperCase()
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
	if(registro.tabla != db.sequelize.models.marca_agentes_oficinas.name.toUpperCase()){
		return res.status(400).send({ status: false, msg: "Registro no pertenece al crud marca_agentes_oficinas" });
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
			if(asociacion.target.name == db.sequelize.models.marca_agentes_oficinas.name){
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

async function listHistoricos(req, res) {
	const { id } = req.params;
	try {
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 

		let usuario = await db.sequelize.models.marca_agentes_oficinas.findByPk(id);
		let msg = 'Elementos obtenidos correctamente';

		if(usuario === null){
			msg = `Registro con id: ${id} no existe`
		}

		var whereFind = {
			where: {
				id_registro: id,
				accion: 'EDICION',
				tabla: db.sequelize.models.marca_agentes_oficinas.name.toUpperCase()
			}
		}
		
		const registrosEncontrados = await db.sequelize.models.historicos.findAll(whereFind);
		const data = []
		for (let index = 0; index < registrosEncontrados.length; index++) {
			let reg = {}
			const registro = registrosEncontrados[index];
			let usuario = await db.sequelize.models.usuarios.findByPk(registro.id_usuario_registro);
			
			if(registro.id_registro == id){
				let datosDesencriptadosPrevia = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_previa)
				let datosDesencriptadosPosterior = await CryptoMiddleware.desencriptarJSON(registro.encriptacion_posterior)
				let fecha_asignacion = moment(registro.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
				let usuario_registro = {id: usuario.id, nombre: usuario.nombre};
				let informacion_posterior = await getRelaciones(datosDesencriptadosPosterior);
				// Verificar por cada agente si hubo cambios
				if (datosDesencriptadosPosterior.id_agente_venta_1 !== datosDesencriptadosPrevia.id_agente_venta_1) {
					reg = {
						clave_oficina: informacion_posterior.clave,
						usuario_edicion: usuario_registro,
						fecha_asignacion: fecha_asignacion,
						agente: informacion_posterior.agente_venta_1.nombre,
						puesto: 'Agente Venta 1',
					}
					data.push(reg)
				}
				if(datosDesencriptadosPosterior.id_agente_venta_2 !== datosDesencriptadosPrevia.id_agente_venta_2){
					reg = {
						clave_oficina: informacion_posterior.clave,
						usuario_edicion: usuario_registro,
						fecha_asignacion: fecha_asignacion,
						agente: informacion_posterior.agente_venta_2.nombre,
						puesto: 'Agente Venta 1',
					}
					data.push(reg)
				}
				if(datosDesencriptadosPosterior.id_inside_sales !== datosDesencriptadosPrevia.id_inside_sales){
					reg = {
						clave_oficina: informacion_posterior.clave,
						usuario_edicion: usuario_registro,
						fecha_asignacion: fecha_asignacion,
						agente: informacion_posterior.inside_sales.nombre,
						puesto: 'Inside Sales',
					}
					data.push(reg)
				}
			}
		}
		return res.status(200).send({
			success: true,
			total: data.length,
			msg: msg,
			data: data
		});
	}catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function envioNotificacion(antes,despues, idUsuarioRegistro) {
	let fechaAsignacion = moment().tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
	const data = []
	if(antes.id_agente_operativo != despues.id_agente_operativo){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_operativo, {paranoid: false});
		let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
		let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
		let reg = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: despues.id_cliente,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuarioRegistro.nombre,
			idMarca:despues.id_marca,
			idUsuario:idUsuarioRegistro,
			correo:agente.email
		}
		data.push(reg)
	}
	if(antes.id_agente_venta_1 != despues.id_agente_venta_1){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_venta_1, {paranoid: false});
		let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
		let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
		let reg = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: despues.id_cliente,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuarioRegistro.nombre,
			idMarca:despues.id_marca,
			idUsuario:idUsuarioRegistro,
			correo:agente.email
		}
		data.push(reg)
	}
	if(antes.id_agente_venta_2 != despues.id_agente_venta_2){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_agente_venta_2, {paranoid: false});
		let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
		let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
		let reg = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: despues.id_cliente,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuarioRegistro.nombre,
			idMarca:despues.id_marca,
			idUsuario:idUsuarioRegistro,
			correo:agente.email
		}
		data.push(reg)
	}
	if(antes.id_inside_sales != despues.id_inside_sales){
		let agente = await db.sequelize.models.usuarios.findByPk(despues.id_inside_sales, {paranoid: false});
		let usuarioRegistro = await db.sequelize.models.usuarios.findByPk(idUsuarioRegistro, {paranoid: false});
		let cliente = await db.sequelize.models.clientes.findByPk(despues.id_cliente, {paranoid: false});
		let reg = {
			nombreAgente: agente.nombre,
			nombreCliente: cliente.nombre,
			claveCliente: despues.id_cliente,
			fechaAsignacion: fechaAsignacion,
			nombreUsuarioRegistro: usuarioRegistro.nombre,
			idMarca:despues.id_marca,
			idUsuario:idUsuarioRegistro,
			correo:agente.email
		}
		data.push(reg)
	}
	for(const notificacion of data){
		sendNotificacion(notificacion)
	}
}
async function exportacion(req, res) {
    var orden = req.query.orden;
    if(orden != 'ASC' && orden != 'DESC'){
        orden = 'ASC';
    }
    var campoOrden = req.query.campoOrden;
    const camposModelo = Object.keys(db.sequelize.models.marca_agentes_oficinas.rawAttributes);
    if(!camposModelo.includes(campoOrden)){
        campoOrden = 'createdAt';
    }
    const filtro = await getFiltroExportacion(req.query);

    try {
		req.query.perfil = 'all';
        const perfilesValidos = ['all'];
        var relaciones = [];
        if(perfilesValidos.includes(req.query.perfil)){
            const parametrosRelaciones = {
                all: [ 
					'oficina_cliente.cliente',
					'oficina_cliente.oficina',
					'marca',
					'agente_venta_1',
					'agente_venta_2'
                ]
            }
            const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
            relaciones = await findRelaciones.getRelaciones();
        }
		
        const docs = await db.sequelize.models.marca_agentes_oficinas.findAll({
            include: relaciones,
            where: filtro,
        });
            
		const data = [];
        for(const info of docs){
			if(info.oficina_cliente == null) continue;
			if(info.oficina_cliente.cliente == null || info.oficina_cliente.oficina == null || info.marca == null){
				continue;
			}
			
			const cliente_razon = await db.sequelize.models.clientes_razones_sociales.findAll({
				where: { id_cliente: info.oficina_cliente.id_cliente, deletedAt: null},
			});
			if(cliente_razon == null) continue;

			const ids_razon_social = cliente_razon.map(razon => razon.id_razon_social);
			// Buscar facturas asociadas a las razones sociales del cliente y la marca
			const facturas = await db.sequelize.models.facturas.findAll({
				where: { id_marca: info.id_marca, id_razon_social: ids_razon_social },
				order: [['createdAt', 'ASC']]
			});

			// Si no hay facturas, omitir este registro
			if (facturas.length === 0) continue;

			// Datos del reporte
			const reporte = {
				id_marca: info.id_marca,
				clave_cliente: info.oficina_cliente.id_cliente,
				nombre_cliente: info.oficina_cliente.cliente.nombre,
				fecha_creacion_cliente:moment(info.oficina_cliente.cliente.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD"),
				clave_oficina: info.clave,
				nombre_oficina: info.oficina_cliente.oficina.nombre,
				fecha_creacion_oficina:moment(info.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD"),
				marca: info.marca.nombre,
				agente_1: info.agente_venta_1 ? info.agente_venta_1.nombre : '',
				agente_2: info.agente_venta_2 ? info.agente_venta_2.nombre : '',
				fecha_primera_factura:moment(facturas[0].createdAt).tz('America/Mexico_City').format("YYYY-MM-DD")
			};
			data.push(reporte);   
        }

		const elementos = [];
        for(const element of data){
            elementos.push({
                'Clave de cliente': element.clave_cliente,
                'Nombre de cliente': element.nombre_cliente,
                'Fecha de creación de cliente': element.fecha_creacion_cliente,
                'Clave de oficina': element.clave_oficina,
				'Nombre de oficina': element.nombre_oficina,
				'Fecha de creación de oficina': element.fecha_creacion_oficina,
				'Marca': element.marca,
				'Agente 1': element.agente_1,
				'Agente 2': element.agente_2,
				'Fecha de primer factura de la marca': element.fecha_primera_factura
            });
        }

        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

        const nombreReporte = `clientes_nuevos_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.marca_agentes_oficinas.name];
        const reporteClientesNuevos = new ReportesXLSX({
            nombreReporte: nombreReporte,
            elementos: elementos,
            namesSheets: namesSheets, 
            idMarca: null
        });
        return await reporteClientesNuevos.gerReporteOneSheet(res,req);

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
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
	listHistoricos,
	exportacion
}
