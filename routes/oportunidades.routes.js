'use strict'

let express = require('express');
let oportunidades = require('../controllers/oportunidades.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/oportunidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'C'), validarPermisos.validarPermiso, oportunidades.store);
api.get('/oportunidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'L'), validarPermisos.validarPermiso, oportunidades.index);
api.get('/oportunidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'L'), validarPermisos.validarPermiso, oportunidades.show);
api.put('/oportunidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'A'), validarPermisos.validarPermiso, oportunidades.update);
api.delete('/oportunidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'E'), validarPermisos.validarPermiso, oportunidades.destroy);
api.patch('/oportunidades/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OPORTUNIDADES', 'R'), validarPermisos.validarPermiso, oportunidades.restaurar);

module.exports = api;