'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { NumberConverter } = require('../middlewares/numToTextEsp');
const { getArchivoLocal } = require('./carga_archivos.controller');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const fs = require('fs');
const path = require('path');
const wkhtmltopdf = require('wkhtmltopdf');
const xml2js = require('xml2js');
const QRCode = require('qrcode');
const { Worker } = require('worker_threads');
const namesTpls = {
    'mx': 'mexico.html'
}
const { cancelado, keepro } = require('../middlewares/getImg');

async function genPdfLocal(id){
    try {
        const respuesta = await getPDF(id);
        if(respuesta != undefined){
            if(respuesta.codeError != undefined){
                return respuesta;
            }
        }
        const htmlContent = respuesta.contenido
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
    } catch (error) {
      return { status: false, msg: "Error interno del servidor", error: error.toString()};
    }
}

async function showPDF(req, res){
	const { id } = req.params;
    try {
        const registroEncontrado = await db.sequelize.models.facturas.findByPk(id, {paranoid: false});
        if(registroEncontrado == null){
          return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        const worker = new Worker('./controllers_hilos/facturacion_pdf.controller.hilo.js', {
            workerData: { idFactura: id }
        });
    
        worker.on('message', (result) => {
            if (result.error) {
                return res.status(500).send({ status: false, msg: "Error al generar Pdf"});
            } else {
              if(result.status !== undefined){
                if(result.codeError !== undefined){
                  const codigoError = result.codeError
                  result.codeError = undefined
                  return res.status(codigoError).send(result);
                }else{
                  return res.status(404).send(result);
                }
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
    
        worker.on('exit', (code) => {
            if (code !== 0){
                return res.status(500).send({ status: false, msg: "Error al generar Pdf"});
            }
        });
    } catch (error) {
		    return res.status(500).send({ status: false, msg: "Error al generar Pdf", error: error.toString()});
    }
}

async function getPDF(idFactura){
	const factura = await db.sequelize.models.facturas.findByPk(idFactura, { include:['cfdi'],paranoid: false });
    const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais'],paranoid: false });
    const nameTpl = namesTpls[marca.pais.clave.toLowerCase()]
    if(nameTpl == undefined){
		  return { status: false, codeError: 404, msg: "No existe tpl para la marca seleccionda"}
    }
    var contenido = await getTpl(nameTpl)
    contenido = await remplaceData(factura,contenido)
    if(contenido.status !== undefined){
      contenido.codeError = 404
      return contenido;
    }
    contenido = await cancelado(contenido,factura.deletedAt != null)
    return { status: true, contenido: contenido}
}

async function getImg(marca){
  try {
      const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(marca.archivo.id,{ paranoid: false });
      if(registroEncontrado == null){
          if(registroEncontrado.deletedAt == null){
          }
      }
      const img = await getArchivoLocal(registroEncontrado)
      if(img.status != undefined){
        const imgKeepro = await keepro()
        return `data:image/png;base64, ${imgKeepro}`
      }
      return `data:image/png;base64, ${img}`
  } catch (error) {
        const imgKeepro = await keepro()
        return `data:image/png;base64, ${imgKeepro}`
  }
}

async function getTpl(nameTpl){
    const rutaTpl = path.join(__dirname, '../tpls/facturas', nameTpl);
    const contenido = fs.readFileSync(rutaTpl, 'utf8');
    return contenido
}

async function remplaceData(factura,tpl){
  try {
    const facturaDetalles = await db.sequelize.models.factura_detalles.findAll({ where:{id_factura:factura.id},paranoid: false })
    var certificado
    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalles[0].id_pedido_factura, {paranoid: false });
    if(pedidoFactura != null){
      certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['beneficiario'],paranoid: false });
    }
    const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['archivo','pais'],paranoid: false });
	  const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['datos_facturacion_domicilios','regimen_fiscal'],paranoid: false });
    var domicilioFiscalEmisor
    for(const domicilio of datoFacturacionEmisor.datos_facturacion_domicilios){
        if(domicilio.tipo == 'F'){
            domicilioFiscalEmisor = domicilio
        }
    }
    domicilioFiscalEmisor = await db.sequelize.models.domicilios.findByPk(domicilioFiscalEmisor.id_domicilio, { paranoid: false });
    const domicilioEmisor = `${domicilioFiscalEmisor.calle.toUpperCase()} ${domicilioFiscalEmisor.num_ext.toUpperCase()} ${domicilioFiscalEmisor.colonia.toUpperCase()}`
	  const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { include:['razones_sociales_domicilios'],paranoid: false });
    var domicilioFiscalReceptor
    for(const domicilio of razonSocialReceptor.razones_sociales_domicilios){
        if(domicilio.tipo == 'F'){
          domicilioFiscalReceptor = domicilio
        }
    }
    domicilioFiscalReceptor = await db.sequelize.models.domicilios.findByPk(domicilioFiscalReceptor.id_domicilio, { include:['estado'],paranoid: false });
    const domicilioReceptor = `${domicilioFiscalReceptor.calle.toUpperCase()} No.${domicilioFiscalReceptor.num_ext.toUpperCase()}${domicilioFiscalReceptor.num_int != '' && domicilioFiscalReceptor.num_int != null? " int."+domicilioFiscalReceptor.num_int.toUpperCase()+",":","} ${domicilioFiscalReceptor.municipio.toUpperCase()}, ${domicilioFiscalReceptor.colonia != null ?domicilioFiscalReceptor.colonia.toUpperCase() : ""}, ${domicilioFiscalReceptor.codigo_postal.toUpperCase()}, ${domicilioFiscalReceptor.estado.descripcion.toUpperCase()}`
	  const logo = await getImg(marca)
    let regimenFiscalEmisor 
    try {
      regimenFiscalEmisor = `(${datoFacturacionEmisor.regimen_fiscal.clave}) ${datoFacturacionEmisor.regimen_fiscal.descripcion}`
    } catch (error) {
      regimenFiscalEmisor = ''
    }
    const bancos = await getBancos(marca.clave);
    const correo = await getCorreo(marca.clave);
    var haveDescuento = true
    //if(marca.pais.clave.toLowerCase() == "pa")
    if(marca.pais.clave.toLowerCase() == "mx"){
      if(factura.id_cfdi === null){
        return { status: false, msg: "La factura no fue timbrada" }
      }
      const xml = await xmlToJSON(factura.cfdi.xml)
      for(const conceptos of xml["cfdi:Comprobante"]["cfdi:Conceptos"]){
        for(const concepto of conceptos['cfdi:Concepto']){
          const dataConcepto = concepto["\$"]
          haveDescuento = dataConcepto['Descuento'] == undefined ? false : haveDescuento
        }
      }
      const regimenFiscalReceptorData = await db.sequelize.models.regimenes_fiscal.findOne({ where:{ clave:xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]["RegimenFiscalReceptor"] },paranoid: false });
      let regimenFiscalReceptor 
      try {
        regimenFiscalReceptor = `(${regimenFiscalReceptorData.clave}) ${regimenFiscalReceptorData.descripcion}`
      } catch (error) {
        regimenFiscalReceptor = xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]["RegimenFiscalReceptor"]
      }
      const detallesFactura = await getDetallesFacturaXML(facturaDetalles,xml["cfdi:Comprobante"]["cfdi:Conceptos"],haveDescuento);
      const totalTxt = await getTotalText(parseFloat(xml["cfdi:Comprobante"]["\$"]['Total']),xml["cfdi:Comprobante"]["\$"]['Moneda'])
      let metodoPago = await db.sequelize.models.metodos_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['MetodoPago']},paranoid: false });
      metodoPago = `(${metodoPago.clave}) ${metodoPago.descripcion}`
      let formaPago = await db.sequelize.models.formas_pago.findOne({ where:{clave: xml["cfdi:Comprobante"]["\$"]['FormaPago']},paranoid: false });
      formaPago = `(${formaPago.clave}) ${formaPago.descripcion}`
      let usoCFDI = await db.sequelize.models.usos_cfdi.findOne({ where:{clave: xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]['UsoCFDI']},paranoid: false });
      usoCFDI = `(${usoCFDI.clave}) ${usoCFDI.descripcion}`
      const qr = await getQr(xml, factura.cfdi.cadena_original)
      tpl = tpl.replace(/\{\{\$logoMarca\}\}/g, logo);
      tpl = tpl.replace(/\{\{\$getRegimenFiscalReceptor\}\}/g, regimenFiscalReceptor);
      tpl = tpl.replace(/\{\{\$nombreMarca\}\}/g, marca.nombre);
      tpl = tpl.replace(/\{\{\$folio\}\}/g, xml["cfdi:Comprobante"]["\$"]['Folio']);
      tpl = tpl.replace(/\{\{\$fechaComprobante\}\}/g, moment(xml["cfdi:Comprobante"]["\$"]['Fecha']).tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss'));
      tpl = tpl.replace(/\{\{\$factura\}\}/g, 'Factura electrónica');
      tpl = tpl.replace(/\{\{\$getRazonSocial\}\}/g, xml["cfdi:Comprobante"]["cfdi:Emisor"][0]["\$"]['Nombre']);
      try {
        tpl = tpl.replace(/\{\{\$getNameBeneficiario\}\}/g, certificado.beneficiario.nombre);
      } catch (error) {
        tpl = tpl.replace(/\{\{\$getNameBeneficiario\}\}/g, "");
      }
      tpl = tpl.replace(/\{\{\$emisorRfc\}\}/g, xml["cfdi:Comprobante"]["cfdi:Emisor"][0]["\$"]['Rfc']);
      tpl = tpl.replace(/\{\{\$geDirEmpresa\}\}/g, domicilioEmisor);
      tpl = tpl.replace(/\{\{\$getCPEmpresa\}\}/g, domicilioFiscalEmisor.codigo_postal);
      tpl = tpl.replace(/\{\{\$getRegimenFiscal\}\}/g, regimenFiscalEmisor);
      tpl = tpl.replace(/\{\{\$getBancos\}\}/g, bancos);
      tpl = tpl.replace(/\{\{\$getCorreo\}\}/g, correo);
      tpl = tpl.replace(/\{\{\$receptorNombre\}\}/g, xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]['Nombre']);
      tpl = tpl.replace(/\{\{\$receptorRfc\}\}/g, xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]['Rfc']);
      tpl = tpl.replace(/\{\{\$getDomFiscal\}\}/g, domicilioReceptor);
      tpl = tpl.replace(/\{\{\$showThDescuento\}\}/g, haveDescuento ? '<th width="10%" style="text-align: right;">Descuento</th>' : '');
      tpl = tpl.replace(/\{\{\$showDescuento\}\}/g, haveDescuento ? 'block' : 'none');
      tpl = tpl.replace(/\{\{\$detallesFactura\}\}/g, detallesFactura);
      tpl = tpl.replace(/\{\{\$cantidadLetra\}\}/g, totalTxt);
      tpl = tpl.replace(/\{\{\$metodoPago\}\}/g, metodoPago);
      tpl = tpl.replace(/\{\{\$tipoCambio\}\}/g, parseFloat(xml["cfdi:Comprobante"]["\$"]['TipoCambio']).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$subTotal\}\}/g, parseFloat(xml["cfdi:Comprobante"]["\$"]['SubTotal']).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$getMontoDescuento\}\}/g, parseFloat(xml["cfdi:Comprobante"]["\$"]['Descuento'] != undefined ? xml["cfdi:Comprobante"]["\$"]['Descuento'] : "0.0000" ).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$getMontosIVA\}\}/g, parseFloat(xml["cfdi:Comprobante"]["cfdi:Impuestos"][0]["\$"]["TotalImpuestosTrasladados"]).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$getTotal\}\}/g, parseFloat(xml["cfdi:Comprobante"]["\$"]['Total']).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$formaPago\}\}/g, formaPago);
      tpl = tpl.replace(/\{\{\$usoCfdi\}\}/g, usoCFDI);
      tpl = tpl.replace(/\{\{\$noCertificado\}\}/g, xml["cfdi:Comprobante"]["\$"]['NoCertificado']);
      tpl = tpl.replace(/\{\{\$uuid\}\}/g, xml["cfdi:Comprobante"]["cfdi:Complemento"][0]["tfd:TimbreFiscalDigital"][0]["\$"]['UUID']);
      tpl = tpl.replace(/\{\{\$noCertificadoSat\}\}/g, xml["cfdi:Comprobante"]["cfdi:Complemento"][0]["tfd:TimbreFiscalDigital"][0]["\$"]['NoCertificadoSAT']);
      tpl = tpl.replace(/\{\{\$fechaTimbrado\}\}/g, moment(xml["cfdi:Comprobante"]["\$"]['Fecha']).tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss'));
      tpl = tpl.replace(/\{\{\$lugarExpedicion\}\}/g, xml["cfdi:Comprobante"]["\$"]['LugarExpedicion']);
      tpl = tpl.replace(/\{\{\$versionCfdi\}\}/g, xml["cfdi:Comprobante"]["\$"]['Version']);
      tpl = tpl.replace(/\{\{\$selloCFD\}\}/g, xml["cfdi:Comprobante"]["cfdi:Complemento"][0]["tfd:TimbreFiscalDigital"][0]["\$"]["SelloCFD"]);
      tpl = tpl.replace(/\{\{\$selloSat\}\}/g, xml["cfdi:Comprobante"]["cfdi:Complemento"][0]["tfd:TimbreFiscalDigital"][0]["\$"]["SelloSAT"]);
      tpl = tpl.replace(/\{\{\$cadenaOriginal\}\}/g, factura.cfdi.cadena_original);
      tpl = tpl.replace(/\{\{\$getQr\}\}/g, qr);
    } else {
      tpl = tpl.replace(/\{\{\$logoMarca\}\}/g, logo);
      tpl = tpl.replace(/\{\{\$nombreMarca\}\}/g, marca.nombre);
      tpl = tpl.replace(/\{\{\$folio\}\}/g, factura.folio);
      tpl = tpl.replace(/\{\{\$fechaComprobante\}\}/g, moment(factura.createdAt).tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss'));
      tpl = tpl.replace(/\{\{\$getClienteRazonSocial\}\}/g, razonSocialReceptor.razon_social);
      tpl = tpl.replace(/\{\{\$getClienteRuc\}\}/g, razonSocialReceptor.no_identificacion);
      try {
      tpl = tpl.replace(/\{\{\$getClienteNombre\}\}/g, certificado.beneficiario.nombre);
      } catch (error) {
        tpl = tpl.replace(/\{\{\$getClienteNombre\}\}/g, "");
      }
      tpl = tpl.replace(/\{\{\$getDomFiscal\}\}/g, domicilioReceptor);
      tpl = tpl.replace(/\{\{\$getBancos\}\}/g, bancos);
      var haveIva
      var subtotalFactura = 0
      var impuestoFactura = 0
      var descuentoFactura = 0
      for(const detalle of facturaDetalles){
        const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
        const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
        const impuesto = parseFloat(detalle.impuesto ?? 0)
        const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
        subtotalFactura = subtotalFactura + (valorUnitario * cantidad ) + impuesto
        descuentoFactura = descuentoFactura + descuentoGeneral
        impuestoFactura = impuestoFactura + impuesto
        if(impuesto > 0){
          haveIva = true
        }
      }
      const moneda = await db.sequelize.models.monedas.findByPk(factura.id_moneda, { paranoid: false });
      const totalFactura = subtotalFactura - descuentoFactura + impuestoFactura
      const totalTxt = await getTotalText(parseFloat(totalFactura),moneda.clave)
      tpl = tpl.replace(/\{\{\$cantidadLetra\}\}/g, totalTxt);
      const detallesFactura = await getDetallesFactura(facturaDetalles);
      tpl = tpl.replace(/\{\{\$getCorreo\}\}/g, correo);
      tpl = tpl.replace(/\{\{\$showIva\}\}/g, haveIva == true ? 'block' : 'none');
      tpl = tpl.replace(/\{\{\$detallesFactura\}\}/g, detallesFactura);
      tpl = tpl.replace(/\{\{\$getMontoSubtotal\}\}/g, parseFloat(subtotalFactura).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$showBlockIva\}\}/g, haveIva == true ? 'block' : 'none');
      tpl = tpl.replace(/\{\{\$getMontoIva\}\}/g, parseFloat(impuestoFactura).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$getMontosDescuento\}\}/g, parseFloat(descuentoFactura).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      tpl = tpl.replace(/\{\{\$getMontoImporte\}\}/g, parseFloat(totalFactura).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
      //Se obtiene el tipo de cambio del dia
      let fechaString = moment(factura.createAt).tz('America/Mexico_City').format('YYYY-MM-DD')
      let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
  
      let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
      if(doit !== true){
        return doit
      }
      const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
      if(tipoCambioSelected == undefined){
        return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
      }
      tpl = tpl.replace(/\{\{\$getMontoTipoCambio\}\}/g, parseFloat(tipoCambioSelected.tipo_cambio).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  }));
    }
    tpl = tpl.replace(/\{\{\$comentariosFactura\}\}/g, factura.comentarios ?? "");
    return tpl
  } catch (error) {
  }
}

