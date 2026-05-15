'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { NumToText } = require('../middlewares/numToText');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { Worker } = require('worker_threads');
const wkhtmltopdf = require('wkhtmltopdf');
const cheerio = require('cheerio');
const { getPolizaDetalle } = require('../middlewares/getters');
const { draft, noValido, cancelada } = require('../middlewares/getImg');
const { getAtributo } = require('./atributos_keepro.controller');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')

async function show(req, res){
    const { id } = req.params;
    if(!Number.isInteger(parseInt(id))){
        res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
        return false
    } 
    try {
        const registroEncontrado = await db.sequelize.models.certificados.findByPk(id, {paranoid: false});
        if(registroEncontrado == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroEncontrado.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
        const isAutoemisor = !req.usuario.es_colaborador && req.usuario.es_autoemisor
		const idsProveedoresNoPermitidos = [6,8]
        if(idsProveedoresNoPermitidos.includes(registroEncontrado.id_proveedor) && isAutoemisor){
			return res.status(400).send({ status: false, msg: "No se puede visualizar este certificado. Comuníquese con su operativo para solicitarlo." });
        }
        const worker = new Worker('./controllers_hilos/gen_pdf.controller.hilo.js', {
            workerData: { idCertificadoPDF: id }
        });
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error al generar Pdf"});
            } else {
                if(result.status !== undefined){
                    return res.status(400).send(result);
                }
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');
                const pdfBuffer = Buffer.from(result);
                return res.send(pdfBuffer);
            }
        });
        worker.on('error', (err) => {
            return res.status(500).send({ status: false, msg: "Error al generar Pdf"});
        });
    } catch (error) {
        return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    } 
}


async function genPdfBuffer(idCertificado){
    try {
        const registroEncontrado = await db.sequelize.models.certificados.findByPk(idCertificado, {include:['poliza_detalle', 'moneda', 'detalle_certificado', 'beneficiario', 'cliente', 'modalidad_transporte', 'commoditie', 'tipo_contenedor', 'tamanio_contenedor', 'buque', 'puerto_aeropuerto_origen', 'puerto_aeropuerto_destino', 'ubicacion_bienes', 'oficina_razon_social'],paranoid: false});
        if(registroEncontrado != null){
            //return res.status(500).send({ status: false, msg: "Error interno del servidor", error: registroEncontrado});
            const htmlContent = await loadTpl(registroEncontrado);
            if(htmlContent === undefined){
                return { status: false, msg: "Error al generar Pdf"};
            }
            const options = {
                pageSize: 'A4', // Puede ser 'A4', 'Letter', 'Legal', etc.
            };
            return new Promise((resolve, reject) => {
                const buffers = [];
                
                wkhtmltopdf(htmlContent, options)
                  .on('data', (chunk) => buffers.push(chunk)) // Guarda cada fragmento del PDF en un buffer
                  .on('end', () => resolve(Buffer.concat(buffers))) // Combina todos los buffers en uno solo
                  .on('error', reject);
            });
        }
    } catch (error) {
        return { status: false, msg: "Error interno del servidor", error: error.toString()}
    } 
}


async function genPdfBufferTerminosYCondiciones(idCertificado){
    try {
        const registroEncontrado = await db.sequelize.models.certificados.findByPk(idCertificado, {include:['poliza_detalle'],paranoid: false});

        if(registroEncontrado != null){
            const tpl = await db.sequelize.models.tpls.findByPk(registroEncontrado.poliza_detalle.id_tpl,{attributes: ['terminos_condiciones']});
            const fileBuffer = Buffer.from(tpl.terminos_condiciones, 'base64');
    
            return fileBuffer
        }
    } catch (error) {
        return { status: false, msg: "Error interno del servidor", error: error.toString()}
    } 
}

async function loadTpl(operacion){
    const tpl = await db.sequelize.models.tpls.findByPk(operacion.poliza_detalle.id_tpl,{attributes: ['certificado']});
    if(tpl != null){ 
        try {
            const dataBuffer = Buffer.from(tpl.certificado, 'base64');
            const originalString = dataBuffer.toString('utf-8');
            var htmlContent = originalString;
            const idsProveedoresNoPermitidos = [6,8]
            if(idsProveedoresNoPermitidos.includes(operacion.id_proveedor)){
                htmlContent = await noValido(htmlContent)
            }else{
                if(operacion.estatus == "C"){
                    htmlContent = await cancelada(htmlContent,true)
                }else{
                    htmlContent = await draft(htmlContent,operacion.draft_certificado)
                }
            }
            
            htmlContent = await remplaceData(operacion,htmlContent)
            return htmlContent;
        } catch (error) {
            return undefined
        } 
    }
    return undefined

}

