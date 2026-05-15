const { parentPort, workerData } = require('worker_threads');
const { sendMailCertificadoLocal } = require('../controllers/certificados_mails.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendMailCertificadoLocal(workerData.idCertificado, workerData.usuarioCertificado,workerData.listEmailsCertificado);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();