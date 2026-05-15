'use strict'

let express = require('express');
let conceptosPresupuesto = require('../controllers/conceptos_presupuesto.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/conceptosPresupuesto', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'C'), validarPermisos.validarPermiso, conceptosPresupuesto.store);
api.get('/conceptosPresupuesto', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'L'), validarPermisos.validarPermiso, conceptosPresupuesto.index);
api.get('/conceptosPresupuesto/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'L'), validarPermisos.validarPermiso, conceptosPresupuesto.show);
api.put('/conceptosPresupuesto/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'A'), validarPermisos.validarPermiso, conceptosPresupuesto.update);
api.delete('/conceptosPresupuesto/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'E'), validarPermisos.validarPermiso, conceptosPresupuesto.destroy);
api.patch('/conceptosPresupuesto/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'R'), validarPermisos.validarPermiso, conceptosPresupuesto.restaurar);
api.get('/conceptosPresupuesto/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, conceptosPresupuesto.indexHistoricos);
api.get('/conceptosPresupuesto/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, conceptosPresupuesto.showHistoricos);
api.get('/exportacion/conceptosPresupuesto', token.validarToken, token.updateToken, validarPermisos.addPermiso('CONCEPTOS_PRESUPUESTO', 'L'), validarPermisos.validarPermiso, conceptosPresupuesto.exportacion);

module.exports = api;