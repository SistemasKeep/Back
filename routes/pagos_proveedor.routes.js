'use strict'

let express = require('express');
let pagosProveedor = require('../controllers/pagos_proveedor.controller');
let pagosProveedorPDF = require('../controllers/pagos_proveedor_pdf.controller')
let pagosProveedorMail = require('../controllers/pagos_proveedor_mails.controllers')
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/pagosProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'C'), validarPermisos.validarPermiso, pagosProveedor.store);
api.get('/pagosProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosProveedor.index);
//api.get('/pagosProveedor/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosPDF.showPDF);
api.get('/pagosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosProveedor.show);
api.delete('/pagosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'E'), validarPermisos.validarPermiso, pagosProveedor.destroy);
//api.post('/pagosProveedor/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosMail.sendPago);
api.post('/cargarArchivoPagosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR_ARCHIVOS', 'C'), validarPermisos.validarPermiso, pagosProveedor.cargarArchivo);
api.delete('/cargarArchivoPagosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR_ARCHIVOS', 'E'), validarPermisos.validarPermiso, pagosProveedor.eliminarArchivo);
api.get('/pagosProveedor/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosProveedorPDF.showPDF);
api.post('/pagosProveedor/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosProveedorMail.sendPagoProveedor);
api.get('/exportacion/pagosProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, pagosProveedor.exportar);
module.exports = api;