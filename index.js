'use strict'
require('dotenv').config();
const app = require('./app');
const {db} = require('./models');
const fs = require('fs')
const path = require('path')
const https = require('https')
// Intenta autenticar la conexión
db.sequelize.authenticate().then(() => {
	try {
		const pathCERT = __dirname + process.env.CER_SSL
		const pathKEY = __dirname + process.env.KEY_SSL
		const options = {
			key: fs.readFileSync(path.resolve(__dirname, pathKEY)),
			cert: fs.readFileSync(path.resolve(__dirname, pathCERT))
		};
		https.createServer(options, app).listen(process.env.PORT, () => {
			console.log('Servidor HTTPS ' + process.env.NOM_APP + ' corriendo correctamente en el puerto ' + process.env.PORT);
		});
	} catch (error) {
		app.listen(process.env.PORT, async () => {
			console.log('Servidor ' + process.env.NOM_APP + ' corriendo correctamente en el puerto ' + process.env.PORT);
		});
	}
}).catch(err => {
  console.error('No se pudo conectar a la base de datos');
});