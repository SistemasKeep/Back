'use strict'

let express = require('express');
let usuarios = require('../controllers/usuarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/usuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'C'), validarPermisos.validarPermiso, usuarios.store);
api.get('/usuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'L'), usuarios.index);
api.get('/exportacion/usuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'L'), usuarios.exportar);
api.get('/usuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'L'), usuarios.show);
api.put('/usuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'A'), usuarios.update);
api.delete('/usuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'E'), usuarios.destroy);
api.patch('/usuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USUARIOS', 'R'), usuarios.restaurar);
api.post('/updateDateTerminosCondiciones/:id', token.validarToken, token.updateToken, usuarios.updateDateTerminosCondiciones);
api.get('/getCurrenUser', token.validarToken, token.updateToken, usuarios.getCurrenUser);
api.get('/KeeProOpen/getCurrenUser', token.validarToken, token.updateToken, usuarios.getCurrenUserApi);



api.post('/login', usuarios.login);
api.post('/KeeProOpen/login', usuarios.loginApi);
api.post('/usuarioAdmin', usuarios.store);
api.put('/changePassword', token.validarToken, token.updateToken, usuarios.changePassword);
api.post('/sendCode', usuarios.sendCode);
api.put('/verifCode', usuarios.verifCode);
api.post('/storeOpen', usuarios.storeOpen);

module.exports = api;