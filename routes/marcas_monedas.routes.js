'use strict'

let express = require('express');
let marcasMonedas = require('../controllers/marcas_monedas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/marcasMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'C'), validarPermisos.validarPermiso, marcasMonedas.store);
api.get('/marcasMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'L'), validarPermisos.validarPermiso, marcasMonedas.index);
api.get('/marcasMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'L'), validarPermisos.validarPermiso, marcasMonedas.show);
api.put('/marcasMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'A'), validarPermisos.validarPermiso, marcasMonedas.update);
api.delete('/marcasMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'E'), validarPermisos.validarPermiso, marcasMonedas.destroy);
api.patch('/marcasMonedas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCAS_MONEDAS', 'R'), validarPermisos.validarPermiso, marcasMonedas.restaurar);

module.exports = api;