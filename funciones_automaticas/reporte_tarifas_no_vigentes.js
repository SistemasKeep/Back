/*const cron = require('node-cron');
const {sendReporte} = require('../controllers/atributos_keepro.controller');
const env = process.env.NODE_ENV;
if(env == 'producction'){
    try {
         //todos los lunes a las 8:00 de la mañana
         cron.schedule('0 8 * * 1', () => {
            sendReporte();
            return;
        });
    
    } catch (error) {
        return console.log('Error generando el reporte: ', error);
    } 
}*/
