'use strict'

let express = require('express');
let razonesSocialesDomicilios = require('../controllers/razones_sociales_domicilios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/razonesSocialesDomicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'C'), validarPermisos.validarPermiso, razonesSocialesDomicilios.store);
api.get('/razonesSocialesDomicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'L'), validarPermisos.validarPermiso, razonesSocialesDomicilios.index);
api.get('/razonesSocialesDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'L'), validarPermisos.validarPermiso, razonesSocialesDomicilios.show);
api.put('/razonesSocialesDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'A'), validarPermisos.validarPermiso, razonesSocialesDomicilios.update);
api.delete('/razonesSocialesDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'E'), validarPermisos.validarPermiso, razonesSocialesDomicilios.destroy);
api.patch('/razonesSocialesDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOMICILIOS', 'R'), validarPermisos.validarPermiso, razonesSocialesDomicilios.restaurar);

module.exports = api;