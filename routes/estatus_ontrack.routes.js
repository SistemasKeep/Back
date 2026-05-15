'use strict'

let express = require('express');
let estatusOnTrack = require('../controllers/estatus_ontrack.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/estatusOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'C'), validarPermisos.validarPermiso, estatusOnTrack.store);
api.get('/estatusOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'L'), validarPermisos.validarPermiso, estatusOnTrack.index);
api.get('/estatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'L'), validarPermisos.validarPermiso, estatusOnTrack.show);
api.put('/estatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'A'), validarPermisos.validarPermiso, estatusOnTrack.update);
api.delete('/estatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'E'), validarPermisos.validarPermiso, estatusOnTrack.destroy);
api.patch('/estatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTATUS_ONTRACK', 'R'), validarPermisos.validarPermiso, estatusOnTrack.restaurar);

module.exports = api;