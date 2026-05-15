'use strict'

let express = require('express');
let ubicaciones = require('../controllers/ubicaciones.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/ubicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'C'), validarPermisos.validarPermiso, ubicaciones.store);
api.get('/ubicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'L'), validarPermisos.validarPermiso, ubicaciones.index);
api.get('/exportacion/ubicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'L'), validarPermisos.validarPermiso, ubicaciones.exportar);
api.get('/ubicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'L'), validarPermisos.validarPermiso, ubicaciones.show);
api.put('/ubicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'A'), validarPermisos.validarPermiso, ubicaciones.update);
api.delete('/ubicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'E'), validarPermisos.validarPermiso, ubicaciones.destroy);
api.patch('/ubicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES', 'R'), validarPermisos.validarPermiso, ubicaciones.restaurar);

module.exports = api;