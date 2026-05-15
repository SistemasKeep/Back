'use strict'

let express = require('express');
let categoriasCliente = require('../controllers/categorias_cliente.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/categoriasClienteList', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'C'), validarPermisos.validarPermiso, categoriasCliente.storeList);
api.post('/categoriasCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'C'), validarPermisos.validarPermiso, categoriasCliente.store);
api.get('/categoriasCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'L'), validarPermisos.validarPermiso, categoriasCliente.index);
api.get('/categoriasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'L'), validarPermisos.validarPermiso, categoriasCliente.show);
api.put('/categoriasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'A'), validarPermisos.validarPermiso, categoriasCliente.update);
api.delete('/categoriasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'E'), validarPermisos.validarPermiso, categoriasCliente.destroy);
api.patch('/categoriasCliente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'R'), validarPermisos.validarPermiso, categoriasCliente.restaurar);
api.get('/exportacion/categoriasCliente', token.validarToken, token.updateToken, validarPermisos.addPermiso('CATEGORIAS_CLIENTE', 'L'), validarPermisos.validarPermiso, categoriasCliente.exportacion);

module.exports = api;