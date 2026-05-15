/*const cron = require('node-cron');
const {sendNotificacionCambioEstatusCliente} = require('../controllers/clientes.controller');
const env = process.env.NODE_ENV;
if(env == 'producction'){
    try {
         //todos los lunes a las 8 de la mañana
         cron.schedule('0 8 * * *', () => {
            sendNotificacionCambioEstatusCliente();
            return;
        });
    } catch (error) {
        return console.log('Error generando el reporte: ', error);
    }
}*/
