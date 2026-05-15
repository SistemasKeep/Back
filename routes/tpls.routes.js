'use strict'

let express = require('express');
let tpls = require('../controllers/tpls.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')
let validarPermisos = require('../middlewares/validarPermisos');


api.post('/tpls', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'C'), validarPermisos.validarPermiso, tpls.store);
api.get('/tpls/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'L'), validarPermisos.validarPermiso, tpls.show);
api.put('/tpls/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'A'), validarPermisos.validarPermiso, tpls.update);
api.delete('/tpls/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'E'), validarPermisos.validarPermiso, tpls.destroy);
api.get('/sendTpls', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'L'), validarPermisos.validarPermiso, tpls.sendTps);
api.get('/downloadTpls/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('TPLS', 'L'), validarPermisos.validarPermiso, tpls.downloadTpls);

module.exports = api;