'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { ReportesXLSX } = require('../middlewares/reportesXlsx')


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cotizaciones.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['cliente', 'marca', 'metodo_pago', 'moneda', 'razon_social', 'contacto', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente'
				],
				contacto: [ 'contacto' ],
				marca: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				metodo_pago: ['metodo_pago'],
				moneda: [ 'moneda' ],
                razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                all: [
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente',
					'contacto',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'metodo_pago',
					'moneda',
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.cotizaciones.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cotizaciones.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cotizaciones`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				element.detalles = await db.sequelize.models.cotizaciones_detalles.findAll({where:{id_cotizacion:element.id}});
			}
			data.push(element)
		}
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: data
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
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

async function store(req, res){
	try {
		const parametros = req.body;
		const detalles = parametros.detalles ?? []
		if(detalles.length < 1 && Array.isArray(detalles)){
			res.status(400).send({status:false , msg: `El parametro detalles no debe estar vacío.` });
			return false
		} 
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [
			{campo:'idMarca', tipo:'model', model:db.sequelize.models.marcas},
			{campo:'idCliente', tipo:'model', model:db.sequelize.models.clientes},
			{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'idMetodoPago', tipo:'model', model:db.sequelize.models.metodos_pago},
			{campo:'folio', tipo:'string', textoCase:"up", largo:255},
        ]
        const validosOpcionales =[
			{campo:'idContacto', tipo:'model', model:db.sequelize.models.contactos},
			{campo:'referencia', tipo:'string', textoCase:"up", largo:255},
			{campo:'comentarios', tipo:'string', textoCase:"up", largo:255}
        ]
		const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca);
		if(marca != null){
			const nameMarca = await ManipuladorCadenas.quitarAcentos(marca.nombre.toLowerCase())
			const nameMarcaList = nameMarca.split(" ")
			if(nameMarcaList.includes('keepro') && nameMarcaList.includes('mexico')){
				const moneda = await db.sequelize.models.monedas.findOne({where: {clave: 'USD'}});
				parametros.idMoneda = moneda.id
			}else if(nameMarcaList.includes('keepro') && !nameMarcaList.includes('mexico')){
				 return res.status(400).send({ status: false, msg: "Marca no válida"});
			}
			const dataDocs = await db.sequelize.models.cotizaciones.findAll({where:{id_marca:marca.id},paranoid: false});
			parametros.folio = marca.clave + "-" + (dataDocs.length + 1)
		}
		const cliente = await db.sequelize.models.clientes.findByPk(parametros.idCliente);
		if(cliente != null){
			if(cliente.cliente_prospecto !== false){
				obligatorios.push({campo:'idRazonSocial', tipo:'model', model:db.sequelize.models.razones_sociales})
				const clienteRazonSocial = await db.sequelize.models.clientes_razones_sociales.findOne({where:{id_razon_social:parametros.idRazonSocial}});
				if(clienteRazonSocial != null){
					if(clienteRazonSocial.id_cliente != cliente.id){
						return res.status(400).send({ status: false, msg: "La razón social no pertenece al cliente."});
					}
				}else{
					return res.status(400).send({ status: false, msg: "La razón social no pertenece al cliente."});
				}
			}
		}
		const contacto = await db.sequelize.models.contactos.findByPk(parametros.idContacto);
		if(contacto != null){
			const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({where:{id_oficina:contacto.id_oficina}})
			if(oficinaCliente == null){
				return res.status(400).send({ status: false, msg: "El contacto no pertenece al cliente."});
			}
			if(oficinaCliente.id_cliente != cliente.id){
				return res.status(400).send({ status: false, msg: "El contacto no pertenece al cliente."});
			}
		}
		const metodoPago = await db.sequelize.models.metodos_pago.findByPk(parametros.idMetodoPago)
		if(metodoPago != null){
			if(metodoPago.clave.toUpperCase() == 'PPD'){
				obligatorios.push({campo:'diasCredito', tipo:'number'})
			}
		}
		
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]

		registro.id_usuario_registro = req.usuario.id
		for(const detalle of detalles){
			let registroValidar = {
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			}
			let obligatoriosDetalle = [
				{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
				{campo:'tarifaCliente', tipo:'number'},
				{campo:'cantidad', tipo:'number'},
				{campo:'minimoVenta', tipo:'number'},
			]
			registroValidar = await Validaciones.validParametros({body:detalle}, res,obligatoriosDetalle,registroValidar);
			if(!registroValidar){
				return undefined;
			}
			const producto = await db.sequelize.models.productos.findByPk(detalle.idProducto);
			if(producto.id_marca != marca.id){
				return res.status(400).send({ status: false, msg: "La marca del producto debe tener la misma marca que la cotización"});
			}
        }
		const nuevoRegistro = await db.sequelize.models.cotizaciones.create(registro);
        for(const detalle of detalles){
			let registroDetalle = {
				createdAt: moment().tz('America/Mexico_City'),
				updatedAt: moment().tz('America/Mexico_City')
			}
			let obligatoriosDetalle = [
				{campo:'idProducto', tipo:'model', model:db.sequelize.models.productos},
				{campo:'tarifaCliente', tipo:'number'},
				{campo:'cantidad', tipo:'number'},
				{campo:'minimoVenta', tipo:'number'},
			]
			registroDetalle = await Validaciones.validParametros({body:detalle}, res,obligatoriosDetalle,registroDetalle);
			if(!registroDetalle){
				return undefined;
			}
			const producto = await db.sequelize.models.productos.findByPk(detalle.idProducto);
			if(producto.id_marca != marca.id){
				return res.status(400).send({ status: false, msg: "La marca del producto debe tener la misma marca que la cotización"});
			}
			registroDetalle.id_cotizacion = nuevoRegistro.id
			registroDetalle.id_usuario_registro = req.usuario.id
			await db.sequelize.models.cotizaciones_detalles.create(registroDetalle);
        }
		return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const perfilesValidos = ['cliente', 'marca', 'metodo_pago', 'moneda', 'razon_social', 'contacto', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				cliente: [
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente'
				],
				contacto: [ 'contacto' ],
				marca: [
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente'
				],
				metodo_pago: ['metodo_pago'],
				moneda: [ 'moneda' ],
                razon_social: [
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
                all: [
					'cliente.categoria_cliente',
					'cliente.detalles_cliente.agente_credito_cobranza',
					'cliente.detalles_cliente.agente_customer',
					'cliente.detalles_cliente.comisionista.proveedor',
					'cliente.detalles_cliente.mediador_mercantil',
					'cliente.estado.pais.continente',
					'cliente.fuente',
					'cliente.oficina_interno',
					'cliente.tipo_cliente',
					'contacto',
					'marca.domicilio.estado.pais.continente',
					'marca.pais.continente',
					'marca.archivo',
					'marca.dato_facturacion.regimen_fiscal', 
					'marca.dato_facturacion.pais.continente', 
					'marca.dato_facturacion.nacionalidad_timbrado.continente',
					'metodo_pago',
					'moneda',
                    'razon_social.pais.continente', 
                    'razon_social.uso_cfdi',
                    'razon_social.metodo_pago',
                    'razon_social.forma_pago',
                    'razon_social.razon_bloqueo',
                    'razon_social.regimen_fiscal',
                    'razon_social.moneda_credito'
                ],
			}
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const registroEncontrado = await db.sequelize.models.cotizaciones.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.cotizaciones.findByPk(id);
		if(registroAEliminar != null){
			const detalles = await db.sequelize.models.cotizaciones_detalles.findAll({where:{id_cotizacion:id}});
			for(const detalle of detalles){
				await detalle.destroy({ where: { id: detalle.id } })
			}
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.cotizaciones.name){
						let where = {}
						if(asociacion.associationType != 'HasMany'){
							where[asociacion.foreignKey] = registroAEliminar.id
							let encontrados = await modelo.findAll({ where: where });
							if(encontrados.length > 0 && !modelosUtilizados.includes(modelo.name)){
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
			if(registroAEliminar.deletedAt != null){
				return res.status(400).send({ status: false, msg: "Registro eliminado" });
			}
			await registroAEliminar.destroy({ where: { id: id } })
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportacion(req, res) {
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cotizaciones.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltroExportacion(req.query);

	try {
		const perfilesValidos = [
			'cliente.categoria_cliente',
			'cliente.detalles_cliente.agente_credito_cobranza',
			'cliente.detalles_cliente.agente_customer',
			'cliente.detalles_cliente.comisionista.proveedor',
			'cliente.detalles_cliente.mediador_mercantil',
			'cliente.estado.pais.continente',
			'cliente.fuente',
			'cliente.oficina_interno',
			'cliente.tipo_cliente',
			'contacto',
			'marca.domicilio.estado.pais.continente',
			'marca.pais.continente',
			'marca.archivo',
			'marca.dato_facturacion.regimen_fiscal', 
			'marca.dato_facturacion.pais.continente', 
			'marca.dato_facturacion.nacionalidad_timbrado.continente',
			'metodo_pago',
			'moneda',
			'razon_social.pais.continente', 
			'razon_social.uso_cfdi',
			'razon_social.metodo_pago',
			'razon_social.forma_pago',
			'razon_social.razon_bloqueo',
			'razon_social.regimen_fiscal',
			'razon_social.moneda_credito'
		]
		const findRelaciones = new Relaciones(perfilesValidos,perfilesValidos,db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()

		const docs = await db.sequelize.models.cotizaciones.findAll({
			paranoid: false,
			include: relaciones,
			order: [[campoOrden, orden]],
			where: filtro,
		})
		
		const data = []
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				element.detalles = await db.sequelize.models.cotizaciones_detalles.findAll({where:{id_cotizacion:element.id}});
			}
			data.push(element)
		}
        const elementos = []
        let idMarca
        for(const element of data){
            if(idMarca === undefined){
                idMarca = element.id_marca
            }
            elementos.push({
                'Folio': element.folio,
                'Fecha de creación': moment(element.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD'),
                'Cliente': element.cliente.nombre,
				'Razón social': element.razon_social != null ? element.razon_social.razon_social : '',
				'Creado por': element.usuario_registro.nombre, 
                'Marca': element.marca.nombre,
				'Referencia': element.referencia != null ? element.referencia : '',
            })
        }
        if(elementos.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        const nombreReporte = `cotizaciones_${moment().tz('America/Mexico_City').format('YYYY-MM-DD')}`;
        const namesSheets = [db.sequelize.models.cotizaciones.name]
        const reporteCertificados = new ReportesXLSX({
            nombreReporte:nombreReporte,
            elementos:elementos,
            namesSheets:namesSheets, 
            idMarca:idMarca
        })
		
        return await reporteCertificados.gerReporteOneSheet(res,req)
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

async function getFiltroExportacion(parametros){
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
	index,
	store,
	show,
	destroy,
	exportacion
}
