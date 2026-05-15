'use strict'

let express = require('express');
let facturasProveedor = require('../controllers/facturas_proveedor.controller');
let facturaProveedorPDF = require('../controllers/facturas_proveedor_pdf.controller')
let facturaProveedorMail = require('../controllers/facturas_proveedor_mails.controllers')
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/facturasProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'C'), validarPermisos.validarPermiso, facturasProveedor.store);
api.get('/facturasProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, facturasProveedor.index);
api.get('/facturasProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, facturasProveedor.show);
api.put('/facturasProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'A'), validarPermisos.validarPermiso, facturasProveedor.update);
api.delete('/facturasProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'E'), validarPermisos.validarPermiso, facturasProveedor.destroy);
api.post('/cargarArchivoFacturasProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR_ARCHIVOS', 'C'), validarPermisos.validarPermiso, facturasProveedor.cargarArchivo);
api.delete('/eliminarArchivoFacturasProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR_ARCHIVOS', 'E'), validarPermisos.validarPermiso, facturasProveedor.eliminarArchivo);
api.get('/facturasProveedor/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, facturaProveedorPDF.showPDF);
api.post('/facturasProveedor/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, facturaProveedorMail.sendFacturaProveedor);
api.get('/exportacion/facturasProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, facturasProveedor.exportacion);

module.exports = api;

