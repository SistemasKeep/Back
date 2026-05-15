'use strict'
const {db} = require('../models');
const PDFParser = require('pdf-parse');
const {Validaciones} = require('../middlewares/validaciones');
const { MailController } = require('./email.controller')
const JSZip = require('jszip');


async function store(req, res){
	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send({ status: false, msg: "No se han encontrado archivos para subir."});
    } else{
		try {
			let registro = {}
			let obligatoriosCampo = [{campo:'nombreTerminosCondiciones', tipo:'string',largo:255}]
			registro = await Validaciones.validParametros(req, res,obligatoriosCampo,registro);
			if(!registro){
				return '';
			}
			const documentosHtmlValidos = ['certificado','correoDraft','correoCertificado','correoDraftAutoemisor','correoCertificadoAutoemisor']
			const obligatorios = ['certificado','correoDraft','correoCertificado','terminosCondiciones']
			for (const file of obligatorios) {
				if (!req.files[file]) {
					return res.status(400).send({ status: false, msg: `Falta el archivo ${file}`})
				}
				if (req.files[file].size > (50 * 1024 * 1024)) {
					return res.status(400).json({ status: false, msg: `El archivo ${file} es demasiado grande. El tamaño máximo permitido es de 50MB` });
				}
			}
			const files = req.files
			for (let key in files){
				if(documentosHtmlValidos.includes(key)){
					const file = files[key]
					if(Array.isArray(file)){
						return res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
					}
					if (file.size <= (50 * 1024 * 1024)) {
						const fileContent = file.data.toString('utf-8')
						const htmlRegex = /<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/gi
						if (!htmlRegex.test(fileContent)) {
							return res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento HTML válido.'})
						}
						const campoDB = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
						registro[campoDB] = file.data.toString('base64')
					}
				} else if(key == 'terminosCondiciones'){
					const file = files[key]
					if(Array.isArray(file)){
						return res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
					}
					if (file.size <= (50 * 1024 * 1024)) {
						try {
							const fileContent = file.data
							await PDFParser(fileContent)
							registro.terminos_condiciones = file.data.toString('base64')
						} catch (error) {
							return res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento PDF válido.'})
						}
					}
				}
			}
			registro.id_usuario_registro = req.usuario.id
			const dataSaved = await db.sequelize.models.tpls.create(registro);
			return res.status(200).send({ status: true, msg: "Elemento registrado correctamente", data: {id:dataSaved.id}});
		} catch (error) {
			return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		} 
	}
}

