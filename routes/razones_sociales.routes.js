'use strict'

let express = require('express');
let razonesSociales = require('../controllers/razones_sociales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/razonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'C'), validarPermisos.validarPermiso, razonesSociales.store);
api.get('/razonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, razonesSociales.index);
api.get('/razonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, razonesSociales.show);
api.put('/razonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'A'), validarPermisos.validarPermiso, razonesSociales.update);
api.delete('/razonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'E'), validarPermisos.validarPermiso, razonesSociales.destroy);
api.patch('/razonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('RAZONES_SOCIALES', 'R'), validarPermisos.validarPermiso, razonesSociales.restaurar);
api.get('/razonesSociales/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, razonesSociales.indexHistoricos);
api.get('/razonesSociales/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, razonesSociales.showHistoricos);

module.exports = api;