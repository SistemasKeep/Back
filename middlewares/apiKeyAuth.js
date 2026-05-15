'use strict'

const {db} = require('../models');
const moment = require('moment-timezone');

exports.validarXApiKey = async function(req, res, next){
    const headers = req.headers;
    const apiKey = headers['x-api-key'];
    let idCliente = null;
    let fechaVencimiento = null;

    if(apiKey == undefined){
        return res.status(400).send({ sucess: false, msg: "Se requiere la clave API para acceder a este recurso", details: `Asegúrate de incluir el encabezado 'x-api-key' con tu clave de API válida`});
    }

    //busca al cliente en base al apiKey, si no encuentra coincidencia con clientes se hace la busqueda en la tabla de usuarios_api_key
    const clienteApiKey = await db.sequelize.models.clientes_api_key.findOne({
        where: {
            [db.Sequelize.Op.and]: {
                key: apiKey,
                deletedAt: null
            }
        }
    });

    if(clienteApiKey != null){
        req.body.draftCertificado = !clienteApiKey.testeo
        idCliente = clienteApiKey.id_cliente;
        if(req.usuario.id_cliente !== idCliente){
            return res.status(400).send({ sucess: false, msg: "Para poder acceder, necesitas tener registrado un cliente en nuestra plataforma"});
        }
        fechaVencimiento = moment(clienteApiKey.fecha_vencimiento).tz('America/Mexico_City');
        if(req.path === "/getClientes"){
            return res.status(400).send({status:false , msg:'ENDPOINT NO EXISTENTE'});
        }
    }else{
        if(req.usuario.es_mediador_mercantil !== true){
            return res.status(400).send({ sucess: false, msg: "Se requiere la clave API para acceder a este recurso", details: `Asegúrate de incluir el encabezado 'x-api-key' con tu clave de API válida`});
        }
        const usuarioApiKey = await db.sequelize.models.usuarios_api_key.findOne({
            where: {
                [db.Sequelize.Op.and]: {
                    key: apiKey,
                    deletedAt: null
                }
            }
        });
        if(usuarioApiKey == null){
            return res.status(400).send({ sucess: false, msg: "X-API-Key proporcionada no está asignada a ningún cliente o usuario."});
        }
        req.body.draftCertificado = !usuarioApiKey.testeo

        //busca al cliente asignado al usuario en cuestión
        const usuario = await db.sequelize.models.usuarios.findOne({
            where: {
                [db.Sequelize.Op.and]: {
                    id: usuarioApiKey.id_usuario,
                    deletedAt: null
                }
            }
        });
        if(usuario == null){
            return res.status(400).send({ sucess: false, msg: "Usuario inexistente o eliminado"});
        }

        if(req.path === "/clientes"){
            req.body.keepro = 3;
            req.query.keepro = 3;
            return next();
        }

        //lee encabezado de x-id-cliente y se asigna ese id_cliente al request.usuario
        const xIdCliente = headers['x-id-cliente'];
        if(xIdCliente == null){
            return res.status(400).send({ sucess: false, msg: "Se requiere el id del cliente", details: `Asegúrate de incluir el encabezado 'x-id-cliente' junto con tu clave de API válida`});
        }
        
        idCliente = xIdCliente;
        fechaVencimiento = moment(usuarioApiKey.fecha_vencimiento).tz('America/Mexico_City');
    }

    const cliente = await db.sequelize.models.clientes.findOne({
        where: {
            [db.Sequelize.Op.and]: {
                id: idCliente,
                deletedAt: null
            }
        }
    });
    if(cliente == null){
        return res.status(400).send({ sucess: false, msg: "Para poder acceder, necesitas tener registrado un cliente en nuestra plataforma"});
    }

    //verifica que el cliente no esté bloqueado
    const clienteBloqueado = await db.sequelize.models.cliente_detalles.findOne({
        where: {
            [db.Sequelize.Op.and]: {
                id: cliente.id_detalle_cliente,
                deletedAt: null
            }
        }
    });
    if(clienteBloqueado == null){
        return res.status(400).send({ sucess: false, msg: "El cliente no cuenta con detalles, favor de comuniquese con su agente operativo"});
    }
    if(clienteBloqueado.bloqueado == true){
        return res.status(400).send({ sucess: false, msg: "Cliente se encuentra bloqueado, favor de comunicarse con su agente operativo."});
    }
    
    //verifica la fecha de vencimiento de la api key
    const fechaActual = moment().tz('America/Mexico_City');
    if(fechaActual > fechaVencimiento){
        return res.status(400).send({ sucess: false, msg: "X-API-Key proporcionada esta vencida."});
    }

    //se identificia como API
    req.query.keepro = 3;

    //se setea el cliente
    req.body.idCliente = cliente.id;
    req.query.idCliente = cliente.id;
    req.usuario.id_cliente = cliente.id;
    next();
}