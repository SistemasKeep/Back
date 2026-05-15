'use strict'

let express = require('express');
let razonesSocialesDocumentosGenerales = require('../controllers/razones_sociales_documentos_generales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/razonesSocialesDocumentosGenerales', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'C'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.store);
api.get('/razonesSocialesDocumentosGenerales', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'L'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.index);
api.get('/razonesSocialesDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'L'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.show);
api.put('/razonesSocialesDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'A'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.update);
api.delete('/razonesSocialesDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'E'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.destroy);
api.patch('/razonesSocialesDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'R'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.restaurar);
// api.post('/razonesSocialesDocumentosGeneralesList', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES_DOCUMENTOS_GENERALES', 'C'), validarPermisos.validarPermiso, razonesSocialesDocumentosGenerales.storeList);

module.exports = api;