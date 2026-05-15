/*const cron = require('node-cron');
const {sendDraftPendienteCertificar} = require('../controllers/certificados.controller');
const env = process.env.NODE_ENV;
if(env == 'producction'){
    try {
         //todos los lunes a las 5 de la mañana
         cron.schedule('0 5 * * *', () => {
            sendDraftPendienteCertificar();
            return;
        });
    } catch (error) {
        return console.log('Error generando el reporte: ', error);
    }
}*/
