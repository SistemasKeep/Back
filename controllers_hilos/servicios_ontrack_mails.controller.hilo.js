const { parentPort, workerData } = require('worker_threads');
const { sendMailServiciosMonitoreoLocal } = require('../controllers/servicios_ontrack_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailServiciosMonitoreoLocal(workerData.idServiciosMonitoreo, workerData.usuarioMonitoreo,workerData.listEmailsMonitoreo);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();