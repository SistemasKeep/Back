'use strict'

let express = require('express');
let configSmtp = require('../controllers/config_smtp.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/configSmtp', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'C'), validarPermisos.validarPermiso, configSmtp.store);
api.get('/configSmtp', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'L'), validarPermisos.validarPermiso, configSmtp.index);
api.get('/configSmtp/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'L'), validarPermisos.validarPermiso, configSmtp.show);
api.put('/configSmtp/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'A'), validarPermisos.validarPermiso, configSmtp.update);
api.delete('/configSmtp/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'E'), validarPermisos.validarPermiso, configSmtp.destroy);
api.patch('/configSmtp/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP', 'R'), validarPermisos.validarPermiso, configSmtp.restaurar);

module.exports = api;