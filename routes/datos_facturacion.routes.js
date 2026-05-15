'use strict'

let express = require('express');
let datosFacturacion = require('../controllers/datos_facturacion.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/datosFacturacion', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'C'), validarPermisos.validarPermiso, datosFacturacion.store);
api.get('/datosFacturacion', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'L'), validarPermisos.validarPermiso, datosFacturacion.index);
api.get('/datosFacturacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'L'), validarPermisos.validarPermiso, datosFacturacion.show);
api.put('/datosFacturacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'A'), validarPermisos.validarPermiso, datosFacturacion.update);
api.delete('/datosFacturacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'E'), validarPermisos.validarPermiso, datosFacturacion.destroy);
api.patch('/datosFacturacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION', 'R'), validarPermisos.validarPermiso, datosFacturacion.restaurar);
module.exports = api;

