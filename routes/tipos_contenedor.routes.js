'use strict'

let express = require('express');
let tiposContenedor = require('../controllers/tipos_contenedor.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tiposContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'C'), validarPermisos.validarPermiso, tiposContenedor.store);
api.get('/tiposContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'L'), validarPermisos.validarPermiso, tiposContenedor.index);
api.get('/tiposContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'L'), validarPermisos.validarPermiso, tiposContenedor.show);
api.put('/tiposContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'A'), validarPermisos.validarPermiso, tiposContenedor.update);
api.delete('/tiposContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'E'), validarPermisos.validarPermiso, tiposContenedor.destroy);
api.patch('/tiposContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPO_CONTENEDOR', 'R'), validarPermisos.validarPermiso, tiposContenedor.restaurar);

module.exports = api;