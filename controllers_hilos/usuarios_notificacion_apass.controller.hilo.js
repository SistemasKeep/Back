const { parentPort, workerData } = require('worker_threads');
const { sendNotificacionNuevaPasswordLocal } = require('../controllers/usuarios_notificacion_apass.controllers');
const { sendMailError } = require('../controllers/errores_sistema.controllers')

async function executeTask() {
    try {
        const result = await sendNotificacionNuevaPasswordLocal(workerData.dataNuevaPassword);
        parentPort.postMessage(result);
    } catch (error) {
        sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
        parentPort.postMessage({ error: error.message });
    }
}

// Ejecuta la función asíncrona
executeTask();