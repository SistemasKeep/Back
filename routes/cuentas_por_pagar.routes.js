'use strict'

let express = require('express');
let cuentasPorPagar = require('../controllers/cuentas_por_pagar.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/cuentasPorPagar', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_PAGAR', 'L'), validarPermisos.validarPermiso, cuentasPorPagar.index);
api.get('/cuentasPorPagar/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_PAGAR', 'L'), validarPermisos.validarPermiso, cuentasPorPagar.show);
api.get('/exportacion/cuentasPorPagar', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_PAGAR', 'L'), validarPermisos.validarPermiso, cuentasPorPagar.exportar);
module.exports = api;