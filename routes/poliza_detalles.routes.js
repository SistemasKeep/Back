'use strict'

let express = require('express');
let polizaDetalles = require('../controllers/poliza_detalles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizaDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'C'), validarPermisos.validarPermiso, polizaDetalles.store);
api.get('/polizaDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'L'), validarPermisos.validarPermiso, polizaDetalles.index);
api.get('/polizaDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'L'), validarPermisos.validarPermiso, polizaDetalles.show);
api.put('/polizaDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'A'), validarPermisos.validarPermiso, polizaDetalles.update);
api.delete('/polizaDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'E'), validarPermisos.validarPermiso, polizaDetalles.destroy);
api.patch('/polizaDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_DETALLES', 'R'), validarPermisos.validarPermiso, polizaDetalles.restaurar);
api.get('/polizaDetalles/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizaDetalles.indexHistoricos);
api.get('/polizaDetalles/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizaDetalles.showHistoricos);

module.exports = api;