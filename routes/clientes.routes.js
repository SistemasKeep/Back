'use strict'

let express = require('express');
let clientes = require('../controllers/clientes.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');
let clientesProspectos = require('../controllers/clientes_prospectos_exportacion.controller');

api.post('/clientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'C'), validarPermisos.validarPermiso, clientes.store);
api.get('/clientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'L'), validarPermisos.validarPermiso, clientes.index);
api.get('/exportacion/clientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'L'), validarPermisos.validarPermiso, clientes.exportar);
api.get('/clientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'L'), validarPermisos.validarPermiso, clientes.show);
api.put('/clientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'A'), validarPermisos.validarPermiso, clientes.update);
api.delete('/clientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'E'), validarPermisos.validarPermiso, clientes.destroy);
api.patch('/clientes/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'R'), validarPermisos.validarPermiso, clientes.restaurar);
api.get('/clientes/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, clientes.indexHistoricos);
api.get('/clientes/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, clientes.showHistoricos);
api.get('/exportacion/clientesProspectos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CLIENTES', 'L'), validarPermisos.validarPermiso, clientesProspectos.exportar);
api.post('/clienteProspecto', token.validarTokenApiInterna, clientes.createProspectoCliente);
module.exports = api;