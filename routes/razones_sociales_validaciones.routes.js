'use strict'

let express = require('express');
let razonesSocialesValidaciones = require('../controllers/razones_sociales_validaciones.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/razonesSocialesValidaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'C'), validarPermisos.validarPermiso, razonesSocialesValidaciones.store);
api.post('/razonesSocialesValidaciones/rechazar', token.validarToken, token.updateToken, razonesSocialesValidaciones.rechazarRazonSocial);
api.post('/razonesSocialesValidaciones/solicitarAlta', token.validarToken, token.updateToken, razonesSocialesValidaciones.solicitarAltaRazonSocial);
api.get('/razonesSocialesValidaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'L'), validarPermisos.validarPermiso, razonesSocialesValidaciones.index);
api.get('/razonesSocialesValidaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'L'), validarPermisos.validarPermiso, razonesSocialesValidaciones.show);
api.put('/razonesSocialesValidaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'A'), validarPermisos.validarPermiso, razonesSocialesValidaciones.update);
api.delete('/razonesSocialesValidaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'E'), validarPermisos.validarPermiso, razonesSocialesValidaciones.destroy);
api.patch('/razonesSocialesValidaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_VALIDACIONES', 'R'), validarPermisos.validarPermiso, razonesSocialesValidaciones.restaurar);

module.exports = api;