'use strict'

let express = require('express');
let validacionesOfac = require('../controllers/validaciones_ofac.controller');
let api =  express.Router();

api.get('/validarEntidadTesteo', validacionesOfac.validarEntidadTesteo);

module.exports = api;