'use strict'

let express = require('express');
let unidadesMedida = require('../controllers/unidades_medida.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/unidadesMedida', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'C'), validarPermisos.validarPermiso, unidadesMedida.store);
api.get('/unidadesMedida', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'L'), validarPermisos.validarPermiso, unidadesMedida.index);
api.get('/unidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'L'), validarPermisos.validarPermiso, unidadesMedida.show);
api.put('/unidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'A'), validarPermisos.validarPermiso, unidadesMedida.update);
api.delete('/unidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'E'), validarPermisos.validarPermiso, unidadesMedida.destroy);
api.patch('/unidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'R'), validarPermisos.validarPermiso, unidadesMedida.restaurar);
api.get('/exportacion/unidadesMedida', token.validarToken, token.updateToken, validarPermisos.addPermiso('UNIDADES_MEDIDA', 'L'), validarPermisos.validarPermiso, unidadesMedida.exportacion);

module.exports = api;