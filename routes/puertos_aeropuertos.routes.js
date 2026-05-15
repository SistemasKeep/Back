'use strict'

let express = require('express');
let puertosAeropuertos = require('../controllers/puertos_aeropuertos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/puertosAeropuertos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'C'), validarPermisos.validarPermiso, puertosAeropuertos.store);
api.get('/puertosAeropuertos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'L'), validarPermisos.validarPermiso, puertosAeropuertos.index);
api.get('/puertosAeropuertos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'L'), validarPermisos.validarPermiso, puertosAeropuertos.show);
api.put('/puertosAeropuertos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'A'), validarPermisos.validarPermiso, puertosAeropuertos.update);
api.delete('/puertosAeropuertos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'E'), validarPermisos.validarPermiso, puertosAeropuertos.destroy);
api.patch('/puertosAeropuertos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PUERTOS_AEROPUERTOS', 'R'), validarPermisos.validarPermiso, puertosAeropuertos.restaurar);
api.get('/puertosAeropuertos/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, puertosAeropuertos.indexHistoricos);
api.get('/puertosAeropuertos/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, puertosAeropuertos.showHistoricos);

module.exports = api;