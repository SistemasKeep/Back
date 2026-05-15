'use strict'

let express = require('express');
let metodosPago = require('../controllers/metodos_pago.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/metodosPago', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'C'), validarPermisos.validarPermiso, metodosPago.store);
api.get('/metodosPago', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'L'), validarPermisos.validarPermiso, metodosPago.index);
api.get('/metodosPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'L'), validarPermisos.validarPermiso, metodosPago.show);
api.put('/metodosPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'A'), validarPermisos.validarPermiso, metodosPago.update);
api.delete('/metodosPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'E'), validarPermisos.validarPermiso, metodosPago.destroy);
api.patch('/metodosPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METODOS_PAGO', 'R'), validarPermisos.validarPermiso, metodosPago.restaurar);

module.exports = api;