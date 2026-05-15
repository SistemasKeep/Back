'use strict'

let express = require('express');
let cuentasBancariasInternas = require('../controllers/cuentas_bancarias_internas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/cuentasBancariasInternas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'C'), validarPermisos.validarPermiso, cuentasBancariasInternas.store);
api.get('/cuentasBancariasInternas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'L'), validarPermisos.validarPermiso, cuentasBancariasInternas.index);
api.get('/cuentasBancariasInternas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'L'), validarPermisos.validarPermiso, cuentasBancariasInternas.show);
api.put('/cuentasBancariasInternas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'A'), validarPermisos.validarPermiso, cuentasBancariasInternas.update);
api.delete('/cuentasBancariasInternas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'E'), validarPermisos.validarPermiso, cuentasBancariasInternas.destroy);
api.patch('/cuentasBancariasInternas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'R'), validarPermisos.validarPermiso, cuentasBancariasInternas.restaurar);
api.get('/exportacion/cuentasBancariasInternas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_INTERNAS', 'L'), validarPermisos.validarPermiso, cuentasBancariasInternas.exportar);
module.exports = api;