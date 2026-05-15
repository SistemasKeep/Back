const cron = require('node-cron');
const {db} = require('../models');
const env = process.env.NODE_ENV;
async function updateDatoFacturacion(){
    let marca = await db.sequelize.models.marcas.findByPk(1)
    if(marca.allow_facturacion) await marca.update({allow_facturacion: false}, { where: { id: marca.id } });
}
if(env == 'producction'){
    try {
         //todos los lunes a las 8:00 de la mañana
        cron.schedule('50 23 15 12 *', () => {
            updateDatoFacturacion()
        }); 
    
    } catch (error) {
        return console.log('Error generando el reporte: ', error);
    } 
}
