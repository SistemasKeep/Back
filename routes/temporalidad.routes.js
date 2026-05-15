'use strict'

let express = require('express');
let temporalidad = require('../controllers/temporalidad.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/temporalidad', token.validarToken, token.updateToken, validarPermisos.addPermiso('TEMPORALIDAD', 'C'), validarPermisos.validarPermiso, temporalidad.store);
api.get('/temporalidad', token.validarToken, token.updateToken, validarPermisos.addPermiso('TEMPORALIDAD', 'L'), validarPermisos.validarPermiso, temporalidad.index);
api.get('/temporalidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TEMPORALIDAD', 'L'), validarPermisos.validarPermiso, temporalidad.show);
api.put('/temporalidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TEMPORALIDAD', 'A'), validarPermisos.validarPermiso, temporalidad.update);
api.delete('/temporalidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TEMPORALIDAD', 'E'), validarPermisos.validarPermiso, temporalidad.destroy);

module.exports = api;