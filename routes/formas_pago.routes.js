'use strict'

let express = require('express');
let formasPago = require('../controllers/formas_pago.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/formasPagoList', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'C'), validarPermisos.validarPermiso, formasPago.storeList);
api.post('/formasPago', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'C'), validarPermisos.validarPermiso, formasPago.store);
api.get('/formasPago', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'L'), validarPermisos.validarPermiso, formasPago.index);
api.get('/formasPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'L'), validarPermisos.validarPermiso, formasPago.show);
api.put('/formasPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'A'), validarPermisos.validarPermiso, formasPago.update);
api.delete('/formasPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'E'), validarPermisos.validarPermiso, formasPago.destroy);
api.patch('/formasPago/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('FORMAS_PAGO', 'R'), validarPermisos.validarPermiso, formasPago.restaurar);

module.exports = api;