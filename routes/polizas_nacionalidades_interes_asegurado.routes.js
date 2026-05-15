'use strict'

let express = require('express');
let polizas_nacionalidades_interes_asegurado = require('../controllers/polizas_nacionalidades_interes_asegurado.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasNacionalidadesInteresAsegurado', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'C'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.store);
api.get('/polizasNacionalidadesInteresAsegurado', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'L'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.index);
api.get('/polizasNacionalidadesInteresAsegurado/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'L'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.show);
api.put('/polizasNacionalidadesInteresAsegurado/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'A'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.update);
api.delete('/polizasNacionalidadesInteresAsegurado/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'E'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.destroy);
api.patch('/polizasNacionalidadesInteresAsegurado/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_INTERES_ASEGURADO', 'R'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.restaurar);
api.get('/polizasNacionalidadesInteresAsegurado/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.indexHistoricos);
api.get('/polizasNacionalidadesInteresAsegurado/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizas_nacionalidades_interes_asegurado.showHistoricos);


module.exports = api;