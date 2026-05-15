'use strict'

let express = require('express');
let domicilios = require('../controllers/domicilios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/domicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'C'), validarPermisos.validarPermiso, domicilios.store);
api.get('/domicilios', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'L'), validarPermisos.validarPermiso, domicilios.index);
api.get('/domicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'L'), validarPermisos.validarPermiso, domicilios.show);
api.put('/domicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'A'), validarPermisos.validarPermiso, domicilios.update);
api.delete('/domicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'E'), validarPermisos.validarPermiso, domicilios.destroy);
api.patch('/domicilios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('DOMICILIOS', 'R'), validarPermisos.validarPermiso, domicilios.restaurar);

module.exports = api;