'use strict'

let express = require('express');
let contactosProveedor = require('../controllers/contactos_proveedor.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/contactosProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'C'), validarPermisos.validarPermiso, contactosProveedor.store);
api.get('/contactosProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, contactosProveedor.index);
api.get('/contactosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'L'), validarPermisos.validarPermiso, contactosProveedor.show);
api.put('/contactosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'A'), validarPermisos.validarPermiso, contactosProveedor.update);
api.delete('/contactosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'E'), validarPermisos.validarPermiso, contactosProveedor.destroy);
api.patch('/contactosProveedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_PROVEEDOR', 'R'), validarPermisos.validarPermiso, contactosProveedor.restaurar);

module.exports = api;