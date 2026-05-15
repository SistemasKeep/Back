const { parentPort, workerData } = require('worker_threads');
const { sendMailCotizacion } = require('../controllers/cotizaciones_mails.controller');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailCotizacion(workerData.idCotizacion, workerData.usuarioCotizacion,workerData.listEmailsCotizacion);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();