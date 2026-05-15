'use strict'

let express = require('express');
let productos = require('../controllers/productos.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/productos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'C'), validarPermisos.validarPermiso, productos.store);
api.get('/productos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'L'), validarPermisos.validarPermiso, productos.index);
api.get('/exportacion/productos', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'L'), validarPermisos.validarPermiso, productos.exportar);
api.get('/productos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'L'), validarPermisos.validarPermiso, productos.show);
api.put('/productos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'A'), validarPermisos.validarPermiso, productos.update);
api.delete('/productos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'E'), validarPermisos.validarPermiso, productos.destroy);
api.patch('/productos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS', 'R'), validarPermisos.validarPermiso, productos.restaurar);

module.exports = api;