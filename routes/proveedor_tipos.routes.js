'use strict'

let express = require('express');
let proveedorTipos = require('../controllers/proveedor_tipos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/proveedorTipos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'C'), validarPermisos.validarPermiso, proveedorTipos.store);
api.get('/proveedorTipos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'L'), validarPermisos.validarPermiso, proveedorTipos.index);
api.get('/exportacion/proveedorTipos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'L'), validarPermisos.validarPermiso, proveedorTipos.exportar);
api.get('/proveedorTipos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'L'), validarPermisos.validarPermiso, proveedorTipos.show);
api.put('/proveedorTipos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'A'), validarPermisos.validarPermiso, proveedorTipos.update);
api.delete('/proveedorTipos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'E'), validarPermisos.validarPermiso, proveedorTipos.destroy);
api.patch('/proveedorTipos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDOR_TIPOS', 'R'), validarPermisos.validarPermiso, proveedorTipos.restaurar);

module.exports = api;