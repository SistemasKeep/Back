'use strict'

let express = require('express');
let buques = require('../controllers/buques.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/buques', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'C'), validarPermisos.validarPermiso, buques.store);
api.get('/buques', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'L'), validarPermisos.validarPermiso, buques.index);
api.get('/buques/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'L'), validarPermisos.validarPermiso, buques.show);
api.put('/buques/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'A'), validarPermisos.validarPermiso, buques.update);
api.delete('/buques/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'E'), validarPermisos.validarPermiso, buques.destroy);
api.patch('/buques/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'R'), validarPermisos.validarPermiso, buques.restaurar);
api.get('/buques/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, buques.indexHistoricos);
api.get('/buques/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, buques.showHistoricos);
api.get('/exportacion/buques', token.validarToken, token.updateToken, validarPermisos.addPermiso('BUQUES', 'L'), validarPermisos.validarPermiso, buques.exportacion);
module.exports = api;