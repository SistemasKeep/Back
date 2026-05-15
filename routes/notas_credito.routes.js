'use strict'

let express = require('express');
let notasCredito = require('../controllers/notas_credito.controller');
let notasCreditoPdf = require('../controllers/notas_credito_pdf.controller')
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/notasCredito', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'C'), validarPermisos.validarPermiso, notasCredito.store);
api.get('/notasCredito', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCredito.index);
api.get('/exportacion/notasCredito', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCredito.exportar);
api.get('/notasCredito/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCreditoPdf.showPDF);
api.get('/notasCredito/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCredito.show);
api.get('/notasCredito/getXML/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCredito.getXML);
api.delete('/notasCredito/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'E'), validarPermisos.validarPermiso, notasCredito.destroy);
api.post('/notasCredito/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'L'), validarPermisos.validarPermiso, notasCredito.enviarNotaCredito);

api.post('/timbrarNotaCredito/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NOTAS_CREDITO', 'C'), validarPermisos.validarPermiso, notasCredito.reTimbrarNotaCredito);
module.exports = api;