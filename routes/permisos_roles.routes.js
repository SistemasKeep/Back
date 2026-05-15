'use strict'

let express = require('express');
let permisosRoles = require('../controllers/permisos_roles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/permisosRoles', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'C'), validarPermisos.validarPermiso, permisosRoles.store);
api.get('/permisosRoles', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'L'), validarPermisos.validarPermiso, permisosRoles.index);
api.get('/permisosRoles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'L'), validarPermisos.validarPermiso, permisosRoles.show);
api.put('/permisosRoles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'A'), validarPermisos.validarPermiso, permisosRoles.update);
api.delete('/permisosRoles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'E'), validarPermisos.validarPermiso, permisosRoles.destroy);
api.patch('/permisosRoles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS_ROLES', 'R'), validarPermisos.validarPermiso, permisosRoles.restaurar);

module.exports = api;