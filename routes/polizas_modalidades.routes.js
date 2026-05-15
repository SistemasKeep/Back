'use strict'

let express = require('express');
let polizasModalidades = require('../controllers/polizas_modalidades.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasModalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'C'), validarPermisos.validarPermiso, polizasModalidades.store);
api.get('/polizasModalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'L'), validarPermisos.validarPermiso, polizasModalidades.index);
api.get('/polizasModalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'L'), validarPermisos.validarPermiso, polizasModalidades.show);
api.put('/polizasModalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'A'), validarPermisos.validarPermiso, polizasModalidades.update);
api.delete('/polizasModalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'E'), validarPermisos.validarPermiso, polizasModalidades.destroy);
api.patch('/polizasModalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_MODALIDADES', 'R'), validarPermisos.validarPermiso, polizasModalidades.restaurar);
api.get('/polizasModalidades/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasModalidades.indexHistoricos);
api.get('/polizasModalidades/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasModalidades.showHistoricos);


module.exports = api;