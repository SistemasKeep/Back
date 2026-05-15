'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const { Relaciones } = require('../middlewares/relaciones');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');
const { Filtros } = require('../middlewares/filtros');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');


async function exportar(req, res) {
	var orden = req.query.orden; 
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.clientes.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	req.query.perfil = 'all';
	try {
		const perfilesValidos = ['all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [
					'categoria_cliente',
					'detalles_cliente.agente_credito_cobranza',
					'detalles_cliente.agente_customer',
					'detalles_cliente.comisionista.proveedor',
					'detalles_cliente.mediador_mercantil',
					'estado.pais.continente',
					'fuente',
					'oficina_interno',
					'tipo_cliente'
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}


		const docs = await db.sequelize.models.clientes.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: {
				...filtro,
				...whereFind,
			},
		});

		const data = [];
		for(const doc of docs){
			const element = doc.toJSON();
			const razonesSociales = [];
			const facturaMX = [];
			const facturaUSD = [];
			let netaAcumuladoMXN = 0;
			let profitAcumuladoMXN = 0;
			const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:element.id}, order: [['id', 'ASC']]});
			var relacionesRS = [];
			const relRS = ['nacionalidad_timbrado','nacionalidad_timbrado.continente','pais','pais.continente', 'uso_cfdi','metodo_pago','forma_pago','razon_bloqueo','regimen_fiscal','moneda_credito', 'razones_sociales_domicilios.domicilio'];
			const findRelacionesRS = new Relaciones(relRS,relRS,db.sequelize.models);
			relacionesRS = await findRelacionesRS.getRelaciones();
			var moneda;
			for(const cliente_razon_social of clientesRazonesSociales){
				const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social,{include: relacionesRS});
				if(razonSocial != null){
					razonesSociales.push(razonSocial);
				}
			}
			element.razones_sociales = razonesSociales;
			if(razonesSociales.length > 0){
					element.razon_social = razonesSociales[0];
			} else{
					element.razon_social = null;
			}
			if(razonesSociales.length > 0){
				const idsRS = [];
				for(const rs of razonesSociales){
					idsRS.push(rs.id);
				}
				const whereFindFacturas = {
					where: {id_razon_social:{[db.Sequelize.Op.or]: idsRS}},
					order: [['id', 'ASC']],
					include:['moneda']
				}
				const facturas = await db.sequelize.models.facturas.findAll(whereFindFacturas);
				if(facturas.length > 0){
					element.fecha_primer_factura = moment(facturas[0].createdAt)
					.tz('America/Mexico_City')
					.format('YYYY-MM-DD HH:mm:ss');
					element.folio_factura = facturas[0].folio;
					element.no_operacion_factura = facturas[0].referencia;
					facturas.forEach(factura => {
						if(factura.moneda.clave.includes("USD")){
							facturaUSD.push(factura.id)
						}else{
							facturaMX.push(factura.id)
						}
					});
				}else{
					element.fecha_primer_factura = null;
					element.folio_factura = null;
					element.no_operacion_factura = null;
				}
			}else{
				element.fecha_primer_factura = null;
				element.folio_factura = null;
				element.no_operacion_factura = null;
			}
			var whereFindMarcas = {
				where: {
					nombre: {[db.Sequelize.Op.like]: `%keepro mexico%`},
					deletedAt: null
				}
			}
			element.agentes_keepro_cliente = null;
			const getRelaciones =  [ 'agente_operativo','agente_venta_1','agente_venta_2','inside_sales' ];
			var relacionesAgentes = [];
			const findRelacionesAgentes = new Relaciones(getRelaciones,getRelaciones,db.sequelize.models);
			relacionesAgentes = await findRelacionesAgentes.getRelaciones();
			const agentesClienteDatakeepro = await db.sequelize.models.marca_agentes_clientes.findOne({where:{id_cliente:element.id}, include:relacionesAgentes,paranoid: false});
			if(agentesClienteDatakeepro != null){
				const agentesClientekeepro = {
					agente_operativo: agentesClienteDatakeepro.agente_operativo != null ? agentesClienteDatakeepro.agente_operativo.nombre : null,
					agente_venta_1: agentesClienteDatakeepro.agente_venta_1 != null ? agentesClienteDatakeepro.agente_venta_1.nombre : null,
					agente_venta_2: agentesClienteDatakeepro.agente_venta_2 != null ? agentesClienteDatakeepro.agente_venta_2.nombre : null,
					inside_sales: agentesClienteDatakeepro.inside_sales != null ? agentesClienteDatakeepro.inside_sales.nombre : null,
				}
				element.agentes_keepro_cliente = agentesClientekeepro;
			}else{
				const agentesClientekeepro = {
					agente_operativo: null,
					agente_venta_1: null,
					agente_venta_2: null,
					inside_sales: null
				};
				element.agentes_keepro_cliente = agentesClientekeepro;
			}
			const oficinasClienteData = await db.sequelize.models.oficinas_cliente.findAll({where:{id_cliente:element.id}});
			const oficinasCliente = [];
			for(const oficinaClientedata of oficinasClienteData){
				oficinasCliente.push({ id_oficina: oficinaClientedata.id_oficina });
			}
			element.contactos = [];
			element.contacto = null;
			if(oficinasCliente.length > 0){
				const filtro = {
					[db.Sequelize.Op.or]: oficinasCliente,
				}
				const contactosData = await db.sequelize.models.contactos.findAll({where:filtro,order: [['createdAt', 'ASC']]})
				if(contactosData.length > 0){
						element.contactos = contactosData
						element.contacto = contactosData[0]
				}
			}


			element.rfc = null;
			if(element.razones_sociales.length > 0){
				element.rfc = element.razones_sociales[0].no_identificacion;
			}

			element.telefono = null;
			element.email = null;
			if(element.contactos.length > 0){
				element.telefono = element.contactos[0].telefono;
				element.email = element.contactos[0].email;
			}

			element.clave = `KP-${element.id}`;
			element.pais = element.estado.pais.descripcion;
			element.estado = element.estado.descripcion;
			var relacionesAgentes = [];
			relacionesAgentes = await findRelacionesSeg.getRelaciones();
			

			const decimales = 6
			var equivalencia = 0;
			if(facturaMX.length > 0){
				//Se calcula el total de la factura
				var subtotalFactura = 0;
				var impuestoFactura = 0;
				var descuentoFactura = 0;
				var AcumuladoMXN = 0;
				var profitMXN = 0;
				for(const fac of facturaMX){
					const factura = await db.sequelize.models.facturas.findByPk(fac, { include:['factura_detalles'] });
					for(const detalle of factura.factura_detalles){
						
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
						var subProfitMXN;
						if(pedidoFactura != null){
							if(pedidoFactura.id_certificado){
								const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
								subProfitMXN = certificado.detalle_certificado[0].costo_compra;
							}else if(pedidoFactura.id_servicio_ontrack !== null){
								const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: pedidoFactura.id_servicio_ontrack}})
								let costoCompra = 0
								for(const detalle of detalles){
									costoCompra = costoCompra + parseFloat(detalle.costo_compra)
								}
								subProfitMXN = costoCompra
							}
						}
						profitMXN += parseFloat(subProfitMXN);
						subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0);
						impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0);
						descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0);
					}
					const totalFactura = subtotalFactura + impuestoFactura - descuentoFactura;
					AcumuladoMXN += totalFactura;
					element.profit_MXN = profitMXN;
				}
				element.facturacion_neta_MXN = AcumuladoMXN;

			}

			profitAcumuladoMXN += element.profit_MXN;
			netaAcumuladoMXN += element.facturacion_neta_MXN;

			if(facturaUSD.length > 0){
				//Se calcula el total de la factura USD
				var subtotalFactura = 0;
				var impuestoFactura = 0;
				var descuentoFactura = 0;
				var AcumuladoMXN = 0;
				var AcumuladoUSD = 0;
				var AcumuladoPfUDS = 0;
				var profitAcumuladoUSD = 0;
				for(const fac of facturaUSD){
					const factura = await db.sequelize.models.facturas.findByPk(fac, { include:['factura_detalles'] });
				
					let fechaString = moment(factura.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD')
					const tipoCambioSelected = await db.sequelize.models.tipos_cambio_futuro.findOne({where:{fecha: fechaString}});
					if(tipoCambioSelected == undefined){
						return res.status(400).send({ status: false, msg: `Tipo de cambio no encontrado`});
					}
					equivalencia = tipoCambioSelected.tipo_cambio;

					for(const detalle of factura.factura_detalles){
						
						const pedidoFactura = await db.sequelize.models.pedidos_factura.findByPk(detalle.id_pedido_factura, { paranoid: false });
						var subProfitUSD;
						if(pedidoFactura != null){
							if(pedidoFactura.id_certificado){
								const certificado = await db.sequelize.models.certificados.findByPk(pedidoFactura.id_certificado, { include:['detalle_certificado'], paranoid: false });
								subProfitMXN = certificado.detalle_certificado[0].costo_compra;
							}else if(pedidoFactura.id_servicio_ontrack !== null){
								const detalles = await db.sequelize.models.servicios_ontrack_detalles.findAll({where:{id_servicio_ontrack: pedidoFactura.id_servicio_ontrack}})
								let costoCompra = 0
								for(const detalle of detalles){
									costoCompra = costoCompra + parseFloat(detalle.costo_compra)
								}
								subProfitMXN = costoCompra
							}
						}
						profitAcumuladoUSD += parseFloat(subProfitUSD);
						subtotalFactura = subtotalFactura + parseFloat(detalle.subtotal ?? 0);
						impuestoFactura = impuestoFactura + parseFloat(detalle.impuesto ?? 0);
						descuentoFactura = descuentoFactura + parseFloat(detalle.descuento ?? 0);
					}
					const totalFacturaUSD = subtotalFactura + impuestoFactura - descuentoFactura;º
					const totalFacturaMX = parseFloat((totalFacturaUSD * equivalencia).toFixed(decimales));
					const totalProfitMX = parseFloat((profitAcumuladoUSD * equivalencia).toFixed(decimales));
					AcumuladoMXN += totalFacturaMX;
					AcumuladoUSD += totalFacturaUSD;
					AcumuladoPfUDS += totalProfitMX;
					
					element.profitUSD = profitAcumuladoUSD;
				}
				element.facturacion_neta_USD = AcumuladoUSD;
				
				netaAcumuladoMXN += AcumuladoMXN;
				profitAcumuladoMXN += AcumuladoPfUDS;
			}
			element.neta_acumulado_mxn = isNaN(netaAcumuladoMXN) ? 0 : netaAcumuladoMXN;
			element.profitMXN = isNaN(profitAcumuladoMXN) ? 0 : profitAcumuladoMXN;

			data.push(element);
		}
		// Datos mapeados
		const elementos = data.map(item => [

			item.clave || '',
			item.nombre || '',
			item.email || '',
			item.telefono || '',
			item.pais || '',
			item.seguimiento_datos.fecha || '',
			item.seguimiento_datos.hora || '',
			item.seguimiento_datos.tipo || '',
			item.agentes_keepro_cliente.agente_venta_1 || '',
			item.agentes_keepro_cliente.agente_venta_2 || '',
			moment(item.createdAt).format('YYYY-MM-DD') || '',
			moment(item.createdAt).format('HH:mm') || '',
			moment(item.seguimiento_datos?.fecha_ultima).isValid() ? moment(item.seguimiento_datos.fecha_ultima).format('YYYY-MM-DD') : '',
			item.detalles_cliente ? moment(item.detalles_cliente.createdAt).format('YYYY-MM-DD') : '',
			item.no_operacion_factura || '',
			item.folio_factura || '',
			item.seguimiento_datos.estatus_ultimo || '',
			ManipuladorCadenas.formatMoney(item.facturacion_neta_MXN) || '',
			ManipuladorCadenas.formatMoney(item.facturacion_neta_USD) || '',
			ManipuladorCadenas.formatMoney(item.neta_acumulado_mxn) || '',
			ManipuladorCadenas.formatMoney(item.profit_MXN) || '',
			ManipuladorCadenas.formatMoney(item.profitUSD) || '',
			ManipuladorCadenas.formatMoney(item.profitMXN) || ''
		]);

		const nombreReporte = 'Clientes_Prospectos';
		const namesSheets = [db.sequelize.models.clientes.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: elementos,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteHeadersColumns(res,req);
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString()});
	}
}

async function getFiltro(parametros){
	var filtro
	try {
		filtro = JSON.parse(parametros.filter)
	} catch (error) {
		filtro = undefined
	}
	var eliminados = parametros.eliminados;
	const Filter = new Filtros({filtros:filtro,eliminados:eliminados})
	return await Filter.get()
}

module.exports = {
	exportar
}
