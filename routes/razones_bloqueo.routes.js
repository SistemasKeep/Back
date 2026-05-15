'use strict'

let express = require('express');
let razonesBloqueo = require('../controllers/razones_bloqueo.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/razonesBloqueo', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'C'), validarPermisos.validarPermiso, razonesBloqueo.store);
api.get('/razonesBloqueo', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'L'), validarPermisos.validarPermiso, razonesBloqueo.index);
api.get('/razonesBloqueo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'L'), validarPermisos.validarPermiso, razonesBloqueo.show);
api.put('/razonesBloqueo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'A'), validarPermisos.validarPermiso, razonesBloqueo.update);
api.delete('/razonesBloqueo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'E'), validarPermisos.validarPermiso, razonesBloqueo.destroy);
api.patch('/razonesBloqueo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_BLOQUEO', 'R'), validarPermisos.validarPermiso, razonesBloqueo.restaurar);

module.exports = api;