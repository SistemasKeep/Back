'use strict'

let express = require('express');
let certificados = require('../controllers/certificados.controller');
let certificadosMail = require('../controllers/certificados_mails.controllers');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');
let { ValidKeepro } = require('../middlewares/validKeepro');


api.post('/certificados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  ValidKeepro.verif ,certificados.store);
api.get('/certificados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.index);
api.get('/certificados/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, certificados.indexHistoricos);
api.get('/certificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.show);
api.get('/certificados/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, certificados.showHistoricos);
api.put('/certificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, ValidKeepro.verif ,certificados.update);
api.delete('/certificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'E'), validarPermisos.validarPermiso, ValidKeepro.verif ,certificados.cancelar);
api.post('/certificados/certificarDraft/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, ValidKeepro.verif ,certificados.certificarDraft);
api.post('/certificados/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificadosMail.sendCertificado)
api.get('/exportacion/certificados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.exportacion);
api.get('/exportacion/draftPorVencer', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.exportarDraftsPorVencer);
api.get('/findCertificado/:noAleatorio', token.validarTokenApiInterna, certificados.findCertificado);

api.post('/cargarArchivoCertificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS_DOCUMENTOS_OPERACIONES', 'C'), validarPermisos.validarPermiso, certificados.cargarArchivo);
api.delete('/eliminarArchivoCertificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS_DOCUMENTOS_OPERACIONES', 'E'), validarPermisos.validarPermiso, certificados.eliminarArchivo);


api.put('/updateDates/certificados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS_UPDATE_DATES', 'M'), validarPermisos.validarPermiso ,certificados.updateDates);
module.exports = api;