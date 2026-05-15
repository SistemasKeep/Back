'use strict'

let express = require('express');
let marcaAgentesOficinas = require('../controllers/marca_agentes_oficinas.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/marcaAgentesOficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'C'), validarPermisos.validarPermiso, marcaAgentesOficinas.store);
api.get('/marcaAgentesOficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.index);
api.get('/marcaAgentesOficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.show);
api.put('/marcaAgentesOficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'A'), validarPermisos.validarPermiso, marcaAgentesOficinas.update);
api.delete('/marcaAgentesOficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'E'), validarPermisos.validarPermiso, marcaAgentesOficinas.destroy);
api.patch('/marcaAgentesOficinas/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'R'), validarPermisos.validarPermiso, marcaAgentesOficinas.restaurar);
api.get('/marcaAgentesOficinas/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.indexHistoricos);
api.get('/marcaAgentesOficinas/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.showHistoricos);
api.get('/marcaAgentesOficinas/historialAsignacionAgentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.listHistoricos);
api.get('/exportacion/marcaAgentesOficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_OFICINAS', 'L'), validarPermisos.validarPermiso, marcaAgentesOficinas.exportacion);
module.exports = api;