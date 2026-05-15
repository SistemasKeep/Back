'use strict'

let express = require('express');
let tiposBienes = require('../controllers/tipos_bienes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tiposBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'C'), validarPermisos.validarPermiso, tiposBienes.store);
api.get('/tiposBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'L'), validarPermisos.validarPermiso, tiposBienes.index);
api.get('/tiposBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'L'), validarPermisos.validarPermiso, tiposBienes.show);
api.put('/tiposBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'A'), validarPermisos.validarPermiso, tiposBienes.update);
api.delete('/tiposBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'E'), validarPermisos.validarPermiso, tiposBienes.destroy);
api.patch('/tiposBienes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_BIENES', 'R'), validarPermisos.validarPermiso, tiposBienes.restaurar);
api.get('/tiposBienes/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposBienes.indexHistoricos);
api.get('/tiposBienes/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, tiposBienes.showHistoricos);

module.exports = api;