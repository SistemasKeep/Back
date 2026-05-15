const nodemailer = require('nodemailer');
const {db} = require('../models');
class MailController{
	idUsuario = undefined
	idMarca = undefined
	mailOptions =  undefined
	smtpUsuario = undefined
	ms = 1000
    correoObligatorio = undefined
	enviar = undefined
    constructor(idUsuario, idMarca, mailOptions, smtpUsuario, correoObligatorio = false, enviar = false) {
		this.idUsuario = idUsuario;
		this.idMarca = idMarca;
		this.mailOptions = mailOptions;
		this.smtpUsuario = smtpUsuario;
		this.correoObligatorio = correoObligatorio
		this.enviar = enviar
		
	}

	async sendMail(){
		if(this.enviar == true || process.env.NODE_ENV != 'producction'){
			const env = process.env.NODE_ENV;
			let configMainEnv = {
				user: process.env.MAIL_USERNAME,
				pass: process.env.MAIL_PASSWORD,
				senderName: process.env.SENDER_NAME,
				senderAddres: process.env.SENDER_ADDRESS,
				host: process.env.MAIL_HOST,
				port: process.env.MAIL_PORT,
				secure: process.env.MAIL_ENCRYPTION.toUpperCase() == 'SSL'
			}
			if(env == 'producction'){
				if(this.smtpUsuario === true){
					const smtpUsurios = await db.sequelize.models.config_smtp.findAll({
						where: {
							id_usuario: this.idUsuario,
							deletedAt: null
						}
					});
					if(smtpUsurios.length >0){
						const smtpUsurio = smtpUsurios[0]
						configMainEnv = {
							user: smtpUsurio.mail_username,
							pass: smtpUsurio.mail_password,
							senderName: smtpUsurio.sender_name,
							senderAddres: smtpUsurio.sender_address,
							host: smtpUsurio.mail_host,
							port: smtpUsurio.mail_port,
							secure: smtpUsurio.mail_encryption.toUpperCase() == 'SSL'
						}
					}
				}else{
					const smtpMarcas = await db.sequelize.models.config_smtp_marcas.findAll({
						where: {
							id_marca: this.idMarca,
							deletedAt: null
						}
					});
					if(smtpMarcas.length >0){
						const smtpMarca = smtpMarcas[0]
						configMainEnv = {
							user: smtpMarca.mail_username,
							pass: smtpMarca.mail_password,
							senderName: smtpMarca.sender_name,
							senderAddres: smtpMarca.sender_address,
							host: smtpMarca.mail_host,
							port: smtpMarca.mail_port,
							secure: smtpMarca.mail_encryption.toUpperCase() == 'SSL'
						}
					}else{
						const smtpUsurios = await db.sequelize.models.config_smtp.findAll({
							where: {
								id_usuario: this.idUsuario,
								deletedAt: null
							}
						});
						if(smtpUsurios.length >0){
							const smtpUsurio = smtpUsurios[0]
							configMainEnv = {
								user: smtpUsurio.mail_username,
								pass: smtpUsurio.mail_password,
								senderName: smtpUsurio.sender_name,
								senderAddres: smtpUsurio.sender_address,
								host: smtpUsurio.mail_host,
								port: smtpUsurio.mail_port,
								secure: smtpUsurio.mail_encryption.toUpperCase() == 'SSL'
							}
						}
					}
				}
			}
			const transporter = nodemailer.createTransport({
				host: configMainEnv.host,
				port: configMainEnv.port,
				secure: configMainEnv.secure,
				auth: {
					user: configMainEnv.user,
					pass: configMainEnv.pass
				},
				tls: {
					rejectUnauthorized: env == "development" ? false : true
				}
			});
	
			let from =  {
				name: configMainEnv.senderName,
				address: configMainEnv.senderAddres
			}
			if(env == 'development'){
				this.mailOptions.to = process.env.MAIL_SENDER_DEVELOPMENT.split(',')
				if(this.mailOptions.cc !== undefined){
					this.mailOptions.cc = process.env.MAIL_SENDER_DEVELOPMENT.split(',')
				}
			}
			this.mailOptions.from = from
			
	
			// Envía el correo electrónico
			const data = await new Promise((resolve) => {
				transporter.sendMail(this.mailOptions,async (err,info)=>{
					if(err != null){
						resolve(await this.reenviar(this.mailOptions))
					} else{
						resolve(info)
					}
				});
			})
		}
    }

	async reenviar(mailOptions, isReintento = false){
		const env = process.env.NODE_ENV;
		let configSMTPEnv = {}
		if(isReintento){
			configSMTPEnv = {
				user: process.env.MAIL_USERNAME_2,
				pass: process.env.MAIL_PASSWORD_2,
				senderName: process.env.SENDER_NAME_2,
				senderAddres: process.env.SENDER_ADDRESS_2,
				host: process.env.MAIL_HOST_2,
				port: process.env.MAIL_PORT_2,
				secure: process.env.MAIL_ENCRYPTION_2.toUpperCase() == 'SSL'
			}
		}else{
			configSMTPEnv = {
				user: process.env.MAIL_USERNAME,
				pass: process.env.MAIL_PASSWORD,
				senderName: process.env.SENDER_NAME,
				senderAddres: process.env.SENDER_ADDRESS,
				host: process.env.MAIL_HOST,
				port: process.env.MAIL_PORT,
				secure: process.env.MAIL_ENCRYPTION.toUpperCase() == 'SSL'
			}

		}
		const transporter = nodemailer.createTransport({
			host: configSMTPEnv.host,
			port: configSMTPEnv.port,
			secure: configSMTPEnv.secure,
			auth: {
				user: configSMTPEnv.user,
				pass: configSMTPEnv.pass
			},
			tls: {
				rejectUnauthorized:  env == "development" ? false : true
			}
		});
		const from =  {
			name: configSMTPEnv.senderName,
			address: configSMTPEnv.senderAddres
		}
		mailOptions.from = from
		return new Promise((resolve) => {
			transporter.sendMail(mailOptions,async (err,info)=>{
				if(err != null){
					if(!isReintento && env == 'producction'){
						resolve(await this.reenviar(mailOptions, true))
					}else{
						resolve(err)
					}

				} else{
					resolve(info)
				}
			});
		})
	}

}

module.exports = {
	MailController
}


