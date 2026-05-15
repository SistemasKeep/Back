'use strict'

let express = require('express');
let serviciosOnTrack = require('../controllers/servicios_ontrack.controller');
let serviciosOnTrackPdf = require('../controllers/servicios_ontrack_pdf.controller');
let serviciosOnTrackMail = require('../controllers/servicios_ontrack_mails.controllers');
let api =  express.Router();
let token = require('../middlewares/gentoken');
let validarPermisos = require('../middlewares/validarPermisos');
const { KeePro } = require('../middlewares/validadoresKeePro')

const validKeepro = (req, res, next) => {
    const isAutoemisor = !req.usuario.es_colaborador && req.usuario.es_autoemisor
    if(req.body.keepro === 0 && !isAutoemisor){
        next();
    }else{
        return KeePro.certificado(req, res, next)
    }
}

api.post('/serviciosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'C'), validarPermisos.validarPermiso, validKeepro , serviciosOnTrack.store);
api.get('/serviciosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'L'), validarPermisos.validarPermiso, serviciosOnTrack.index);
api.get('/serviciosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'L'), validarPermisos.validarPermiso, serviciosOnTrack.show);
api.put('/serviciosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'A'), validarPermisos.validarPermiso, serviciosOnTrack.update);
api.delete('/serviciosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'E'), validarPermisos.validarPermiso, serviciosOnTrack.destroy);
api.patch('/serviciosOnTrack/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'R'), validarPermisos.validarPermiso, serviciosOnTrack.restaurar);
api.get('/exportacion/serviciosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'L'), validarPermisos.validarPermiso, serviciosOnTrack.exportacion);

api.get('/serviciosOnTrack/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'L'), validarPermisos.validarPermiso, serviciosOnTrackPdf.showPDF);
api.post('/serviciosOnTrack/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'L'), validarPermisos.validarPermiso, serviciosOnTrackMail.sendServiciosMonitoreo)

//Catalogos
api.get('/operaciones/getOficinaProductosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'C'), validarPermisos.validarPermiso, serviciosOnTrack.getOficinaProductosOnTrack);
api.get('/keepro/getOficinaProductosOnTrack', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'C'), validarPermisos.validarPermiso, serviciosOnTrack.getOficinaProductosOnTrack);
api.post('/operaciones/canContratarSOT', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'C'), validarPermisos.validarPermiso, serviciosOnTrack.canContratarSOT);
api.post('/keepro/canContratarSOT', token.validarToken, token.updateToken, validarPermisos.addPermiso('SERVICIOS_ONTRACK', 'C'), validarPermisos.validarPermiso, serviciosOnTrack.canContratarSOT);
module.exports = api;