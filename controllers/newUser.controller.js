'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const crypto = require('crypto-js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
const { MailController } = require('./email.controller');

async function index(req, res) {
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
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;
	const userId = req.usuario.id_cliente == null ? req.query.idCliente : req.usuario.id_cliente;

	try {
		const perfilesValidos = ['cliente', 'oficina','roles', 'proveedor','marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: ['cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				oficina: ['oficina'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				marca: [ 'marca.domicilio.estado.pais.continente', 'marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const oficinasC = await db.sequelize.models.oficinas_cliente.findAll({
			paranoid: false,
			order: [['createdAt', orden]],
			where: {
				id_cliente: userId
			},
		  });

		const oficinasIds = oficinasC.map(oficinaCliente => oficinaCliente.id_oficina);

		const docsContactos = await db.sequelize.models.contactos.findAll({
			paranoid: false,
			where: {
				id_oficina: {
				[db.Sequelize.Op.in]: oficinasIds
				},
				es_usuario: true,
				deletedAt: null 
			},
			order: [['createdAt', orden]],
		});

		const correosIds = docsContactos.map(contacto => contacto.email);

		filtro.email = {
			[db.Sequelize.Op.in]: correosIds
		}

		
		const usuarios = await db.sequelize.models.usuarios.findAll({
			paranoid: false,
			where: filtro,
			include: relaciones,
			attributes: { exclude: ['password','code_pass', 'uuid'] },
			order: [[campoOrden, orden]],
			offset,
			limit
		});
		
		const dataDocs = await db.sequelize.models.usuarios.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});		

		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/newUser`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: usuarios
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
		let obligatorios = [{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
							{campo:'idContacto', tipo:'model', model:db.sequelize.models.contactos},
							{campo:'adminUser', tipo:'boolean'}
        ]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const isAutoemisor = !req.usuario.es_colaborador && req.usuario.es_autoemisor;
		const isMediador = req.usuario.es_mediador_mercantil === true ;

		
		if (isAutoemisor) {
			if (req.usuario.id_cliente !=  registro.id_cliente) {
				return res.status(409).send({status: true, msg: "El id_cliente del payload debe coincidir con el id_cliente asignado al usuario" });
			}
		}

		const cliente = await getCliente(registro);
		if (isMediador) {
			const detalleC = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente);
			if (req.usuario.id_mediador_mercantil !=  detalleC.id_mediador_mercantil) {
				return res.status(409).send({status: true, msg: "El usuario y cliente debe coincidir con el mismo mediador mercantil" });
			}
		}

		if(cliente.cliente_prospecto !== true){
			return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.body.idCliente} es prospecto` });
		}
		const clienteDetalles = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente)
		if(clienteDetalles.autoemisor == null || clienteDetalles.autoemisor == ""){
			return res.status(409).send({ status: false, msg: "El cliente no tiene permiso de autoemisor"});
        }
		/*
		if(!cliente.razon_social.id_metodo_pago || cliente.razon_social.id_metodo_pago == "" ||
			!cliente.razon_social.id_forma_pago || cliente.razon_social.id_forma_pago == "" ||
			!cliente.razon_social.id_uso_cfdi || cliente.razon_social.id_uso_cfdi == "" ){

			return res.status(409).send({ status: false, msg: "El cliente no cuenta con datos de facturación registrado"});
        }
		*/
		const ids_oficinas = [];
		const ids_oficinas_clientes = [];
		const oficinasAsignados = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente: parametros.idCliente}});
		for(const oficinaAsignada of oficinasAsignados){
			ids_oficinas.push(oficinaAsignada.id_oficina);
			ids_oficinas_clientes.push(oficinaAsignada.id);
		}

		const ids_marca_agentes_oficina = [];
		const marcasOficinasAsignados = await db.sequelize.models.marca_agentes_oficinas.findAll({where: {id_oficina_cliente: ids_oficinas_clientes}});
		for(const marcasOficinaAsignada of marcasOficinasAsignados){
			ids_marca_agentes_oficina.push(marcasOficinaAsignada.id);
		}

		const oficinasProductosAsignados = await db.sequelize.models.oficinas_productos.count({where:{id_marca_agente_oficina: ids_marca_agentes_oficina }});
		if(oficinasProductosAsignados == 0){
			return res.status(409).send({ status: false, msg: "No se tienen productos registrados"});

		}

		const ids_razones_sociales = [];
		const razonesSocialesAsignados = await db.sequelize.models.oficinas_razones_sociales.findAll({where:{id_oficina: ids_oficinas }});
		for(const razonSocialAsignada of razonesSocialesAsignados){
			ids_razones_sociales.push(razonSocialAsignada.id_razon_social);
		}
		const razonesSociales = await db.sequelize.models.razones_sociales.findAll({where: {id: ids_razones_sociales}});
	
		var isRazonezValid = true;
		var invalidMsg = '';
		const razonesSocialesValidNO = [];
		const ids_cargas_archivos = []
		


		const archivosAsignados = await db.sequelize.models.razones_sociales_archivos.findOne({where: {
			descripcion:{
				[db.Sequelize.Op.like]: `%TÉRMINOS Y CONDICIONES DEL AUTOEMISOR%`
			}
		}});
		
		for(const razonSocial of razonesSociales){
			if (
				razonSocial.deletedAt == null &&
				razonSocial.id_regimen_fiscal != null &&
				razonSocial.id_regimen_fiscal != "" &&
				razonSocial.no_identificacion != null &&
				razonSocial.no_identificacion != "" &&
				razonSocial.razon_social != null &&
				razonSocial.razon_social != ""
			){/*
				const archivoAsignado = await db.sequelize.models.razones_sociales_archivos.findOne({where: {
					descripcion:{
						[db.Sequelize.Op.like]: `%TÉRMINOS Y CONDICIONES DEL AUTOEMISOR%`
					},
					id_razon_social: razonSocial.id
				}});

				if(archivoAsignado == null){
					isRazonezValid = false;
					invalidMsg = 'Falta anexar documento [Términos y Condiciones del Autoemisor] ';
				}else if(archivoAsignado.id_carga_archivo == null){
					isRazonezValid = false;
					invalidMsg = 'Falta anexar documento [Términos y Condiciones del Autoemisor] ';
				}*/
			}else{
				isRazonezValid = false;
				invalidMsg = 'Faltan datos (RFC, razón social y/o régimen fiscal).';
				razonesSocialesValidNO.push(razonSocial);
			}
		}
		
		if(!isRazonezValid){
			return res.status(409).send({ status: false, msg: "Una o más razones sociales del cliente no se encuentran validadas", razon: invalidMsg});
		}

		const { contactoValido, mensaje, email , nombreCompleto } = await findUsuario(parametros, ids_oficinas)
		if(!contactoValido){
			return res.status(400).send({ status: false, msg: mensaje});
		}

		const passTemp = crypto.lib.WordArray.random(8).toString(crypto.enc.Base64).substring(0,8);
		
		var registro2 = {
			nombre: nombreCompleto,
			password: bcrypt.hashSync(passTemp, 10),
			email: email,
			es_autoemisor: true,
			id_cliente: parametros.idCliente,
			envio_automatico: true,
			filtro_visualizacion: true,
			id_carga_archivo: null,
			es_nuevo_autoemisor: true,
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}

		var datosUpdate = {es_usuario: true}

		const info = {
			'idUsuario':req.usuario.id,
			'idMarca':req.usuario.id_marca,
			'userName': req.usuario.nombre.toUpperCase(),
			'email': email,
		};
		
		await db.sequelize.models.contactos.update(datosUpdate, { where: { id: parametros.idContacto } })
		const nuevoRegistro  = await db.sequelize.models.usuarios.create(registro2);

		const result = await createRoles(parametros, nuevoRegistro.id, req.usuario.id);
		
		sendMail('registro_usuario',[{nombre:'userName',contenido: nombreCompleto.toUpperCase()}, {nombre:'email', contenido: email.toLowerCase()},{nombre:'tempPassword', contenido:passTemp}],info);
		
		return res.status(200).send({ status: true, msg: `Usuario registrado correctamente y ${result.msg}`, data: {id_registro: nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function getCliente(registro){
	try {
		return await db.sequelize.models.clientes.findByPk(registro.id_cliente,{paranoid: false});
	} catch (error) {
		return '';
	}
}

async function getRol(id){
	try {
		return await db.sequelize.models.roles.findByPk(id);
	} catch (error) {
		return '';
	}
}

async function findUsuario(parametros, ids_oficinas){
	const contactosCliente = await db.sequelize.models.contactos.findAll({ where: { id_oficina: ids_oficinas, id: parametros.idContacto } });

	var contactoValido = true;
	var mensaje = '';
	var email = '';
	var nombre = '';
	var apellidoPaterno = '';
	var apellidoMaterno = '';

	if(contactosCliente == 0){
		contactoValido = false;
		mensaje = 'El nuevo usuario no se encuentra entre los contactos del cliente';
		return { contactoValido, mensaje };
	}

	const correosExistentes = []; 

	contactosCliente.forEach(contacto => {
		correosExistentes.push(contacto.email);
		if (contacto.es_usuario) {
			contactoValido = false;
			mensaje = 'Actualmente este contacto ya es usuario';
		} 
		email = contacto.email
		nombre = contacto.nombre
		apellidoPaterno = contacto.apellido_paterno
		apellidoMaterno = contacto.apellido_materno

	});
	const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`;

	const correos = await db.sequelize.models.contactos.findAll({ 
		where: {
			email:correosExistentes 
		}	
	});

	if (correos.length >=2 ) {
		contactoValido = false;
		mensaje = 'El correo electrónico ya está asociado a otro usuario';
	}
	return { contactoValido, mensaje, email, nombreCompleto };
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
		subject: 'Confirmación de registro en Keepro',
		html: htmlContent
	};
	const mainSender = new MailController(info.idUsuario, info.idMarca, mailOptions, true, false, true)
	mainSender.sendMail()
}

async function createRoles(parametros, id, usuarioRegistro) {

	const rolesMap = {
		adminUser: 146,
		autoemisor:  18,
		automisorLimitado: 132,
		restringidoKeepro: 143,
	};

    const rolesToCreate = [];
    
    for (const [key, rolNombre] of Object.entries(rolesMap)) {
        if (parametros[key]) {
            const rol = await getRol(rolNombre);
            rolesToCreate.push({
                id_role: rol.id,
                id_usuario: id,
                id_usuario_registro: usuarioRegistro
            });
        }
    }

    if (rolesToCreate.length > 0) {
        await db.sequelize.models.roles_usuarios.bulkCreate(rolesToCreate, { ignoreDuplicates: true });
        return { status: true, msg: "Roles asignados con éxito" };
    }

    return { status: false, msg: "No se encontraron roles para asignar" };
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
        const perfilesValidos = ['cliente', 'oficina','roles', 'proveedor','marca', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: ['cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno',],
				oficina: ['oficina'],
				proveedor: [ 'proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo' ],
				marca: [ 'marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente' ],
				all: [ 'oficina','cliente.tipo_cliente','cliente.estado.pais.continente','cliente.oficina_interno','marca.domicilio.estado.pais.continente','marca.pais.continente', 'marca.archivo','marca.dato_facturacion.regimen_fiscal', 'marca.dato_facturacion.pais.continente', 'marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.moneda','proveedor.conceptos_presupuesto','proveedor.marca.domicilio.estado.pais.continente','proveedor.marca.pais.continente','proveedor.marca.archivo','proveedor.marca.dato_facturacion.regimen_fiscal', 'proveedor.marca.dato_facturacion.pais.continente', 'proveedor.marca.dato_facturacion.nacionalidad_timbrado.continente','proveedor.proveedor_tipo']
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.usuarios.findByPk(id, {include:relaciones,paranoid: false,attributes: { exclude: ['password','code_pass', 'uuid'] },});
		const findRelacionesContacto = new Relaciones([],[],db.sequelize.models)
		const relacionesContacto = await findRelacionesContacto.getRelaciones()
		if(registroEncontrado != null ){
			const contacto = await db.sequelize.models.contactos.findOne({
				paranoid: false,
				include: relacionesContacto,
				where: {
					email: registroEncontrado.email,
					es_usuario: true,
				},
				
			});
			
			if(contacto != null){
				
				return res.status(200).send({ status: true, data: contacto});
			}
			return res.status(400).send({ status: false, msg: "Error al obtener usuario contacto, no se puede gestionar" });
			
			
		}
		return res.status(400).send({ status: false, msg: "No es usuario Keepro" });
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
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')};

		const registroAEditar = await db.sequelize.models.usuarios.findByPk(id);
	
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Usuario no existe" });
		}else if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Usuario eliminado" });
		}
	
		const validosOpcionales = [
			{campo:'nombre', tipo:'string', largo:255, textoCase:"up"},
			{campo:'apellidoPaterno', tipo:'string', largo:255, textoCase:"up"},
			{campo:'apellidoMaterno', tipo:'string', largo:255, textoCase:"up"},
            {campo:'adminUser', tipo:'boolean'},
			{campo:'autoemisor', tipo:'boolean'},
			{campo:'automisorLimitado', tipo:'boolean'},
			{campo:'restringidoKeepro', tipo:'boolean'},
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

		const roles = {
			adminUser: 146,
			autoemisor:  18,
			automisorLimitado: 132,
			restringidoKeepro: 143,
		};

		const resultados = [];

		if(parametros.nombre !== undefined && parametros.apellidoMaterno !== undefined && parametros.apellidoPaterno !== undefined){
			let nombreC = `${parametros.nombre} ${parametros.apellidoPaterno} ${parametros.apellidoMaterno}`.toUpperCase();
			const resultado = await updateUsuario(id, registroAEditar, nombreC, parametros.nombre, parametros.apellidoPaterno, parametros.apellidoMaterno);
			if(resultado !== undefined){
				resultados.push(resultado);
			}
		} 
		
		for (const { campo} of validosOpcionales) {
			if(typeof parametros[campo] === 'boolean'){
				if (parametros[campo] !== undefined) {
					const idRole = await getRol(roles[campo]);
					const resultado = await checkRoleExist(idRole.id, id, req.usuario.id, parametros[campo], campo);
					if(resultado !== undefined){
						resultados.push(resultado);
					}
				}
			}
		}

		const errores = resultados.filter(r => !r.status);
		const exitosos = resultados.filter(r => r.status);


		if (errores.length > 0) {
			return res.status(400).send({ status: false, msg: "No se aplicaron cambios", detalles: errores });
		} 
		if (exitosos.length > 0) {
			return res.status(200).send({ status: true, msg: "Información actualizada con éxito", detalles: exitosos });
		} else {
			return res.status(400).send({ status: true, msg: "No hubo cambios en los roles" });
		}
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function checkRoleExist(idRole,idUsuario,usuarioRegistro, estatusRole, nameRole) {
	const whereFind = {
		where: {
			id_role: idRole,
			id_usuario: idUsuario,
		},
		paranoid: false, // Para incluir registros eliminados
	};
	const registroRol = await db.sequelize.models.roles_usuarios.findAll(whereFind);
	if (estatusRole) {
		if (registroRol.length > 0) {
			for(const regrol of registroRol){
				// Verifica si el registro está eliminado
				if (regrol.deletedAt !== null) {
					await regrol.restore();
					return { status: true, msg: `Rol ${nameRole} asignado con éxito`};
				}
			}
			// El registro no está eliminado
			return { status: true, msg: `El rol ${nameRole} no se modificó`};
		}else{
			var registro = {
				id_role: idRole,
				id_usuario: idUsuario,
				id_usuario_registro: usuarioRegistro
			}
		
			await db.sequelize.models.roles_usuarios.create(registro);
			return { status: true, msg: `Rol ${nameRole} asignado con éxito`};

		}  
	} else {
		if(registroRol.length > 0){
			let eliminado = false
			for(const regrol of registroRol){
				if ( regrol.deletedAt === null) {
					await regrol.destroy();
					eliminado = true
				}
			}
			if(eliminado){
				return { status: true, msg: `Rol ${nameRole} modificado con éxito`};
			}
			return { status: true, msg: `El rol  ${nameRole} no estaba asignado anteriormente`};
		}
    }
}

async function updateUsuario(id, registroAEditar, nombreC, nombre, apellido_paterno, apellido_materno) {
	var where = {
		where: {
			nombre: {
				[db.Sequelize.Op.like]: `%${nombreC}%`
			},
			deletedAt: null
		}
	};
	
	const registrosEncontrados = await db.sequelize.models.usuarios.findAll(where);
	if(registrosEncontrados.length > 0){
		let regExistente = false;
		for (const registro of registrosEncontrados) {
			if (registro.nombre === nombreC && registro.id !== parseInt(id)) {
				regExistente = true;
				return { status: false, msg: "Nombre existente" };
			}
		}

	}else{
		var nombreUpdate = {nombre: nombreC};
	
		var datosUpdate = {
			updatedAt: moment().tz('America/Mexico_City'),
			nombre: nombre.toUpperCase(),
			apellido_paterno:apellido_paterno.toUpperCase(),
			apellido_materno: apellido_materno.toUpperCase(),
		}
		var whereFind = {
			where: {
				email: registroAEditar.email,
				
			}
		}
		const registro = await db.sequelize.models.contactos.findAll(whereFind);
		if(registro.length > 0){
			await registroAEditar.update(nombreUpdate, { where: { id: id } });
			await registro[0].update(datosUpdate, { where: { id: registro[0].id }});
			return {status: true, msg: "Nombre editado correctamente"};
		}else{
			return { status: false, msg: "Contacto no existe"};
		}
	}
}

module.exports = {
	index,
	store,
	show,
	update,
	sendMail
}
