'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { google } = require('googleapis');
const { Readable } = require('stream');
const { Buffer } = require('buffer');
const credenciales = {
	client_id: process.env.GOOGLE_CLIENT_ID,
	auth_uri: process.env.GOOGLE_AUTH_URI,
	token_uri: process.env.GOOGLE_TOKEN_URI,
	auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER,
	client_secret: process.env.GOOGLE_CLIENT_SECRET,
	redirect_uri: process.env.GOOGLE_REDIRECT_URI,
	refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
	code: process.env.GOOGLE_CODE
};
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const oAuth2Client = new google.auth.OAuth2(credenciales.client_id, credenciales.client_secret, credenciales.redirect_uri); 
const { Filtros } = require('../middlewares/filtros');


async function index(req, res) {
	const page = parseInt(Number.isInteger(parseInt(req.query.page)) && Math.sign(parseInt(req.query.page)) === 1 ? req.query.page : 1);
	const pageSize = parseInt(Number.isInteger(parseInt(req.query.pageSize)) && Math.sign(parseInt(req.query.pageSize)) === 1 ? req.query.pageSize : 10);
	var orden = req.query.orden;
	if(orden != 'ASC' && orden != 'DESC'){
		orden = 'ASC';
	}
	var campoOrden = req.query.campoOrden;
	const camposModelo = Object.keys(db.sequelize.models.carga_archivos.rawAttributes);
	if(!camposModelo.includes(campoOrden)){
		campoOrden = 'createdAt';
	}
	const filtro = await getFiltro(req.query);
	const offset = (page - 1) * pageSize;
	const limit = pageSize;

	try {
		const findRelaciones = new Relaciones([],[],db.sequelize.models)
		const relaciones = await findRelaciones.getRelaciones()
		const docs = await db.sequelize.models.carga_archivos.findAll({
			paranoid: false,
			page: page || 1,
			include: relaciones,
			paginate: pageSize || 10,
			order: [[campoOrden, orden]],
			where: filtro,
			offset,
			limit
		})
		const dataDocs = await db.sequelize.models.carga_archivos.count({
			paranoid: false,
			include: relaciones,
			where: filtro
		});

		const totalCount = dataDocs
		
		const totalPages = Math.ceil(totalCount / pageSize);
		const nextPage = page < totalPages ? page + 1 : null;
		const prevPage = page > 1 ? page - 1 : null;
		const fullUrl = `${req.protocol}://${req.get('host')}/api/cargaArchivos`;
		const nextPageUrl = nextPage ? `${fullUrl}?page=${nextPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		const prevPageUrl = prevPage ? `${fullUrl}?page=${prevPage}&pageSize=${pageSize}&orden=${orden}` + ((req.query.filter != '' && req.query.filter != undefined) ? `&filter=${req.query.filter}`:'') : null;
		
		return res.status(200).send({
			success: true,
			currentPage: page,
			nextPage: nextPageUrl,
			prevPage: prevPageUrl,
			pages: totalPages,
			total: totalCount,
			data: docs
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
	const parametros = req.body;
	try {
		var registro = {
			createdAt: moment().tz('America/Mexico_City'),
			updatedAt: moment().tz('America/Mexico_City')
		}
		let obligatorios = [{campo:'nombre', tipo:'string',largo:100,textoCase:"up"},
							{campo:'descripcion', tipo:'string',largo:255,textoCase:"up"},
							{campo:'ruta', tipo:'string',largo:255,textoCase:"up"}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
	
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	}
	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send({ status: false, msg: "No se han encontrado archivos para subir."});
    } else{
		try {
			const obligatorios = ['archivo']
			for (const file of obligatorios) {
				if (!req.files[file]) {
					return res.status(400).send({ status: false, msg: `Falta el archivo ${file}`})
				}
			  }
			const files = req.files
			var fileContent = undefined
			var tipoDocumento = undefined
			var fileIsArray = false
			for (let key in files){
				if(obligatorios.includes(key)){
					const file = files[key]
					if (file.size > (50 * 1024 * 1024)) {
						return res.status(400).json({ status: false, msg: 'El archivo es demasiado grande. El tamaño máximo permitido es de 50MB' });
					}
					if(Array.isArray(file)){
						fileIsArray = true
					}
					fileContent = file.data
					tipoDocumento = file.mimetype;
				}
			}	
			if(fileIsArray){
				return res.status(400).json({ status: false, msg: 'Solo se debe enviar un archivo' });
			}
			const registrosEncontrados = await db.sequelize.models.carga_archivos.findAll({
				where: {
					nombre: {
						[db.Sequelize.Op.like]: `%${parametros.nombre}%`
					},
					ruta: {
						[db.Sequelize.Op.like]: `%${parametros.ruta}%`
					},
					deletedAt: null
				}
			});
			if(registrosEncontrados.length > 0){
				var regExistente = false
				await registrosEncontrados.forEach(registro => {
					if(registro.nombre.toLowerCase() == parametros.nombre.toLowerCase() &&
					   registro.ruta.toLowerCase() == parametros.ruta.toLowerCase()){
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
			const validUpload = await saveDrive(registro,fileContent,tipoDocumento)
			if(validUpload != undefined){
				registro.id_usuario_registro = req.usuario.id
				registro.id_google = validUpload.id
				const nuevoRegistro = await db.sequelize.models.carga_archivos.create(registro);
				return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:nuevoRegistro.id}});
			}
			return res.status(500).send({ status: true, msg: "Error al generar registro"});
		} catch (error) {
			return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		} 
	}
}

async function saveDrive(registro,fileContent,tipoDocumento){
	try {
		oAuth2Client.setCredentials({refresh_token: credenciales.refresh_token})
		const drive = google.drive({ version: 'v3', auth: oAuth2Client })
		const folderID = await getFolderId(registro,drive)
		if(folderID == undefined){
			return undefined
		}
		const nombreArchivo = registro.nombre
		const dataFile = await subirArchivo(drive, fileContent, nombreArchivo, tipoDocumento, folderID)
		return dataFile;
	} catch (error) {
		return undefined
	}
}

async function getFolderId(registro,drive) {
	try {
		const carpetas = registro.ruta.split('/').filter(Boolean)
		let parentFolderId = process.env.CARPETA_ID
	  
		for (const carpeta of carpetas) {
		  const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${carpeta}' and trashed = false`;
		  const res = await drive.files.list({
			q: query,
			fields: 'files(id)',
		  });
		  if (res.data.files.length === 0) {
			const nuevaCarpeta = await drive.files.create({
			  requestBody: {
				name: carpeta,
				mimeType: 'application/vnd.google-apps.folder',
				parents: [parentFolderId],
			  },
			  fields: 'id',
			});
			parentFolderId = nuevaCarpeta.data.id;
		  } else {
			parentFolderId = res.data.files[0].id;
		  }
		}
		return parentFolderId;
	} catch (error) {
		return undefined
	}
}

