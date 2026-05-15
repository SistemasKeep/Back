'use strict'

let express = require('express');
let tamaniosContenedor = require('../controllers/tamanios_contenedor.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tamaniosContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'C'), validarPermisos.validarPermiso, tamaniosContenedor.store);
api.get('/tamaniosContenedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'L'), validarPermisos.validarPermiso, tamaniosContenedor.index);
api.get('/tamaniosContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'L'), validarPermisos.validarPermiso, tamaniosContenedor.show);
api.put('/tamaniosContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'A'), validarPermisos.validarPermiso, tamaniosContenedor.update);
api.delete('/tamaniosContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'E'), validarPermisos.validarPermiso, tamaniosContenedor.destroy);
api.patch('/tamaniosContenedor/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TAMANIOS_CONTENEDOR', 'R'), validarPermisos.validarPermiso, tamaniosContenedor.restaurar);

module.exports = api;