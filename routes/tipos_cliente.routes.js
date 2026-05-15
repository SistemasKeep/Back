'use strict'

let express = require('express');
let tiposCliente = require('../controllers/tipos_cliente.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tiposCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'C'), validarPermisos.validarPermiso, tiposCliente.store);
api.get('/tiposCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'L'), validarPermisos.validarPermiso, tiposCliente.index);
api.get('/exportacion/tiposCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'L'), validarPermisos.validarPermiso, tiposCliente.exportar);
api.get('/tiposCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'L'), validarPermisos.validarPermiso, tiposCliente.show);
api.put('/tiposCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'A'), validarPermisos.validarPermiso, tiposCliente.update);
api.delete('/tiposCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'E'), validarPermisos.validarPermiso, tiposCliente.destroy);
api.patch('/tiposCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CLIENTE', 'R'), validarPermisos.validarPermiso, tiposCliente.restaurar);

module.exports = api;