async function subirArchivo(drive, fileContent, nombreArchivo, tipoDocumento, folderID) {
	try {
		const media = {
		  mimeType: tipoDocumento,
		  body: Readable.from(fileContent),
		};
	
		const res = await drive.files.create({
		  requestBody: {
			name: nombreArchivo,
			parents: [folderID],
		  },
		  media: media,
		  fields: 'id',
		});
		return res.data;
	  } catch (error) {
		return undefined
	  }
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	try {
		const registroEncontrado = await db.sequelize.models.carga_archivos.findByPk(id,{ paranoid: false });
		if(registroEncontrado != null){
			if(registroEncontrado.deletedAt == null){
				return await getFile(registroEncontrado,res)
			}
			return res.status(400).send({ status: false, msg: "Registro eliminado" });
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function getFile(registro,respuesta) {
	try {
		oAuth2Client.setCredentials({refresh_token: credenciales.refresh_token})
		const drive = google.drive({ version: 'v3', auth: oAuth2Client })
		const res = await drive.files.get({
		  fileId: registro.id_google,
		  alt: 'media',
		}, {responseType: 'stream'});
		respuesta.setHeader('Content-Type', res.headers["content-type"]);
		res.data
		.on('error', err => {
			res.status(500).send('Error al descargar el archivo');
		})
		.pipe(respuesta);
		return undefined
	} catch (error) {
		respuesta.status(500).send({ status: false, msg: "El documento no existe en Google Drive"});
		return undefined
	}
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.carga_archivos.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.carga_archivos.name){
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
			await delFile(registroAEliminar)
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function delFile(registro) {
	try {
		oAuth2Client.setCredentials({refresh_token: credenciales.refresh_token})
		const drive = google.drive({ version: 'v3', auth: oAuth2Client })
		await drive.files.update({
			fileId: registro.id_google,
			requestBody: {
			  trashed: true,
			},
		});
		return undefined
	} catch (error) {
		res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		return undefined
	}
}

//Google Auth

async function getRuta(req,res){
	try {
		const data = await oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
			prompt: 'consent' 
		});
		return res.status(200).send({ status: true, data: data});
	} catch (error) {
		res.status(400).send({ status: false, msg: "Token no válido", error: error.toString()});
		return undefined
	}
}

async function getToken(req,res){
	try {
		const data = await oAuth2Client.getToken(credenciales.code);
		return res.status(200).send({ status: true, data: data});
	} catch (error) {
		res.status(400).send({ status: false, msg: "Token no válido", error: error.toString()});
		return undefined
	}
}

async function refreshToken(req,res){
	try {
		oAuth2Client.setCredentials({ refresh_token: credenciales.refresh_token });
		const data = await oAuth2Client.getAccessToken();
		if(req != undefined && res != undefined){
			return res.status(200).send({ status: true, data: data.token});
		} else{
			return data.token
		}
	} catch (error) {
		res.status(400).send({ status: false, msg: "Token no válido", error: error.toString()});
		return undefined
	}
}


async function getArchivoLocal(registro) {
	try {
		oAuth2Client.setCredentials({refresh_token: credenciales.refresh_token})
		const drive = google.drive({ version: 'v3', auth: oAuth2Client })
		return await getFileLocal(drive,registro.id_google)
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	}
}

async function getFileLocal(drive,archivoId) {
	try {
		const res = await drive.files.get({
		  fileId: archivoId,
		  alt: 'media',
		}, {responseType: 'stream'});

		return new Promise((resolve, reject) => {
			const chunks = [];
			res.data.on('data', chunk => {
			  chunks.push(chunk);
			});
		
			res.data.on('end', () => {
			  const buffer = Buffer.concat(chunks);
			  const base64String = buffer.toString('base64');
			  resolve(base64String);
			});
		
			res.data.on('error', err => {
			  reject(err);
			});
		  });
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()}
	}
}


async function getIdsGoogle(req, res){
	const filtroNoAnalizados = await getFiltro({
		filter: '{"or":[{"property": "id_google","value": null,"operator": "=="}],"and":[]}',
		eliminados: false
	},db.sequelize.models.carga_archivos);

	try {
		let docs = await db.sequelize.models.carga_archivos.findAll({
			paranoid: false,
			order: [["createdAt", "ASC"]],
			where: filtroNoAnalizados,
		})
		for(const doc of docs){
			const id_google = await getIdGoogle(doc)
			if(id_google !== null && id_google !== undefined){
				await doc.update({
					id_google: id_google
				}, { where: { id: doc.id } });
			} else{
				await doc.update({
					id_google: "null"
				}, { where: { id: doc.id } });
			}
		}
		return res.status(200).send({
			success: true,
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
}

async function getIdGoogle(registro) {
	try {
		oAuth2Client.setCredentials({refresh_token: credenciales.refresh_token})
		const drive = google.drive({ version: 'v3', auth: oAuth2Client })
		const carpetaId = await getFolderId(registro,drive);
		const archivos = [];
		let pageToken = null;
		do {
			const res = await drive.files.list({
				q: `'${carpetaId}' in parents and trashed = false`,
				fields: 'nextPageToken, files(id, name, mimeType)',
				pageToken: pageToken, 
			});
			for(const fileA of res.data.files){
				archivos.push(fileA)
			}
			pageToken = res.data.nextPageToken;

		} while (pageToken);
		var fileSelected = undefined
		for(const file of archivos){
			if(file.name == registro.nombre){
				fileSelected = file
			}
		}
		if(fileSelected == undefined){
			return null
		}
		return fileSelected.id
		

	} catch (error) {
		return undefined
	}
}

module.exports = {
	index,
	store,
	show,
	destroy,
	getRuta,
	getToken,
	refreshToken,
	getArchivoLocal,
	getIdsGoogle
}
