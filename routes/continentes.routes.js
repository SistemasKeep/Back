'use strict'

let express = require('express');
let continentes = require('../controllers/continentes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/continentes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'C'), validarPermisos.validarPermiso, continentes.store);
api.get('/continentes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'L'), validarPermisos.validarPermiso, continentes.index);
api.get('/continentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'L'), validarPermisos.validarPermiso, continentes.show);
api.put('/continentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'A'), validarPermisos.validarPermiso, continentes.update);
api.delete('/continentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'E'), validarPermisos.validarPermiso, continentes.destroy);
api.patch('/continentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTINENTES', 'R'), validarPermisos.validarPermiso, continentes.restaurar);
api.get('/continentes/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, continentes.indexHistoricos);
api.get('/continentes/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, continentes.showHistoricos);

module.exports = api;