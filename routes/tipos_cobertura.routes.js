'use strict'

let express = require('express');
let tiposCobertura = require('../controllers/tipos_cobertura.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/tiposCobertura', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'C'), validarPermisos.validarPermiso, tiposCobertura.store);
api.get('/tiposCobertura', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'L'), validarPermisos.validarPermiso, tiposCobertura.index);
api.get('/tiposCobertura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'L'), validarPermisos.validarPermiso, tiposCobertura.show);
api.put('/tiposCobertura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'A'), validarPermisos.validarPermiso, tiposCobertura.update);
api.delete('/tiposCobertura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'E'), validarPermisos.validarPermiso, tiposCobertura.destroy);
api.patch('/tiposCobertura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_COBERTURA', 'R'), validarPermisos.validarPermiso, tiposCobertura.restaurar);
api.get('/tiposCobertura/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposCobertura.indexHistoricos);
api.get('/tiposCobertura/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposCobertura.showHistoricos);

module.exports = api;