'use strict'

let express = require('express');
let pedidosFactura = require('../controllers/pedidos_factura.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/pedidosFactura/:idCertificado', token.validarToken, token.updateToken, validarPermisos.addPermiso('PEDIDOS_FACTURA', 'C'), validarPermisos.validarPermiso, pedidosFactura.store);
api.get('/pedidosFactura', token.validarToken, token.updateToken, validarPermisos.addPermiso('PEDIDOS_FACTURA', 'L'), validarPermisos.validarPermiso, pedidosFactura.index);
api.get('/pedidosFactura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PEDIDOS_FACTURA', 'L'), validarPermisos.validarPermiso, pedidosFactura.show);
api.put('/pedidosFactura', token.validarToken, token.updateToken, validarPermisos.addPermiso('PEDIDOS_FACTURA', 'L'), validarPermisos.validarPermiso, pedidosFactura.uploadDatos);
api.get('/exportacion/pedidosFactura', token.validarToken, token.updateToken, validarPermisos.addPermiso('PEDIDOS_FACTURA', 'L'), validarPermisos.validarPermiso, pedidosFactura.exportacion);
module.exports = api;