const { parentPort, workerData } = require('worker_threads');
const { genPdfLocal } = require('../controllers/notas_credito_pdf.controller');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await genPdfLocal(workerData.idNotaCredito);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();