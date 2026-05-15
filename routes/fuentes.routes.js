'use strict'

let express = require('express');
let fuentes = require('../controllers/fuentes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/fuentes', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'C'), validarPermisos.validarPermiso, fuentes.store);
api.get('/fuentes', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'L'), validarPermisos.validarPermiso, fuentes.index);
api.get('/fuentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'L'), validarPermisos.validarPermiso, fuentes.show);
api.put('/fuentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'A'), validarPermisos.validarPermiso, fuentes.update);
api.delete('/fuentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'E'), validarPermisos.validarPermiso, fuentes.destroy);
api.patch('/fuentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FUENTES', 'R'), validarPermisos.validarPermiso, fuentes.restaurar);

module.exports = api;