async function xmlToJSON(xmlString){
    const parser = new xml2js.Parser();
    var xmlJSON = undefined
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        xmlJSON = { status: false, msg: "Error al convertir XML a JSON", error: err.toString()};
      }
      xmlJSON = result
    });
    return xmlJSON
}

async function getBancos(claveMarca) {
    let bancos = [];
  
    const banco1 = {
      nombre: 'BANCO BASE',
      moneda: 'USD',
      cuenta: '-',
      swift: 'BBSEMXMX',
      clabe: '145320457851302019'
    };
    //bancos.push(banco1);

    const banco2 = {
      nombre: 'BANCO BASE',
      moneda: 'MXN',
      cuenta: '-',
      swift: '-',
      clabe: '145320457851301010'
    };
    //bancos.push(banco2);
  
    const banco3 = {
      nombre: 'BANORTE',
      moneda: 'USD',
      cuenta: '1092956783',
      swift: 'MENOMXMTXXX',
      clabe: '072320010929567830'
    };
    //bancos.push(banco3);

    const banco4 = {
      nombre: 'BANORTE',
      moneda: 'MXN',
      cuenta: '1289761116',
      swift: '-',
      clabe: '072320012897611162'
    };
    //bancos.push(banco4);

    const banco5 = {
      nombre: 'BANREGIO',
      moneda: 'USD',
      cuenta: '136939560024',
      swift: 'RGIOMXMTXXX',
      clabe: '058320000152480064'
    };
    //bancos.push(banco5);

    const banco6 = {
      nombre: 'BANREGIO',
      moneda: 'MXN',
      cuenta: '136939560016',
      swift: '-',
      clabe: '058320000152387251'
    };
    //bancos.push(banco6);


    const banco7 = {
      nombre: 'SANTANDER (MXN)',
      moneda: 'MXN',
      cuenta: '65511341925',
      swift: '',
      clabe: '014320655113419256'
    };
    bancos.push(banco7);

    const banco8 = {
      nombre: 'SANTANDER (USD)',
      moneda: 'USD',
      cuenta: '82501248747',
      swift: 'BMSXMXMMXXX',
      clabe: '014320825012487478'
    };
    bancos.push(banco8);

    let html = '<table width="100%" style="font-size: 12px;"><tr class="small-text text-left"><th style="padding:1px 5px">BANCO</th><th style="padding:1px 5px">CUENTA</th><th style="padding:1px 5px">CLABE</th><th style="padding:1px 5px">SWIFT</th></tr>';
  
    bancos.forEach(banco => {
      html += `<tr><td>${banco.nombre}(${banco.moneda})</td><td>${banco.cuenta}</td><td>${banco.clabe != null && banco.clabe != undefined ? banco.clabe : 'N/A'}</td><td>${banco.swift}</td></tr>`;
    });
    
    html += '</table>';
    return html;
}

