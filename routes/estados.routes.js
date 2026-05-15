'use strict'

let express = require('express');
let estados = require('../controllers/estados.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/estados', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'C'), validarPermisos.validarPermiso, estados.store);
api.get('/estados', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'L'), validarPermisos.validarPermiso, estados.index);
api.get('/estados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'L'), validarPermisos.validarPermiso, estados.show);
api.put('/estados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'A'), validarPermisos.validarPermiso, estados.update);
api.delete('/estados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'E'), validarPermisos.validarPermiso, estados.destroy);
api.patch('/estados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'R'), validarPermisos.validarPermiso, estados.restaurar);
api.get('/estados/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, estados.indexHistoricos);
api.get('/estados/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, estados.showHistoricos);
api.get('/exportacion/estados', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'L'), validarPermisos.validarPermiso, estados.exportacion);

api.get('/open/estados', estados.index);
module.exports = api;