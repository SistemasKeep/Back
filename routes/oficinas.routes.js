'use strict'

let express = require('express');
let oficinas = require('../controllers/oficinas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/oficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'C'), validarPermisos.validarPermiso, oficinas.store);
api.get('/oficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'L'), validarPermisos.validarPermiso, oficinas.index);
api.get('/oficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'L'), validarPermisos.validarPermiso, oficinas.show);
api.put('/oficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'A'), validarPermisos.validarPermiso, oficinas.update);
api.delete('/oficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'E'), validarPermisos.validarPermiso, oficinas.destroy);
api.patch('/oficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'R'), validarPermisos.validarPermiso, oficinas.restaurar);
api.get('/oficinas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinas.indexHistoricos);
api.get('/oficinas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinas.showHistoricos);
api.get('/exportacion/oficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS', 'L'), validarPermisos.validarPermiso, oficinas.exportacion);

module.exports = api;