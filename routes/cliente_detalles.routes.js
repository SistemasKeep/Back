'use strict'

let express = require('express');
let clienteDetalles = require('../controllers/cliente_detalles.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/clienteDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'C'), validarPermisos.validarPermiso, clienteDetalles.store);
api.get('/clienteDetalles', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'L'), validarPermisos.validarPermiso, clienteDetalles.index);
api.get('/clienteDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'L'), validarPermisos.validarPermiso, clienteDetalles.show);
api.put('/clienteDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'A'), validarPermisos.validarPermiso, clienteDetalles.update);
api.delete('/clienteDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'E'), validarPermisos.validarPermiso, clienteDetalles.destroy);
api.patch('/clienteDetalles/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTE_DETALLES', 'R'), validarPermisos.validarPermiso, clienteDetalles.restaurar);
api.get('/clienteDetalles/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, clienteDetalles.indexHistoricos);
api.get('/clienteDetalles/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, clienteDetalles.showHistoricos);


module.exports = api;