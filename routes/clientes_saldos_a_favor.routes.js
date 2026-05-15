'use strict'

let express = require('express');
let clientesSaldosAFavor = require('../controllers/clientes_saldos_a_favor.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/clientesSaldosAFavor', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_SALDOS_A_FAVOR', 'L'), validarPermisos.validarPermiso, clientesSaldosAFavor.index);
api.get('/clientesSaldosAFavor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_SALDOS_A_FAVOR', 'L'), validarPermisos.validarPermiso, clientesSaldosAFavor.show);
api.delete('/clientesSaldosAFavor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_SALDOS_A_FAVOR', 'E'), validarPermisos.validarPermiso, clientesSaldosAFavor.destroy);

module.exports = api;