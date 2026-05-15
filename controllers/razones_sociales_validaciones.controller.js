'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { MailController } = require('./email.controller');
const path = require('path');
const { where } = require('sequelize');
const fs = require('fs').promises;


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.razones_sociales_validaciones.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['razon_social', 'marca', 'usuario', 'all'];
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente','marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente'
                ],
				razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                usuario: [ 'usuario' ],
				all: [
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente','marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',

                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',

                    'usuario'
                ]
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [
                    'razon_social',
                    'razon_social.pais',
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',

                    'marca',
                    'marca.domicilio',
                    'marca.domicilio.estado',
                    'marca.domicilio.estado.pais',
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',

                    'usuario'
                ];
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}

		const docs = await db.sequelize.models.razones_sociales_validaciones.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		
        const dataDocs = await db.sequelize.models.razones_sociales_validaciones.count({
		    paranoid: false,
		    include: relaciones,
		    where: filtro
		});
        
		const totalCount = dataDocs;
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/razonesSocialesValidaciones`;
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
		};
        parametros.validado = false
        parametros.prevalidado = false
		let obligatorios = [
            {campo:'idRazonSocial', tipo:'model', model:db.sequelize.models.razones_sociales},
            {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
			{campo:'validado', tipo:'boolean'},
            {campo:'prevalidado', tipo:'boolean'}
        ];
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

        const validosOpcionales = [{campo:'idUsuarioSolicita', tipo:'model', model:db.sequelize.models.usuarios}];
        const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
        if(dataValidarOpcionales == undefined){
        return undefined;
        }
        registro = dataValidarOpcionales[0]

		const registrosEncontrados = await db.sequelize.models.razones_sociales_validaciones.findAll({
			where: {
                id_razon_social: parametros.idRazonSocial,
				id_marca: parametros.idMarca,
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false;
			await registrosEncontrados.forEach(registro => {
				if(registro.id_razon_social == parametros.idRazonSocial && registro.id_marca == parametros.idMarca){
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
		registro.id_usuario_registro = req.usuario.id;

        //si se crea con alguna validación como true, se le pone la fecha del momento en el que se esté creando el registro
        if(registro.validado == true){
            registro.fecha_validado = moment().tz('America/Mexico_City');
        }else{
            registro.fecha_validado = null;
        }

        if(registro.prevalidado == true){
            registro.fecha_prevalidado = moment().tz('America/Mexico_City');
        }else{
            registro.fecha_prevalidado = null;
        }
        
        registro.fecha_solicitud = moment().tz('America/Mexico_City');

		const nuevoRegistro = await db.sequelize.models.razones_sociales_validaciones.create(registro);
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
		const perfilesValidos = ['razon_social', 'marca', 'usuario', 'all'];
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				marca: [ 
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente','marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente'
                ],
				razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                usuario: [ 'usuario' ],
				all: [
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais.continente','marca.archivo',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',

                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',

                    'usuario'
                ]
            }
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}else{
			try {
				const relacionesValidas = [
                    'razon_social',
                    'razon_social.pais',
                    'razon_social.pais.continente',
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito',

                    'marca',
                    'marca.domicilio',
                    'marca.domicilio.estado',
                    'marca.domicilio.estado.pais',
                    'marca.domicilio.estado.pais.continente',
                    'marca.pais',
                    'marca.pais.continente',
                    'marca.archivo',
                    'marca.dato_facturacion',
                    'marca.dato_facturacion.regimen_fiscal',
                    'marca.dato_facturacion.pais',
                    'marca.dato_facturacion.pais.continente',
                    'marca.dato_facturacion.nacionalidad_timbrado',
                    'marca.dato_facturacion.nacionalidad_timbrado.continente',
                ];
				const findRelaciones = new Relaciones(relacionesValidas,req.query.with.split(","),db.sequelize.models)
				relaciones = await findRelaciones.getRelaciones()
			} catch (error) {
				relaciones = []
			}
		}

		const registroEncontrado = await db.sequelize.models.razones_sociales_validaciones.findByPk(id, {include:relaciones,paranoid: false});
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
            {campo:'validado', tipo:'boolean'},
            {campo:'prevalidado', tipo:'boolean'}
        ];
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res);
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0];
		seEdita = dataValidarOpcionales[1];
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.razones_sociales_validaciones.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}

        //Selección de las fechas de validación
        let fecha_prevalidado;
        let fecha_validado;
        if(datosUpdate.validado == true && registroAEditar.validado == false){
            fecha_validado = moment().tz('America/Mexico_City');
        }
        else if(datosUpdate.validado == false || datosUpdate.validado == null){
            fecha_validado = null;
        }
        else{
            fecha_validado = registroAEditar.fecha_validado;
        }

        if(datosUpdate.prevalidado == true && registroAEditar.prevalidado == false){
            fecha_prevalidado = moment().tz('America/Mexico_City');
        }
        else if(datosUpdate.prevalidado == false || datosUpdate.prevalidado == null){
            fecha_prevalidado = null;
        }
        else{
            fecha_prevalidado = registroAEditar.fecha_prevalidado;
        }

        datosUpdate.fecha_validado = fecha_validado;
        datosUpdate.fecha_prevalidado = fecha_prevalidado;
        datosUpdate.fecha_solicitud = moment().tz('America/Mexico_City');

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
		const registroAEliminar = await db.sequelize.models.razones_sociales_validaciones.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.razones_sociales_validaciones.name){
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
		const registroARestaurar = await db.sequelize.models.razones_sociales_validaciones.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.razones_sociales_validaciones.findAll({
					where: {
                        id_razon_social: registroARestaurar.id_razon_social,
						id_marca: registroARestaurar.id_marca,
						deletedAt: null
                    }
				});

				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if(registro.id_razon_social == registroARestaurar.id_razon_social && registro.id_marca == registroARestaurar.id_marca && registro.id != id){
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

async function rechazarRazonSocial(req,res){
    const parametros = req.body;

    //se obtiene el cliente
    const idCliente = await db.sequelize.models.clientes_razones_sociales.findOne({
        where: {
            id_razon_social: parametros.idRazonSocial,
            deletedAt: null
        }
    });
    if(idCliente == null){
        return res.status(500).send({ status: false, msg: "No se encontró un cliente para esa razón social"});
    }
    const cliente = await db.sequelize.models.clientes.findOne({
        where: {
            id: idCliente.id_cliente,
            deletedAt: null
        }
    });

    //obtiene la razón social
    const razonSocial = await db.sequelize.models.razones_sociales.findOne({
        where: {
            id: parametros.idRazonSocial,
            deletedAt: null
        }
    });
    if(razonSocial == null){
        return res.status(500).send({ status: false, msg: "No se encontró una razón socual para ese cliente"});
    }

    //obtiene los agentes del cliente
    const agentes = await db.sequelize.models.marca_agentes_clientes.findOne({
        where: {
            id_cliente: cliente.id,
            id_marca: parametros.idMarca,
            deletedAt: null
        }
    });
    if(agentes == null){
        return res.status(500).send({ status: false, msg: "No se encontraron agentes registrados para ese cliente con esa marca"});
    }

    //obtiene los correos de los agentes de ventas del cliente
    let correoAgente;
    let destinatarios = [];

    if(agentes.id_agente_venta_1 != null){
        correoAgente = await db.sequelize.models.usuarios.findOne({
            where: {
                id: agentes.id_agente_venta_1,
                deletedAt: null
            }
        });

        if(correoAgente != null){
            destinatarios.push(correoAgente.email);
        }
    }

    if(agentes.id_agente_venta_2 != null){
        correoAgente = await db.sequelize.models.usuarios.findOne({
            where: {
                id: agentes.id_agente_venta_2,
                deletedAt: null
            }
        });

        if(correoAgente != null){
            destinatarios.push(correoAgente.email);
        }
    }

    if(destinatarios == []){
        return res.status(500).send({ status: false, msg: "No se encontraron direcciones de correo de los agentes de venta"});
    }

    //obtiene el correo del usuario que solicita la validacion
    const usuarioSolicita = await db.sequelize.models.usuarios.findOne({
        where: {
            id: parametros.idUsuarioSolicita,
            deletedAt: null
        }
    });

    destinatarios.push(usuarioSolicita.email);

    //agrega a los usuarios con rol de supervisor de cxc
    const rolesUsuarios = await db.sequelize.models.roles_usuarios.findAll({
        where: {
            id_role: 24,
            deletedAt: null
        },
        include: ['usuario']
    });

    if(rolesUsuarios != null){
        for (let i = 0; i < rolesUsuarios.length; i++) {
            const rolUsr = rolesUsuarios[i];
            if(rolUsr.usuario == null) continue;
            destinatarios.push(rolUsr.usuario.email);
        }
    }

    //agrega el correo de la persona que RECHAZA la razón social
    destinatarios.push(req.usuario.email);

    //guarda el comentario de rechazo de la razón social
    const rsValidacion = await db.sequelize.models.razones_sociales_validaciones.findOne({
        where:{
            id_razon_social: parametros.idRazonSocial,
            id_marca: parametros.idMarca,
            deletedAt: null
        }
    });
    rsValidacion.comentarios = parametros.comentarios != null ? parametros.comentarios : '';
    rsValidacion.updatedAt = moment().tz('America/Mexico_City');
    await rsValidacion.save();

    //genera el cuerpo del correo
    let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `rechazoValidacionRazonSocial.html`);
    var htmlContent = await fs.readFile(rutaArchivoHTML, 'utf8');
    const data = [
        {nombre:'nombreCliente', contenido: cliente.nombre},
        {nombre:'razonSocial', contenido: razonSocial.razon_social},
        {nombre:'comentarios', contenido: parametros.comentarios},
        {nombre:'usuarioSolicita', contenido: usuarioSolicita.nombre}
    ];
    for (let i = 0; i < data.length; i++) {
		const campo = data[i];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}

    //Envía el correo
    try {
        let mailOptions = {
            to: destinatarios,
            subject: 'Keepro | Alta de Cliente Rechazada',
            html: htmlContent,
        };
        const mainSender = new MailController(null, null, mailOptions, null);
        await mainSender.sendMail();
    } catch (error) {
        return res.status(500).send({ status: false, msg: "Hubo un error enviando los correos", error: error});
    }
    return res.status(200).send({ status: true, msg: "Razón Social rechazada correctamente. El correo se ha enviado a los agentes de ventas"});
}

async function solicitarAltaRazonSocial(req,res){
    const parametros = req.body;
    let destinatarios = [];

    //se obtiene el cliente
    const idCliente = await db.sequelize.models.clientes_razones_sociales.findOne({
        where: {
            id_razon_social: parametros.idRazonSocial,
            deletedAt: null
        }
    });
    if(idCliente == null){
        return res.status(500).send({ status: false, msg: "No se encontró un cliente para esa razón social"});
    }
    const cliente = await db.sequelize.models.clientes.findOne({
        where: {
            id: idCliente.id_cliente,
            deletedAt: null
        }
    });

    //obtiene la razón social
    const razonSocial = await db.sequelize.models.razones_sociales.findOne({
        where: {
            id: parametros.idRazonSocial,
            deletedAt: null
        }
    });
    if(razonSocial == null){
        return res.status(500).send({ status: false, msg: "No se encontró la razón social para el cliente"});
    }

    //obtiene agente operativo y agentes de venta del cliente
    const agentes = await db.sequelize.models.marca_agentes_clientes.findOne({
        where: {
            id_cliente: cliente.id,
            id_marca: parametros.idMarca,
            deletedAt: null
        },
        include: ['agente_operativo', 'agente_venta_1', 'agente_venta_2']
    });
    const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca);
    if(marca == null){
        return res.status(500).send({ status: false, msg: "No se encontró la marca seleccionada."});
    }

    if(agentes != null){
        if(agentes.agente_operativo != null){
            destinatarios.push(agentes.agente_operativo.email);
        }

        if(agentes.agente_venta_1 != null){
            destinatarios.push(agentes.agente_venta_1.email);
        }

        if(agentes.agente_venta_2 != null){
            destinatarios.push(agentes.agente_venta_2.email);
        }
    }

    //obtiene agente de cobranza del cliente
    const clienteDetalle = await db.sequelize.models.cliente_detalles.findByPk(cliente.id_detalle_cliente, {include: ['agente_credito_cobranza'], paranoid: false});
    if(clienteDetalle != null){
        if(clienteDetalle.agente_credito_cobranza){
            destinatarios.push(clienteDetalle.agente_credito_cobranza.email);
        }
    }

    //agrega a los usuarios con rol de supervisor de cxc
    const rolesUsuarios = await db.sequelize.models.roles_usuarios.findAll({
        where: {
            id_role: 24,
            deletedAt: null
        },
        include: ['usuario']
    });

    if(rolesUsuarios != null){
        for (let i = 0; i < rolesUsuarios.length; i++) {
            const rolUsr = rolesUsuarios[i];
            if(rolUsr.usuario == null) continue;
            destinatarios.push(rolUsr.usuario.email);
        }
    }

    //obtiene el correo del usuario que solicita la validacion
    const usuarioSolicita = await db.sequelize.models.usuarios.findOne({
        where: {
            id: parametros.idUsuarioSolicita,
            deletedAt: null
        }
    });
    
    if(usuarioSolicita != null){
        destinatarios.push(usuarioSolicita.email);
    }
    
    //genera el cuerpo del correo
    let rutaArchivoHTML = path.join(__dirname, '..', 'tpls/emails', `solicitudAltaRazonSocial.html`);
    var htmlContent = await fs.readFile(rutaArchivoHTML, 'utf8');
    const data = [
        {nombre:'usuarioSolicita', contenido: usuarioSolicita.nombre},
        {nombre:'marca', contenido: marca.nombre},
        {nombre:'codigoCliente', contenido: cliente.id},
        {nombre:'nombreCliente', contenido: cliente.nombre},
        {nombre:'razonSocial', contenido: razonSocial.razon_social}
    ];
    for (let i = 0; i < data.length; i++) {
		const campo = data[i];
		htmlContent = htmlContent.replace(new RegExp(`\\{\\{\\$${campo.nombre}\\}\\}`, 'g'), campo.contenido);
	}

    //Envía el correo
    try {
        let mailOptions = {
            to: destinatarios,
            subject: 'Keepro | Solicitud de Validación de Razón Social',
            html: htmlContent,
        };
        const mainSender = new MailController(null, null, mailOptions, null, null, true);
        await mainSender.sendMail();
    } catch (error) {
        return res.status(500).send({ status: false, msg: "Hubo un error enviando los correos", error: error});
    }
    return res.status(200).send({ status: true, msg: "Validación Solicitada correctamente. El correo se ha enviado a los agentes de ventas"});
}

module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
    rechazarRazonSocial,
	solicitarAltaRazonSocial
}
