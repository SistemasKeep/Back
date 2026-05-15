const {db} = require('../models');
const moment = require('moment-timezone');

exports.validarMantenimiento =async function(req, res, next){
    const fechaActual = moment().tz('America/Mexico_City')
    var whereFind = {
        where: {
            fecha_inicio: {
                [db.Sequelize.Op.lte]: fechaActual,
            },
            fecha_fin: {
                [db.Sequelize.Op.gte]: fechaActual,
            }
        }
    }	
    const rutaSolicitada = req.url;
    if (rutaSolicitada.includes('mantenimientoKeepro')) {
        next();
    }else{
        const registrosEncontrados = await db.sequelize.models.mantenimiento_keepro.findAll(whereFind);
        if (registrosEncontrados.length > 0) {	
            var regExistente = false
                await registrosEncontrados.forEach(registro => {
                    if(registro.imagen.toLowerCase()){
                        if(!regExistente){
                            regExistente = true;
                            res.setHeader('Content-Type', registrosEncontrados[0].mime_type);
                            return res.send(Buffer.from(registrosEncontrados[0].imagen, 'base64'));
                        }
                    }
                });
                if(regExistente){
                    return '';
                }
        }
        next();
    }
};