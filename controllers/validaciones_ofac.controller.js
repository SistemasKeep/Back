/*
    La documentación sobre la api que se implementa en este controlador se puede encontrar en:
    https://search.ofac-api.com/documentation/v3/index.html
*/

'use strict'
const axios = require('axios');

async function validarEntidad(datosEntidad){
    const headers = { 'Content-Type': 'application/json' };
    //const validOfac = process.env.NODE_ENV == 'producction';
    const validOfac = false;
    
    if(validOfac){
        const data = {
            'apiKey': process.env.OFAC_KEY_PRODUCTION,
            'minScore': 95,
            //si se utilizan las claves de desarrollo, se debe comentar PEP, ya que no es permitido
            'source':['SDN', 'NONSDN', 'PEP', 'DPL', 'UN', 'UK', 'EU', 'DFAT'],
            'cases': [{
                'name': datosEntidad.nombre,
                'citizenship': datosEntidad.pais,
                'taxId': datosEntidad.rfc,
            }]
        };
        
        try {
            const coincidencias = await axios.post('https://api.ofac-api.com/v3', data, {
                'headers': headers
            });
    
            return { success: true, coincidencias: coincidencias.data};
        } catch (error) {
            return { success: false, error: error.toString()};
        }
    }else{
        let name = datosEntidad.nombre
        let data = {matches: {}};
        data.matches[name] = [];
        return { success: true, coincidencias: data};
    }
}

async function validarEntidadTesteo(req, res){
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = process.env.NODE_ENV == 'producction' ? process.env.OFAC_KEY_PRODUCTION : process.env.OFAC_KEY_DEVELOPMENT;
    const payload = req.body

    const data = {
        'apiKey': apiKey,
        'minScore': 95,
        'source': ['SDN', 'NONSDN', 'DPL', 'UN', 'EU', 'DFAT'],
        'cases': [{
            'name': payload.nombre,
            'citizenship': payload.pais,
            'taxId': payload.rfc
        }]
    };
    
    try {
        const response = await axios.post('https://api.ofac-api.com/v3', data, {
            'headers': headers
        });
        return res.status(200).json({ success: true, response: response.data});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.toString()});
    }
}

module.exports = {
    validarEntidad,
    validarEntidadTesteo
};