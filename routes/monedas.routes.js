'use strict'

let express = require('express');
let monedas = require('../controllers/monedas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/monedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'C'), validarPermisos.validarPermiso, monedas.store);
api.get('/monedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'L'), validarPermisos.validarPermiso, monedas.index);
api.get('/monedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'L'), validarPermisos.validarPermiso, monedas.show);
api.put('/monedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'A'), validarPermisos.validarPermiso, monedas.update);
api.delete('/monedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'E'), validarPermisos.validarPermiso, monedas.destroy);
api.patch('/monedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MONEDAS', 'R'), validarPermisos.validarPermiso, monedas.restaurar);
api.get('/monedas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, monedas.indexHistoricos);
api.get('/monedas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, monedas.showHistoricos);

module.exports = api;