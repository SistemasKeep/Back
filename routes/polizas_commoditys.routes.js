'use strict'

let express = require('express');
let polizasCommoditys = require('../controllers/polizas_commoditys.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasCommoditys', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'C'), validarPermisos.validarPermiso, polizasCommoditys.store);
api.get('/polizasCommoditys', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'L'), validarPermisos.validarPermiso, polizasCommoditys.index);
api.get('/polizasCommoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'L'), validarPermisos.validarPermiso, polizasCommoditys.show);
api.put('/polizasCommoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'A'), validarPermisos.validarPermiso, polizasCommoditys.update);
api.delete('/polizasCommoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'E'), validarPermisos.validarPermiso, polizasCommoditys.destroy);
api.patch('/polizasCommoditys/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_COMMODITYS', 'R'), validarPermisos.validarPermiso, polizasCommoditys.restaurar);
api.get('/polizasCommoditys/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasCommoditys.indexHistoricos);
api.get('/polizasCommoditys/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasCommoditys.showHistoricos);


module.exports = api;