async function getCorreo(claveMarca){
  if(claveMarca === "keepro") {
    return "test@test.com";
  } else if (claveMarca === "keepro") {
    return "test@test.com";
  } else if (claveMarca === "keepro") {
    return 'ctest@test.com';
  } else {
    return "test@test.com";
  }
}

async function getDetallesFacturaXML(detalles,conceptosData, haveDescuento){
  let detallesFactura = ''
  var index = 0
  for(const conceptos of conceptosData){
    for(const concepto of conceptos['cfdi:Concepto']){
      const detalle = detalles[index]
      const dataConcepto = concepto["\$"]
      const iva = concepto['cfdi:Impuestos'][0]['cfdi:Traslados'][0]['cfdi:Traslado'][0]["\$"]['Importe']
      const detalleHtml = `<tr>
        <td style="text-align:right;">${dataConcepto['Cantidad']}<br></td>
        <td style="text-align:left;">
          ${dataConcepto['Unidad']}<br />
          <span style="color:gray;font-size:10px;">Clave SAT: ${dataConcepto['ClaveUnidad']}</span><br>
        </td>
        <td style="text-align:left;">
          <span>
            <span style="color:gray;">(${dataConcepto['NoIdentificacion']})&nbsp;</span>
            ${dataConcepto['Descripcion'].split('-')[0]} <br />
            <span style="color:gray;font-size: 10px;">Clave SAT:
              ${dataConcepto['ClaveProdServ']}</span><br>
            <span style="color:gray;font-size: 10px;">Leyenda CFDI:
              </span>
          </span>
          <div class="small-text" style="padding-top:10px; display: {{$showComentarios}}">
          ${detalle.comentarios}
          </div>
        </td>
        <td style="text-align: right;">${parseFloat(dataConcepto['ValorUnitario']).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
        <td style="text-align: right; display:${haveDescuento ? 'block' : 'none'};">${ parseFloat(dataConcepto['Descuento'] != undefined ? dataConcepto['Descuento'] : '0.0000').toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
        <td style="text-align: right;">${ parseFloat(iva).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
        <td style="text-align: right;">${((parseFloat(dataConcepto['ValorUnitario']) * parseFloat(dataConcepto['Cantidad']))-parseFloat(dataConcepto['Descuento'] != undefined ? dataConcepto['Descuento'] : '0.0000')+parseFloat(iva)).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
      </tr>`
      detallesFactura = detallesFactura + detalleHtml
      index = index +1
    }
  }
  
  return detallesFactura
}

