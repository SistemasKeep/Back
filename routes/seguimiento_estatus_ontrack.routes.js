'use strict'

let express = require('express');
let seguimientoEstatusOnTrack = require('../controllers/seguimiento_estatus_ontrack.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/seguimientoEstatusOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SEGUIMIENTO_ESTATUS_ONTRACK', 'C'), validarPermisos.validarPermiso, seguimientoEstatusOnTrack.store);
api.get('/seguimientoEstatusOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SEGUIMIENTO_ESTATUS_ONTRACK', 'L'), validarPermisos.validarPermiso, seguimientoEstatusOnTrack.index);
api.get('/seguimientoEstatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SEGUIMIENTO_ESTATUS_ONTRACK', 'L'), validarPermisos.validarPermiso, seguimientoEstatusOnTrack.show);
api.delete('/seguimientoEstatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SEGUIMIENTO_ESTATUS_ONTRACK', 'E'), validarPermisos.validarPermiso, seguimientoEstatusOnTrack.destroy);
api.patch('/seguimientoEstatusOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SEGUIMIENTO_ESTATUS_ONTRACK', 'R'), validarPermisos.validarPermiso, seguimientoEstatusOnTrack.restaurar);

module.exports = api;