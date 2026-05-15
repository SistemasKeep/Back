'use strict'

let express = require('express');
let contactosTransportistas = require('../controllers/contactos_transportistas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/contactosTransportistas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'C'), validarPermisos.validarPermiso, contactosTransportistas.store);
api.get('/contactosTransportistas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'L'), validarPermisos.validarPermiso, contactosTransportistas.index);
api.get('/contactosTransportistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'L'), validarPermisos.validarPermiso, contactosTransportistas.show);
api.put('/contactosTransportistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'A'), validarPermisos.validarPermiso, contactosTransportistas.update);
api.delete('/contactosTransportistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'E'), validarPermisos.validarPermiso, contactosTransportistas.destroy);
api.patch('/contactosTransportistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONTACTOS_TRANSPORTISTAS', 'R'), validarPermisos.validarPermiso, contactosTransportistas.restaurar);

module.exports = api;