'use strict'

let express = require('express');
let cuentasBancariasProveedores = require('../controllers/cuentas_bancarias_proveedores.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/cuentasBancariasProveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'C'), validarPermisos.validarPermiso, cuentasBancariasProveedores.store);
api.get('/cuentasBancariasProveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'L'), validarPermisos.validarPermiso, cuentasBancariasProveedores.index);
api.get('/cuentasBancariasProveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'L'), validarPermisos.validarPermiso, cuentasBancariasProveedores.show);
api.put('/cuentasBancariasProveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'A'), validarPermisos.validarPermiso, cuentasBancariasProveedores.update);
api.delete('/cuentasBancariasProveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'E'), validarPermisos.validarPermiso, cuentasBancariasProveedores.destroy);
api.patch('/cuentasBancariasProveedores/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'R'), validarPermisos.validarPermiso, cuentasBancariasProveedores.restaurar);
api.get('/exportacion/cuentasBancariasProveedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_BANCARIAS_PROVEEDORES', 'L'), validarPermisos.validarPermiso, cuentasBancariasProveedores.exportacion);

module.exports = api;