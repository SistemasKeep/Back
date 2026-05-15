'use strict'
const {db} = require('../models');
const axios = require('axios')
const moment = require('moment-timezone');
const {CryptoMiddleware} = require('../middlewares/desEncrpJson');
const { Relaciones } = require('../middlewares/relaciones');
const {Validaciones} = require('../middlewares/validaciones');
const { sendMailFactura } = require('./facturas_mails.controllers')
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')
const fs = require('fs');
const path = require('path');

async function timbrar(req, res){
	const parametros = req.body;
    const pedidosFactura = parametros.pedidosFactura ?? []
    if(pedidosFactura.length < 1 && Array.isArray(pedidosFactura)){
		res.status(400).send({status:false , msg: `El parametro pedidosFactura no debe estar vacío.` });
		return false
	} 
    try {
        var cliente = undefined
        var moneda = undefined
        var continuar = true
        var razonSocial = undefined
        var marca = undefined
        const storeFacturaDetalles = []
        const storeOCs = []
        const findRelaciones = new Relaciones([ 'certificado', 'factura_detalle.factura', 'servicios_ontrack' ],[ 'certificado', 'factura_detalle.factura', 'servicios_ontrack' ],db.sequelize.models)
        const relaciones = await findRelaciones.getRelaciones()
        let totalFactura = 0
        for(const pedidoFactura of pedidosFactura){
            if(continuar){
                const registroEncontrado = await db.sequelize.models.pedidos_factura.findByPk(pedidoFactura, {include:relaciones,paranoid: false});
                if(registroEncontrado == null){
                    continuar = false
                    return res.status(400).send({status:false , msg: `No se encontro pedido de factura con id: ${pedidoFactura}.` });
                } else{
                    if(registroEncontrado.certificado !== null){
                        const certificado = await db.sequelize.models.certificados.findByPk(registroEncontrado.certificado.id, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado','tipo_cambio_futuro'],paranoid: false });
                        if(cliente === undefined){
                            cliente = certificado.id_cliente
                        }
                        if(moneda === undefined){
                            moneda = certificado.id_moneda
                        }
                        if(razonSocial === undefined){
                            razonSocial = certificado.oficina_razon_social.id_razon_social
                        }
                        if(marca === undefined){
                            marca = certificado.id_marca
                        }
                        const clienteCert = await db.sequelize.models.clientes.findByPk(certificado.id_cliente, { include:['detalles_cliente'] });
                        if(clienteCert.detalles_cliente.bloqueado === true){
                            return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
                        }
                        if(registroEncontrado.estatus != "P"){
                            continuar = false
                            return res.status(400).send({status:false , msg: `Los pedidos factura no deben estar facturados.` });
                        } else if(cliente != certificado.id_cliente){
                            continuar = false
                            return res.status(400).send({status:false , msg: `El cliente asignado en todos los pedidos factura deben ser el mismo.` });
                        } else if(moneda != certificado.id_moneda){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La moneda asignada en todos los pedidos factura deben ser la misma.` });
                        } else if(razonSocial != certificado.oficina_razon_social.id_razon_social){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La razon social asignada en todos los pedidos factura deben ser la misma.` });
                        } else if(marca != certificado.id_marca){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La marca asignada en todos los pedidos factura deben ser la misma.` });
                        } else{
                            const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca, { include:['pais','domicilio'],paranoid: false });
                            const moneda = await db.sequelize.models.monedas.findByPk(certificado.id_moneda);
                            const paisOrigen = await db.sequelize.models.paises.findByPk(certificado.estado_origen.id_pais);
                            const paisDestino = await db.sequelize.models.paises.findByPk(certificado.estado_destino.id_pais);
                            const tipoCambio = parseFloat(certificado.tipo_cambio_futuro.tipo_cambio)
                            const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(razonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
                            if(razonSocialAux.bloqueado == true){
                                return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
                            }
                            const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial,id_marca:marca.id}})
                            let razonValidada = true
                            if(razonesSocialesValidaciones == null){
                                const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                                const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                                if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                                    razonValidada = false
                                }
                            } else{
                                if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
                                    const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                                    const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                                    if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                                        razonValidada = false
                                    }
                                }else{
                                    razonValidada = true
                                }
                            }
                            if(!razonValidada){
                                return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
                            }
                            if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
                                const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
                                return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
                            }
                            const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
                            if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
                                if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
                                    return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
                                }
                                if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
                                    return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
                                }
                            }
                            const nameTipoCobertura = certificado.tipo_cobertura.toLowerCase().split(" ")
                            const isRC = nameTipoCobertura.includes('rc')
                            let producto
                            if(isRC && certificado.detalle_certificado[0].id_atributo_keepro == null){
                                producto = await db.sequelize.models.productos.findOne({ where:{descripcion: { [db.Sequelize.Op.like]: `%rc%` }}, include:['producto_unidad_medida'],paranoid: false });
                            }else{
                                const atributoKP = await db.sequelize.models.atributos_keepro.findByPk(certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
                                const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKP.id_oficina_producto, {include: ['producto']});
                                producto = await db.sequelize.models.productos.findByPk(oficinaProducto.producto.id,{ include:['producto_unidad_medida'],paranoid: false });
                            }
                            let subtotal = certificado.detalle_certificado[0].subtotal
                            let descuento = certificado.detalle_certificado[0].descuento_monto
                            let impuestoCertificado = certificado.detalle_certificado[0].monto_iva
                            var minimoVenta = parseFloat(certificado.detalle_certificado[0].minimo_venta)
                            if(moneda.id == 1){
                                minimoVenta = minimoVenta * tipoCambio
                            }
                            totalFactura = totalFactura + certificado.detalle_certificado[0].total
                            const minimoInfo = moneda.id == 1 ? `${(parseFloat(certificado.detalle_certificado[0].minimo_venta)).toLocaleString('es-US', { style: 'currency', currency: "USD" })} USD * TC (${tipoCambio}) = ${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el valor a facturar (Valor asegurado x Tarifa) es menor al mínimo de venta acordado, se facturará el mínimo de venta.` : `${( minimoVenta).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> Si el valor a facturar (Valor asegurado x Tarifa) es menor al mínimo de venta acordado, se facturará el mínimo de venta.`
                            const registroFacturaDetalles = {
                                id_pedido_factura: pedidoFactura,
                                id_moneda: certificado.id_moneda,
                                id_usuario_registro: req.usuario.id,
                                id_producto: producto.id,
                                cantidad: 1,
                                precio_unitario: subtotal,
                                subtotal: subtotal,
                                impuesto: impuestoCertificado,
                                descuento: descuento,
                                comentarios: `Referencia ${marca.nombre}:${certificado.no_operacion}<br> 
                                              Referencia del Cliente: ${(certificado.referencias !== null && certificado.referencias !== '' && certificado.referencias !== undefined ? certificado.referencias : '')}<br> 
                                              Folio del certificado:  ${certificado.no_seguridad}<br> 
                                              Tipo de Cobertura:  ${certificado.tipo_cobertura}<br> 
                                              Valor Asegurado:  ${parseFloat(certificado.suma_asegurada).toLocaleString('es-US', { style: 'currency', currency: "USD" })} ${moneda.clave}<br> 
                                              Origen:  ${paisOrigen.descripcion}<br> 
                                              Destino:  ${paisDestino.descripcion}<br> 
                                              Tarifa:  ${certificado.detalle_certificado[0].tarifa_final_cliente == null ? 0.0 : certificado.detalle_certificado[0].tarifa_final_cliente}%<br> 
                                              Mínimo de Venta: ${minimoInfo} `,
                                createdAt: moment().tz('America/Mexico_City')
                            }
                            storeFacturaDetalles.push(registroFacturaDetalles)
                        }
                    }else if(registroEncontrado.servicios_ontrack !== null){
                        const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(registroEncontrado.servicios_ontrack.id, { include:['oficina_razon_social', 'estado_origen','estado_destino', 'servicios_ontrack_detalles','tipo_cambio_futuro'],paranoid: false });
                        if(cliente === undefined){
                            cliente = servicioMonitoreo.id_cliente
                        }
                        if(moneda === undefined){
                            moneda = servicioMonitoreo.id_moneda
                        }
                        if(razonSocial === undefined){
                            razonSocial = servicioMonitoreo.oficina_razon_social.id_razon_social
                        }
                        if(marca === undefined){
                            marca = servicioMonitoreo.id_marca
                        }
                        const clienteCert = await db.sequelize.models.clientes.findByPk(servicioMonitoreo.id_cliente, { include:['detalles_cliente'] });
                        if(clienteCert.detalles_cliente.bloqueado === true){
                            return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
                        }
                        if(registroEncontrado.estatus != "P"){
                            continuar = false
                            return res.status(400).send({status:false , msg: `Los pedidos factura no deben estar facturados.` });
                        } else if(cliente != servicioMonitoreo.id_cliente){
                            continuar = false
                            return res.status(400).send({status:false , msg: `El cliente asignado en todos los pedidos factura deben ser el mismo.` });
                        } else if(moneda != servicioMonitoreo.id_moneda){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La moneda asignada en todos los pedidos factura deben ser la misma.` });
                        } else if(razonSocial != servicioMonitoreo.oficina_razon_social.id_razon_social){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La razon social asignada en todos los pedidos factura deben ser la misma.` });
                        } else if(marca != servicioMonitoreo.id_marca){
                            continuar = false
                            return res.status(400).send({status:false , msg: `La marca asignada en todos los pedidos factura deben ser la misma.` });
                        } else{
                            const marca = await db.sequelize.models.marcas.findByPk(servicioMonitoreo.id_marca, { include:['pais','domicilio'],paranoid: false });
                            const moneda = await db.sequelize.models.monedas.findByPk(servicioMonitoreo.id_moneda);
                            const paisOrigen = await db.sequelize.models.paises.findByPk(servicioMonitoreo.estado_origen.id_pais);
                            const paisDestino = await db.sequelize.models.paises.findByPk(servicioMonitoreo.estado_destino.id_pais);
                            const tipoCambio = parseFloat(servicioMonitoreo.tipo_cambio_futuro.tipo_cambio)
                            const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(razonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
                            if(razonSocialAux.bloqueado == true){
                                return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
                            }
                            const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:razonSocial,id_marca:marca.id}})
                            let razonValidada = true
                            if(razonesSocialesValidaciones == null){
                                const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                                const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                                if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                                    razonValidada = false
                                }
                            } else{
                                if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
                                    const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                                    const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                                    if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                                        razonValidada = false
                                    }
                                }else{
                                    razonValidada = true
                                }
                            }
                            if(!razonValidada){
                                return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
                            }
                            if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
                                const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
                                return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
                            }
                            const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
                            if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
                                if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
                                    return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
                                }
                                if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
                                    return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
                                }
                            }
                            if(servicioMonitoreo.id_proveedor == null){
                                continuar = false
                                return res.status(400).send({status:false , msg: `No se puede generar la factura. No se ha asignado un proveedor al servicio de monitoreo.` });
                            }
                            const proveedor = await db.sequelize.models.proveedores.findByPk(servicioMonitoreo.id_proveedor);
                            const registrosEncontrados = await db.sequelize.models.ordenes_compra.findAll({
                                where: {
                                    id_marca: servicioMonitoreo.id_marca
                                }
                            });
                            let subtotal = 0
                            let impuestos = 0
                            let descuento = 0
                            for(const detalle of servicioMonitoreo.servicios_ontrack_detalles){
                                subtotal = subtotal += detalle.costo_compra
                                if(proveedor.id_nacionalidad == 96){
                                    impuestos = impuestos += (detalle.costo_compra * 0.16)
                                }
                            }
                            const dataOC = {
                                payload: {
                                    folio: marca.clave + "-" + (registrosEncontrados.length + 1),
                                    id_moneda: servicioMonitoreo.id_moneda_compra,
                                    id_proveedor: servicioMonitoreo.id_proveedor,
                                    id_marca: servicioMonitoreo.id_marca,
                                    referencia: "",
                                    subtotal: subtotal,
                                    impuestos: impuestos,
                                    descuento: descuento,
                                    id_usuario_solicita: req.usuario.id,
                                    id_usuario_registro: req.usuario.id,
                                    createdAt: moment().tz('America/Mexico_City'),
                                    updatedAt: moment().tz('America/Mexico_City')
                                },
                                detalles: []
                            }
                            for(const detalle of servicioMonitoreo.servicios_ontrack_detalles){
                                if(detalle.costo_compra == 0 || detalle.subtotal == 0){
                                    continuar = false
                                    return res.status(400).send({status:false , msg: `No se puede generar la Factura. El subtotal y costo de compra de los detalles de la operación no pueden ser $0.00.` });
                                }
                            }
                            for(const detalle of servicioMonitoreo.servicios_ontrack_detalles){
                                const fechaFull = moment(servicioMonitoreo.createdAt).tz('America/Mexico_City').format("YYYY-MM-DD HH:mm:ss")
                                const producto = await db.sequelize.models.productos.findByPk(detalle.id_producto,{ include:['producto_unidad_medida'],paranoid: false });
                                const registroFacturaDetalles = {
                                    id_pedido_factura: pedidoFactura,
                                    id_moneda: servicioMonitoreo.id_moneda,
                                    id_usuario_registro: req.usuario.id,
                                    id_producto: producto.id,
                                    cantidad: detalle.cantidad,
                                    precio_unitario: parseFloat(detalle.precio_unitario),
                                    subtotal: parseFloat(detalle.subtotal) * detalle.cantidad,
                                    impuesto: parseFloat(detalle.monto_iva),
                                    descuento: parseFloat(detalle.descuento_monto),
                                    comentarios: `Referencia ${marca.nombre}:${servicioMonitoreo.no_operacion}<br> 
                                                  Servicio: ${producto.descripcion}<br>
                                                  Fecha: ${fechaFull.split(" ")[0]}<br>
                                                  Origen:  ${paisOrigen.descripcion}<br> 
                                                  Destino:  ${paisDestino.descripcion}<br> 
                                                 
                                                  Comentarios: ${(servicioMonitoreo.comentarios !== null && servicioMonitoreo.comentarios !== '' && servicioMonitoreo.comentarios !== undefined ? servicioMonitoreo.comentarios : '')}`,
                                    createdAt: moment().tz('America/Mexico_City')
                                }
                                storeFacturaDetalles.push(registroFacturaDetalles)
                                totalFactura = totalFactura + parseFloat(detalle.total)
                                dataOC.detalles.push({
                                    id_concepto_presupuesto: 1,
                                    id_producto: detalle.id_producto,
                                    precio_unitario: detalle.costo_compra,
                                    cantidad: 1,
                                    subtotal: detalle.costo_compra,
                                    impuestos: proveedor.id_nacionalidad == 96 ? (detalle.costo_compra * 0.16) : 0,
                                    descuentos: 0,
                                    impuesto_adicional: 0,
                                    id_usuario_registro: req.usuario.id,
                                    createdAt: moment().tz('America/Mexico_City'),
                                    updatedAt: moment().tz('America/Mexico_City')
                                })
                            }
                            storeOCs.push(dataOC)
                        }
                    }
                }
            }
        }
	    let facturaId
        if(continuar){
            const registroEncontrado = await db.sequelize.models.pedidos_factura.findByPk(pedidosFactura[0], {include:relaciones,paranoid: false});
            if(registroEncontrado.certificado !== null){
                const certificado = await db.sequelize.models.certificados.findByPk(registroEncontrado.certificado.id, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado'],paranoid: false });
                const marca = await db.sequelize.models.marcas.findByPk(certificado.id_marca, { include:['pais','domicilio'],paranoid: false });
                const totalCount = await db.sequelize.models.facturas.count({
                    paranoid: false,
                    where: {
                        folio: {[db.Sequelize.Op.like]:`%${marca.clave}%`}
                    }
                });
                const folio = `${marca.clave}-${(totalCount+1)}`
                const registroFactura = {
                    id_razon_social: certificado.oficina_razon_social.id_razon_social,
                    id_oficina: certificado.oficina_razon_social.id_oficina,
                    id_marca: certificado.id_marca,
                    id_moneda: certificado.id_moneda,
                    folio: folio,
                    id_usuario_registro: req.usuario.id,
                    createdAt: moment().tz('America/Mexico_City')
                }
                const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_cliente:certificado.id_cliente,id_oficina:certificado.oficina_razon_social.id_oficina}});
                let marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: certificado.id_marca}})
                if(marcaAgenteOficina == null){
                    marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: 3}})
                    if(marcaAgenteOficina == null){
                        return res.status(400).send({ status: false, msg: "Error al encontrar la oficina marca"});
                    }
                }
                const oficina = await db.sequelize.models.oficinas.findByPk(certificado.oficina_razon_social.id_oficina,{include: ['razones_sociales']});
                //const referencia = await genReferencia(marcaAgenteOficina.clave,certificado.oficina_razon_social.id_razon_social,oficina)
                registroFactura.referencia = certificado.no_operacion
                const factura = await db.sequelize.models.facturas.create(registroFactura);
                const clienteUpdate = await db.sequelize.models.clientes.findByPk(cliente)
                const clienteDetallesUpdate = await db.sequelize.models.cliente_detalles.findByPk(clienteUpdate.id_detalle_cliente)
                await clienteDetallesUpdate.update({fecha_ultima_factura: moment().tz('America/Mexico_City')}, { where: { id: clienteDetallesUpdate.id } });
            
                for(const registroDetalle of storeFacturaDetalles){
                    registroDetalle.id_factura = factura.id
                    await db.sequelize.models.factura_detalles.create(registroDetalle);
                }
                if(marca.pais.clave == "MX"){
                    const cfid = await timbrarLocal(factura.id,req.usuario)
                } else{
                    for(const pedidoFacturaID of pedidosFactura){
                        const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(pedidoFacturaID, {include:relaciones,paranoid: false});
                        const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.certificado.id, { paranoid: false });
                        const registroCertificadoUpdate = {
                            estatus: 'F',
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await certificado.update(registroCertificadoUpdate, { where: { id: pedidoFactura.certificado.id } });
                        const registroPedidoFacturaUpdate = {
                            estatus: 'F',
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await pedidoFactura.update(registroPedidoFacturaUpdate, { where: { id: pedidoFactura.id } });
                    }
                    if(factura.id_marca == 1 ){
                        sendMailFactura(factura.id, req.usuario)
                    }
                }
                const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
                let fechaVencimiento = moment().tz('America/Mexico_City');
                fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
                const registroCXC = {
                    id_factura: factura.id,
                    saldo: parseFloat((parseFloat(totalFactura)).toFixed(2)) ,
                    fecha_vencimiento: fechaVencimiento,
                    id_usuario_registro: req.usuario.id,
                    createdAt: moment().tz('America/Mexico_City')
                }
                await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
                facturaId = factura.id
            }else if(registroEncontrado.servicios_ontrack !== null){
                const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(registroEncontrado.servicios_ontrack.id, { include:['oficina_razon_social', 'estado_origen','estado_destino', 'servicios_ontrack_detalles','tipo_cambio_futuro'],paranoid: false });
                const marca = await db.sequelize.models.marcas.findByPk(servicioMonitoreo.id_marca, { include:['pais','domicilio'],paranoid: false });
                const totalCount = await db.sequelize.models.facturas.count({
                    paranoid: false,
                    where: {
                        folio: {[db.Sequelize.Op.like]:`%${marca.clave}%`}
                    }
                });
                const folio = `${marca.clave}-${(totalCount+1)}`
                const registroFactura = {
                    id_razon_social: servicioMonitoreo.oficina_razon_social.id_razon_social,
                    id_oficina: servicioMonitoreo.oficina_razon_social.id_oficina,
                    id_marca: servicioMonitoreo.id_marca,
                    id_moneda: servicioMonitoreo.id_moneda,
                    folio: folio,
                    id_usuario_registro: req.usuario.id,
                    createdAt: moment().tz('America/Mexico_City')
                }
                const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_cliente:servicioMonitoreo.id_cliente,id_oficina:servicioMonitoreo.oficina_razon_social.id_oficina}});
                let marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: servicioMonitoreo.id_marca}})
                if(marcaAgenteOficina == null){
                    const marcaId = servicioMonitoreo.id_marca == 2 ? 1 : 1
                    marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: marcaId}})
                    if(marcaAgenteOficina == null){
                        return res.status(400).send({ status: false, msg: "Error al encontrar la oficina marca"});
                    }
                }
                registroFactura.referencia = servicioMonitoreo.no_operacion
                const factura = await db.sequelize.models.facturas.create(registroFactura);
                const clienteUpdate = await db.sequelize.models.clientes.findByPk(cliente)
                const clienteDetallesUpdate = await db.sequelize.models.cliente_detalles.findByPk(clienteUpdate.id_detalle_cliente)
                await clienteDetallesUpdate.update({fecha_ultima_factura: moment().tz('America/Mexico_City')}, { where: { id: clienteDetallesUpdate.id } });
            
                for(const registroDetalle of storeFacturaDetalles){
                    registroDetalle.id_factura = factura.id
                    await db.sequelize.models.factura_detalles.create(registroDetalle);
                }
                for(const regOC of storeOCs){
                    regOC.id_factura = factura.id
                    const ordenCompra = await db.sequelize.models.ordenes_compra.create(regOC.payload);
                    for(const detalleOC of regOC.detalles){
                        detalleOC.id_orden_compra = ordenCompra.id
                        const ocD = await db.sequelize.models.facturas_proveedor_detalles.create(detalleOC);
                    }
                    const ocF = await db.sequelize.models.oc_facturas.create({
                        id_factura: factura.id,
                        id_orden_compra: ordenCompra.id,
                        id_usuario_registro: req.usuario.id
                    });
                }
                if(marca.pais.clave == "MX"){
                    const cfid = await timbrarLocal(factura.id,req.usuario)
                } else{
                    for(const pedidoFacturaID of pedidosFactura){
                        const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(pedidoFacturaID, {include:relaciones,paranoid: false});
                        const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.servicios_ontrack.id, { paranoid: false });
                        const registroCertificadoUpdate = {
                            estatus: 'F',
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await servicioMonitoreo.update(registroCertificadoUpdate, { where: { id: pedidoFactura.servicios_ontrack.id } });
                        const registroPedidoFacturaUpdate = {
                            estatus: 'F',
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await pedidoFactura.update(registroPedidoFacturaUpdate, { where: { id: pedidoFactura.id } });
                    }
                    //ENVIAR FACTURA TRACKING
                }
                const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
                let fechaVencimiento = moment().tz('America/Mexico_City');
                fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
                const registroCXC = {
                    id_factura: factura.id,
                    saldo: parseFloat((parseFloat(totalFactura)).toFixed(2)) ,
                    fecha_vencimiento: fechaVencimiento,
                    id_usuario_registro: req.usuario.id,
                    createdAt: moment().tz('America/Mexico_City')
                }
                await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
                //sendMailCertificadoCobertura(factura.id_razon_social, req.usuario, factura.id_marca)
                facturaId = factura.id
            }
        }
        return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:facturaId}});
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function timbrarFactura(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
    try {
        const factura = await db.sequelize.models.facturas.findByPk(id, { paranoid: false });
        const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
        if(marca.pais.clave.toUpperCase() !== "MX"){
            return res.status(400).send({ status: false, msg: "Por la nacionalidad de la factura, no es necesario timbrarla."});
        }
		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, {include: ['metodo_pago','forma_pago','nacionalidad_timbrado']})
		if(razonSocialAux.bloqueado == true){
            return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
        }
        const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:factura.id_razon_social,id_marca:factura.id_marca}})
		let razonValidada = true
        if(razonesSocialesValidaciones == null){
            const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
            const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
            if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                razonValidada = false
            }
        } else{
            if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
                const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                    razonValidada = false
                }
                const fechaCreacionRSV = moment(razonesSocialesValidaciones.createdAt).tz('America/Mexico_City')
                const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
                if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
                    razonValidada = true
                }
            }else{
                razonValidada = true
            }
        }
        if(!razonValidada){
            return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
        }
        const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: factura.id_razon_social}})
        const clienteCert = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente, { include:['detalles_cliente'] });
        if(clienteCert.detalles_cliente.bloqueado === true){
            return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
        }

		if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
		}
        if(razonSocialAux.nacionalidad_timbrado.clave.toUpperCase() !== "MX"){
            return res.status(400).send({ status: false, msg: "Por la nacionalidad de la factura, no es necesario timbrarla."});
        }
        const respuesta =  await timbrarLocal(id,req.usuario)
        if(respuesta.validado === true){
            return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:factura.id}});
        }
        return res.status(400).send(respuesta);
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function genReferencia(claveMarcaAgenteOficina,idRazonSocial,oficina){
	var claveRazonSocial = undefined
	await oficina.razones_sociales.forEach((oficinaRazonSocial,index) => {
		if(oficinaRazonSocial.id_razon_social == idRazonSocial){
			claveRazonSocial = (index +1)
		}
	});
	var noOperacion = claveMarcaAgenteOficina + "-" + claveRazonSocial

	var whereFind = {
		where: {
			referencia: {[db.Sequelize.Op.like]: `%${noOperacion}%`}
		},paranoid: false
	}
	const registrosEncontrados = await db.sequelize.models.facturas.findAll(whereFind);
	var countOperaciones = registrosEncontrados.length +1 
	noOperacion = noOperacion + "-" + (countOperaciones +1)
	return noOperacion
}

async function timbrarManal(req,res){
	const parametros = req.body;
    const facturaDetalles = parametros.facturaDetalles ?? []
    if(facturaDetalles.length < 1 && Array.isArray(facturaDetalles)){
		res.status(400).send({status:false , msg: `El parametro facturaDetalles no debe estar vacío.` });
		return false
	} 
    try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'idOficina', tipo:'model', model:db.sequelize.models.oficinas},
                            {campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
                            {campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:parametros.idOficina,id_razon_social:parametros.idRazonSocial}}},
                            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const validosOpcionales =[{campo:'comentarios', tipo:'string',largo:255}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}

		const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial, {include: ['metodo_pago','forma_pago','regimen_fiscal']})
		if(razonSocialAux.bloqueado == true){
            return res.status(400).send({ status: false, msg: "La razón social se encuentra bloqueada" });
        }
        const razonesSocialesValidaciones = await db.sequelize.models.razones_sociales_validaciones.findOne({where:{id_razon_social:parametros.idRazonSocial,id_marca:parametros.idMarca}})
		let razonValidada = true
        if(razonesSocialesValidaciones == null){
            const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
            const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
            if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                razonValidada = false
            }
        } else{
            if(razonesSocialesValidaciones.prevalidado !== true && razonesSocialesValidaciones.validado !== true){
                const fechaCreacionRS = moment(razonSocialAux.createdAt).tz('America/Mexico_City')
                const fechalimiteUsoRS = fechaCreacionRS.add(24, 'hours');
                if(fechalimiteUsoRS < moment().tz('America/Mexico_City')){
                    razonValidada = false
                }
                const fechaCreacionRSV = moment(razonesSocialesValidaciones.createdAt).tz('America/Mexico_City')
                const fechalimiteUsoRSV = fechaCreacionRSV.add(24, 'hours');
                if(fechalimiteUsoRSV >= moment().tz('America/Mexico_City')){
                    razonValidada = true
                }
            }else{
                razonValidada = true
            }
        }
        if(!razonValidada){
            return res.status(400).send({ status: false, msg: `La razón social no se encuentra validada.`});
        }
        const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social: parametros.idRazonSocial}})
        const clienteCert = await db.sequelize.models.clientes.findByPk(clienteRazonSocial.id_cliente, { include:['detalles_cliente'] });
        if(clienteCert.detalles_cliente.bloqueado === true){
            return res.status(400).send({ status: false, msg: `El cliente se encuentra bloqueado.`});
        }

		if(razonSocialAux.metodo_pago.clave.toUpperCase() === 'PPD' && razonSocialAux.forma_pago.clave.toUpperCase() !== '99'){
			const formaPago99 = await db.sequelize.models.formas_pago.findOne({where:{ clave: '99' }})
			return res.status(400).send({ status: false, msg: `Si la razón social seleccionada cuenta con el método de pago (${razonSocialAux.metodo_pago.clave}) ${razonSocialAux.metodo_pago.descripcion}, por favor asegúrese de que cuente con la forma de pago (${formaPago99.clave}) ${formaPago99.descripcion}`});
		}
		const nacionalidadTimbrado = await db.sequelize.models.paises.findByPk(razonSocialAux.id_nacionalidad_timbrado, { paranoid: false });
        if(nacionalidadTimbrado.clave.toUpperCase() == 'MX'){
            if(razonSocialAux.id_regimen_fiscal == null || razonSocialAux.tipo_persona == null){
                return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no está configurado."});
            }
			if(razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != razonSocialAux.tipo_persona.toUpperCase() && razonSocialAux.regimen_fiscal.tipo_persona.toUpperCase() != "FM" ){
				return res.status(400).send({ status: false, msg: "El régimen fiscal de la razón social no es válido."});
			}
        }
		registro = dataValidarOpcionales[0]
        registro.id_usuario_registro = req.usuario.id
        const marca = await db.sequelize.models.marcas.findByPk(registro.id_marca, { include:['pais','domicilio'],paranoid: false });
        const totalCount = await db.sequelize.models.facturas.count({
            paranoid: false,
            where: {
                folio: {[db.Sequelize.Op.like]:`%${marca.clave}%`}
            }
        });
        registro.folio = `${marca.clave}-${(totalCount+1)}`
        const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:registro.id_oficina}})
        const marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findOne({where:{id_oficina_cliente:oficinaCliente.id, id_marca: parametros.idMarca }})
        if(marcaAgenteOficina == null){
            return res.status(400).send({ status: false, msg: "No existe oficina ligada al cliente con la marca seleccionada"});
        }
        const oficina = await db.sequelize.models.oficinas.findByPk(registro.id_oficina,{include: ['razones_sociales']});
        const referencia = await genReferencia(marcaAgenteOficina.clave,registro.id_razon_social,oficina)
        registro.referencia = referencia

        for(const facturaDetalle of facturaDetalles){
            var registroFacturaDetalle = {}
            let obligatoriosFacturaDetalle = [{campo:'idProducto', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_productos, where:{where:{id_producto:facturaDetalle.idProducto, id_marca_agente_oficina: marcaAgenteOficina.id}}},
                                              {campo:'cantidad', tipo:'number'},
                                              {campo:'precioUnitario', tipo:'number'},
                                              {campo:'haveImpuesto', tipo:'boolean'},
                                              {campo:'haveRetenciones', tipo:'boolean'}]
            registroFacturaDetalle = await Validaciones.validParametros({body:facturaDetalle}, res,obligatoriosFacturaDetalle,registroFacturaDetalle);
            if(!registroFacturaDetalle){
                return '';
            }
            const validosOpcionales =[{campo:'descuento', tipo:'number'}]
            const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registroFacturaDetalle,false,validosOpcionales,facturaDetalle,res)
            if(dataValidarOpcionales == undefined){
                return undefined;
            }
        }
        const factura = await db.sequelize.models.facturas.create(registro);
        const dataOC = []
        const warings = []
        if(parametros.idMarca == 2){
            const ordenesCompra = parametros.ordenesCompra ?? []
            if(ordenesCompra.length > 0 && Array.isArray(ordenesCompra)){
                for(const oc of ordenesCompra){
                    var validOC = {}
                    let validObligatorios = [{campo:'idOrdenCompra', tipo:'model', model:db.sequelize.models.ordenes_compra}]
                    validOC = await Validaciones.validParametros({body:{idOrdenCompra: oc}}, res,validObligatorios,validOC);
                    if(!validOC){
                        return '';
                    }
                    const ordenCompra = await db.sequelize.models.ordenes_compra.findByPk(oc)
                    if(ordenCompra.id_marca != parametros.idMarca){
                        return res.status(400).send({ status: false, msg: "La orden de compra debe tener la misma marca que la factura. id_orden_compra: " + ordenCompra.id});
                    }
                    const ocFacturasTrackingEncontrados = await db.sequelize.models.oc_facturas.findAll({where: {id_orden_compra:ordenCompra.id}});
                    if(ocFacturasTrackingEncontrados.length > 0){
                        warings.push( "Las ordenes de compra solo pueden estar ligadas a una sola factura. id_orden_compra: " + ordenCompra.id);
                    }else{
                        const ocFacTracking = await db.sequelize.models.oc_facturas.create({
                            id_factura: factura.id,
                            id_orden_compra: ordenCompra.id,
                            id_usuario_registro: req.usuario.id
                        });
                        dataOC.push(ocFacTracking)
                    }
                }
            } 
        }
        const clienteDetallesUpdate = await db.sequelize.models.cliente_detalles.findByPk(clienteCert.id_detalle_cliente)
        await clienteDetallesUpdate.update({fecha_ultima_factura: moment().tz('America/Mexico_City')}, { where: { id: clienteDetallesUpdate.id } });
        var totalFactura = 0
        for(const facturaDetalle of facturaDetalles){
            var registroFacturaDetalle = {
                id_factura: factura.id,
                createdAt: moment().tz('America/Mexico_City'),
                updatedAt: moment().tz('America/Mexico_City')
            }
            let obligatoriosFacturaDetalle = [{campo:'idProducto', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_productos, where:{where:{id_producto:facturaDetalle.idProducto, id_marca_agente_oficina: marcaAgenteOficina.id}}},
                                              {campo:'cantidad', tipo:'number'},
                                              {campo:'precioUnitario', tipo:'number'},
                                              {campo:'haveImpuesto', tipo:'boolean'},
                                              {campo:'haveRetenciones', tipo:'boolean'}]
            registroFacturaDetalle = await Validaciones.validParametros({body:facturaDetalle}, res,obligatoriosFacturaDetalle,registroFacturaDetalle);
            if(!registroFacturaDetalle){
                return '';
            }
            const validosOpcionales =[{campo:'descuento', tipo:'number'}]
            const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registroFacturaDetalle,false,validosOpcionales,facturaDetalle,res)
            if(dataValidarOpcionales == undefined){
                return undefined;
            }
            if(registroFacturaDetalle.have_impuesto === true && marca.pais.clave == "MX"){
                registroFacturaDetalle.impuesto = await round(((registroFacturaDetalle.precio_unitario * parseInt(registroFacturaDetalle.cantidad)) - parseFloat(registroFacturaDetalle.descuento)) * 0.16,4)
            } else{
                registroFacturaDetalle.impuesto = 0
            }
            /*if(registroFacturaDetalle.have_retenciones === true){
                registroFacturaDetalle.retenciones = await round(registroFacturaDetalle.subtotal * 0.1,4)
            } else{
                registroFacturaDetalle.retenciones = 0
            }*/


            registroFacturaDetalle = dataValidarOpcionales[0]
            registroFacturaDetalle.comentarios = facturaDetalle.comentarios
            if(registroFacturaDetalle.descuento === undefined){
                registroFacturaDetalle.descuento = 0.0
            }
            registroFacturaDetalle.subtotal = (parseFloat(registroFacturaDetalle.precio_unitario) * parseInt(registroFacturaDetalle.cantidad))
            totalFactura = totalFactura + ((parseFloat(registroFacturaDetalle.precio_unitario) * parseInt(registroFacturaDetalle.cantidad)) + (parseFloat(registroFacturaDetalle.impuesto)) - parseFloat(registroFacturaDetalle.descuento))
            await db.sequelize.models.factura_detalles.create(registroFacturaDetalle);
        }
        if(marca.pais.clave == "MX"){
           const respuesta = await  timbrarLocal(factura.id,req.usuario)
           const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
           let fechaVencimiento = moment().tz('America/Mexico_City');
           fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
           const registroCXC = {
               id_factura: factura.id,
               saldo: parseFloat((parseFloat(totalFactura)).toFixed(2)),
               fecha_vencimiento: fechaVencimiento,
               id_usuario_registro: req.usuario.id,
               createdAt: moment().tz('America/Mexico_City')
           }
           await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
           if(respuesta.validado === true){
            return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:factura.id}});
           }
           return res.status(400).send(respuesta);
        } else{
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { paranoid: false });
            let fechaVencimiento = moment().tz('America/Mexico_City');
            fechaVencimiento = fechaVencimiento.add(razonSocial.dias_credito, 'days');
            const registroCXC = {
                id_factura: factura.id,
                saldo: parseFloat((parseFloat(totalFactura)).toFixed(2)),
                fecha_vencimiento: fechaVencimiento,
                id_usuario_registro: req.usuario.id,
                createdAt: moment().tz('America/Mexico_City')
            }
            await db.sequelize.models.cuentas_por_cobrar.create(registroCXC);
            sendMailFactura(factura.id, req.usuario)
            return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:factura.id}});
        }
    } catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}

async function timbrarLocal(id,usuario){
	const factura = await db.sequelize.models.facturas.findByPk(id, { include:['factura_detalles'],paranoid: false });
    if(factura.id_cfdi != null){
        return { validado: false, msg: "La factura ya fue timbrada" }
    }
	const moneda = await db.sequelize.models.monedas.findByPk(factura.id_moneda, { paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
	const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['regimen_fiscal'],paranoid: false });
	const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { include:['regimen_fiscal','uso_cfdi','forma_pago','metodo_pago'],paranoid: false });
    const dataRazonSocial = await db.sequelize.models.razones_sociales_domicilios.findOne({ where:{id_razon_social:factura.id_razon_social, tipo: 'F'}, include:['domicilio'],paranoid: false });
	const findRelaciones = new Relaciones(['estado.pais.continente'],['estado.pais.continente'],db.sequelize.models)
    const relaciones = await findRelaciones.getRelaciones()
    const domicilioFiscalReceptor = await db.sequelize.models.domicilios.findByPk(dataRazonSocial.domicilio.id,{include: relaciones})
    const factura_detalles = []
	for(const detalles of factura.factura_detalles){
		if(!factura_detalles.includes(detalles)){
			factura_detalles.push(detalles)
		}
	}
    const impuestosTotales = {
        totalImpuestosTrasladados: 0,
        totalImpuestosRetenidos: 0,
        traslados:[],
        retenciones:[]
    }
    const conceptos = []
    var totalFactura = 0
    var subTotalFactura = 0
    var descuentoFactura = 0
	for(const facturaDetalle of factura_detalles){
		const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
        var producto
        const iva = '0.160000'
        const tipoFactor = 'Tasa'
        const claveIva = "002"
        const isr = '0.100000'
        const claveISR = "001"
        var tipoCambio = 0.0
        var comentarios
        if(pedidoFactura != null){
            if(pedidoFactura.id_certificado !== null){
                const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado','tipo_cambio_futuro'],paranoid: false });
                const nameTipoCobertura = certificado.tipo_cobertura.toLowerCase().split(" ")
                const isRC = nameTipoCobertura.includes('rc')
                if(isRC && certificado.detalle_certificado[0].id_atributo_keepro == null){
                    producto = await db.sequelize.models.productos.findOne({ where:{descripcion: { [db.Sequelize.Op.like]: `%rc%` }}, include:['producto_unidad_medida'],paranoid: false });
                }else{
                    const atributoKP = await db.sequelize.models.atributos_keepro.findByPk(certificado.detalle_certificado[0].id_atributo_keepro, { paranoid: false });
                    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKP.id_oficina_producto, {include: ['producto']});
                    producto = await db.sequelize.models.productos.findByPk(oficinaProducto.producto.id,{ include:['producto_unidad_medida'],paranoid: false });
                }
                comentarios = certificado.referencias
            }else if(pedidoFactura.id_servicio_ontrack !== null){
                producto = await db.sequelize.models.productos.findByPk(facturaDetalle.id_producto,{ include:['producto_unidad_medida'],paranoid: false });
                const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
                comentarios = servicioMonitoreo.comentarios
            }
        }else{
            producto = await db.sequelize.models.productos.findByPk(facturaDetalle.id_producto,{ include:['producto_unidad_medida'],paranoid: false });
        }
        //Se obtiene el tipo de cambio del dia
        let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
        let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')
    
        let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
        if(doit !== true){
            return doit
        }
        const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
        if(tipoCambioSelected == undefined){
            return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
        }
        tipoCambio = '' + tipoCambioSelected.tipo_cambio
        const cantidad = parseFloat(facturaDetalle.cantidad ?? 1)
        const valorUnitario = parseFloat(facturaDetalle.precio_unitario ?? 0)
        const impuesto = parseFloat(facturaDetalle.impuesto ?? 0)
        const descuentoGeneral = parseFloat(facturaDetalle.descuento ?? 0)
        const retencionConcepto = parseFloat(facturaDetalle.retenciones ?? 0.0)
        descuentoFactura = parseFloat(descuentoGeneral) + parseFloat(descuentoFactura)
        subTotalFactura = subTotalFactura + await round(((valorUnitario * cantidad)),2)
        const impuestos = [
            {
                base: await round((valorUnitario * cantidad) - parseFloat(descuentoGeneral),2),
                impuesto: claveIva,
                tipoFactor: tipoFactor,
                tasaOCuota: impuesto > 0 ? iva : '0.000000',
                importe: await round(impuesto,2)
            }
        ]
        if(impuestosTotales.traslados.length < 1){
            impuestosTotales.traslados.push({
                base: await round((valorUnitario * cantidad) - parseFloat(descuentoGeneral),2),
                impuesto: claveIva,
                tipoFactor: tipoFactor,
                tasaOCuota: impuesto > 0 ? iva : '0.000000',
                importe: await round(impuesto,2)
            })
        }else{
            var index = -1
            for(var i = 0; i < impuestosTotales.traslados.length; i++){
                if(impuestosTotales.traslados[i].tasaOCuota == (impuesto > 0 ? iva : '0.000000')){
                    index = i
                }
            }
            if(index > -1){
                impuestosTotales.traslados[index].base = impuestosTotales.traslados[index].base +  await round(((valorUnitario * cantidad) - parseFloat(descuentoGeneral)),2)
                impuestosTotales.traslados[index].importe = impuestosTotales.traslados[index].importe + await round(impuesto,2)
            }else{
                impuestosTotales.traslados.push({
                    base: await round((valorUnitario * cantidad) - parseFloat(descuentoGeneral),2),
                    impuesto: claveIva,
                    tipoFactor: tipoFactor,
                    tasaOCuota: impuesto > 0 ? iva : '0.000000',
                    importe: await round(impuesto,2)
                })
            }
        }
        const concepto = {
            ClaveProdServ: producto.clave_producto_servicio_sat,
            ClaveUnidad: producto.producto_unidad_medida.clave_unidad_medida_sat,
            NoIdentificacion: producto.clave,
            Cantidad: cantidad,
            Unidad: producto.producto_unidad_medida.nombre,
            ValorUnitario: valorUnitario,
            Descuento: descuentoGeneral,
            Importe: await round((valorUnitario * cantidad),2),
            ObjetoImp: "02",
            impuestos: impuestos,
            //retenciones: retencion
        };
        try {
            let auxReferencia = comentarios ?? ""
            if(auxReferencia != ''){
                auxReferencia = auxReferencia.replace(/\|/g, "-");
            }
            concepto["Descripcion"] = producto.producto_servicio_sat + (auxReferencia !== '' ? ' - ' + auxReferencia : '')
        } catch (error) {
            concepto["Descripcion"] = producto.producto_servicio_sat
        }
        conceptos.push(concepto)
	}
    for(const importeTranslado of impuestosTotales.traslados){
        impuestosTotales.totalImpuestosTrasladados = impuestosTotales.totalImpuestosTrasladados + importeTranslado.importe
    }
    /*for(const importeRetenciones of impuestosTotales.retenciones){
        impuestosTotales.totalImpuestosRetenidos = impuestosTotales.totalImpuestosRetenidos + importeRetenciones.importe
    }
    totalFactura = subTotalFactura + impuestosTotales.totalImpuestosTrasladados + impuestosTotales.totalImpuestosRetenidos - descuentoFactura*/
    totalFactura = subTotalFactura + impuestosTotales.totalImpuestosTrasladados - descuentoFactura
    var emisor = undefined;
    var receptor = undefined;
    const env = process.env.NODE_ENV;
    var noCertificado = undefined
    var cer
    var key
    let password
    if((env == 'development' || env == 'test')){
        emisor = {
            rfc: 'EKU9003173C9',
            nombre: 'ESCUELA KEMPER URGATE',
            regimenFiscal: '601',
        }
        receptor = {
            rfc: 'MASO451221PM4',
            nombre: 'MARIA OLIVIA MARTINEZ SAGAZ',
            domicilioFiscal: '80290',
            regimenFiscal: '612',
            usoCFDI: 'S01',
        }
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
        noCertificado = '30001000000500003416'
    } else{
        emisor = {
            rfc: datoFacturacionEmisor.no_identificacion,
            nombre: datoFacturacionEmisor.razon_social,
            regimenFiscal: datoFacturacionEmisor.regimen_fiscal.clave,
        }
        receptor = {
            rfc: razonSocialReceptor.no_identificacion,
            nombre: razonSocialReceptor.razon_social,
            domicilioFiscal: domicilioFiscalReceptor.codigo_postal,
            regimenFiscal: razonSocialReceptor.regimen_fiscal.clave,
            usoCFDI: razonSocialReceptor.uso_cfdi.clave
        }
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
        noCertificado = '00001000000515086712'
    }
    const data = {
        env:env,
        certificado:{
            cer:cer,
            key:key,
            password: password,
            folio: factura.folio,
            formaPago: razonSocialReceptor.forma_pago.clave,
            totalFactura: totalFactura,
            descuentoFactura:descuentoFactura,
            subTotalFactura: await round(subTotalFactura,2),
            claveMoneda: moneda.clave,
            tipoCambio: moneda.clave == "USD" ? tipoCambio : '1',
            metodoPago:razonSocialReceptor.metodo_pago.clave,
            serie: marca.clave,
            lugarExpedicion: marca.domicilio.codigo_postal,
            noCertificado: noCertificado,
            tipoDeComprobante: "I"
        },
        emisor: emisor,
        receptor: receptor,
        conceptos:conceptos,
        impuestos: impuestosTotales
    };
    const url = `${process.env.URL_API_FACTURACION}/api/facturacion`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    var response
    let dataTimbrado
    let validado
    let xml
    try {
        response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        xml = response.data.xml
        validado = response.data.data.validado === true
    } catch (error) {
        xml = undefined
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var registro = {
            xml: dataTimbrado.xml,
            folio_fiscal: dataTimbrado.uuid,
            id_metodo_pago: razonSocialReceptor.metodo_pago.id,
            id_forma_pago: razonSocialReceptor.forma_pago.id,
            id_uso_cfdi: razonSocialReceptor.uso_cfdi.id,
            cadena_original:dataTimbrado.cadena_original,
            id_usuario_registro: usuario.id,
			createdAt: moment().tz('America/Mexico_City')
		}
		const nuevoRegistro = await db.sequelize.models.cfdis.create(registro);
        const datosUpdate = {
            id_cfdi: nuevoRegistro.id,
			createdAt: moment().tz('America/Mexico_City'),
            updatedAt: moment().tz('America/Mexico_City')
        }
        await factura.update(datosUpdate, { where: { id: factura.id } });
        for(const facturaDetalle of factura.factura_detalles){
            const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
            if(pedidoFactura != null){
                if(pedidoFactura.id_certificado !== null){
                    const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado'],paranoid: false });
                    const datosUpdateDetalle = {
                        estatus: "F",
                        updatedAt: moment().tz('America/Mexico_City')
                    }
                    const datosUpdateCertificado = {
                        estatus: "F",
                        updatedAt: moment().tz('America/Mexico_City')
                    }
                    await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                    await certificado.update(datosUpdateCertificado, { where: { id: certificado.id } });
                } else if(pedidoFactura.id_servicio_ontrack !== null){
                    const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
                    const datosUpdateDetalle = {
                        estatus: "F",
                        updatedAt: moment().tz('America/Mexico_City')
                    }
                    const datosUpdateServicioMonitoreo = {
                        estatus: "F",
                        updatedAt: moment().tz('America/Mexico_City')
                    }
                    await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                    await servicioMonitoreo.update(datosUpdateServicioMonitoreo, { where: { id: servicioMonitoreo.id } });
                } 
            }
        }
        sendMailFactura(factura.id, usuario)
        return { validado: validado, msg: registro}
    }
    return { validado: validado, msg: dataTimbrado, xml:xml}
}

async function timbrarPago(data,idPago,usuario,razonSocialReceptor, multiMoneda = false){
    const pago = await db.sequelize.models.pagos.findByPk(idPago);
    if(pago.id_cfdi != null){
        return { validado: false, msg: "El pago ya fue timbrado" }
    }
    const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(pago.id_razon_social, {include: ['nacionalidad_timbrado']})
    if(razonSocialAux.nacionalidad_timbrado.clave.toUpperCase() !== "MX"){
        return res.status(400).send({ status: false, msg: "Por la nacionalidad de la razón social, no es necesario timbrar el pago."});
    }
     const url = multiMoneda == true ? `${process.env.URL_API_FACTURACION}/api/facturacion/pagoMultiMoneda` :`${process.env.URL_API_FACTURACION}/api/facturacion/pago`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    var response
    let dataTimbrado
    let validado
    let xml
    let err
    try {
        response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        xml = response.data.xml
        validado = response.data.data.validado === true
    } catch (error) {
        err = error
        xml = undefined
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var registro = {
            xml: dataTimbrado.xml,
            folio_fiscal: dataTimbrado.uuid,
            id_metodo_pago: razonSocialReceptor.metodo_pago.id,
            id_forma_pago: razonSocialReceptor.forma_pago.id,
            id_uso_cfdi: razonSocialReceptor.uso_cfdi.id,
            cadena_original:dataTimbrado.cadena_original,
            id_usuario_registro: usuario.id,
			createdAt: moment().tz('America/Mexico_City')
		}
		const cfdi = await db.sequelize.models.cfdis.create(registro);
        const datosUpdate = {
            id_cfdi: cfdi.id,
			createdAt: moment().tz('America/Mexico_City'),
            updatedAt: moment().tz('America/Mexico_City')
        }
        await pago.update(datosUpdate, { where: { id: pago.id } });
        return { validado: validado, msg: registro}
    }
    return { validado: validado, msg: dataTimbrado, err:err, xml:xml}
}

async function timbrarNotaCredito(dataNotaCredito,usuario){
	const factura = await db.sequelize.models.facturas.findByPk(dataNotaCredito.idFactura, { include:['cfdi'],paranoid: false });
	const moneda = await db.sequelize.models.monedas.findByPk(factura.id_moneda, { paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
	const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { include:['regimen_fiscal'],paranoid: false });
	const razonSocialReceptor = await db.sequelize.models.razones_sociales.findByPk(factura.id_razon_social, { include:['regimen_fiscal','uso_cfdi','forma_pago','metodo_pago'],paranoid: false });
    const dataRazonSocial = await db.sequelize.models.razones_sociales_domicilios.findOne({ where:{id_razon_social:factura.id_razon_social, tipo: 'F'}, include:['domicilio'],paranoid: false });
	const findRelaciones = new Relaciones(['estado.pais.continente'],['estado.pais.continente'],db.sequelize.models)
    const relaciones = await findRelaciones.getRelaciones()
    const domicilioFiscalReceptor = await db.sequelize.models.domicilios.findByPk(dataRazonSocial.domicilio.id,{include: relaciones})
    const impuestosTotales = {
        totalImpuestosTrasladados: 0,
        totalImpuestosRetenidos: 0,
        traslados:[],
        retenciones:[]
    }
    const conceptos = []
    
    const cantidad = 1
    const valorUnitario = dataNotaCredito.subtotal
    const impuesto = dataNotaCredito.impuesto
    const descuentoFactura = 0
    const descuentoGeneral = 0
    const iva = '0.160000'
    const tipoFactor = 'Tasa'
    const claveIva = "002"
    const isr = '0.100000'
    const claveISR = "001"
    //const xmlFactura = await xmlToJSON(factura.cfdi.xml)
    //var tipoCambio = parseFloat(xmlFactura["cfdi:Comprobante"]["\$"]['TipoCambio'])
    //Se obtiene el tipo de cambio del dia
    let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
    let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')

    let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
    if(doit !== true){
        return doit
    }
    const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
    if(tipoCambioSelected == undefined){
        return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
    }
    let tipoCambio = '' + tipoCambioSelected.tipo_cambio
    const impuestos = [{
        base: await round(valorUnitario * cantidad,2),
        impuesto: claveIva,
        tipoFactor: tipoFactor,
        tasaOCuota: impuesto > 0 ? iva : '0.000000',
        importe: await round(impuesto,2)
    }]
    impuestosTotales.traslados.push({
        base: await round(valorUnitario * cantidad,2),
        impuesto: claveIva,
        tipoFactor: tipoFactor,
        tasaOCuota: impuesto > 0 ? iva : '0.000000',
        importe: await round(impuesto,2)
    })
    
    const concepto = {
        ClaveProdServ: '84111506',
        ClaveUnidad: 'ACT',
        NoIdentificacion: '00001',
        Cantidad: cantidad,
        Unidad: 'PIEZA',
        ValorUnitario: valorUnitario,
        Descuento: descuentoGeneral,
        Importe: await round(valorUnitario * cantidad,2),
        ObjetoImp: "02",
        impuestos: impuestos,
        Descripcion: 'BONIFICACIÓN'
        //retenciones: retencion
    };
    conceptos.push(concepto)
    for(const importeTranslado of impuestosTotales.traslados){
        impuestosTotales.totalImpuestosTrasladados = impuestosTotales.totalImpuestosTrasladados + importeTranslado.importe
    }
    const subTotalFactura = parseFloat(await round(valorUnitario * cantidad,2))
    const totalFactura = subTotalFactura + impuestosTotales.totalImpuestosTrasladados - descuentoFactura
    var emisor = undefined;
    var receptor = undefined;
    const env = process.env.NODE_ENV;
    var noCertificado = undefined
    var cer
    var key
    var password
    if((env == 'development' || env == 'test')){
        emisor = {
            rfc: 'EKU9003173C9',
            nombre: 'ESCUELA KEMPER URGATE',
            regimenFiscal: '601',
        }
        receptor = {
            rfc: 'MASO451221PM4',
            nombre: 'MARIA OLIVIA MARTINEZ SAGAZ',
            domicilioFiscal: '80290',
            regimenFiscal: '612',
            usoCFDI: 'G02',
        }
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
        noCertificado = '30001000000500003416'
    } else{
        emisor = {
            rfc: datoFacturacionEmisor.no_identificacion,
            nombre: datoFacturacionEmisor.razon_social,
            regimenFiscal: datoFacturacionEmisor.regimen_fiscal.clave,
        }
        receptor = {
            rfc: razonSocialReceptor.no_identificacion,
            nombre: razonSocialReceptor.razon_social,
            domicilioFiscal: domicilioFiscalReceptor.codigo_postal,
            regimenFiscal: razonSocialReceptor.regimen_fiscal.clave,
            usoCFDI: "G02"
        }
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
        noCertificado = '00001000000515086712'
    }
    const data = {
        env:env,
        certificado:{
            cer:cer,
            key:key,
            password: password,
            folio: dataNotaCredito.notaCredito.folio,
            formaPago: '15',
            totalFactura: totalFactura,
            descuentoFactura:descuentoFactura,
            subTotalFactura: subTotalFactura,
            claveMoneda: moneda.clave,
            tipoCambio: moneda.clave == "USD" ? tipoCambio : '1',
            metodoPago:"PUE",
            serie: marca.clave,
            lugarExpedicion: marca.domicilio.codigo_postal,
            noCertificado: noCertificado,
            tipoDeComprobante: 'E',
            cfdiRelacionados:[{
                tipoRelacion: '01',
                uuid: factura.cfdi.folio_fiscal
            }]
        },
        emisor: emisor,
        receptor: receptor,
        conceptos:conceptos,
        impuestos: impuestosTotales
    };
    const url = `${process.env.URL_API_FACTURACION}/api/facturacion`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    var response
    let dataTimbrado
    let validado
    let xml
    try {
        response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        xml = response.data.xml
        validado = response.data.data.validado === true
    } catch (error) {
        xml = undefined
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var registro = {
            xml: dataTimbrado.xml,
            folio_fiscal: dataTimbrado.uuid,
            id_metodo_pago: razonSocialReceptor.metodo_pago.id,
            id_forma_pago: razonSocialReceptor.forma_pago.id,
            id_uso_cfdi: razonSocialReceptor.uso_cfdi.id,
            cadena_original:dataTimbrado.cadena_original,
            id_usuario_registro: usuario.id,
			createdAt: moment().tz('America/Mexico_City')
		}
		const nuevoRegistro = await db.sequelize.models.cfdis.create(registro);
        const datosUpdate = {
            id_cfdi: nuevoRegistro.id,
			createdAt: moment().tz('America/Mexico_City'),
            updatedAt: moment().tz('America/Mexico_City')
        }
        await dataNotaCredito.notaCredito.update(datosUpdate, { where: { id: factura.id } });
        return { validado: validado, msg: registro}
    }
    return { validado: validado, msg: dataTimbrado, xml:xml}
}

async function cancelar(req, res){
	const { id } = req.params;
	const factura = await db.sequelize.models.facturas.findByPk(id, { include:['factura_detalles'],paranoid: false });
    
    if(factura == null){
        return res.status(400).send({ status: false, msg: "El registro no existe" });
    }
    if(factura.deletedAt != null){
        return res.status(400).send({ status: false, msg: "La factura ya fue cancelada" });
    }
    let canDelete = true
    const modelosUtilizados = []
    const elemntosToDelete = []
    for (const modelo of Object.values(db.sequelize.models)) {
        let asociaciones = modelo.associations
        for (const asociacion of Object.values(asociaciones)) {
            if(asociacion.target.name == db.sequelize.models.facturas.name){
                let where = {}
                if(asociacion.associationType != 'HasMany'){
                    where[asociacion.foreignKey] = factura.id
                    let elemntosToFind = await modelo.findAll({ where: where });
                    if(modelo.name == "cuentas_por_cobrar"){
                        for(const element of elemntosToFind){
                            let canDeleteCxC = true
                            const modelosUtilizadosCxC = []
                            for (const modelo2 of Object.values(db.sequelize.models)) {
                                let asociacionesCxC = modelo2.associations
                                for (const asaciacion2 of Object.values(asociacionesCxC)) {
                                    if(asaciacion2.target.name == db.sequelize.models.cuentas_por_cobrar.name){
                                        let where = {}
                                        if(asaciacion2.associationType != 'HasMany'){
                                            where[asaciacion2.foreignKey] = element.id
                                            let encontradosCxC = await modelo2.findAll({ where: where });
                                            if(encontradosCxC.length > 0 && !modelosUtilizadosCxC.includes(modelo2.name)){
                                                canDeleteCxC = false
                                                modelosUtilizadosCxC.push(modelo2.name)
                                            }
                                        }
                                    }
                                }
                            }
                            if(!canDeleteCxC){
                                return res.status(400).send({ status: false, msg: `No se pudo eliminar. El elemento actualmente está siendo referenciado indirectamente en los modelos [${modelosUtilizadosCxC}].` });
                            }
                            elemntosToDelete.push(element)
                        }
                    }else if(modelo.name == "oc_facturas"){
                        const elemntosToFind = await modelo.findAll({ where: where });
                        for(const element of elemntosToFind){
                            const oc = await await db.sequelize.models.ordenes_compra.findByPk(element.id_orden_compra);
                            if(oc !== null){
                                elemntosToDelete.push(oc)
                            }
                            elemntosToDelete.push(element)
                        }
                    }else if(elemntosToFind.length > 0 && !modelosUtilizados.includes(modelo.name) && modelo.name != "factura_detalles"){
                        canDelete = false
                        modelosUtilizados.push(modelo.name)
                    }
                }
            }
        }
    }
    if(!canDelete){
        return res.status(400).send({ status: false, msg: `No se pudo eliminar. El elemento actualmente está siendo referenciado en los modelos [${modelosUtilizados}].` });
    }
    for(const elemntToDelet of elemntosToDelete){
        const h = await elemntToDelet.destroy({ where: { id: elemntToDelet.id } })
    }
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
    if(marca.pais.clave.toLowerCase() == "mx" && factura.id_cfdi != null){
        const cfdi = await db.sequelize.models.cfdis.findByPk(factura.id_cfdi, { paranoid: false });
        const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { paranoid: false });
        var emisor = undefined;
        const env = process.env.NODE_ENV;
        var cer 
        var key 
        var password
        if((env == 'development' || env == 'test')){
            emisor = 'EKU9003173C9'
            password = '12345678a'
            cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
            key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
        } else{
            emisor = datoFacturacionEmisor.no_identificacion
            cer = datoFacturacionEmisor.cer
            key = datoFacturacionEmisor.key
            password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
        }
        var data 
        try {
            data = {
                env:env,
                uuid: cfdi.folio_fiscal,
                rfc_emisor: emisor,
                certificado:{
                    cer:cer,
                    key:key,
                    password: password,
                },
                motivo: '02'
            };
        } catch (error) {
            return res.status(400).send({ validado: false, msg: "Factura no timbrada"});
        }
        const url = `${process.env.URL_API_FACTURACION}/api/cancelar`
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'x-api-key': process.env.API_KEY_FACTURACION
        }
        let dataTimbrado
        let validado
        try {
            const response = await axios.post(url, data, { headers });
            dataTimbrado = response.data.data
            validado = response.data.validado
        } catch (error) {
            dataTimbrado = undefined
            validado = false
        }
        if(validado && dataTimbrado != undefined){
            var datosUpdate = {
                acuse_cancelacion: dataTimbrado.acuse,
                folio_cancelacion: "",
                updatedAt: moment().tz('America/Mexico_City')
            }
            await cfdi.update(datosUpdate, { where: { id: cfdi.id } });
            var datosUpdate = {
                id_cfdi: null,
                updatedAt: moment().tz('America/Mexico_City')
            }
            await factura.destroy({ where: { id: factura.id } });
            for(const facturaDetalle of factura.factura_detalles){
                const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
                if(pedidoFactura != null){
                    if(pedidoFactura.id_certificado !== null){
                        const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado'],paranoid: false });
                        const datosUpdateDetalle = {
                            estatus: "P",
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        const datosUpdateCertificado = {
                            estatus: "N",
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                        await certificado.update(datosUpdateCertificado, { where: { id: certificado.id } });
                    }  else if(pedidoFactura.id_servicio_ontrack !== null){
                        const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
                        const datosUpdateDetalle = {
                            estatus: "P",
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        const datosUpdateServicioMonitoreo = {
                            estatus: "N",
                            updatedAt: moment().tz('America/Mexico_City')
                        }
                        await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                        await servicioMonitoreo.update(datosUpdateServicioMonitoreo, { where: { id: servicioMonitoreo.id } });
                    }
                }
                const facturaDetalles = await db.sequelize.models.factura_detalles.findByPk(facturaDetalle.id);
                await facturaDetalles.destroy({ where: { id: facturaDetalle.id } });
            }
        }
        if(validado){
            return res.status(200).send({ status: true, msg: "Registro cancelado con éxito", dataTimbrado:dataTimbrado});
        }
        return res.status(400).send({ status: validado, msg: dataTimbrado});
    }
    await factura.destroy({ where: { id: factura.id } });
    for(const facturaDetalle of factura.factura_detalles){
        const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(facturaDetalle.id_pedido_factura, { paranoid: false });
        if(pedidoFactura != null){
            if(pedidoFactura.id_certificado !== null){
                const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['oficina_razon_social','estado_origen','estado_destino','detalle_certificado'],paranoid: false });
                const datosUpdateDetalle = {
                    estatus: "P",
                    updatedAt: moment().tz('America/Mexico_City')
                }
                const datosUpdateCertificado = {
                    estatus: "N",
                    updatedAt: moment().tz('America/Mexico_City')
                }
                await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                await certificado.update(datosUpdateCertificado, { where: { id: certificado.id } });
            } else if(pedidoFactura.id_servicio_ontrack !== null){
                const servicioMonitoreo = await db.sequelize.models.servicios_ontrack.findByPk(pedidoFactura.id_servicio_ontrack, {paranoid: false });
                const datosUpdateDetalle = {
                    estatus: "P",
                    updatedAt: moment().tz('America/Mexico_City')
                }
                const datosUpdateServicioMonitoreo = {
                    estatus: "N",
                    updatedAt: moment().tz('America/Mexico_City')
                }
                await pedidoFactura.update(datosUpdateDetalle, { where: { id: pedidoFactura.id } });
                await servicioMonitoreo.update(datosUpdateServicioMonitoreo, { where: { id: servicioMonitoreo.id } });
            }
        }
        const facturaDetalles = await db.sequelize.models.factura_detalles.findByPk(facturaDetalle.id);
        await facturaDetalles.destroy({ where: { id: facturaDetalle.id } });
    }
    return res.status(200).send({ status: true, msg: "Registro cancelado con éxito"});
}

async function cancelarCFDI(req, res){
	const { id } = req.params;
	const factura = await db.sequelize.models.facturas.findOne({where:{ id_cfdi:id }, paranoid: false });
    let idMarca
    if(factura != null){
        idMarca = factura.id_marca
    }else{
        const pago = await db.sequelize.models.pagos.findOne({where:{ id_cfdi:id }, paranoid: false });
        idMarca = pago.id_marca
    }
	const marca = await db.sequelize.models.marcas.findByPk(idMarca, { include:['pais','domicilio'],paranoid: false });
    const cfdi = await db.sequelize.models.cfdis.findByPk(id, { paranoid: false });
    const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { paranoid: false });
    var emisor = undefined;
    const env = process.env.NODE_ENV;
    var cer 
    var key 
    var password
    if((env == 'development' || env == 'test')){
        emisor = 'EKU9003173C9'
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
    } else{
        emisor = datoFacturacionEmisor.no_identificacion
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
    }
    var data 
    try {
        data = {
            env:env,
            uuid: cfdi.folio_fiscal,
            rfc_emisor: emisor,
            certificado:{
                cer:cer,
                key:key,
                password: password,
            },
            motivo: '02'
        };
    } catch (error) {
        return res.status(400).send({ validado: false, msg: "Factura no timbrada"});
    }
    const url = `${process.env.URL_API_FACTURACION}/api/cancelar`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    let dataTimbrado
    let validado
    try {
        const response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        validado = response.data.validado
    } catch (error) {
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var datosUpdate = {
            //id_motivo_cancelacion_factura:req.body.idMotivoCancelacionFactura,
            acuse_cancelacion: dataTimbrado.acuse,
            folio_cancelacion: "",
            updatedAt: moment().tz('America/Mexico_City')
        }
        await cfdi.update(datosUpdate, { where: { id: cfdi.id } });
        var datosUpdate = {
            id_cfdi: null,
            updatedAt: moment().tz('America/Mexico_City')
        }
    }
    if(validado){
        return res.status(200).send({ status: true, msg: "Registro cancelado con éxito", dataTimbrado:dataTimbrado});
    }
    return res.status(400).send({ status: validado, msg: dataTimbrado});
}

async function cancelarNotaCredito(id){
	const notaCredito = await db.sequelize.models.notas_credito.findByPk(id, { paranoid: false });
    const cfdi = await db.sequelize.models.cfdis.findByPk(notaCredito.id_cfdi, { paranoid: false });
	const factura = await db.sequelize.models.facturas.findByPk(notaCredito.id_factura, { paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
	const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { paranoid: false });
	var emisor = undefined;
    const env = process.env.NODE_ENV;
    var cer 
    var key 
    var password
    if((env == 'development' || env == 'test')){
        emisor = 'EKU9003173C9'
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
    } else{
        emisor = datoFacturacionEmisor.no_identificacion
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
    }
    var data 
    try {
        data = {
            env:env,
            uuid: cfdi.folio_fiscal,
            rfc_emisor: emisor,
            certificado:{
                cer:cer,
                key:key,
                password: password,
            },
            motivo: '02'
        };
    } catch (error) {
        return { validado: false, msg: "Nota de credito no timbrada"};
    }
    const url = `${process.env.URL_API_FACTURACION}/api/cancelar`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    let dataTimbrado
    let validado
    try {
        const response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        validado = response.data.validado
    } catch (error) {
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var datosUpdate = {
            acuse_cancelacion: dataTimbrado.acuse,
            folio_cancelacion: "",
			updatedAt: moment().tz('America/Mexico_City')
		}
        await cfdi.update(datosUpdate, { where: { id: cfdi.id } });
        var datosUpdate = {
            id_cfdi: null,
			updatedAt: moment().tz('America/Mexico_City')
		}
    }
    if(validado){
        return { status: true, msg: "Registro cancelado con éxito"};
    }
    return { status: validado, msg: dataTimbrado};
}

async function cancelarPago(id){
    const pago = await db.sequelize.models.pagos.findByPk(id);
    const cfdi = await db.sequelize.models.cfdis.findByPk(pago.id_cfdi, { paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(pago.id_marca, { include:['pais','domicilio'],paranoid: false });
	const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { paranoid: false });
	var emisor = undefined;
    const env = process.env.NODE_ENV;
    var cer 
    var key 
    var password
    if((env == 'development' || env == 'test')){
        emisor = 'EKU9003173C9'
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
    } else{
        emisor = datoFacturacionEmisor.no_identificacion
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
    }
    var data 
    try {
        data = {
            env:env,
            uuid: cfdi.folio_fiscal,
            rfc_emisor: emisor,
            certificado:{
                cer:cer,
                key:key,
                password: password,
            },
            motivo: '02'
        };
    } catch (error) {
        return { validado: false, msg: "Pago no timbrada"};
    }
    const url = `${process.env.URL_API_FACTURACION}/api/cancelar`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    let dataTimbrado
    let validado
    try {
        const response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        validado = response.data.validado
    } catch (error) {
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var datosUpdate = {
            acuse_cancelacion: dataTimbrado.acuse,
            folio_cancelacion: "",
			updatedAt: moment().tz('America/Mexico_City')
		}
        await cfdi.update(datosUpdate, { where: { id: cfdi.id } });
        var datosUpdate = {
            id_cfdi: null,
			updatedAt: moment().tz('America/Mexico_City')
		}
    }
    if(validado){
        return { status: true, msg: "Registro cancelado con éxito"};
    }
    return { status: validado, msg: dataTimbrado};
}

async function round(numero,decimas) {
    numero = parseFloat(numero)
    return Number(numero.toFixed(decimas));
}

async function getDataDoc(nameFile){
    const filePath = path.join(__dirname, '../facturacion/fields', nameFile);

    try {
        const data = fs.readFileSync(filePath);
        const base64Content = data.toString('base64');
        return base64Content
    } catch (err) {
        return undefined
    }
}

async function cancelarCFDI(req, res){
	const { id } = req.params;
	const factura = await db.sequelize.models.facturas.findOne({where:{ id_cfdi:id }, include:['factura_detalles'],paranoid: false });
	const marca = await db.sequelize.models.marcas.findByPk(factura.id_marca, { include:['pais','domicilio'],paranoid: false });
    const cfdi = await db.sequelize.models.cfdis.findByPk(id, { paranoid: false });
    const datoFacturacionEmisor = await db.sequelize.models.datos_facturacion.findByPk(marca.id_dato_facturacion, { paranoid: false });
    var emisor = undefined;
    const env = process.env.NODE_ENV;
    var cer 
    var key 
    var password
    if((env == 'development' || env == 'test')){
        emisor = 'EKU9003173C9'
        password = '12345678a'
        cer = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.cer')
        key = await getDataDoc('CSD_Sucursal_1_EKU9003173C9_20230517_223850.key')
    } else{
        emisor = datoFacturacionEmisor.no_identificacion
        cer = datoFacturacionEmisor.cer
        key = datoFacturacionEmisor.key
        password = datoFacturacionEmisor.password // await CryptoMiddleware.desencriptarString(datoFacturacionEmisor.password)
    }
    var data 
    try {
        data = {
            env:env,
            uuid: cfdi.folio_fiscal,
            rfc_emisor: emisor,
            certificado:{
                cer:cer,
                key:key,
                password: password,
            },
            motivo: '02'
        };
    } catch (error) {
        return res.status(400).send({ validado: false, msg: "Factura no timbrada"});
    }
    const url = `${process.env.URL_API_FACTURACION}/api/cancelar`
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'x-api-key': process.env.API_KEY_FACTURACION
    }
    let dataTimbrado
    let validado
    try {
        const response = await axios.post(url, data, { headers });
        dataTimbrado = response.data.data
        validado = response.data.validado
    } catch (error) {
        dataTimbrado = undefined
        validado = false
    }
    if(validado && dataTimbrado != undefined){
        var datosUpdate = {
            //id_motivo_cancelacion_factura:req.body.idMotivoCancelacionFactura,
            acuse_cancelacion: dataTimbrado.acuse,
            folio_cancelacion: "",
            updatedAt: moment().tz('America/Mexico_City')
        }
        await cfdi.update(datosUpdate, { where: { id: cfdi.id } });
        var datosUpdate = {
            id_cfdi: null,
            updatedAt: moment().tz('America/Mexico_City')
        }
    }
    if(validado){
        return res.status(200).send({ status: true, msg: "Registro cancelado con éxito"});
    }
    return res.status(400).send({ status: validado, msg: dataTimbrado});
}


module.exports = {
	timbrar,
    cancelar,
    timbrarLocal,
    timbrarManal,
    timbrarNotaCredito,
    cancelarNotaCredito,
    timbrarPago,
    getDataDoc,
    cancelarPago,
    timbrarFactura,
    cancelarCFDI
}