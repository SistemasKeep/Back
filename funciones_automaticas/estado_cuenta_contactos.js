/*const cron = require('node-cron');
const {sendEstadoCuenta} = require('../controllers/estado_cuenta_reporte.controllers');

try {
    //todos los días a las 11:00 de la noche
    cron.schedule('0 5 * * *', () => {
        sendEstadoCuenta();
        return;
    });

} catch (error) {
    return console.log('Error generando el reporte: ', error);
}*/