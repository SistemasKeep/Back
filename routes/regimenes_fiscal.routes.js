'use strict'

let express = require('express');
let regimenesFiscal = require('../controllers/regimenes_fiscal.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/regimenesFiscal', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'C'), validarPermisos.validarPermiso, regimenesFiscal.store);
api.get('/regimenesFiscal', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'L'), validarPermisos.validarPermiso, regimenesFiscal.index);
api.get('/regimenesFiscal/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'L'), validarPermisos.validarPermiso, regimenesFiscal.show);
api.put('/regimenesFiscal/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'A'), validarPermisos.validarPermiso, regimenesFiscal.update);
api.delete('/regimenesFiscal/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'E'), validarPermisos.validarPermiso, regimenesFiscal.destroy);
api.patch('/regimenesFiscal/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('REGIMENES_FISCAL', 'R'), validarPermisos.validarPermiso, regimenesFiscal.restaurar);


api.get('/open/regimenesFiscal', regimenesFiscal.index);

module.exports = api;