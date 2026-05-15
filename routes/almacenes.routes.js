'use strict'

let express = require('express');
let almacenes = require('../controllers/almacenes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/almacenes', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'C'), validarPermisos.validarPermiso, almacenes.store);
api.get('/almacenes', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'L'), validarPermisos.validarPermiso, almacenes.index);
api.get('/almacenes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'L'), validarPermisos.validarPermiso, almacenes.show);
api.put('/almacenes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'A'), validarPermisos.validarPermiso, almacenes.update);
api.delete('/almacenes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'E'), validarPermisos.validarPermiso, almacenes.destroy);
api.patch('/almacenes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'R'), validarPermisos.validarPermiso, almacenes.restaurar);
api.get('/exportacion/almacenes', token.validarToken, token.updateToken, validarPermisos.addPermiso('ALMACENES', 'L'), validarPermisos.validarPermiso, almacenes.exportacion);

module.exports = api;