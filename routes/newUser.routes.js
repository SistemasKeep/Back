'use strict'

let express = require('express');
let newUser = require('../controllers/newUser.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/newUser', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'C'), validarPermisos.validarPermiso, newUser.store);
api.get('/newUser', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, newUser.index);
api.get('/newUser/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, newUser.show);
api.put('/newUser/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'A'), validarPermisos.validarPermiso, newUser.update);

module.exports = api;