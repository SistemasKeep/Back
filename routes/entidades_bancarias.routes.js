'use strict'

let express = require('express');
let entidadesBancarias = require('../controllers/entidades_bancarias.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/entidadesBancarias', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'C'), validarPermisos.validarPermiso, entidadesBancarias.store);
api.get('/entidadesBancarias', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'L'), validarPermisos.validarPermiso, entidadesBancarias.index);
api.get('/entidadesBancarias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'L'), validarPermisos.validarPermiso, entidadesBancarias.show);
api.put('/entidadesBancarias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'A'), validarPermisos.validarPermiso, entidadesBancarias.update);
api.delete('/entidadesBancarias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'E'), validarPermisos.validarPermiso, entidadesBancarias.destroy);
api.patch('/entidadesBancarias/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ENTIDADES_BANCARIAS', 'R'), validarPermisos.validarPermiso, entidadesBancarias.restaurar);

module.exports = api;