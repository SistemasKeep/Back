'use strict'

let express = require('express');
let ubicacionesBienes = require('../controllers/ubicaciones_bienes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/ubicacionesBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'C'), validarPermisos.validarPermiso, ubicacionesBienes.store);
api.get('/ubicacionesBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'L'), validarPermisos.validarPermiso, ubicacionesBienes.index);
api.get('/ubicacionesBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'L'), validarPermisos.validarPermiso, ubicacionesBienes.show);
api.put('/ubicacionesBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'A'), validarPermisos.validarPermiso, ubicacionesBienes.update);
api.delete('/ubicacionesBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'E'), validarPermisos.validarPermiso, ubicacionesBienes.destroy);
api.patch('/ubicacionesBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UBICACIONES_BIENES', 'R'), validarPermisos.validarPermiso, ubicacionesBienes.restaurar);
api.get('/ubicacionesBienes/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), ubicacionesBienes.indexHistoricos);
api.get('/ubicacionesBienes/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), ubicacionesBienes.showHistoricos);

module.exports = api;