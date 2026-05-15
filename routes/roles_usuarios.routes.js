'use strict'

let express = require('express');
let rolesUsuarios = require('../controllers/roles_usuarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/rolesUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'C'), validarPermisos.validarPermiso, rolesUsuarios.store);
api.get('/rolesUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'L'), validarPermisos.validarPermiso, rolesUsuarios.index);
api.get('/rolesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'L'), validarPermisos.validarPermiso, rolesUsuarios.show);
api.put('/rolesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'A'), validarPermisos.validarPermiso, rolesUsuarios.update);
api.delete('/rolesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'E'), validarPermisos.validarPermiso, rolesUsuarios.destroy);
api.patch('/rolesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES_USUARIOS', 'R'), validarPermisos.validarPermiso, rolesUsuarios.restaurar);

module.exports = api;