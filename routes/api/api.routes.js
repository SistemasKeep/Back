'use strict'

let express = require('express');
let rutas = require('../../controllers/get_data_certificados.controller');
let tiposCambioFuturo = require('../../controllers/tipos_cambio_futuro.controller');
let genPdf = require('../../controllers/gen_pdf.controller');
let atributosKeepro = require('../../controllers/atributos_keepro.controller');
let certificados = require('../../controllers/certificados.controller')
let certificadosMail = require('../../controllers/certificados_mails.controllers')
let beneficiarios = require('../../controllers/beneficiarios.controller')
let buques = require('../../controllers/buques.controller')
const { ApiKeePro } = require('../../middlewares/validadoresApiKeePro')
let api =  express.Router();
let token = require('../../middlewares/gentoken')
let validarPermisos = require('../../middlewares/validarPermisos');
let paises = require('../../controllers/paises.controller');
let apiKeyAuth = require('../../middlewares/apiKeyAuth');
let usuarios = require('../../controllers/usuarios.controller');
let estados = require('../../controllers/estados.controller');
let ubicacionesBienes = require('../../controllers/ubicaciones_bienes.controller');
let cfdi = require('../../controllers/cfdis.controller');

api.get('/clientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexClientes);
api.get('/oficinas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexOficinas);
api.get('/razonesSociales', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexRazonesSociales);
api.get('/servicios', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexOficinasProductos);
api.get('/monedas', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexMonedas);
api.get('/tiposContenedores', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexTiposContenedores);
api.get('/commodities', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexCommodities);
api.get('/modalidades', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexModalidades);
//api.get('/buques', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, buques.index);
api.get('/paises', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexPaises);
api.get('/paises/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, ApiKeePro.addKeepro, paises.show);
//api.get('/nacionalidadesBeneficiario', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutasPaises.index);
api.get('/estados', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexEstados);
api.get('/estados/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('ESTADOS', 'L'), validarPermisos.validarPermiso, ApiKeePro.addKeepro, estados.show);
api.get('/puertosAeropuestos', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexPuertosAeropuertos);
api.get('/ubicaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexUbicacionBienes);
api.get('/ubicaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, ApiKeePro.addKeepro, ubicacionesBienes.show);
//api.get('/getTiposBienes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.indexTiposBienes);
//api.post('/isDeducible', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.isDeducibleAtributo);
//api.post('/canRedondo', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.canRedondo);
//api.post('/canContratarRc', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.canContratarRc);
api.post('/validarSumaAsegurada', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.validSumaAsegurada);
api.get('/pdfOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, genPdf.show)
api.get('/tipoCambio/fecha/:dateFind', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, tiposCambioFuturo.getTipoCambioByFecha);
api.get('/buscarTarifa', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, atributosKeepro.findAtributo);
//api.get('/getAgentesClientes', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.getAgentesClientes);
api.get('/nacionalidadesBeneficiario', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.getPaisesBeneficiarios);
//api.get('/getDataDraft', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.getDataDraft);
//api.get('/getEstadoCuenta', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, rutas.getEstadoCuenta);

api.post('/guardarOperacion', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.certificado, certificados.store);
api.put('/actualizarOperacion/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'A'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.certificado, certificados.updateApi);
api.get('/operaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.indexCertificado, certificados.index);
api.get('/operaciones/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.validClienteOperacion, certificados.show);
api.post('/enviarOperacionCorreo/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.validClienteOperacion, certificadosMail.sendCertificado);

api.post('/guardarBeneficiario', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.beneficiario, beneficiarios.store);
api.get('/beneficiarios', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.indexBeneficiario,  rutas.indexBeneficiarios);
api.put('/actualizarBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'A'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.validarBeneficiarioCliente, beneficiarios.update);
api.delete('/eliminarBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'E'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.validarBeneficiarioCliente, beneficiarios.destroy);
api.get('/verBeneficiario/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('BENEFICIARIOS', 'L'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.validarBeneficiarioCliente, beneficiarios.show);

api.get('/exportar/operaciones', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'L'), validarPermisos.validarPermiso, ApiKeePro.indexCertificado, certificados.exportacion);

api.post('/aceptarTerminosCondicionesAutoemisor/:id', token.validarToken, token.updateToken, apiKeyAuth.validarXApiKey, usuarios.updateDateTerminosCondiciones);
api.post('/previewPdf', token.validarToken, token.updateToken, apiKeyAuth.validarXApiKey, genPdf.genPdf);


api.post('/guardarOperacionCotizacion', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.certificado, ApiKeePro.getDatosClienteDeMediador);
api.post('/facturar/:id', token.validarToken, token.updateToken, validarPermisos.addPermiso('CERTIFICADOS', 'C'), validarPermisos.validarPermiso, apiKeyAuth.validarXApiKey, ApiKeePro.getPedidoFactura, cfdi.timbrar)
module.exports = api;