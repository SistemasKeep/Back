'use strict'

let express = require('express');
let oficinasCliente = require('../controllers/oficinas_cliente.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/oficinasCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_CLIENTE', 'C'), validarPermisos.validarPermiso, oficinasCliente.store);
api.get('/oficinasCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_CLIENTE', 'L'), validarPermisos.validarPermiso, oficinasCliente.index);
api.get('/oficinasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_CLIENTE', 'L'), validarPermisos.validarPermiso, oficinasCliente.show);
api.delete('/oficinasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_CLIENTE', 'E'), validarPermisos.validarPermiso, oficinasCliente.destroy);
api.patch('/oficinasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_CLIENTE', 'R'), validarPermisos.validarPermiso, oficinasCliente.restaurar);
api.get('/oficinasCliente/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasCliente.indexHistoricos);
api.get('/oficinasCliente/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasCliente.showHistoricos);

module.exports = api;