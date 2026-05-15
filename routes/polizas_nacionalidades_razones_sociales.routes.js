'use strict'

let express = require('express');
let polizasNacionalidadesRazonesSociales = require('../controllers/polizas_nacionalidades_razones_sociales.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/polizasNacionalidadesRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'C'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.store);
api.get('/polizasNacionalidadesRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.index);
api.get('/polizasNacionalidadesRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'L'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.show);
api.put('/polizasNacionalidadesRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'A'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.update);
api.delete('/polizasNacionalidadesRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'E'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.destroy);
api.patch('/polizasNacionalidadesRazonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('POLIZAS_NACIONALIDADES_RAZONES_SOCIALES', 'R'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.restaurar);
api.get('/polizasNacionalidadesRazonesSociales/historicos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.indexHistoricos);
api.get('/polizasNacionalidadesRazonesSociales/historico/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('HISTORICOS', 'L'), validarPermisos.validarPermiso, polizasNacionalidadesRazonesSociales.showHistoricos);

module.exports = api;