const { parentPort, workerData } = require('worker_threads');
const { sendMainPagoProveedor } = require('../controllers/pagos_proveedor_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMainPagoProveedor(workerData.idPagoProveedor, workerData.usuarioPagoProveedor,workerData.listEmailsPagoProveedor);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();