'use strict'

let express = require('express');
let proveedoresDocumentosGenerales = require('../controllers/proveedores_documentos_generales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/proveedoresDocumentosGenerales', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'C'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.store);
api.get('/proveedoresDocumentosGenerales', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'L'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.index);
api.get('/proveedoresDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'L'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.show);
api.put('/proveedoresDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'A'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.update);
api.delete('/proveedoresDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'E'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.destroy);
api.patch('/proveedoresDocumentosGenerales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_DOCUMENTOS_GENERALES', 'R'), validarPermisos.validarPermiso, proveedoresDocumentosGenerales.restaurar);

module.exports = api;