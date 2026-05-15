'use strict'

let express = require('express');
let proveedoresExpediente = require('../controllers/proveedores_expediente.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/proveedoresExpediente', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'C'), validarPermisos.validarPermiso, proveedoresExpediente.store);
api.get('/proveedoresExpediente', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'L'), validarPermisos.validarPermiso, proveedoresExpediente.index);
api.get('/proveedoresExpediente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'L'), validarPermisos.validarPermiso, proveedoresExpediente.show);
api.put('/proveedoresExpediente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'A'), validarPermisos.validarPermiso, proveedoresExpediente.update);
api.delete('/proveedoresExpediente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'E'), validarPermisos.validarPermiso, proveedoresExpediente.destroy);
api.patch('/proveedoresExpediente/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PROVEEDORES_EXPEDIENTE', 'R'), validarPermisos.validarPermiso, proveedoresExpediente.restaurar);

module.exports = api;