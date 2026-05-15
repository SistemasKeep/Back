'use strict'

let express = require('express');
let marcasUsuarios = require('../controllers/marcas_usuarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/marcasUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'C'), validarPermisos.validarPermiso, marcasUsuarios.store);
api.get('/marcasUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'L'), validarPermisos.validarPermiso, marcasUsuarios.index);
api.get('/marcasUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'L'), validarPermisos.validarPermiso, marcasUsuarios.show);
api.put('/marcasUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'A'), validarPermisos.validarPermiso, marcasUsuarios.update);
api.delete('/marcasUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'E'), validarPermisos.validarPermiso, marcasUsuarios.destroy);
api.patch('/marcasUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_USUARIOS', 'R'), validarPermisos.validarPermiso, marcasUsuarios.restaurar);

module.exports = api;