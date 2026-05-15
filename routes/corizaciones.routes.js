'use strict'

let express = require('express');
let cotizaciones = require('../controllers/cotizaciones.controller');
let cotizacionesPdf = require('../controllers/cotizaciones_pdf.controller');
let cotizacionesMail = require('../controllers/cotizaciones_mails.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/cotizaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'C'), validarPermisos.validarPermiso, cotizaciones.store);
api.get('/cotizaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'L'), validarPermisos.validarPermiso, cotizaciones.index);
api.get('/cotizaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'L'), validarPermisos.validarPermiso, cotizaciones.show);
api.delete('/cotizaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'E'), validarPermisos.validarPermiso, cotizaciones.destroy);
api.get('/cotizaciones/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'L'), validarPermisos.validarPermiso, cotizacionesPdf.showPDF);
api.post('/cotizaciones/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'L'), validarPermisos.validarPermiso, cotizacionesMail.sendCotizacion);
api.get('/exportacion/cotizaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('COTIZACIONES', 'L'), validarPermisos.validarPermiso, cotizaciones.exportacion);

module.exports = api;
