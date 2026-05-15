'use strict'

let express = require('express');
let clientesBeneficiarios = require('../controllers/clientes_beneficiarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.get('/clientesBeneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, clientesBeneficiarios.index);
api.get('/clientesBeneficiarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, clientesBeneficiarios.show);

module.exports = api;