async function remplaceData(operacion,tpl){
    try {
        const env = process.env.NODE_ENV;
        const serverPruebas = process.env.IS_SERVERPRUEBAS;
        if(env != 'producction' && serverPruebas != 'true'){
            const $ = cheerio.load(tpl);
            $('div.Pagina').each((index, element) => {
                // Verificar si el div tiene la clase "p1"
                if (!$(element).hasClass('p1')) {
                    // Eliminar el div si no tiene la clase "p1"
                    $(element).remove();
                }
            });
            $('style').each((index, style) => {
                let css = $(style).html();
                css = css.replace(/\.ContentIndex\s*\{[^}]*top:\s*\d+%;[^}]*\}/, 
                    '.ContentIndex { position: relative; top: 200px; left: 0; right: 0; padding: 10px; transform: translateY(-50%); box-sizing: border-box; }');
                $(style).html(css);
            });
            $('link[href="http://fonts.googleapis.com/css?family=Helvetica"]').remove();
            tpl = $.html();
        }
        if(operacion.datos_adicionales.length > 3000){
            const $ = cheerio.load(tpl);
            $('.ContentIndex td').css('font-size', '7px');
            tpl = $.html();
        }else{
            const $ = cheerio.load(tpl);
            $('.ContentIndex td').css('font-size', '12px');
            tpl = $.html();
        }
    } catch (error) {
    }
    const validadorRc = operacion.tipo_cobertura.toLowerCase().split(" ")
    const isRC = validadorRc.includes('rc') && !Number.isInteger(parseInt(operacion.detalle_certificado[0].id_atributo_keepro)) 
    const isContenedor = validadorRc.includes('contenedor') 
    if(isRC || isContenedor){
        tpl = tpl.replace(/\{\{\$costoTarifa\}\}/g, "");
        var tarifaCompra = (parseFloat(operacion.venta_cliente_final)).toLocaleString('es-US', { style: 'currency', currency: operacion.moneda.clave });
        tarifaCompra = tarifaCompra.replace(operacion.moneda.clave,"").trim()
        tpl = tpl.replace(/\{\{\$getTarifaVenta\}\}/g, tarifaCompra);
    }else{
        tpl = tpl.replace(/\{\{\$getTarifaVenta\}\}/g, operacion.venta_cliente_final);
        tpl = tpl.replace(/\{\{\$costoTarifa\}\}/g, "%");
    }
    const razonSocial = await db.sequelize.models.razones_sociales.findByPk(operacion.oficina_razon_social.id_razon_social);
    let fechaCreacionDate
    let formatoCreacion
    if(operacion.draft_certificado == true){
        fechaCreacionDate = operacion.certifiedAt
        formatoCreacion = moment(moment(operacion.fecha_inicio_cobertura).format('YYYY-MM-DD 12:00:00')) < moment(moment(operacion.certifiedAt).format('YYYY-MM-DD 12:00:00')) ? 'DD-MM-YYYY 00:00:00' : 'DD-MM-YYYY HH:mm:ss'
    }else{
        fechaCreacionDate = operacion.createdAt
        formatoCreacion = 'DD-MM-YYYY HH:mm:ss'
    }
    const fechaCreacion = moment(fechaCreacionDate).tz('America/Mexico_City').format(formatoCreacion);
    const fechaInicio = moment(operacion.fecha_inicio_cobertura).tz('America/Mexico_City').format('DD-MM-YYYY');
    const fechaFin = operacion.fecha_fin_cobertura != null && operacion.fecha_fin_cobertura != undefined ? moment(operacion.fecha_fin_cobertura).tz('America/Mexico_City').format('DD-MM-YYYY') : '';
    const domicilio = await db.sequelize.models.domicilios.findByPk(operacion.beneficiario.id_domicilio, {include:['estado'],paranoid: false});
    const paisDomicilio = domicilio.estado != null ? await db.sequelize.models.paises.findByPk(domicilio.estado.id_pais, {paranoid: false}) : null;
    const estadoOrigen = await db.sequelize.models.estados.findByPk(operacion.id_estado_origen, {include:['pais'],paranoid: false});
    const estadoDestino = await db.sequelize.models.estados.findByPk(operacion.id_estado_destino, {include:['pais'],paranoid: false});
    const estadoDestinoRedondo = await db.sequelize.models.estados.findByPk(operacion.id_estado_destino_redondo, {include:['pais'],paranoid: false});
    const modalidad = await db.sequelize.models.modalidades.findByPk(operacion.id_modalidad);
    const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
    const isMaritimo = modalidadNombre == 'maritimo';
    const isAereo = modalidadNombre == 'aereo';
    const NumText = new NumToText(operacion.suma_asegurada)
    const sumaAseguradaTxt = NumText.numberToWords()
    const showPrecioRC = isRC
    const rcDirecto = operacion.detalle_certificado[0].id_atributo_keepro != null && isRC
    if(isRC != true || rcDirecto){
        var sumaAsegurada = (parseFloat(operacion.suma_asegurada)).toLocaleString('es-US', { style: 'currency', currency: operacion.moneda.clave });
        sumaAsegurada = sumaAsegurada.replace(operacion.moneda.clave,"").trim()
        sumaAsegurada = sumaAsegurada
    } else{
        let whereRC = {
            where:{
                [db.Sequelize.Op.or]: {
                    id_certificado_rc:operacion.id
                },
            },paranoid: false,include:['certificado']
        }
        let certificadosRc = await db.sequelize.models.certificados_rc.findOne(whereRC);
        const certificadoOP = await db.sequelize.models.certificados.findByPk(certificadosRc.certificado.id, {include:['moneda'],paranoid: false});
        var sumaAsegurada = (parseFloat(certificadoOP.suma_asegurada)).toLocaleString('es-US', { style: 'currency', currency: certificadoOP.moneda.clave });
        sumaAsegurada = sumaAsegurada.replace(certificadoOP.moneda.clave,"").trim()
        sumaAsegurada = sumaAsegurada
    }
    const SumaRC = new NumToText(50000)
    const sumaRCTxt = SumaRC.numberToWords()
    tpl = tpl.replace(/\{\{\$securityNumber\}\}/g, operacion.no_seguridad);
    tpl = tpl.replace(/\{\{\$tipoContendor\}\}/g, operacion.tipo_cobertura);
    tpl = tpl.replace(/\{\{\$noOperacion\}\}/g, operacion.no_operacion);
    tpl = tpl.replace(/\{\{\$referencia\}\}/g, operacion.referencias != null ? operacion.referencias : '');
    tpl = tpl.replace(/\{\{\$getFechaCreated\}\}/g, fechaCreacion);
    tpl = tpl.replace(/\{\{\$dataContratante\}\}/g, razonSocial.razon_social);
    tpl = tpl.replace(/\{\{\$beneficiarioNombre\}\}/g, operacion.beneficiario.nombre);
    tpl = tpl.replace(/\{\{\$beneficiarioRfc\}\}/g, operacion.beneficiario.rfc);
    tpl = tpl.replace(/\{\{\$beneficiarioDom\}\}/g, `${domicilio.calle} ${domicilio.num_ext}${domicilio.num_int != null ? `-${domicilio.num_int}` : ''}, ${domicilio.colonia}, ${domicilio.codigo_postal}${domicilio.ciudad_localidad != null ? `, ${domicilio.ciudad_localidad}, `: ', '}${domicilio.municipio}, ${domicilio.estado == null ? '': domicilio.estado.descripcion}, ${paisDomicilio == null ? '': paisDomicilio.descripcion}`);
    if(!isContenedor){
        tpl = tpl.replace(/\{\{\$commodityNombre\}\}/g, operacion.commoditie.descripcion);
    }else{
        tpl = tpl.replace(/\{\{\$tipoContenedor\}\}/g, operacion.tipo_contenedor.descripcion)
        tpl = tpl.replace(/\{\{\$tamanioContenedor\}\}/g, operacion.tamanio_contenedor.descripcion)
        tpl = tpl.replace(/\{\{\$numContenedor\}\}/g, operacion.num_contenedor)
    }
    tpl = tpl.replace(/\{\{\$datosAdicionales\}\}/g, operacion.datos_adicionales != undefined ? operacion.datos_adicionales : '');
    tpl = tpl.replace(/\{\{\$descripcionCarga\}\}/g, operacion.descripcion_carga);
    tpl = tpl.replace(/\{\{\$valorAsegurado\}\}/g, sumaAsegurada);
    tpl = tpl.replace(/\{\{\$valorAseguradoTxt\}\}/g, sumaAseguradaTxt);
    tpl = tpl.replace(/\{\{\$showPrecioRC\}\}/g, `${showPrecioRC ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$numeroAtexto50\}\}/g, sumaRCTxt);
    tpl = tpl.replace(/\{\{\$claveMoneda\}\}/g, operacion.moneda.clave);
    tpl = tpl.replace(/\{\{\$transporte\}\}/g, operacion.modalidad_transporte.nombre);
    tpl = tpl.replace(/\{\{\$haveBuque\}\}/g, `${operacion.buque !== null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getBuque\}\}/g, `${operacion.buque !== null ? operacion.buque.nombre: ''}`);
    tpl = tpl.replace(/\{\{\$showNumViaje\}\}/g, `${operacion.num_viaje !== null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getNomViaje\}\}/g, `${operacion.num_viaje !== null ? operacion.num_viaje: ''}`);
    tpl = tpl.replace(/\{\{\$getFechaSalida\}\}/g, fechaInicio);
    tpl = tpl.replace(/\{\{\$getFechaEntrega\}\}/g, fechaFin);
    tpl = tpl.replace(/\{\{\$tramoEmbarque\}\}/g, operacion.tramo_embarque);
    tpl = tpl.replace(/\{\{\$tipoOperacion\}\}/g, operacion.tipo_operacion);
    tpl = tpl.replace(/\{\{\$getOrigenCarga\}\}/g, `${estadoOrigen.pais.descripcion} ${estadoOrigen.descripcion} ${operacion.ciudad_origen}`);
    tpl = tpl.replace(/\{\{\$getDomDestino\}\}/g, `${estadoDestino.pais.descripcion} ${estadoDestino.descripcion} ${operacion.ciudad_destino}`);
    tpl = tpl.replace(/\{\{\$showDestinoRedondo\}\}/g, `${operacion.poliza_detalle.is_redondo === true ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$showDomDestinoRedondo\}\}/g, `${estadoDestinoRedondo != null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getTipoViaje\}\}/g, `${estadoDestinoRedondo != null ? 'Redondo': 'Sencillo'}`);
    if(estadoDestinoRedondo != null){
        tpl = tpl.replace(/\{\{\$getDestinoRedondo\}\}/g, `${estadoDestinoRedondo.pais.descripcion} ${estadoDestinoRedondo.descripcion} ${operacion.ciudad_destino_redondo}`);
    }
    
    
    
    tpl = tpl.replace(/\{\{\$showPolAolPodAod\}\}/g, `${ isMaritimo || isAereo ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$namePAOrigen\}\}/g, `${ isMaritimo? 'POL / Puerto principal de carga:': isAereo ?'AOL / Aeropuerto principal de carga:' : ''}`);
    tpl = tpl.replace(/\{\{\$namePADestino\}\}/g, `${ isMaritimo ? 'POD / Puerto de descarga o internación:': isAereo ?'AOD / Aeropuerto de descarga o internación:' : ''}`);
    if(operacion.puerto_aeropuerto_origen != null){
        tpl = tpl.replace(/\{\{\$getPuertoCarga\}\}/g, operacion.puerto_aeropuerto_origen.descripcion);
    }
    if(operacion.puerto_aeropuerto_destino != null){
        tpl = tpl.replace(/\{\{\$getPuertoDescarga\}\}/g, operacion.puerto_aeropuerto_destino.descripcion);
    }
    tpl = tpl.replace(/\{\{\$ubicacionBienes\}\}/g, operacion.ubicacion_bienes == null ? '' : operacion.ubicacion_bienes.descripcion);
    tpl = tpl.replace(/\{\{\$ruta\}\}/g, operacion.ruta != null ? operacion.ruta : '');
    tpl = tpl.replace(/\{\{\$showTarifaVenta\}\}/g, `${operacion.venta_cliente_final != null ? 'block': 'none'}`);
    return tpl
}

