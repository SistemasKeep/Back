'use strict'

let express = require('express');
let polizas_paises = require('../controllers/polizas_paises.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasPaises', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'C'), validarPermisos.validarPermiso, polizas_paises.store);
api.get('/polizasPaises', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'L'), validarPermisos.validarPermiso, polizas_paises.index);
api.get('/polizasPaises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'L'), validarPermisos.validarPermiso, polizas_paises.show);
api.put('/polizasPaises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'A'), validarPermisos.validarPermiso, polizas_paises.update);
api.delete('/polizasPaises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'E'), validarPermisos.validarPermiso, polizas_paises.destroy);
api.patch('/polizasPaises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_PAISES', 'R'), validarPermisos.validarPermiso, polizas_paises.restaurar);
api.get('/polizasPaises/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_paises.indexHistoricos);
api.get('/polizasPaises/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_paises.showHistoricos);

module.exports = api;