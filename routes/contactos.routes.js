'use strict'

let express = require('express');
let contactos = require('../controllers/contactos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/contactos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'C'), validarPermisos.validarPermiso, contactos.store);
api.get('/contactos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'L'), validarPermisos.validarPermiso, contactos.index);
api.get('/contactos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'L'), validarPermisos.validarPermiso, contactos.show);
api.put('/contactos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'A'), validarPermisos.validarPermiso, contactos.update);
api.delete('/contactos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'E'), validarPermisos.validarPermiso, contactos.destroy);
api.patch('/contactos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS', 'R'), validarPermisos.validarPermiso, contactos.restaurar);

module.exports = api;