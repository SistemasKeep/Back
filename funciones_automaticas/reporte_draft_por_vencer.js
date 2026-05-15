/*const cron = require('node-cron');
const {sendDraftsPorVencer} = require('../controllers/certificados.controller');
const env = process.env.NODE_ENV;
if(env == 'producction'){
    try {
         //todos los lunes a las 2 de la mañana
         cron.schedule('0 2 * * 1', () => {
            sendDraftsPorVencer();
            return;
        });
    
        //todos los miercoles a las 2 de la mañana
        cron.schedule('0 2 * * 3', () => {
            sendDraftsPorVencer();
            return;
        });
    
        //todos los viernes a las 2 de la mañana
        cron.schedule('0 2 * * 5', () => {
            sendDraftsPorVencer();
            return;
        });
    } catch (error) {
        return console.log('Error generando el reporte: ', error);
    }
}*/
