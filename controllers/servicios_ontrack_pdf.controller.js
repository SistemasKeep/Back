'use strict'
const { db } = require('../models');
const moment = require('moment-timezone');
const { getArchivoLocal } = require('./carga_archivos.controller');
const { Relaciones } = require('../middlewares/relaciones');
const fs = require('fs');
const path = require('path');
const wkhtmltopdf = require('wkhtmltopdf');
const { Worker } = require('worker_threads');
const { cancelado, onTrack } = require('../middlewares/getImg');


async function genPdfLocal(id) {
  try {
    const respuesta = await getPDF(id);
    if (respuesta != undefined) {
      if (respuesta.codeError != undefined) {
        return respuesta;
      }
    }
    const htmlContent = respuesta.contenido
    if (htmlContent === undefined) {
      return { status: false, msg: "Error al generar Pdf" };
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
    return { status: false, msg: "Error interno del servidor", error: error.toString() };
  }
}

async function showPDF(req, res) {
  const { id } = req.params;
  try {
    const registroEncontrado = await db.sequelize.models.servicios_ontrack.findByPk(id, { paranoid: false });
    if (registroEncontrado == null) {
      return res.status(400).send({ status: false, msg: "Registro no existe" });
    }
    const worker = new Worker('./controllers_hilos/servicios_ontrack_pdf.controller.hilo.js', {
      workerData: { idServiciosMonitoreo: id }
    });

    worker.on('message', (result) => {
      if (result.error) {
        return res.status(500).send({ status: false, msg: "Error al generar Pdf" });
      } else {
        if (result.status !== undefined) {
          if (result.codeError !== undefined) {
            const codigoError = result.codeError
            result.codeError = undefined
            return res.status(codigoError).send(result);
          } else {
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
      return res.status(500).send({ status: false, msg: "Error al generar Pdf" });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        return res.status(500).send({ status: false, msg: "Error al generar Pdf" });
      }
    });
  } catch (error) {
    return res.status(500).send({ status: false, msg: "Error al generar Pdf", error: error.toString() });
  }
}

async function getPDF(idServiciosMonitoreo) {
  const rels = ['certificado', 'cliente.detalles_cliente', 'oficina_razon_social.oficina', 'oficina_razon_social.razon_social', 'marca', 'tipo_cambio_futuro', 'proveedor', 'estado_origen.pais', 'estado_destino.pais', 'contacto', 'estatus_ontrack']
  const findRelaciones = new Relaciones(rels, rels, db.sequelize.models)
  const relaciones = await findRelaciones.getRelaciones()
  const serviciosMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(idServiciosMonitoreo, { include: relaciones, paranoid: false });
  const nameTpl = "solicitud_ontrack.html"
  let contenido = await getTpl(nameTpl)
  contenido = await remplaceData(serviciosMonitoreo, contenido)
  if (contenido.status !== undefined) {
    contenido.codeError = 404
    return contenido;
  }
  contenido = await cancelado(contenido, serviciosMonitoreo.deletedAt != null)
  return { status: true, contenido: contenido }
}

async function getImg(marca) {
  try {
    const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(marca.archivo.id, { paranoid: false });
    if (registroEncontrado == null) {
      if (registroEncontrado.deletedAt == null) {
      }
    }
    const img = await getArchivoLocal(registroEncontrado)
    if (img.status != undefined) {
      const imgOnTrack = await onTrack()
      return `data:image/png;base64, ${imgOnTrack}`
    }
    return `data:image/png;base64, ${img}`
  } catch (error) {
      const imgOnTrack = await onTrack()
      return `data:image/png;base64, ${imgOnTrack}`
  }
}

async function getTpl(nameTpl) {
  const rutaTpl = path.join(__dirname, '../tpls/comprobantes', nameTpl);
  const contenido = fs.readFileSync(rutaTpl, 'utf8');
  return contenido
}

async function remplaceData(serviciosMonitoreo, tpl) {
  try {
    const perfilesValidosDetalles = [ 'producto' ]
    const findRelacionesDetalles = new Relaciones(perfilesValidosDetalles,perfilesValidosDetalles,db.sequelize.models)
    const relacionesDetalles = await findRelacionesDetalles.getRelaciones()
    const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: serviciosMonitoreo.id},include: relacionesDetalles,})
    const marca = await db.sequelize.models.marcas.findByPk(serviciosMonitoreo.id_marca, { include: ['archivo', 'pais'], paranoid: false });
    const fechaFull = moment(serviciosMonitoreo.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
    const fechaSolicitud = fechaFull.split(" ")[0]
    const horaSolicitud = fechaFull.split(" ")[1]
    const logo = await getImg(marca)
    const nombreContacto =  `${serviciosMonitoreo.contacto.nombre} ${serviciosMonitoreo.contacto.apellido_paterno}${serviciosMonitoreo.contacto.apellido_materno !== null && serviciosMonitoreo.contacto.apellido_materno !== undefined && serviciosMonitoreo.contacto.apellido_materno !== "" ? serviciosMonitoreo.contacto.apellido_materno : ""}`
    const firstContacto = await getFirstContacto(serviciosMonitoreo.id_cliente)
    const firstContactoTransportista = await getFirstContactoTransportista(serviciosMonitoreo.id)
    

    tpl = tpl.replace(/\{\{\$logoMarca\}\}/g, logo);
    tpl = tpl.replace(/\{\{\$nombreMarca\}\}/g, marca.nombre);
    tpl = tpl.replace(/\{\{\$fechaSolicitud\}\}/g, fechaSolicitud);
    tpl = tpl.replace(/\{\{\$horaSolicitud\}\}/g, horaSolicitud);
    tpl = tpl.replace(/\{\{\$servicioContratado\}\}/g, detalles[0].producto.descripcion);
  
    tpl = tpl.replace(/\{\{\$razonSocial\}\}/g, serviciosMonitoreo.oficina_razon_social.razon_social.razon_social);
    tpl = tpl.replace(/\{\{\$nombreContacto\}\}/g, nombreContacto);
    tpl = tpl.replace(/\{\{\$telefonoContacto\}\}/g, serviciosMonitoreo.contacto.telefono ?? "");
    tpl = tpl.replace(/\{\{\$extensionContacto\}\}/g, serviciosMonitoreo.contacto.extension ?? "");
    tpl = tpl.replace(/\{\{\$telefonoSecundarioContacto\}\}/g, firstContacto !== null && firstContacto !== undefined ? firstContacto.telefono : "");
    tpl = tpl.replace(/\{\{\$correoContacto\}\}/g, serviciosMonitoreo.contacto.email ?? "");

    tpl = tpl.replace(/\{\{\$paisOrigen\}\}/g, serviciosMonitoreo.estado_origen.pais.descripcion);
    tpl = tpl.replace(/\{\{\$estadoOrigen\}\}/g, serviciosMonitoreo.estado_origen.descripcion);
    tpl = tpl.replace(/\{\{\$domicilioOrigen\}\}/g, `${serviciosMonitoreo.ciudad_origen}, ${serviciosMonitoreo.estado_origen.descripcion}, ${serviciosMonitoreo.estado_origen.pais.descripcion}`);
    tpl = tpl.replace(/\{\{\$fechaSalida\}\}/g, moment(serviciosMonitoreo.fecha_salida).tz('America/Mexico_City').format("YYYY-MM-DD"));
    tpl = tpl.replace(/\{\{\$horaSalida\}\}/g, moment(serviciosMonitoreo.fecha_salida).tz('America/Mexico_City').format("HH:mm:ss"));

    tpl = tpl.replace(/\{\{\$paisDestino\}\}/g, serviciosMonitoreo.estado_destino.pais.descripcion);
    tpl = tpl.replace(/\{\{\$estadoDestino\}\}/g, serviciosMonitoreo.estado_destino.descripcion);
    tpl = tpl.replace(/\{\{\$domicilioDestino\}\}/g,  `${serviciosMonitoreo.ciudad_destino}, ${serviciosMonitoreo.estado_destino.descripcion}, ${serviciosMonitoreo.estado_destino.pais.descripcion}`);
    tpl = tpl.replace(/\{\{\$fechaDestino\}\}/g, moment(serviciosMonitoreo.fecha_llegada).tz('America/Mexico_City').format("YYYY-MM-DD"));
    tpl = tpl.replace(/\{\{\$horaDestino\}\}/g, moment(serviciosMonitoreo.fecha_llegada).tz('America/Mexico_City').format("HH:mm:ss"));
  
    tpl = tpl.replace(/\{\{\$numeroEmbarque\}\}/g, serviciosMonitoreo.num_conocimiento ?? "");
    tpl = tpl.replace(/\{\{\$numeroContenedor\}\}/g, serviciosMonitoreo.num_contenedor ?? "");

    tpl = tpl.replace(/\{\{\$lineaTransportista\}\}/g, serviciosMonitoreo.nombre_transportista ?? "");
    tpl = tpl.replace(/\{\{\$temporalidad\}\}/g, `${serviciosMonitoreo.temporalidad !== null && serviciosMonitoreo.temporalidad !== undefined && serviciosMonitoreo.temporalidad !== "" ? serviciosMonitoreo.temporalidad : "-"}`);
    tpl = tpl.replace(/\{\{\$telefonoTransportista\}\}/g, `${serviciosMonitoreo.telefono_transportista !== null && serviciosMonitoreo.telefono_transportista !== undefined && serviciosMonitoreo.telefono_transportista !== "" ? serviciosMonitoreo.telefono_transportista : "-"}`);
    if(firstContactoTransportista !== null && firstContactoTransportista !== undefined){
      tpl = tpl.replace(/\{\{\$telefonoSecundarioTransportista\}\}/g, `${firstContactoTransportista.telefono_principal ?? ""}${firstContactoTransportista.extension_telefono_principal !== null && firstContactoTransportista.extension_telefono_principal !== undefined && firstContactoTransportista.extension_telefono_principal !== "" ? `- ${firstContactoTransportista.extension_telefono_principal}` : ""}`);
      tpl = tpl.replace(/\{\{\$contactoTransportista\}\}/g, firstContactoTransportista.nombre_contacto ?? "");
      tpl = tpl.replace(/\{\{\$puestoTransportista\}\}/g, firstContactoTransportista.puesto ?? "");
      //tpl = tpl.replace(/\{\{\$telefonoSecundarioTransportista\}\}/g, `${firstContactoTransportista.telefono_secundario ?? ""} - ${firstContactoTransportista.extension_telefono_secundario ?? ""}`);
      tpl = tpl.replace(/\{\{\$correoTransportista\}\}/g, firstContactoTransportista.correo_electronico ?? "");
    }else{
      //tpl = tpl.replace(/\{\{\$telefonoTransportista\}\}/g, "");
      tpl = tpl.replace(/\{\{\$contactoTransportista\}\}/g, "");
      tpl = tpl.replace(/\{\{\$puestoTransportista\}\}/g, "");
      tpl = tpl.replace(/\{\{\$telefonoSecundarioTransportista\}\}/g, "");
      tpl = tpl.replace(/\{\{\$correoTransportista\}\}/g, "");
    }
  
    
  
  
    tpl = tpl.replace(/\{\{\$comentarios\}\}/g, serviciosMonitoreo.comentarios ?? "");
    return tpl
  } catch (error) {
    return undefined
  }
}

async function getFirstContacto(idCliente) {
  const idsOficinas = [];
  const oficinasAsignados = await db.sequelize.models.oficinas_cliente.findAll({where: {id_cliente: idCliente}});
  for(const oficinaAsignada of oficinasAsignados){
    idsOficinas.push(oficinaAsignada.id_oficina);
  }
  const contactosCliente = await db.sequelize.models.contactos.findAll({ where: { id_oficina: idsOficinas } });
  return contactosCliente[0]
}

async function getFirstContactoTransportista(idServiciosMonitoreo) {
  const _filtro = { id_servicio_ontrack: idServiciosMonitoreo, deletedAt: null }
  const contactosTransportistas = await db.sequelize.models.contactos_transportistas.findAll({
    where: _filtro
  })
  return contactosTransportistas[0]
}


module.exports = {
  getPDF,
  showPDF,
  remplaceData,
  genPdfLocal
}
