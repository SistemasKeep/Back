'use strict'

let express = require('express');
let usosCfdi = require('../controllers/usos_cfdi.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/usosCfdi', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'C'), validarPermisos.validarPermiso, usosCfdi.store);
api.get('/usosCfdi', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'L'), validarPermisos.validarPermiso, usosCfdi.index);
api.get('/usosCfdi/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'L'), validarPermisos.validarPermiso, usosCfdi.show);
api.put('/usosCfdi/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'A'), validarPermisos.validarPermiso, usosCfdi.update);
api.delete('/usosCfdi/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'E'), validarPermisos.validarPermiso, usosCfdi.destroy);
api.patch('/usosCfdi/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('USOS_CFDI', 'R'), validarPermisos.validarPermiso, usosCfdi.restaurar);

api.get('/open/usosCfdi', usosCfdi.index);
module.exports = api;