async function genPdf(req, res){
    
    try {
        const htmlContent = await tplTopdf(req,res);
        if(htmlContent == null){
            return null
        }
        if(htmlContent === undefined){
            return res.status(500).send({ status: false, msg: "Error al generar Pdf"});
        }
        const options = {
            pageSize: 'A4', // Puede ser 'A4', 'Letter', 'Legal', etc.
        };
        res.contentType('application/pdf');
        return wkhtmltopdf(htmlContent,options).pipe(res);
    } catch (error) {
        return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    } 
}

async function tplTopdf(req,res){
	const parametros = req.body;
    if(req.query.keepro == 3){
		let fechaStringAux = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
		let fechaBusqueda = moment(fechaStringAux).tz('America/Mexico_City')
	
		let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
		if(doit !== true){
			return doit
		}
		const tipoCambioSelectedAux = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaStringAux}});
		if(tipoCambioSelectedAux == null){
			return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
		}
        parametros.keepro = req.query.keepro 
        if(parametros.idServicio === null || parametros.idServicio === undefined || parametros.idServicio === ""){
            res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idServicio" });
            return  null
        }
        parametros.idOficinaProducto = parametros.idServicio
        const copiaParametros = JSON.parse(JSON.stringify(parametros));
        copiaParametros.sumaAsegurada = parametros.idMoneda === 1 ? parseFloat(parseFloat(parametros.sumaAsegurada / tipoCambioSelectedAux.tipo_cambio).toFixed(2)) : parametros.sumaAsegurada
        const atributo =  await getAtributo(copiaParametros)
        if(atributo.status === false){
            if(atributo.msg == 'No se encontro registros'){
                res.status(400).send({ status: false, msg: "No existen tarifas con la suma asegurada seleccionada."})
                return null
            }
            res.status(400).send(atributo)
            return null
        }
        parametros.idAtributo = atributo.id
    }
    const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idAtributo);
    if(atributoKeepro == null){
        return undefined
    }
    const proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include: ['marca_agente_oficina','producto']});
    if(oficinaProducto === null){
        return undefined
    }
    const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
    const polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
    if(polizaDetalle === undefined){
        return undefined
    } else if(polizaDetalle === null){
        return undefined
    }
    const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
    const tpl = await db.sequelize.models.tpls.findByPk(polizaDetalle.id_poliza,{attributes: ['certificado']});
    if(parametros.idMoneda === null || parametros.idMoneda === undefined || parametros.idMoneda === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idMoneda" });
        return  null
    }
    const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
    if(parametros.idUbicacionBienes === null || parametros.idUbicacionBienes === undefined || parametros.idUbicacionBienes === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idUbicacionBienes" });
        return  null
    }
    const ubicacionBien = await db.sequelize.models.ubicaciones_bienes.findByPk(parametros.idUbicacionBienes);
    if(ubicacionBien == null){
        res.status(400).send({ status: false, msg: "No existen la ubicación de bien seleccionada."})
        return null
    }
    if(parametros.razonSocial === null || parametros.razonSocial === undefined || parametros.razonSocial === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "razonSocial" });
        return  null
    }
    if(parametros.fechaInicio === null || parametros.fechaInicio === undefined || parametros.fechaInicio === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "fechaInicio" });
        return  null
    }
    if(parametros.fechaFin === null || parametros.fechaFin === undefined || parametros.fechaFin === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "fechaFin" });
        return  null
    }
    if(parametros.idEstadoOrigen === null || parametros.idEstadoOrigen === undefined || parametros.idEstadoOrigen === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idEstadoOrigen" });
        return  null
    }
    if(parametros.idEstadoDestino === null || parametros.idEstadoDestino === undefined || parametros.idEstadoDestino === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idEstadoDestino" });
        return  null
    }
    if(parametros.idModalidad === null || parametros.idModalidad === undefined || parametros.idModalidad === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idModalidad" });
        return  null
    }
    if(parametros.sumaAsegurada === null || parametros.sumaAsegurada === undefined || parametros.sumaAsegurada === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "sumaAsegurada" });
        return  null
    }
    if(parametros.ciudadOrigen === null || parametros.ciudadOrigen === undefined || parametros.ciudadOrigen === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "ciudadOrigen" });
        return  null
    }
    if(parametros.ciudadDestino === null || parametros.ciudadDestino === undefined || parametros.ciudadDestino === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "ciudadDestino" });
        return  null
    }
    if(parametros.idModalidad === null || parametros.idModalidad === undefined || parametros.idModalidad === ""){
        res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idModalidad" });
        return  null
    }
    if(tpl != null){ 
        try {
            const dataBuffer = Buffer.from(tpl.certificado, 'base64');
            const originalString = dataBuffer.toString('utf-8');
            var htmlContent = originalString;
            htmlContent = await noValido(htmlContent,false)
            const operacion = {
                tipo_cobertura : tipoCobertura.nombre,
                detalle_certificado:[{
                    id_atributo_keepro: atributoKeepro.id
                }],
                moneda: moneda.toJSON(),
                datos_adicionales: parametros.datosAdicionales ?? "",
                venta_cliente_final: null,
                razonSocial: parametros.razonSocial,
                fecha_inicio_cobertura: parametros.fechaInicio,
                fecha_fin_cobertura:parametros.fechaFin,
                domicilio: ManipuladorCadenas.toTitle("Emiliano Zapata 1385, int. 31, Guanajuato, Guanajuato, Mexico"),
                id_estado_origen:parametros.idEstadoOrigen,
                id_estado_destino:parametros.idEstadoDestino,
                id_estado_destino_redondo: null,
                id_modalidad: parametros.idModalidad,
                suma_asegurada: parametros.sumaAsegurada,
                no_seguridad: "0000000000000000",
                no_operacion: "XXXXXXXXXXXXXXXX",
                referencias: parametros.referencias ?? "",
                beneficiario: {
                    nombre: "Nombre Beneficiario",
                    rfc: "XXXXXXXXXXXXX"
                    
                },
                buque: null,
                num_viaje: null,
                ciudad_origen: parametros.ciudadOrigen,
                ciudad_destino: parametros.ciudadDestino,
                poliza_detalle: {is_redondo:false},
                ubicacion_bienes: ubicacionBien.toJSON(),
                ruta: parametros.ruta ?? ""
            }
            if(parametros.idModalidad == 2){  
                const puertoAeropuertoOrigen = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoOrigen);
                const puertoAeropuertoDestino = await db.sequelize.models.puertos_aeropuertos.findByPk(parametros.idPuertoAeropuertoDestino);     
                if(puertoAeropuertoOrigen == null){
                    res.status(400).send({ status: false, msg: "No existen el aeropuerto de Origen seleccionado."})
                    return null
                }  
                if(puertoAeropuertoDestino == null){
                    res.status(400).send({ status: false, msg: "No existen el aeropuerto de Destino seleccionado."})
                    return null
                }  
                operacion.puerto_aeropuerto_origen = puertoAeropuertoOrigen.toJSON()
                operacion.puerto_aeropuerto_destino = puertoAeropuertoDestino.toJSON()
            }
            if(oficinaProducto.producto.id_tipo_cobertura == 2){
                if(parametros.idTipoContenedor === null || parametros.idTipoContenedor === undefined || parametros.idTipoContenedor === ""){
                    res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idTipoContenedor" });
                    return  null
                }
                if(parametros.idTamanioContenedor === null || parametros.idTamanioContenedor === undefined || parametros.idTamanioContenedor === ""){
                    res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idTamanioContenedor" });
                    return  null
                }
                if(parametros.numContenedor === null || parametros.numContenedor === undefined || parametros.numContenedor === ""){
                    res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "numContenedor" });
                    return  null
                }
                const tipoContenedor = await db.sequelize.models.tipo_contenedor.findByPk(parametros.idTipoContenedor);
                const tamanioContenedor = await db.sequelize.models.tamanios_contenedor.findByPk(parametros.idTamanioContenedor);
                operacion.tipo_contenedor = tipoContenedor.toJSON()
                operacion.tamanio_contenedor = tamanioContenedor.toJSON()
                operacion.num_contenedor = parametros.numContenedor
                operacion.descripcion_carga = ""
            }else{
                if(parametros.idCommoditie === null || parametros.idCommoditie === undefined || parametros.idCommoditie === ""){
                    res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "idCommoditie" });
                    return  null
                }
                if(parametros.descripcionCarga === null || parametros.descripcionCarga === undefined || parametros.descripcionCarga === ""){
                    res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: "descripcionCarga" });
                    return  null
                }
                const commoditie = await db.sequelize.models.commoditys.findByPk(parametros.idCommoditie);
                operacion.commoditie = commoditie.toJSON()
                operacion.descripcion_carga = parametros.descripcionCarga
                operacion.num_contenedor = ""
            }
            htmlContent = await remplaceDataDraft(operacion,htmlContent)
            return htmlContent;
        } catch (error) {
            console.log(error)
            return undefined
        } 
    }
    return undefined
}

