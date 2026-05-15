'use strict'

let express = require('express');
let configSmtpMarcas = require('../controllers/config_smtp_marcas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/configSmtpMarcas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'C'), validarPermisos.validarPermiso, configSmtpMarcas.store);
api.get('/configSmtpMarcas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'L'), validarPermisos.validarPermiso, configSmtpMarcas.index);
api.get('/configSmtpMarcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'L'), validarPermisos.validarPermiso, configSmtpMarcas.show);
api.put('/configSmtpMarcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'A'), validarPermisos.validarPermiso, configSmtpMarcas.update);
api.delete('/configSmtpMarcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'E'), validarPermisos.validarPermiso, configSmtpMarcas.destroy);
api.patch('/configSmtpMarcas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONFIG_SMTP_MARCAS', 'R'), validarPermisos.validarPermiso, configSmtpMarcas.restaurar);

module.exports = api;