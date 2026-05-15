'use strict'

let express = require('express');
let ordenesCompra = require('../controllers/ordenes_compra.controller');
let ordenesCompraPDF = require('../controllers/ordenes_compra_pdf.controller')
let ordenesCompraMail = require('../controllers/ordenes_compra_mails.controllers')
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/ordenesCompra', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'C'), validarPermisos.validarPermiso, ordenesCompra.store);
api.get('/ordenesCompra', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'L'), validarPermisos.validarPermiso, ordenesCompra.index);
api.get('/ordenesCompra/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'L'), validarPermisos.validarPermiso, ordenesCompra.show);
api.put('/ordenesCompra/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'A'), validarPermisos.validarPermiso, ordenesCompra.update);
api.delete('/ordenesCompra/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'E'), validarPermisos.validarPermiso, ordenesCompra.destroy);
api.post('/cargarArchivoOrdenesCompra/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA_ARCHIVOS', 'C'), validarPermisos.validarPermiso, ordenesCompra.cargarArchivo);
api.delete('/eliminarArchivoOrdenesCompra/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA_ARCHIVOS', 'E'), validarPermisos.validarPermiso, ordenesCompra.eliminarArchivo);
api.get('/ordenesCompra/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'L'), validarPermisos.validarPermiso, ordenesCompraPDF.showPDF);
api.post('/ordenesCompra/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'L'), validarPermisos.validarPermiso, ordenesCompraMail.sendOrdenCompra);

api.get('/exportacion/ordenesCompra', token.validarToken, token.updateToken, validarPermisos.addPermiso('ORDENES_COMPRA', 'L'), validarPermisos.validarPermiso, ordenesCompra.exportacion);
api.post('/relacionarOcFactura', token.validarToken, token.updateToken, validarPermisos.addPermiso('OC_FACTURAS', 'C'), validarPermisos.validarPermiso, ordenesCompra.relacionarOcFactura);
module.exports = api;

