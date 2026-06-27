'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { QueryTypes } = require('sequelize');

async function index(req, res) {
	try {
		const fecha = req.query.fecha
		var registro = {}
		const obligatorios = [{campo:'fecha', tipo:'stringDate'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}
		const resultados = await db.sequelize.query('CALL keepro.sp_reporte_cuentas_por_cobrar(:fecha)',
			{
				replacements: {
					fecha: registro.fecha,
				},
				type: QueryTypes.RAW, 
			}
		);
		const data = []
		for(const resultado of resultados){
			resultado.createdAt = moment(resultado.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD hh:mm:ss')
			data.push(resultado)
		}
		
		return res.status(200).send({
			status: true,
			data: data
		});
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

module.exports = {
	index
}
