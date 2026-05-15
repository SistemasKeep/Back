'use strict'

let express = require('express');
let motivosCancelacionFacturas = require('../controllers/motivos_cancelacion_facturas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/motivosCancelacionFacturas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'C'), validarPermisos.validarPermiso, motivosCancelacionFacturas.store);
api.get('/motivosCancelacionFacturas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'L'), validarPermisos.validarPermiso, motivosCancelacionFacturas.index);
api.get('/motivosCancelacionFacturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'L'), validarPermisos.validarPermiso, motivosCancelacionFacturas.show);
api.put('/motivosCancelacionFacturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'A'), validarPermisos.validarPermiso, motivosCancelacionFacturas.update);
api.delete('/motivosCancelacionFacturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'E'), validarPermisos.validarPermiso, motivosCancelacionFacturas.destroy);
api.patch('/motivosCancelacionFacturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MOTIVOS_CANCELACION_FACTURAS', 'R'), validarPermisos.validarPermiso, motivosCancelacionFacturas.restaurar);

module.exports = api;