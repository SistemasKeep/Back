'use strict'

let express = require('express');
let razonesSocialesArchivos = require('../controllers/razones_sociales_archivos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/razonesSocialesArchivos', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'C'), validarPermisos.validarPermiso, razonesSocialesArchivos.store);
api.get('/razonesSocialesArchivos', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'L'), validarPermisos.validarPermiso, razonesSocialesArchivos.index);
api.get('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'L'), validarPermisos.validarPermiso, razonesSocialesArchivos.show);
api.put('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'A'), validarPermisos.validarPermiso, razonesSocialesArchivos.update);
api.delete('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'E'), validarPermisos.validarPermiso, razonesSocialesArchivos.destroy);
api.patch('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_ARCHIVOS', 'R'), validarPermisos.validarPermiso, razonesSocialesArchivos.restaurar);

module.exports = api;