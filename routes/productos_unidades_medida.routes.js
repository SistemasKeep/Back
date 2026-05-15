'use strict'

let express = require('express');
let productosUnidadesMedida = require('../controllers/productos_unidades_medida.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/productosUnidadesMedida', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'C'), validarPermisos.validarPermiso, productosUnidadesMedida.store);
api.get('/productosUnidadesMedida', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'L'), validarPermisos.validarPermiso, productosUnidadesMedida.index);
api.get('/productosUnidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'L'), validarPermisos.validarPermiso, productosUnidadesMedida.show);
api.put('/productosUnidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'A'), validarPermisos.validarPermiso, productosUnidadesMedida.update);
api.delete('/productosUnidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'E'), validarPermisos.validarPermiso, productosUnidadesMedida.destroy);
api.patch('/productosUnidadesMedida/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('PRODUCTOS_UNIDADES_MEDIDA', 'R'), validarPermisos.validarPermiso, productosUnidadesMedida.restaurar);

module.exports = api;