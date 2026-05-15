'use strict'

let express = require('express');
let marcas = require('../controllers/marcas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/marcas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'C'), validarPermisos.validarPermiso, marcas.store);
api.get('/marcas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'L'), validarPermisos.validarPermiso, marcas.index);
api.get('/marcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'L'), validarPermisos.validarPermiso, marcas.show);
api.put('/marcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'A'), validarPermisos.validarPermiso, marcas.update);
api.delete('/marcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'E'), validarPermisos.validarPermiso, marcas.destroy);
api.patch('/marcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS', 'R'), validarPermisos.validarPermiso, marcas.restaurar);
api.get('/marcas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, marcas.indexHistoricos);
api.get('/marcas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, marcas.showHistoricos);

module.exports = api;