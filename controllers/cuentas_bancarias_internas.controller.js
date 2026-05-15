'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { Filtros } = require('../middlewares/filtros');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_bancarias_internas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const perfilesValidos = ['dato_facturacion', 'entidad_bancaria', 'moneda', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				dato_facturacion: [ 
					'dato_facturacion.pais.continente',
					'dato_facturacion.nacionalidad_timbrado.continente',
					'dato_facturacion.regimen_fiscal'
				],
				moneda: [ 'moneda' ],
				entidad_bancaria: [ 'entidad_bancaria' ],
				all: [ 
					'moneda',
					'entidad_bancaria',
					'dato_facturacion.pais.continente',
					'dato_facturacion.nacionalidad_timbrado.continente',
					'dato_facturacion.regimen_fiscal'
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}

		const docs = await db.sequelize.models.cuentas_bancarias_internas.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.cuentas_bancarias_internas.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cuentasBancariasInternas`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const data = []
		'domicilio.estado.pais.continente'
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const listRel = [ 'domicilio.estado.pais.continente' ]
				const findRelacionesDomicilios = new Relaciones(listRel,listRel,db.sequelize.models)
				const relacionesDomicilios =  await findRelacionesDomicilios.getRelaciones()
				const domiciliosData = await db.sequelize.models.datos_facturacion_domicilios.findAll({where:{id_dato_facturacion: element.dato_facturacion.id}, include:relacionesDomicilios})
				const domicilios = []
				for(const domicilio of domiciliosData){
					const dom = domicilio.domicilio.toJSON()
					dom.tipo = domicilio.tipo
					dom.usuario_registro = undefined
					domicilios.push(dom)
				}
				element.dato_facturacion.domicilios = domicilios
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
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [
			{campo:'idDatosFacturacion', tipo:'model', model:db.sequelize.models.datos_facturacion},
			{campo:'idEntidadBancaria', tipo:'model', model:db.sequelize.models.entidades_bancarias},
			{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'alias', tipo:'string', largo:45, textoCase:"up"},
        	{campo:'numeroCuentaBanco', tipo:'string', largo:45, textoCase:"up"},
        	{campo:'clabe', tipo:'string', largo:45, textoCase:"up"},
			{campo:'cajaChica', tipo:'boolean'}
        ];
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		const registrosEncontrados = await db.sequelize.models.cuentas_bancarias_internas.findAll({
			where: {
				[db.Sequelize.Op.or]: {
					[db.Sequelize.Op.and]: {
						id_datos_facturacion: parametros.idDatosFacturacion,
						[db.Sequelize.Op.or]: {
							numero_cuenta_banco: {
								[db.Sequelize.Op.like]: `%${parametros.numeroCuentaBanco}%`
							},
							clabe: {
								[db.Sequelize.Op.like]: `%${parametros.clabe}%`
							}
						},
					},
					alias: {
						[db.Sequelize.Op.like]: `%${parametros.alias}%`
					},
				},
				deletedAt: null
			}
		});
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if(((registro.id_datos_facturacion == parametros.idDatosFacturacion) && 
				   ((registro.numero_cuenta_banco.toLowerCase() == parametros.numeroCuentaBanco.toLowerCase()) ||
				   (registro.clabe.toLowerCase() == parametros.clabe.toLowerCase()))) ||
				   (registro.alias.toLowerCase() == parametros.alias.toLowerCase())){
						if(!regExistente){
							regExistente = true;
							res.status(400).send({ status: false, msg: "Registro existente"});
						}
				}
			});
			if(regExistente){
				return '';
			}
		}
		registro.id_usuario_registro = req.usuario.id
		const nuevoRegistro = await db.sequelize.models.cuentas_bancarias_internas.create(registro);
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
		const perfilesValidos = ['dato_facturacion', 'entidad_bancaria', 'moneda', 'all']
		var relaciones = []
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				dato_facturacion: [ 
					'dato_facturacion.pais.continente',
					'dato_facturacion.datos_facturacion_domicilios.domicilio.estado.pais.continente',
					'dato_facturacion.nacionalidad_timbrado.continente',
					'dato_facturacion.regimen_fiscal'
				],
				moneda: [ 'moneda' ],
				entidad_bancaria: [ 'entidad_bancaria' ],
				all: [ 
					'moneda',
					'entidad_bancaria',
					'dato_facturacion.pais.continente',
					'dato_facturacion.datos_facturacion_domicilios.domicilio.estado.pais.continente',
					'dato_facturacion.nacionalidad_timbrado.continente',
					'dato_facturacion.regimen_fiscal'
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models)
			relaciones = await findRelaciones.getRelaciones()
		}
		const registroEncontrado = await db.sequelize.models.cuentas_bancarias_internas.findByPk(id, {include:relaciones,paranoid: false});
		if(registroEncontrado != null){
			return res.status(200).send({ status: true, data: registroEncontrado.toJSON()});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const parametros = req.body;
	try {
		const { id } = req.params;
		if(!Number.isInteger(parseInt(id))){
			res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
			return false
		} 
		let seEdita = false;
		var datosUpdate = {updatedAt: moment().tz('America/Mexico_City')}
	
		const validosOpcionales = [
			{campo:'idEntidadBancaria', tipo:'model', model:db.sequelize.models.entidades_bancarias},
			{campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
			{campo:'alias', tipo:'string', largo:45, textoCase:"up"},
			{campo:'numeroCuentaBanco', tipo:'string', largo:45, textoCase:"up"},
			{campo:'clabe', tipo:'string', largo:45, textoCase:"up"},
			{campo:'cajaChica', tipo:'boolean'}
        ];
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(datosUpdate,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		datosUpdate = dataValidarOpcionales[0]
		seEdita = dataValidarOpcionales[1]
		if(!seEdita){
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		}
		const registroAEditar = await db.sequelize.models.cuentas_bancarias_internas.findByPk(id);
		if(registroAEditar == null){
			return res.status(400).send({ status: false, msg: "Registro no existe" });
		}
		if(registroAEditar.deletedAt != null){
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		var whereFind =  {
			[db.Sequelize.Op.or]: {
				[db.Sequelize.Op.and]: {
					id_datos_facturacion: registroAEditar.id_datos_facturacion,
					[db.Sequelize.Op.or]: {
						numero_cuenta_banco: {
							[db.Sequelize.Op.like]: `%${parametros.numeroCuentaBanco != undefined ? parametros.numeroCuentaBanco :registroAEditar.numero_cuenta_banco}%`
						},
						clabe: {
							[db.Sequelize.Op.like]: `%${parametros.clabe != undefined ? parametros.clabe :registroAEditar.clabe}%`
						}},
				},
				alias: {
					[db.Sequelize.Op.like]: `%${parametros.alias != undefined ? parametros.alias :registroAEditar.alias}%`
				},
			},
			deletedAt: null
		}
		const registrosEncontrados = await db.sequelize.models.cuentas_bancarias_internas.findAll(whereFind);
		if(registrosEncontrados.length > 0){
			var regExistente = false
			await registrosEncontrados.forEach(registro => {
				if((((registro.id_datos_facturacion == registroAEditar.id_datos_facturacion) &&
				    ((registro.numero_cuenta_banco.toLowerCase() == (parametros.numeroCuentaBanco != undefined? parametros.numeroCuentaBanco.toLowerCase(): registroAEditar.numero_cuenta_banco.toLowerCase())) ||
					 (registro.clabe.toLowerCase() == (parametros.clabe != undefined? parametros.clabe.toLowerCase(): registroAEditar.clabe.toLowerCase())))) || 
					 (registro.alias.toLowerCase() == (parametros.alias != undefined? parametros.alias.toLowerCase(): registroAEditar.alias.toLowerCase()))) && 
					  registro.id != id){
					if(!regExistente){
						regExistente = true;
						res.status(400).send({ status: false, msg: "Registro existente"});
					}
				}
			});
			if(regExistente){
				return '';
			}
		}
		await registroAEditar.update(datosUpdate, { where: { id: id } });
		return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
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
		const registroAEliminar = await db.sequelize.models.cuentas_bancarias_internas.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.cuentas_bancarias_internas.name){
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

async function restaurar(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroARestaurar = await db.sequelize.models.cuentas_bancarias_internas.findByPk(id,{ paranoid: false });
		if(registroARestaurar != null){
			if(registroARestaurar.deletedAt != null){
				const registrosEncontrados = await db.sequelize.models.cuentas_bancarias_internas.findAll({
					where: {
						[db.Sequelize.Op.or]: {
							[db.Sequelize.Op.and]: {
								id_datos_facturacion: registroARestaurar.id_datos_facturacion,
								[db.Sequelize.Op.or]: {
									numero_cuenta_banco: {
										[db.Sequelize.Op.like]: `%${registroARestaurar.numero_cuenta_banco}%`
									},
									clabe: {
										[db.Sequelize.Op.like]: `%${registroARestaurar.clabe}%`
									}},
							},
							alias: {
								[db.Sequelize.Op.like]: `%${registroARestaurar.alias}%`
							},
						},
						deletedAt: null
                    }
				});
				if(registrosEncontrados.length > 0){
					var regExistente = false
					await registrosEncontrados.forEach(registro => {
						if((((registro.id_datos_facturacion == registroARestaurar.id_datos_facturacion) &&
							((registro.numero_cuenta_banco.toLowerCase() == (registroARestaurar.numero_cuenta_banco.toLowerCase())) ||
							(registro.clabe.toLowerCase() == (registroARestaurar.clabe.toLowerCase())))) || 
							(registro.alias.toLowerCase() == (registroARestaurar.alias.toLowerCase()))) && 
							registro.id != id){
							if(!regExistente){
								regExistente = true;
								res.status(400).send({ status: false, msg: "Registro existente"});
							}
						}
					});
					if(regExistente){
						return '';
					}
				}
				await registroARestaurar.restore()
				return res.status(200).send({ status: true, msg: "Registro restaurado con éxito"});
			}
			return res.status(400).send({ status: false, msg: "Registro no eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function exportar(req, res) {
	var orden = req.query.orden;
	req.query.perfil = 'all';
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.cuentas_bancarias_internas.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);

	try {
		const perfilesValidos = ['all'];
		var relaciones = [];
		if(perfilesValidos.includes(req.query.perfil)){
			const parametrosRelaciones = {
				all: [ 
					'moneda',
					'entidad_bancaria',
					'dato_facturacion.pais.continente',
					'dato_facturacion.nacionalidad_timbrado.continente',
					'dato_facturacion.regimen_fiscal'
				]
			};
			const findRelaciones = new Relaciones(parametrosRelaciones[req.query.perfil],parametrosRelaciones[req.query.perfil],db.sequelize.models);
			relaciones = await findRelaciones.getRelaciones();
		}

		const docs = await db.sequelize.models.cuentas_bancarias_internas.findAll({
			paranoid: false,
			page: 1,
			include: relaciones,
			paginate: 10000,
			order: [[campoOrden, orden]],
			where: filtro
		});
		
		const data = [];
		for(const doc of docs){
			const element = doc.toJSON()
			if(req.query.perfil == 'all'){
				const marca = await db.sequelize.models.marcas.findOne({
					where: {
						id_dato_facturacion: element.id_datos_facturacion
					}
				});
				element.marca = marca != null ? marca.nombre : '';
			}
			data.push(element);
		}

		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			if(elemento.entidad_bancaria == null || elemento.moneda == null) continue;
			
			aux = {
				'Nombre': elemento.alias,
				'Entidad bancaria': elemento.entidad_bancaria.nombre,
				'Marca': elemento.marca,
				'Número de cuenta': elemento.numero_cuenta_banco,
				'CLABE': elemento.clabe,
				'Moneda': elemento.moneda.clave,
				'Eliminado': elemento.deletedAt != null ? 'Si' : 'No'
			};
			dataExcel.push(aux);
		}

		if(dataExcel.length < 1){
            return res.status(400).json({ success: false, error: 'Sin registros' });
        }
        res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});

		const nombreReporte = 'Cuentas Bancarias Internas';
		const namesSheets = [db.sequelize.models.cuentas_bancarias_internas.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteOneSheet(res,req);
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}


module.exports = {
	index,
	store,
	show,
	update,
	destroy,
	restaurar,
	exportar
}