async function show(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroEncontrado = await db.sequelize.models.tpls.findByPk(id,{ paranoid: false });
		const registroJson = registroEncontrado.toJSON()
		registroJson.certificado = Buffer.from(registroJson.certificado, 'base64').toString('utf-8')
		registroJson.correo_draft = Buffer.from(registroJson.correo_draft, 'base64').toString('utf-8')
		registroJson.correo_certificado = Buffer.from(registroJson.correo_certificado, 'base64').toString('utf-8')
		registroJson.correo_draft_autoemisor = registroJson.correo_draft_autoemisor != undefined ? Buffer.from(registroJson.correo_draft_autoemisor, 'base64').toString('utf-8') : undefined
		registroJson.correo_certificado_autoemisor = registroJson.correo_certificado_autoemisor != undefined ? Buffer.from(registroJson.correo_certificado_autoemisor, 'base64').toString('utf-8') : undefined
		registroJson.terminos_condiciones = registroJson.terminos_condiciones != undefined ? Buffer.from(registroJson.terminos_condiciones, 'base64') : undefined
		return res.status(200).send({ status: true, data: registroJson})
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function update(req, res){
	const parametros = req.body;
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	let seEdita = false;
	var registro = {}
	const validosOpcionales =[{campo:'nombreTerminosCondiciones', tipo:'string',largo:255}]
	const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
	if(dataValidarOpcionales == undefined){
		return undefined;
	}
	registro = dataValidarOpcionales[0]
	seEdita = dataValidarOpcionales[1]
	const registroAEditar = await db.sequelize.models.tpls.findByPk(id);
	if(registroAEditar == null){
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	}
	if ((!req.files || Object.keys(req.files).length === 0) && !seEdita) {
		return res.status(200).send({ status: true, msg: "Registro no editado" });
    } else{
		const documentosHtmlValidos = ['certificado','correoDraft','correoCertificado','correoDraftAutoemisor','correoCertificadoAutoemisor']
		const files = req.files
		for (let key in files){
			if(documentosHtmlValidos.includes(key)){
				const file = files[key]
				if(Array.isArray(file)){
					return res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
				}
				if (file.size <= (50 * 1024 * 1024)) {
					const fileContent = file.data.toString('utf-8')
					const htmlRegex = /<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/gi
					if (!htmlRegex.test(fileContent)) {
						return res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento HTML válido.'})
					}
					const campoDB = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
					registro[campoDB] = file.data.toString('base64')
				}
			} else if(key == 'terminosCondiciones'){
				const file = files[key]
				if(Array.isArray(file)){
					return res.status(400).json({ status: false, msg: `Solo se debe enviar un archivo. Campo: ${key}` });
				}
				if (file.size <= (50 * 1024 * 1024)) {
					const fileContent = file.data
					try {
						await PDFParser(fileContent)
						registro.terminos_condiciones = file.data.toString('base64')
					} catch (error) {
						if(fileContent !== undefined && fileContent !== null){
							return res.status(400).send({ status: false, msg: 'El archivo ' + key + ' no contiene un documento PDF válido.'})
						}
						
					}
				}
			}
		}
		try {
			if(Object.keys(registro).length > 0){
				await registroAEditar.update(registro, { where: { id: id } });
				return res.status(200).send({ status: true, msg: "Registro editado con éxito"});
			}
			return res.status(200).send({ status: true, msg: "Registro no editado" });
		} catch (error) {
			return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
		} 
	}
}

async function destroy(req,res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroAEliminar = await db.sequelize.models.tpls.findByPk(id);
		if(registroAEliminar != null){
			let canDelete = true
			const modelosUtilizados = []
			for (const modelo of Object.values(db.sequelize.models)) {
				let asociaciones = modelo.associations
				for (const asociacion of Object.values(asociaciones)) {
					if(asociacion.target.name == db.sequelize.models.tpls.name){
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
			await registroAEliminar.destroy({ where: { id: id } });
			return res.status(200).send({ status: true, msg: "Registro eliminado con éxito"});
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function sendTps(req, res){
	
	try {
		const registrosEncontrado = await db.sequelize.models.tpls.findAll({ paranoid: false });
		for(const registroEncontrado of registrosEncontrado){
			const registroJson = registroEncontrado.toJSON()
			const attachments = []
			const archivos = [ 'certificado', 'correo_draft', 'correo_certificado', 'correo_draft_autoemisor', 'correo_certificado_autoemisor', 'terminos_condiciones']
			for(const key of archivos){
				try {
					attachments.push({
						filename: key + ".html",
						content: Buffer.from(registroJson[key], 'base64').toString('utf-8'),
						contentType: 'text/html'
					})
				} catch (error) {
					
				}
			}
			const polizasDetalles = await db.sequelize.models.poliza_detalles.findAll({ where: { id_poliza: registroEncontrado.id }, paranoid: false });
			let polizasTag = ""
			for(const polizaDetalle of polizasDetalles){
				const poliza = await db.sequelize.models.polizas.findByPk(polizaDetalle.id_poliza,{paranoid: false });
				const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(poliza.id_tipo_cobertura,{paranoid: false });
				polizasTag = polizasTag + " " + tipoCobertura.nombre + ""
			}
			const asunto = 'Envío de Tpls de la poliza ' + polizasTag.trim();
    
			const emails = ['kpsoft80@gmail.com','diegocorona161295@gmail.com']
			let mailOptions = {
				to: emails,
				subject: asunto,
				attachments: attachments
			};
			const mainSender = new MailController(null,null,mailOptions, null,false,true)
			await mainSender.sendMail()
		}
		return res.status(400).send({ status: false, msg: "Tpls enviados" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}

async function downloadTpls(req, res){
	const { id } = req.params;
	if(!Number.isInteger(parseInt(id))){
		res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
		return false
	} 
	
	try {
		const registroEncontrado = await db.sequelize.models.tpls.findByPk(id,{ paranoid: false });
		if(registroEncontrado !== null){
			const registroJson = registroEncontrado.toJSON()
			registroJson.certificado = Buffer.from(registroJson.certificado, 'base64').toString('utf-8')
			registroJson.correo_draft = Buffer.from(registroJson.correo_draft, 'base64').toString('utf-8')
			registroJson.correo_certificado = Buffer.from(registroJson.correo_certificado, 'base64').toString('utf-8')
			registroJson.correo_draft_autoemisor = registroJson.correo_draft_autoemisor !== null && registroJson.correo_draft_autoemisor !== "" && registroJson.correo_draft_autoemisor !== undefined ? Buffer.from(registroJson.correo_draft_autoemisor, 'base64').toString('utf-8') : undefined
			registroJson.correo_certificado_autoemisor = registroJson.correo_certificado_autoemisor !== null && registroJson.correo_certificado_autoemisor !== "" && registroJson.correo_certificado_autoemisor !== undefined ? Buffer.from(registroJson.correo_certificado_autoemisor, 'base64').toString('utf-8') : undefined
			registroJson.terminos_condiciones = registroJson.terminos_condiciones !== null && registroJson.terminos_condiciones !== "" && registroJson.terminos_condiciones !== undefined ? Buffer.from(registroJson.terminos_condiciones, 'base64').toString('utf-8') : undefined
			
			var zip = new JSZip();

			

			zip.file(`certificado.html`, registroJson.certificado);
			zip.file(`correo_draft.html`, registroJson.correo_draft);
			zip.file(`correo_certificado.html`, registroJson.correo_certificado);


			if(registroJson.correo_draft_autoemisor !== undefined){
				zip.file(`correo_draft_autoemisor.html`, registroJson.correo_draft_autoemisor);
			}
			if(registroJson.correo_certificado_autoemisor !== undefined){
				zip.file(`correo_certificado_autoemisor.html`, registroJson.correo_certificado_autoemisor);
			}
			if(registroJson.terminos_condiciones !== undefined){
				zip.file(`terminos_condiciones.pdf`, registroJson.terminos_condiciones);
			}
	
			// Generar el ZIP 
			const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
	
			res.setHeader('Content-Disposition', `attachment; filename="tpls_${registroJson.id}.zip"`);
			res.setHeader('Content-Type', 'application/zip');
			return res.send(zipContent);
		}
		return res.status(400).send({ status: false, msg: "Tpls enviados" });
	} catch (error) {
		return res.status(500).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
	} 
}




module.exports = {
	store,
	show,
	update,
	destroy,
	sendTps,
	downloadTpls
}
