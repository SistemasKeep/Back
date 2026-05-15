'use strict'

let express = require('express');
let proveedoresMonedas = require('../controllers/proveedores_monedas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/proveedoresMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'C'), validarPermisos.validarPermiso, proveedoresMonedas.store);
api.get('/proveedoresMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'L'), validarPermisos.validarPermiso, proveedoresMonedas.index);
api.get('/proveedoresMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'L'), validarPermisos.validarPermiso, proveedoresMonedas.show);
api.put('/proveedoresMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'A'), validarPermisos.validarPermiso, proveedoresMonedas.update);
api.delete('/proveedoresMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'E'), validarPermisos.validarPermiso, proveedoresMonedas.destroy);
api.patch('/proveedoresMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_MONEDAS', 'R'), validarPermisos.validarPermiso, proveedoresMonedas.restaurar);
api.get('/proveedoresMonedas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, proveedoresMonedas.indexHistoricos);
api.get('/proveedoresMonedas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, proveedoresMonedas.showHistoricos);

module.exports = api;