'use strict'

let express = require('express');
let tiposCambioFuturo = require('../controllers/tipos_cambio_futuro.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tiposCambioFuturo', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'C'), validarPermisos.validarPermiso, tiposCambioFuturo.store);
api.get('/tiposCambioFuturo', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'L'), validarPermisos.validarPermiso, tiposCambioFuturo.index);
api.get('/tiposCambioFuturo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'L'), validarPermisos.validarPermiso, tiposCambioFuturo.show);
api.put('/tiposCambioFuturo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'A'), validarPermisos.validarPermiso, tiposCambioFuturo.update);
api.delete('/tiposCambioFuturo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'E'), validarPermisos.validarPermiso, tiposCambioFuturo.destroy);
api.patch('/tiposCambioFuturo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'R'), validarPermisos.validarPermiso, tiposCambioFuturo.restaurar);

api.get('/tiposCambioFuturo/date/:dateFind', token.validarToken, token.updateToken, validarPermisos.addPermiso('TIPOS_CAMBIO_FUTURO', 'L'), validarPermisos.validarPermiso, tiposCambioFuturo.getTipoCambioByFecha);



module.exports = api;