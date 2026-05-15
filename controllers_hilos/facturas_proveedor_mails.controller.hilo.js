const { parentPort, workerData } = require('worker_threads');
const { sendMailFacturaProveedorLocal } = require('../controllers/facturas_proveedor_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailFacturaProveedorLocal(workerData.idFacturaProveedor, workerData.usuarioFacturaProveedor,workerData.listEmailsFacturaProveedor);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();