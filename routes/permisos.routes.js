'use strict'

let express = require('express');
let permisos = require('../controllers/permisos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/permisos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'C'), permisos.store);
api.get('/permisos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'L'), permisos.index);
api.get('/exportacion/permisos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'L'), permisos.exportar);
api.get('/permisos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'L'), permisos.show);
api.put('/permisos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'A'), permisos.update);
api.delete('/permisos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'E'), permisos.destroy);
api.patch('/permisos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'R'), permisos.restaurar);
api.get('/listPermisos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PERMISOS', 'C'), permisos.listPermisos);
api.post('/permisosStoreList', permisos.storeList);
module.exports = api;