'use strict'

let express = require('express');
let comisionistas = require('../controllers/comisionistas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/comisionistas', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'C'), validarPermisos.validarPermiso, comisionistas.store);
api.get('/comisionistas', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'L'), validarPermisos.validarPermiso, comisionistas.index);
api.get('/comisionistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'L'), validarPermisos.validarPermiso, comisionistas.show);
api.put('/comisionistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'A'), validarPermisos.validarPermiso, comisionistas.update);
api.delete('/comisionistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'E'), validarPermisos.validarPermiso, comisionistas.destroy);
api.patch('/comisionistas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'R'), validarPermisos.validarPermiso, comisionistas.restaurar);
api.get('/exportacion/comisionistas', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMISIONISTAS', 'L'), validarPermisos.validarPermiso, comisionistas.exportacion);

module.exports = api;