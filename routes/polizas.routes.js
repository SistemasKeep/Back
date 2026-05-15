'use strict'

let express = require('express');
let polizas = require('../controllers/polizas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizas', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'C'), validarPermisos.validarPermiso, polizas.store);
api.get('/polizas', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'L'), validarPermisos.validarPermiso, polizas.index);
api.get('/polizas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'L'), validarPermisos.validarPermiso, polizas.show);
api.put('/polizas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'A'), validarPermisos.validarPermiso, polizas.update);
api.delete('/polizas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'E'), validarPermisos.validarPermiso, polizas.destroy);
api.patch('/polizas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS', 'R'), validarPermisos.validarPermiso, polizas.restaurar);
api.get('/polizas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas.indexHistoricos);
api.get('/polizas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas.showHistoricos);

module.exports = api;