'use strict'

let express = require('express');
let modalidades = require('../controllers/modalidades.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/modalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'C'), validarPermisos.validarPermiso, modalidades.store);
api.get('/modalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'L'), validarPermisos.validarPermiso, modalidades.index);
api.get('/modalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'L'), validarPermisos.validarPermiso, modalidades.show);
api.put('/modalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'A'), validarPermisos.validarPermiso, modalidades.update);
api.delete('/modalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'E'), validarPermisos.validarPermiso, modalidades.destroy);
api.patch('/modalidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MODALIDADES', 'R'), validarPermisos.validarPermiso, modalidades.restaurar);
api.get('/modalidades/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, modalidades.indexHistoricos);
api.get('/modalidades/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, modalidades.showHistoricos);

module.exports = api;