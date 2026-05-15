'use strict'

let express = require('express');
let beneficiarios = require('../controllers/beneficiarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');
let { ValidKeepro } = require('../middlewares/validKeepro');



api.post('/beneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, ValidKeepro.verif ,beneficiarios.store);
api.get('/beneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, beneficiarios.index);
api.get('/exportacion/beneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, beneficiarios.exportar);
api.get('/beneficiarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, beneficiarios.show);
api.put('/beneficiarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'A'), validarPermisos.validarPermiso, ValidKeepro.verif, beneficiarios.update);
api.delete('/beneficiarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'E'), validarPermisos.validarPermiso, beneficiarios.destroy);
api.patch('/beneficiarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'R'), validarPermisos.validarPermiso, beneficiarios.restaurar);
api.get('/beneficiarios/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, beneficiarios.indexHistoricos);
api.get('/beneficiarios/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, beneficiarios.showHistoricos);

module.exports = api;