'use strict'

let express = require('express');
let polizasTipoContenedor = require('../controllers/polizas_tipo_contenedor.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasTipoContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'C'), validarPermisos.validarPermiso, polizasTipoContenedor.store);
api.get('/polizasTipoContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'L'), validarPermisos.validarPermiso, polizasTipoContenedor.index);
api.get('/polizasTipoContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'L'), validarPermisos.validarPermiso, polizasTipoContenedor.show);
api.put('/polizasTipoContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'A'), validarPermisos.validarPermiso, polizasTipoContenedor.update);
api.delete('/polizasTipoContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'E'), validarPermisos.validarPermiso, polizasTipoContenedor.destroy);
api.patch('/polizasTipoContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_TIPO_CONTENEDOR', 'R'), validarPermisos.validarPermiso, polizasTipoContenedor.restaurar);

module.exports = api;