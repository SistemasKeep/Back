'use strict'

let express = require('express');
let metasMensaulesUsuarios = require('../controllers/metas_mensuales_usuarios.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/metasMensaulesUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'C'), validarPermisos.validarPermiso, metasMensaulesUsuarios.store);
api.get('/metasMensaulesUsuarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'L'), validarPermisos.validarPermiso, metasMensaulesUsuarios.index);
api.get('/metasMensaulesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'L'), validarPermisos.validarPermiso, metasMensaulesUsuarios.show);
api.put('/metasMensaulesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'A'), validarPermisos.validarPermiso, metasMensaulesUsuarios.update);
api.delete('/metasMensaulesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'E'), validarPermisos.validarPermiso, metasMensaulesUsuarios.destroy);
api.patch('/metasMensaulesUsuarios/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('METAS_MENSUALES_USUARIOS', 'R'), validarPermisos.validarPermiso, metasMensaulesUsuarios.restaurar);

module.exports = api;