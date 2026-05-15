'use strict'

let express = require('express');
let modalidadesUbicaciones = require('../controllers/modalidades_ubicaciones.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/modalidadesUbicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'C'), validarPermisos.validarPermiso, modalidadesUbicaciones.store);
api.get('/modalidadesUbicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'L'), validarPermisos.validarPermiso, modalidadesUbicaciones.index);
api.get('/modalidadesUbicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'L'), validarPermisos.validarPermiso, modalidadesUbicaciones.show);
api.put('/modalidadesUbicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'A'), validarPermisos.validarPermiso, modalidadesUbicaciones.update);
api.delete('/modalidadesUbicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'E'), validarPermisos.validarPermiso, modalidadesUbicaciones.destroy);
api.patch('/modalidadesUbicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES_UBICACIONES', 'R'), validarPermisos.validarPermiso, modalidadesUbicaciones.restaurar);
api.get('/modalidadesUbicaciones/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, modalidadesUbicaciones.indexHistoricos);
api.get('/modalidadesUbicaciones/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, modalidadesUbicaciones.showHistoricos);


module.exports = api;