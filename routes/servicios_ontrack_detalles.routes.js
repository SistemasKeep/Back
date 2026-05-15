'use strict'

let express = require('express');
let serviciosOnTrackDetalles = require('../controllers/servicios_ontrack_detalles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/serviciosOnTrackDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'C'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.store);
api.get('/serviciosOnTrackDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'L'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.index);
api.get('/serviciosOnTrackDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'L'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.show);
api.put('/serviciosOnTrackDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'A'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.update);
api.delete('/serviciosOnTrackDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'E'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.destroy);
api.patch('/serviciosOnTrackDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK_DETALLES', 'R'), validarPermisos.validarPermiso, serviciosOnTrackDetalles.restaurar);

module.exports = api;