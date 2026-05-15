'use strict'

let express = require('express');
let rutas = require('../../controllers/operaciones_draft.controller');
let tiposCambioFuturo = require('../../controllers/tipos_cambio_futuro.controller');
let certificados = require('../../controllers/certificados.controller')
let certificadosMail = require('../../controllers/certificados_mails.controllers')
let beneficiarios = require('../../controllers/beneficiarios.controller')
let genPdf = require('../../controllers/gen_pdf.controller');
let atributosKeepro = require('../../controllers/atributos_keepro.controller');
let buques = require('../../controllers/buques.controller')
let api =  express.Router();
let token = require('../../middlewares/gentoken')
let validarPermisos = require('../../middlewares/validarPermisos');
let rutasPaises = require('../../controllers/paises.controller');
let cuentasPorCobrar = require('../../controllers/cuentas_por_cobrar.controller');
let facturas = require('../../controllers/facturacion.controller');

api.get('/getClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexClientes);
api.get('/getOficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexOficinas);
api.get('/getRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexRazonesSociales);
api.get('/getOficinaProductos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexOficinasProductos);
api.get('/getMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexMonedas);
api.get('/getTiposContenedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexTiposContenedores);
api.get('/getCommodities', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexCommodities);
api.get('/getCommoditiesProveedor', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexCommoditiesProveedor);
api.get('/getModalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexModalidades);
api.get('/getBuques', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, buques.index);
api.get('/getPaises', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexPaises);
api.get('/paises', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutasPaises.index);
api.get('/getEstados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexEstados);
api.get('/getPuertosAeropuertos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexPuertosAeropuertos);
api.get('/getUbicacionBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexUbicacionBienes);
api.get('/getTiposBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexTiposBienes);
api.post('/isDeducible', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.isDeducibleAtributo);
api.post('/canRedondo', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.canRedondo);
api.post('/canContratarRc', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.canContratarRc);
api.post('/validSumaAsegurada', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.validSumaAsegurada);
api.get('/getPdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, genPdf.show)
api.get('/getTipoCambio/date/:dateFind', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, tiposCambioFuturo.getTipoCambioByFecha);
api.get('/findAtributoKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, atributosKeepro.findAtributo);
api.get('/getAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getAgentesClientes);
api.get('/getPaisesBeneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, rutas.getPaisesBeneficiarios);
api.get('/getDataDraft', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getDataDraft);
api.get('/getEstadoCuenta', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getEstadoCuenta);
api.get('/getUsuariosKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'C'), validarPermisos.validarPermiso, rutas.getUsuariosKeepro);
api.get('/getContactos', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, rutas.getContactos);
api.get('/getMarcaAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, rutas.getMarcaAgentesClientes);
api.post('/genDraft', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, certificados.store);
api.get('/getOperaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.index);
api.put('/updateOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, certificados.update);
api.delete('/cancelarDraft/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'E'), validarPermisos.validarPermiso, certificados.cancelar);
api.post('/certificarDraft/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, certificados.certificarDraft);
api.get('/getOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificados.show);
api.post('/resendMail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, certificadosMail.sendCertificado);

api.post('/genBeneficiario', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, beneficiarios.store);
api.get('/getBeneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, rutas.indexBeneficiarios);
api.put('/updateBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'A'), validarPermisos.validarPermiso,beneficiarios.update);
api.delete('/deleteBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'E'), validarPermisos.validarPermiso, beneficiarios.destroy);
api.get('/getBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, beneficiarios.show);


api.get('/exportacion/certificados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso,  certificados.exportacion);
api.get('/exportacion/antiguedadSaldosCxC', token.validarToken, token.updateToken, validarPermisos.addPermiso('CUENTAS_POR_COBRAR', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.antiguedadSaldosCxC);

api.get('/getZip/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, facturas.getZip);
module.exports = api;
