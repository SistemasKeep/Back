'use strict'

let express = require('express');
let oficinasRazonesSociales = require('../controllers/oficinas_razones_sociales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/oficinasRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'C'), validarPermisos.validarPermiso, oficinasRazonesSociales.store);
api.get('/oficinasRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, oficinasRazonesSociales.index);
api.get('/oficinasRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, oficinasRazonesSociales.show);
api.put('/oficinasRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'A'), validarPermisos.validarPermiso, oficinasRazonesSociales.update);
api.delete('/oficinasRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'E'), validarPermisos.validarPermiso, oficinasRazonesSociales.destroy);
api.patch('/oficinasRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('OFICINAS_RAZONES_SOCIALES', 'R'), validarPermisos.validarPermiso, oficinasRazonesSociales.restaurar);
api.get('/oficinasRazonesSociales/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasRazonesSociales.indexHistoricos);
api.get('/oficinasRazonesSociales/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, oficinasRazonesSociales.showHistoricos);

module.exports = api;