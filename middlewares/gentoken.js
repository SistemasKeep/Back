'use strict'
const {db} = require('../models');
const jwt = require('jsonwebtoken');



exports.validarToken =async function(req, res, next){
	if(!req.headers.authorization){
		return res.status(400).send({status:false , msg:'Token no válido'});
	}else {
		try {
			const token  = req.headers.authorization.split(" ")
			if(token[0] != 'Bearer'){
				return res.status(400).send({status:false , msg:'Token no válido'});
			}
			const decodedToken = await jwt.verify(token[1], process.env.TOKEN_KEY);
			if(decodedToken.exp === undefined){
				return res.status(400).send({status:false , msg:'Token expirado'});
			}
			const currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos
			if ((decodedToken.exp - currentTime) < 0) {
				return res.status(400).send({status:false , msg:'Token expirado'});
			}
			
			let idUsuario = decodedToken.idUsuario
			let usuario = await db.sequelize.models.usuarios.findOne({ where:{uuid:idUsuario}, attributes: { exclude: ['password'] } });
			if(usuario != undefined){
				req.usuario = usuario.toJSON();
			}else{
				return res.status(400).send({status:false , msg:'Token no válido'});
			}
			next();
		} catch (error) {
			return res.status(400).send({status:false , msg:'Token no válido'});
		}
	}
};


exports.updateToken =async function(req, res, next){
	if(req.usuario !== undefined){
		var duracionToken =  /*process.env.NODE_ENV != 'producction' ? undefined : */ { expiresIn:'1h' }
		const token = jwt.sign({ idUsuario: req.usuario.uuid}, process.env.TOKEN_KEY, duracionToken);
		res.setHeader('x-token', 'Bearer ' + token);
	}
	next()
};

exports.validarTokenApiInterna =async function(req, res, next){
	if(!req.headers['x-api-key']){
		return res.status(400).send({status:false , msg:'ApiKey no válida'});
	}else {
		try {
			const apikey  = req.headers['x-api-key']
			const apikeyInterna = process.env.X_API_KEY_INTERNA
			if(apikey != apikeyInterna){
				return res.status(400).send({status:false , msg:'ApiKey no válida'});
			}
			next();
		} catch (error) {
			return res.status(400).send({status:false , msg:'ApiKey no válida'});
		}
	}
};




