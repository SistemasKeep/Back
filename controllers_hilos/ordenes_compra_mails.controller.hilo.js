const { parentPort, workerData } = require('worker_threads');
const { sendMailOrdenPago } = require('../controllers/ordenes_compra_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailOrdenPago(workerData.idOrdenCompra, workerData.usuarioOrdenCompra,workerData.listEmailsOrdenCompra);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();