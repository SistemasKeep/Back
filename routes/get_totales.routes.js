'use strict'

let express = require('express');
let getTotales = require('../controllers/get_totales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')


api.post('/getTotales', token.validarToken, token.updateToken, getTotales.getTotales);

module.exports = api;