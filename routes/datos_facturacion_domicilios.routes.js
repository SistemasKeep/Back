'use strict'

let express = require('express');
let datosFacturacionDomicilios = require('../controllers/datos_facturacion_domicilios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/datosFacturacionDomicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'C'), validarPermisos.validarPermiso, datosFacturacionDomicilios.store);
api.get('/datosFacturacionDomicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'L'), validarPermisos.validarPermiso, datosFacturacionDomicilios.index);
api.get('/datosFacturacionDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'L'), validarPermisos.validarPermiso, datosFacturacionDomicilios.show);
api.put('/datosFacturacionDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'A'), validarPermisos.validarPermiso, datosFacturacionDomicilios.update);
api.delete('/datosFacturacionDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'E'), validarPermisos.validarPermiso, datosFacturacionDomicilios.destroy);
api.patch('/datosFacturacionDomicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DATOS_FACTURACION_DOMICILIOS', 'R'), validarPermisos.validarPermiso, datosFacturacionDomicilios.restaurar);

module.exports = api;