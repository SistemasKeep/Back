'use strict'

let express = require('express');
let roles = require('../controllers/roles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/roles', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'C'), validarPermisos.validarPermiso, roles.store);
api.get('/roles', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'L'), validarPermisos.validarPermiso, roles.index);
api.get('/exportacion/roles', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'L'), validarPermisos.validarPermiso, roles.exportar);
api.get('/roles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'L'), validarPermisos.validarPermiso, roles.show);
api.put('/roles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'A'), validarPermisos.validarPermiso, roles.update);
api.delete('/roles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'E'), validarPermisos.validarPermiso, roles.destroy);
api.patch('/roles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ROLES', 'R'), validarPermisos.validarPermiso, roles.restaurar);

module.exports = api;