'use strict'

let express = require('express');
let mantenimientoKeepro = require('../controllers/mantenimiento_keepro.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/mantenimientoKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'C'), validarPermisos.validarPermiso, mantenimientoKeepro.store);
api.get('/mantenimientoKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'L'), validarPermisos.validarPermiso, mantenimientoKeepro.index);
api.get('/mantenimientoKeepro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'L'), validarPermisos.validarPermiso, mantenimientoKeepro.show);
api.put('/mantenimientoKeepro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'A'), validarPermisos.validarPermiso, mantenimientoKeepro.update);
api.delete('/mantenimientoKeepro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'E'), validarPermisos.validarPermiso, mantenimientoKeepro.destroy);
api.patch('/mantenimientoKeepro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('mantenimiento_keepro', 'R'), validarPermisos.validarPermiso, mantenimientoKeepro.restaurar);

module.exports = api;