'use strict'

let express = require('express');
let paises = require('../controllers/paises.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/paises', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'C'), validarPermisos.validarPermiso, paises.store);
api.get('/paises', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'L'), validarPermisos.validarPermiso, paises.index);
api.get('/paises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'L'), validarPermisos.validarPermiso, paises.show);
api.put('/paises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'A'), validarPermisos.validarPermiso, paises.update);
api.delete('/paises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'E'), validarPermisos.validarPermiso, paises.destroy);
api.patch('/paises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'R'), validarPermisos.validarPermiso, paises.restaurar);
api.get('/paises/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, paises.indexHistoricos);
api.get('/paises/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, paises.showHistoricos);
api.get('/exportacion/paises', token.validarToken, token.updateToken, validarPermisos.addPermiso('PAISES', 'L'), validarPermisos.validarPermiso, paises.exportacion);

api.get('/open/paises', paises.index);
//api.get('/updateClavePaises',paises.updateClavePais)
module.exports = api;