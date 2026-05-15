'use strict'

let express = require('express');
let clientesRazonesSociales = require('../controllers/clientes_razones_sociales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/clientesRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, clientesRazonesSociales.index);
api.get('/clientesRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, clientesRazonesSociales.show);

module.exports = api;