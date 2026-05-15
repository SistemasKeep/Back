'use strict'

let express = require('express');
let commodityCategorias = require('../controllers/commodity_categorias.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/commodityCategorias', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'C'), validarPermisos.validarPermiso, commodityCategorias.store);
api.get('/commodityCategorias', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'L'), validarPermisos.validarPermiso, commodityCategorias.index);
api.get('/exportacion/commodityCategorias', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'L'), validarPermisos.validarPermiso, commodityCategorias.exportar);
api.get('/commodityCategorias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'L'), validarPermisos.validarPermiso, commodityCategorias.show);
api.put('/commodityCategorias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'A'), validarPermisos.validarPermiso, commodityCategorias.update);
api.delete('/commodityCategorias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'E'), validarPermisos.validarPermiso, commodityCategorias.destroy);
api.patch('/commodityCategorias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITY_CATEGORIAS', 'R'), validarPermisos.validarPermiso, commodityCategorias.restaurar);
api.get('/commodityCategorias/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, commodityCategorias.indexHistoricos);
api.get('/commodityCategorias/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, commodityCategorias.showHistoricos);


module.exports = api;