async function remplaceDataDraft(operacion,tpl){
    try {
        const env = process.env.NODE_ENV;
        const serverPruebas = process.env.IS_SERVERPRUEBAS;
        if(env != 'producction' && serverPruebas != 'true'){
            const $ = cheerio.load(tpl);
            $('div.Pagina').each((index, element) => {
                // Verificar si el div tiene la clase "p1"
                if (!$(element).hasClass('p1')) {
                    // Eliminar el div si no tiene la clase "p1"
                    $(element).remove();
                }
            });
            $('style').each((index, style) => {
                let css = $(style).html();
                css = css.replace(/\.ContentIndex\s*\{[^}]*top:\s*\d+%;[^}]*\}/, 
                    '.ContentIndex { position: relative; top: 200px; left: 0; right: 0; padding: 10px; transform: translateY(-50%); box-sizing: border-box; }');
                $(style).html(css);
            });
            $('link[href="http://fonts.googleapis.com/css?family=Helvetica"]').remove();
            tpl = $.html();
        }
        if(operacion.datos_adicionales.length > 3000){
            const $ = cheerio.load(tpl);
            $('.ContentIndex td').css('font-size', '7px');
            tpl = $.html();
        }else{
            const $ = cheerio.load(tpl);
            $('.ContentIndex td').css('font-size', '12px');
            tpl = $.html();
        }
    } catch (error) {
    }
    const validadorRc = operacion.tipo_cobertura.toLowerCase().split(" ")
    const isRC = validadorRc.includes('rc') && !Number.isInteger(parseInt(operacion.detalle_certificado[0].id_atributo_keepro)) 
    const isContenedor = validadorRc.includes('contenedor') 
    if(isRC || isContenedor){
        tpl = tpl.replace(/\{\{\$costoTarifa\}\}/g, "");
        var tarifaCompra = (parseFloat(operacion.venta_cliente_final)).toLocaleString('es-US', { style: 'currency', currency: operacion.moneda.clave });
        tarifaCompra = tarifaCompra.replace(operacion.moneda.clave,"").trim()
        tpl = tpl.replace(/\{\{\$getTarifaVenta\}\}/g, tarifaCompra);
    }else{
        tpl = tpl.replace(/\{\{\$getTarifaVenta\}\}/g, operacion.venta_cliente_final);
        tpl = tpl.replace(/\{\{\$costoTarifa\}\}/g, "%");
    }
    const fechaCreacion = moment().tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss');
    const fechaInicio = moment(operacion.fecha_inicio_cobertura).tz('America/Mexico_City').format('DD-MM-YYYY');
    const fechaFin = operacion.fecha_fin_cobertura != null && operacion.fecha_fin_cobertura != undefined ? moment(operacion.fecha_fin_cobertura).tz('America/Mexico_City').format('DD-MM-YYYY') : '';

    const estadoOrigen = await db.sequelize.models.estados.findByPk(operacion.id_estado_origen, {include:['pais'],paranoid: false});
    const estadoDestino = await db.sequelize.models.estados.findByPk(operacion.id_estado_destino, {include:['pais'],paranoid: false});
    const estadoDestinoRedondo = await db.sequelize.models.estados.findByPk(operacion.id_estado_destino_redondo, {include:['pais'],paranoid: false});
    const modalidad = await db.sequelize.models.modalidades.findByPk(operacion.id_modalidad);
    const modalidadNombre = await ManipuladorCadenas.quitarAcentos(modalidad.nombre.toLowerCase());
    const isMaritimo = modalidadNombre == 'maritimo';
    const isAereo = modalidadNombre == 'aereo';
    const NumText = new NumToText(operacion.suma_asegurada)
    const sumaAseguradaTxt = NumText.numberToWords()
    const showPrecioRC = isRC
    const rcDirecto = operacion.detalle_certificado[0].id_atributo_keepro != null && isRC
    if(isRC != true || rcDirecto){
        var sumaAsegurada = (parseFloat(operacion.suma_asegurada)).toLocaleString('es-US', { style: 'currency', currency: operacion.moneda.clave });
        sumaAsegurada = sumaAsegurada.replace(operacion.moneda.clave,"").trim()
        sumaAsegurada = sumaAsegurada
    } else{
        let whereRC = {
            where:{
                [db.Sequelize.Op.or]: {
                    id_certificado_rc:operacion.id
                },
            },paranoid: false,include:['certificado']
        }
        let certificadosRc = await db.sequelize.models.certificados_rc.findOne(whereRC);
        const certificadoOP = await db.sequelize.models.certificados.findByPk(certificadosRc.certificado.id, {include:['moneda'],paranoid: false});
        var sumaAsegurada = (parseFloat(certificadoOP.suma_asegurada)).toLocaleString('es-US', { style: 'currency', currency: certificadoOP.moneda.clave });
        sumaAsegurada = sumaAsegurada.replace(certificadoOP.moneda.clave,"").trim()
        sumaAsegurada = sumaAsegurada
    }
    const SumaRC = new NumToText(50000)
    const sumaRCTxt = SumaRC.numberToWords()
    tpl = tpl.replace(/\{\{\$securityNumber\}\}/g, operacion.no_seguridad);
    tpl = tpl.replace(/\{\{\$tipoContendor\}\}/g, operacion.tipo_cobertura);
    tpl = tpl.replace(/\{\{\$noOperacion\}\}/g, operacion.no_operacion);
    tpl = tpl.replace(/\{\{\$referencia\}\}/g, operacion.referencias != null ? operacion.referencias : '');
    tpl = tpl.replace(/\{\{\$getFechaCreated\}\}/g, fechaCreacion);
    tpl = tpl.replace(/\{\{\$dataContratante\}\}/g, operacion.razonSocial);
    tpl = tpl.replace(/\{\{\$beneficiarioNombre\}\}/g, operacion.beneficiario.nombre);
    tpl = tpl.replace(/\{\{\$beneficiarioRfc\}\}/g, operacion.beneficiario.rfc);
    tpl = tpl.replace(/\{\{\$beneficiarioDom\}\}/g, operacion.domicilio);
    if(!isContenedor){
        tpl = tpl.replace(/\{\{\$commodityNombre\}\}/g, operacion.commoditie.descripcion);
    }else{
        tpl = tpl.replace(/\{\{\$tipoContenedor\}\}/g, operacion.tipo_contenedor.descripcion)
        tpl = tpl.replace(/\{\{\$tamanioContenedor\}\}/g, operacion.tamanio_contenedor.descripcion)
        tpl = tpl.replace(/\{\{\$numContenedor\}\}/g, operacion.num_contenedor)
    }
    tpl = tpl.replace(/\{\{\$datosAdicionales\}\}/g, operacion.datos_adicionales != undefined ? operacion.datos_adicionales : '');
    tpl = tpl.replace(/\{\{\$descripcionCarga\}\}/g, operacion.descripcion_carga);
    tpl = tpl.replace(/\{\{\$valorAsegurado\}\}/g, sumaAsegurada);
    tpl = tpl.replace(/\{\{\$valorAseguradoTxt\}\}/g, sumaAseguradaTxt);
    tpl = tpl.replace(/\{\{\$showPrecioRC\}\}/g, `${showPrecioRC ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$numeroAtexto50\}\}/g, sumaRCTxt);
    tpl = tpl.replace(/\{\{\$claveMoneda\}\}/g, operacion.moneda.clave);
    tpl = tpl.replace(/\{\{\$transporte\}\}/g, modalidad.nombre);
    tpl = tpl.replace(/\{\{\$haveBuque\}\}/g, `${operacion.buque !== null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getBuque\}\}/g, `${operacion.buque !== null ? operacion.buque.nombre: ''}`);
    tpl = tpl.replace(/\{\{\$showNumViaje\}\}/g, `${operacion.num_viaje !== null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getNomViaje\}\}/g, `${operacion.num_viaje !== null ? operacion.num_viaje: ''}`);
    tpl = tpl.replace(/\{\{\$getFechaSalida\}\}/g, fechaInicio);
    tpl = tpl.replace(/\{\{\$getFechaEntrega\}\}/g, fechaFin);
    tpl = tpl.replace(/\{\{\$tramoEmbarque\}\}/g, operacion.tramo_embarque);
    tpl = tpl.replace(/\{\{\$tipoOperacion\}\}/g, operacion.tipo_operacion);
    tpl = tpl.replace(/\{\{\$getOrigenCarga\}\}/g, `${estadoOrigen.pais.descripcion} ${estadoOrigen.descripcion} ${operacion.ciudad_origen}`);
    tpl = tpl.replace(/\{\{\$getDomDestino\}\}/g, `${estadoDestino.pais.descripcion} ${estadoDestino.descripcion} ${operacion.ciudad_destino}`);
    tpl = tpl.replace(/\{\{\$showDestinoRedondo\}\}/g, `${operacion.poliza_detalle.is_redondo === true ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$showDomDestinoRedondo\}\}/g, `${estadoDestinoRedondo != null ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$getTipoViaje\}\}/g, `${estadoDestinoRedondo != null ? 'Redondo': 'Sencillo'}`);
    if(estadoDestinoRedondo != null){
        tpl = tpl.replace(/\{\{\$getDestinoRedondo\}\}/g, `${estadoDestinoRedondo.pais.descripcion} ${estadoDestinoRedondo.descripcion} ${operacion.ciudad_destino_redondo}`);
    }
    
    
    
    tpl = tpl.replace(/\{\{\$showPolAolPodAod\}\}/g, `${ isMaritimo || isAereo ? 'block': 'none'}`);
    tpl = tpl.replace(/\{\{\$namePAOrigen\}\}/g, `${ isMaritimo? 'POL / Puerto principal de carga:': isAereo ?'AOL / Aeropuerto principal de carga:' : ''}`);
    tpl = tpl.replace(/\{\{\$namePADestino\}\}/g, `${ isMaritimo ? 'POD / Puerto de descarga o internación:': isAereo ?'AOD / Aeropuerto de descarga o internación:' : ''}`);
    if(operacion.puerto_aeropuerto_origen != null){
        tpl = tpl.replace(/\{\{\$getPuertoCarga\}\}/g, operacion.puerto_aeropuerto_origen.descripcion);
    }
    if(operacion.puerto_aeropuerto_destino != null){
        tpl = tpl.replace(/\{\{\$getPuertoDescarga\}\}/g, operacion.puerto_aeropuerto_destino.descripcion);
    }
    tpl = tpl.replace(/\{\{\$ubicacionBienes\}\}/g, operacion.ubicacion_bienes == null ? '' : operacion.ubicacion_bienes.descripcion);
    tpl = tpl.replace(/\{\{\$ruta\}\}/g, operacion.ruta != null ? operacion.ruta : '');
    tpl = tpl.replace(/\{\{\$showTarifaVenta\}\}/g, `${operacion.venta_cliente_final != null ? 'block': 'none'}`);
    return tpl
}


module.exports = {
    show,
    genPdf,
    genPdfBuffer,
    genPdfBufferTerminosYCondiciones
}
