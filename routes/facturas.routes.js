'use strict'

let express = require('express');
let facturas = require('../controllers/facturacion.controller');
let facturas_mails = require('../controllers/facturas_mails.controllers');
let facturas_pdf = require('../controllers/facturacion_pdf.controller')
let cfdi = require('../controllers/cfdis.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.get('/facturas', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas.index);
api.get('/facturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas.show);
api.get('/facturas/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas_pdf.showPDF);
api.post('/facturas', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'C'), validarPermisos.validarPermiso, cfdi.timbrar);
api.post('/timbrarFactura/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'C'), validarPermisos.validarPermiso, cfdi.timbrarFactura);
api.post('/facturaManual', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'C'), validarPermisos.validarPermiso, cfdi.timbrarManal);
api.delete('/facturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'E'), validarPermisos.validarPermiso, cfdi.cancelar);
api.delete('/cfdis/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'E'), validarPermisos.validarPermiso, cfdi.cancelarCFDI);
api.post('/facturas/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas_mails.sendFactura)
api.get('/facturas/getXML/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas.getXML);
api.get('/exportacion/facturas', token.validarToken, token.updateToken, validarPermisos.addPermiso('FACTURAS', 'L'), validarPermisos.validarPermiso, facturas.exportacion);

api.delete('/delRelOc/facturas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OC_FACTURAS', 'E'), validarPermisos.validarPermiso, facturas.delRelOC);
module.exports = api;