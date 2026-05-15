'use strict'

let express = require('express');
let cargaArchivos = require('../controllers/carga_archivos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');



api.post('/cargaArchivos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CARGA_ARCHIVOS', 'C'), validarPermisos.validarPermiso, cargaArchivos.store);
api.get('/cargaArchivos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CARGA_ARCHIVOS', 'L'), validarPermisos.validarPermiso, cargaArchivos.index);
api.get('/cargaArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CARGA_ARCHIVOS', 'L'), validarPermisos.validarPermiso, cargaArchivos.show);
api.delete('/cargaArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CARGA_ARCHIVOS', 'E'), validarPermisos.validarPermiso, cargaArchivos.destroy);

api.get('/getIdsGoogle', token.validarToken, token.updateToken, validarPermisos.addPermiso('CARGA_ARCHIVOS', 'L'), validarPermisos.validarPermiso, cargaArchivos.getIdsGoogle);
/*api.post('/cargaArchivos/Auth/getRuta', token.validarToken, token.updateToken, cargaArchivos.getRuta);
api.post('/cargaArchivos/Auth/getToken', token.validarToken, token.updateToken, cargaArchivos.getToken);
api.post('/cargaArchivos/Auth/refreshToken', token.validarToken, token.updateToken, cargaArchivos.refreshToken);*/

module.exports = api;