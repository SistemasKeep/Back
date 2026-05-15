let express = require('express');
let reporteError = require('../controllers/errores_sistema.controllers');
let api =  express.Router();
let token = require('../middlewares/gentoken');


api.post('/reporteError', token.validarToken, token.updateToken, reporteError.sendMailReporteError);

module.exports = api;
