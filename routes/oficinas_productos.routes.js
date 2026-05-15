'use strict'

let express = require('express');
let oficinasProductos = require('../controllers/oficinas_productos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/oficinasProductos', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'C'), validarPermisos.validarPermiso, oficinasProductos.store);
api.get('/oficinasProductos', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'L'), validarPermisos.validarPermiso, oficinasProductos.index);
api.get('/oficinasProductos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'L'), validarPermisos.validarPermiso, oficinasProductos.show);
api.put('/oficinasProductos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'A'), validarPermisos.validarPermiso, oficinasProductos.update);
api.delete('/oficinasProductos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'E'), validarPermisos.validarPermiso, oficinasProductos.destroy);
api.patch('/oficinasProductos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_PRODUCTOS', 'R'), validarPermisos.validarPermiso, oficinasProductos.restaurar);
api.get('/oficinasProductos/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasProductos.indexHistoricos);
api.get('/oficinasProductos/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasProductos.showHistoricos);

module.exports = api;