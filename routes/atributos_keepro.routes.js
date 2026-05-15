'use strict'

let express = require('express');
let atributosKeePro = require('../controllers/atributos_keepro.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/atributosKeePro', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'C'), validarPermisos.validarPermiso, atributosKeePro.store);
api.get('/atributosKeePro', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'L'), validarPermisos.validarPermiso, atributosKeePro.index);
api.get('/findAtributosKeePro', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'L'), validarPermisos.validarPermiso, atributosKeePro.findAtributo);
api.get('/atributosKeePro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'L'), validarPermisos.validarPermiso, atributosKeePro.show);
api.put('/atributosKeePro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'A'), validarPermisos.validarPermiso, atributosKeePro.update);
api.delete('/atributosKeePro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'E'), validarPermisos.validarPermiso, atributosKeePro.destroy);
api.patch('/atributosKeePro/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('atributos_keepro', 'R'), validarPermisos.validarPermiso, atributosKeePro.restaurar);
api.get('/atributosKeePro/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, atributosKeePro.indexHistoricos);
api.get('/atributosKeePro/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, atributosKeePro.showHistoricos);
api.get('/exportacion/atributosKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('ATRIBUTOS_KEEPRO', 'L'), validarPermisos.validarPermiso, atributosKeePro.exportacion);


module.exports = api;