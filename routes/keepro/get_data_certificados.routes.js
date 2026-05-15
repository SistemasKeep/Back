'use strict'

let express = require('express');
let rutas = require('../../controllers/get_data_certificados.controller');
let tiposCambioFuturo = require('../../controllers/tipos_cambio_futuro.controller');
let genPdf = require('../../controllers/gen_pdf.controller');
let atributosKeepro = require('../../controllers/atributos_keepro.controller');
let buques = require('../../controllers/buques.controller')
let api =  express.Router();
let token = require('../../middlewares/gentoken')
let validarPermisos = require('../../middlewares/validarPermisos');
let rutasPaises = require('../../controllers/paises.controller');
let certificados = require('../../controllers/certificados.controller')
let certificadosMail = require('../../controllers/certificados_mails.controllers')
let beneficiarios = require('../../controllers/beneficiarios.controller')
const { KeePro } = require('../../middlewares/validadoresKeePro')
let facturas = require('../../controllers/facturacion.controller');
let facturas_pdf = require('../../controllers/facturacion_pdf.controller')
let usuarios = require('../../controllers/newUser.controller')
let cuentasPorCobrar = require('../../controllers/cuentas_por_cobrar.controller');
let facturas_mails = require('../../controllers/facturas_mails.controllers');
let razonesSociales = require('../../controllers/razones_sociales.controller');
let razonesSocialesArchivos = require('../../controllers/razones_sociales_archivos.controller');

api.get('/getClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexClientes);
api.get('/getOficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexOficinas);
api.get('/getRazonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexRazonesSociales);
api.get('/getOficinaProductos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexOficinasProductos);
api.get('/getMonedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexMonedas);
api.get('/getTiposContenedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexTiposContenedores);
api.get('/getCommodities', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.indexCommodities);
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
api.get('/findatributoKeepro', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, atributosKeepro.findAtributo);
api.get('/getAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getAgentesClientes);
api.get('/getPaisesBeneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, rutas.getPaisesBeneficiarios);
api.get('/getDataDraft', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getDataDraft);
api.get('/getEstadoCuenta', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, rutas.getEstadoCuenta);
api.get('/getUsuariosKeePro', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'C'), validarPermisos.validarPermiso, rutas.getUsuariosKeePro);
api.get('/getContactos', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, rutas.getContactos);
api.get('/getMarcaAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, rutas.getMarcaAgentesClientes);

api.post('/genDraft', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, KeePro.certificado, certificados.store);
api.get('/getOperaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, KeePro.indexCertificado, certificados.index);
api.put('/updateOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, KeePro.certificado, certificados.update);
api.get('/getOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, KeePro.validClienteOperacion, certificados.show);
api.post('/resendMail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, KeePro.validClienteOperacion, certificadosMail.sendCertificado);


api.post('/genBeneficiario', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, KeePro.beneficiario, beneficiarios.store);
api.get('/getBeneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, KeePro.indexBeneficiario, rutas.indexBeneficiarios);
api.put('/updateBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'A'), validarPermisos.validarPermiso, KeePro.validarBeneficiarioCliente, beneficiarios.update);
api.delete('/deleteBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'E'), validarPermisos.validarPermiso, KeePro.validarBeneficiarioCliente, beneficiarios.destroy);
api.get('/getBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, KeePro.validarBeneficiarioCliente, beneficiarios.show);

api.post('/genNewUser', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'C'), validarPermisos.validarPermiso, usuarios.store);
api.get('/getNewUsers', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, usuarios.index);
api.put('/updateNewUser/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'A'), validarPermisos.validarPermiso, usuarios.update);
api.get('/getNewUser/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('NEW_USER', 'L'), validarPermisos.validarPermiso, usuarios.show);

api.get('/exportacion/certificados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, KeePro.indexCertificado, certificados.exportacion);
api.get('/facturas/pdf/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, facturas_pdf.showPDF);
api.post('/viewPdf', genPdf.genPdf);
api.get('/facturas/getXML/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, facturas.getXML);
api.get('/exportacion/antiguedadSaldosCxC', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, cuentasPorCobrar.antiguedadSaldosCxC);
api.get('/getZip/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, facturas.getZip);
api.post('/viewPdf', genPdf.genPdf)

api.post('/facturas/mail/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, facturas_mails.sendFactura)

api.get('/razonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  KeePro.indexRazonesSociales, rutas.indexAllRazonesSociales);
api.get('/razonesSociales/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  KeePro.showRazonesSociales, razonesSociales.show);

api.get('/razonesSocialesArchivos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  KeePro.indexRazonesSocialesArchivos, razonesSocialesArchivos.index);
api.get('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  KeePro.showRazonesSocialesArchivos, razonesSocialesArchivos.show);
api.put('/razonesSocialesArchivos/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso,  KeePro.showRazonesSocialesArchivos, razonesSocialesArchivos.update);
module.exports = api;