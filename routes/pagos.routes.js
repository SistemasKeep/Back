'use strict'

let express = require('express');
let pagos = require('../controllers/pagos.controller');
let pagosPDF = require('../controllers/pagos_pdf.controller')
let pagosMail = require('../controllers/pagos_mails.controllers')
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/pagos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'C'), validarPermisos.validarPermiso, pagos.store);
api.get('/pagos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagos.index);
api.get('/pagos/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagosPDF.showPDF);
api.get('/pagos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagos.show);
api.get('/pagos/getXML/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagos.getXML);
api.delete('/pagos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'E'), validarPermisos.validarPermiso, pagos.destroy);
api.post('/pagos/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagosMail.sendPago);
api.get('/exportacion/pagos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'L'), validarPermisos.validarPermiso, pagos.exportar);

api.post('/cargarArchivoPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_ARCHIVOS', 'C'), validarPermisos.validarPermiso, pagos.cargarArchivo);
api.delete('/eliminarArchivoPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS_ARCHIVOS', 'E'), validarPermisos.validarPermiso, pagos.eliminarArchivo);

api.post('/timbrarPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAGOS', 'C'), validarPermisos.validarPermiso, pagos.reTimbrarPago);
module.exports = api;