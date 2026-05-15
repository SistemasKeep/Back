'use strict'

let express = require('express');
let marcaAgentesClientes = require('../controllers/marca_agentes_clientes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');

api.post('/marcaAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'C'), validarPermisos.validarPermiso, marcaAgentesClientes.store);
api.get('/marcaAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'L'), validarPermisos.validarPermiso, marcaAgentesClientes.index);
api.get('/marcaAgentesClientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'L'), validarPermisos.validarPermiso, marcaAgentesClientes.show);
api.put('/marcaAgentesClientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'A'), validarPermisos.validarPermiso, marcaAgentesClientes.update);
api.delete('/marcaAgentesClientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'E'), validarPermisos.validarPermiso, marcaAgentesClientes.destroy);
api.patch('/marcaAgentesClientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'R'), validarPermisos.validarPermiso, marcaAgentesClientes.restaurar);
api.get('/marcaAgentesClientes/historicoAsignacionAgentes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('MARCA_AGENTES_CLIENTES', 'L'), validarPermisos.validarPermiso, marcaAgentesClientes.historicoAsignacionAgentes);
module.exports = api;