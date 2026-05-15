'use strict'

let express = require('express');
let tiposBuque = require('../controllers/tipos_buque.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tiposBuque', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'C'), validarPermisos.validarPermiso, tiposBuque.store);
api.get('/tiposBuque', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'L'), validarPermisos.validarPermiso, tiposBuque.index);
api.get('/tiposBuque/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'L'), validarPermisos.validarPermiso, tiposBuque.show);
api.put('/tiposBuque/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'A'), validarPermisos.validarPermiso, tiposBuque.update);
api.delete('/tiposBuque/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'E'), validarPermisos.validarPermiso, tiposBuque.destroy);
api.patch('/tiposBuque/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'R'), validarPermisos.validarPermiso, tiposBuque.restaurar);
api.get('/tiposBuque/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposBuque.indexHistoricos);
api.get('/tiposBuque/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposBuque.showHistoricos);
api.get('/exportacion/tiposBuque', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BUQUE', 'L'), validarPermisos.validarPermiso, tiposBuque.exportacion);

module.exports = api;