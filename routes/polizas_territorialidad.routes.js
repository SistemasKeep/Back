'use strict'

let express = require('express');
let polizas_territorialidad = require('../controllers/polizas_territorialidad.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasTerritorialidad', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'C'), validarPermisos.validarPermiso, polizas_territorialidad.store);
api.get('/polizasTerritorialidad', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'L'), validarPermisos.validarPermiso, polizas_territorialidad.index);
api.get('/polizasTerritorialidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'L'), validarPermisos.validarPermiso, polizas_territorialidad.show);
api.put('/polizasTerritorialidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'A'), validarPermisos.validarPermiso, polizas_territorialidad.update);
api.delete('/polizasTerritorialidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'E'), validarPermisos.validarPermiso, polizas_territorialidad.destroy);
api.patch('/polizasTerritorialidad/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZA_TERRITORIALIDAD', 'R'), validarPermisos.validarPermiso, polizas_territorialidad.restaurar);
api.get('/polizasTerritorialidad/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_territorialidad.indexHistoricos);
api.get('/polizasTerritorialidad/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_territorialidad.showHistoricos);


module.exports = api;