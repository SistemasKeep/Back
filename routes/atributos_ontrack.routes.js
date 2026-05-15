'use strict'

let express = require('express');
let atributosOnTrack = require('../controllers/atributos_ontrack.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/atributosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'C'), validarPermisos.validarPermiso, atributosOnTrack.store);
api.get('/atributosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'L'), validarPermisos.validarPermiso, atributosOnTrack.index);
api.get('/atributosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'L'), validarPermisos.validarPermiso, atributosOnTrack.show);
api.put('/atributosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'A'), validarPermisos.validarPermiso, atributosOnTrack.update);
api.delete('/atributosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'E'), validarPermisos.validarPermiso, atributosOnTrack.destroy);
api.patch('/atributosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_ONTRACK', 'R'), validarPermisos.validarPermiso, atributosOnTrack.restaurar);

module.exports = api;