async function getDetallesFactura(detalles){
  let detallesFactura = ''
  for(const detalle of detalles){
    const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
    var producto
    var subtotal
    var descuento
    var impuestoCertificado
    if(pedidoFactura != null){
      if(pedidoFactura.id_certificado !== null){
        const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
        const poliza = await db.sequelize.models.polizas.findByPk(certificado.id_poliza, { paranoid: false })
        producto = await db.sequelize.models.productos.findOne({ where:{id_tipo_cobertura: poliza.id_tipo_cobertura}, include:['producto_unidad_medida'],paranoid: false })
      } else{
        producto = await db.sequelize.models.productos.findByPk(detalle.id_producto,{ include:['producto_unidad_medida'],paranoid: false })
      }
    } else{
      producto = await db.sequelize.models.productos.findByPk(detalle.id_producto,{ include:['producto_unidad_medida'],paranoid: false })
    }
    const valorUnitario = parseFloat(detalle.precio_unitario ?? 0)
    const descuentoGeneral = parseFloat(detalle.descuento ?? 0)
    const impuesto = parseFloat(detalle.impuesto ?? 0)
    const cantidad = parseInt(detalle.cantidad != null ? detalle.cantidad : 1) 
    const detalleHtml = `<tr>
        <td style="text-align:right;">${cantidad}<br></td>
        <td style="text-align:left;">
          ${producto.producto_unidad_medida.nombre}<br />
          <span style="color:gray;font-size:10px;">Clave SAT: ${producto.producto_unidad_medida.clave_unidad_medida_sat}</span><br>
        </td>
        <td style="text-align:left;">
          <span>
            <span style="color:gray;">(${producto.clave})&nbsp;</span>
            ${producto.producto_servicio_sat} <br />
            <span style="color:gray;font-size: 10px;">Clave SAT:
              ${producto.clave_producto_servicio_sat}</span><br>
            <span style="color:gray;font-size: 10px;">Leyenda CFDI:
              </span>
          </span>
          <div class="small-text" style="padding-top:10px; display: {{$showComentarios}}">
          ${detalle.comentarios}
          </div>
        </td>
        <td style="text-align: right;">${parseFloat(valorUnitario).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
        <td style="text-align: right; display:${descuentoGeneral > 0 ? 'block' : 'none'};">${ parseFloat(descuentoGeneral).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
        ${impuesto > 0 ? `<td style="text-align: right;">${ parseFloat(impuesto).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>`: ''}
        <td style="text-align: right;">${((parseFloat(valorUnitario) * cantidad)-parseFloat(descuentoGeneral)+parseFloat(impuesto)).toLocaleString('es-US', { style: 'currency', currency: 'USD',  minimumFractionDigits: 4, maximumFractionDigits: 4  })}<br></td>
      </tr>`
      detallesFactura = detallesFactura + detalleHtml
  }
  return detallesFactura
}

async function getTotalText(numero, claveMoneda){
  const entero = parseInt(numero)
  const decimales = parseFloat(parseFloat(parseFloat((parseFloat(numero) - entero).toLocaleString('es-US')) * 100).toFixed(2))
  const converter = new NumberConverter();
  if(numero  > 1.99){
    claveMoneda = claveMoneda + "s"
  }
  const symbolCurrencyText ={
    "MXNs" : "pesos mexicanos",
    "MXN" : "peso mexicano",
    "USDs" : "dolares americanos",
    "USD" : "dolar americano",
    "PENs" : "soles peruanos",
    "PEN" : "sole peruano",
    "GTQs" : "quetzales guatemaltecos",
    "GTQ" : "quetzal guatemalteco"
  }
  return converter.convertNumber(entero).toUpperCase() + " " + symbolCurrencyText[claveMoneda].toUpperCase() + " " + decimales + "/100"
}

async function getQr(xml, cadena_original) {
  const re = xml["cfdi:Comprobante"]["cfdi:Emisor"][0]["\$"]['Rfc'];
  const rr = xml["cfdi:Comprobante"]["cfdi:Receptor"][0]["\$"]['Rfc'];
  const sello = xml["cfdi:Comprobante"]["\$"]['Sello'];
  const fe = sello.slice(-8);
  const uuid = xml["cfdi:Comprobante"]["cfdi:Complemento"][0]["tfd:TimbreFiscalDigital"][0]["\$"]['UUID'];
  const cadenaOriginal = cadena_original.split('|');
  const tt = cadenaOriginal[13];
  const qrUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${re}&rr=${rr}&tt=${tt}&fe=${fe}`;
  
  return QRCode.toString(qrUrl, { type: 'svg' })
      .then(qr => {
          let qrAux = qr.replace('<?xml version="1.0" encoding="UTF-8"?>\n', '');
          const start = qr.indexOf('viewBox');
          const aux = qr.substring(start, start + 19);
          qrAux = qrAux.replace(aux, `${aux} style="height:150px; width:150px"`);
          return qrAux;
      })
      .catch(err => {
      });
}


module.exports = {
  getPDF,
  showPDF,
  remplaceData,
  genPdfLocal,
  xmlToJSON
}
