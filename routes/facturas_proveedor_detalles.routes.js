'use strict'

let express = require('express');
let facturasProveedorDetalles = require('../controllers/facturas_proveedor_detalles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/facturasProveedorDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR_DETALLES', 'L'), validarPermisos.validarPermiso, facturasProveedorDetalles.index);
api.get('/facturasProveedorDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR_DETALLES', 'L'), validarPermisos.validarPermiso, facturasProveedorDetalles.show);
module.exports = api;

