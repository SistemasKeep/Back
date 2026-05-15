'use strict'

let express = require('express');
let proveedores = require('../controllers/proveedores.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/proveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'C'), validarPermisos.validarPermiso, proveedores.store);
api.get('/proveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'L'), validarPermisos.validarPermiso, proveedores.index);
api.get('/exportacion/proveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'L'), validarPermisos.validarPermiso, proveedores.exportar);
api.get('/proveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'L'), validarPermisos.validarPermiso, proveedores.show);
api.put('/proveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'A'), validarPermisos.validarPermiso, proveedores.update);
api.delete('/proveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'E'), validarPermisos.validarPermiso, proveedores.destroy);
api.patch('/proveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES', 'R'), validarPermisos.validarPermiso, proveedores.restaurar);
api.get('/proveedores/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, proveedores.indexHistoricos);
api.get('/proveedores/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, proveedores.showHistoricos);

module.exports = api;