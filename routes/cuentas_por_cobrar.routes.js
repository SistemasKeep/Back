'use strict'

let express = require('express');
let cuentasPorCobrar = require('../controllers/cuentas_por_cobrar.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');
api.get('/exportacion/cuentasPorCobrar', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.exportar);
api.get('/cuentasPorCobrar', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.index);
api.get('/cuentasPorCobrar/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.show);
api.get('/exportacion/cuentasPorCobrar', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.exportar);
api.put('/cuentasPorCobrar/saldar/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'A'), validarPermisos.validarPermiso, cuentasPorCobrar.saldoCero);

api.get('/exportacion/antiguedadSaldosCxC', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.antiguedadSaldosCxC);
module.exports = api;