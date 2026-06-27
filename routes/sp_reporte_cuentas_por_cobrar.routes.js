'use strict'

let express = require('express');
let reporteCxC = require('../controllers/sp_reporte_cuentas_por_cobrar.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/reporteCxC', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, reporteCxC.index);

module.exports = api;