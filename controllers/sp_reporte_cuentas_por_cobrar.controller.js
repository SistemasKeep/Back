'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { QueryTypes } = require('sequelize');
const { ReportesXLSX } = require('../middlewares/reportesXlsx');

async function index(req, res) {
	try {
		const fecha = req.query.fecha
		var registro = {}
		const obligatorios = [{campo:'fecha', tipo:'stringDate'}]
		registro = await Validaciones.validParametros(req, res,obligatorios,registro);
		if(!registro){
			return '';
		}

		res.status(200).send({ status: true, msg: "Se enviará el reporte a su correo electrónico."});
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
		const dataExcel = [];
		let aux;
		for (let i = 0; i < data.length; i++) {
			let elemento = data[i];
			aux = {
				"Agente CXC": elemento["Agente CXC"],
				"Oficina": elemento["Oficina"],
				"Folio": elemento["folio"],
				"UUID": elemento["UUID"],
				"ID Cliente": elemento["ID Cliente"],
				"Nombre Cliente": elemento["Nombre Cliente"],
				"Marca": elemento["Marca"],
				"Monto original": elemento["Monto original"],
				"Moneda": elemento["Moneda"],
				"Saldo actual": elemento["Saldo actual"],
				"Cantidad pagos": elemento["cantidad_pagos"],
				"Saldo al corte": elemento["Saldo_al_corte"],
				"Dias Credito": elemento["Dias Credito"],
				"Fecha de creación": elemento["createdAt"],
				"Fecha Vencimiento": elemento["fecha_vencimiento"],
				"Vencimiento a la fecha": elemento["Vencimiento a la fecha"],
				"Referencia": elemento["referencia"]
			};
			dataExcel.push(aux);
		}

		const nombreReporte = 'Cuentas por Cobrar';
		const namesSheets = [db.sequelize.models.cuentas_por_cobrar.name];
		const reporte = new ReportesXLSX({
			nombreReporte: nombreReporte,
			elementos: dataExcel,
			namesSheets: namesSheets, 
			idMarca: null
		});
		
		return await reporte.gerReporteOneSheet(res,req);
		
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Error interno del servidor', error: error.toString() });
	}
	
}

module.exports = {
	index
}
