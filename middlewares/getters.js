
const moment = require('moment-timezone');

async function getPolizaDetalle(operadores,polizaModel,polizaDetallesModel,wherePoliza){
    const polizas = await polizaModel.findAll(wherePoliza);
    if(polizas.length != 1){
        return undefined;
    }
    const poliza = polizas[0]
    const fechaActual = moment().tz('America/Mexico_City')
    const polizaDetalles = await polizaDetallesModel.findAll({where:{id_poliza: poliza.id, inicio_vigencia: { [operadores.lte]: fechaActual }, fin_vigencia: { [operadores.gte]: fechaActual }}});
    if(polizaDetalles.length != 1){
        return null;
    }
    return polizaDetalles[0]
}


async function getPolizaDetalleAll(polizaModel,polizaDetallesModel,wherePoliza){
    const polizas = await polizaModel.findAll(wherePoliza);
    if(polizas.length != 1){
        return undefined;
    }
    const poliza = polizas[0]
    const polizaDetalles = await polizaDetallesModel.findAll({where:{id_poliza: poliza.id}});
    return polizaDetalles
}


async function getPoliza(polizaModel,wherePoliza){
    const polizas = await polizaModel.findAll(wherePoliza);
    if(polizas.length != 1){
        return res.status(400).send({ status: false, msg: "No existe poliza vigente"});
    }
    return polizas[0]
}


async function getPolizasDetalle(operadores,polizaModel,polizaDetallesModel,wherePoliza){
    const polizas = await polizaModel.findAll(wherePoliza);
    const polizasFind  =[]
    for (let index = 0; index < polizas.length; index++) {
        const polizaAux = polizas[index];
        if(!polizasFind.includes(polizaAux.id)){
            polizasFind.push(polizaAux.id)
        }
        
    }
    const fechaActual = moment().tz('America/Mexico_City')
    const polizaDetalles = await polizaDetallesModel.findAll({where:{id_poliza: {[operadores.or]: polizasFind}, inicio_vigencia: { [operadores.lte]: fechaActual }, fin_vigencia: { [operadores.gte]: fechaActual }}});
    
    return polizaDetalles
}

module.exports = {
    getPoliza,
	getPolizaDetalle,
    getPolizaDetalleAll,
    getPolizasDetalle
}