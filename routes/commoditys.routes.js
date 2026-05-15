'use strict'

let express = require('express');
let commoditys = require('../controllers/commoditys.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/commoditys', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'C'), validarPermisos.validarPermiso, commoditys.store);
api.get('/commoditys', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'L'), validarPermisos.validarPermiso, commoditys.index);
api.get('/exportacion/commoditys', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'L'), validarPermisos.validarPermiso, commoditys.exportar);
api.get('/commoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'L'), validarPermisos.validarPermiso, commoditys.show);
api.put('/commoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'A'), validarPermisos.validarPermiso, commoditys.update);
api.delete('/commoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'E'), validarPermisos.validarPermiso, commoditys.destroy);
api.patch('/commoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('COMMODITYS', 'R'), validarPermisos.validarPermiso, commoditys.restaurar);
api.get('/commoditys/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, commoditys.indexHistoricos);
api.get('/commoditys/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, commoditys.showHistoricos);

module.exports = api;