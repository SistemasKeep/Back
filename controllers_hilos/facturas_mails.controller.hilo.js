const { parentPort, workerData } = require('worker_threads');
const { sendMailFacturaLocal } = require('../controllers/facturas_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailFacturaLocal(workerData.idFactura, workerData.usuarioFactura,workerData.listEmailsFactura);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();