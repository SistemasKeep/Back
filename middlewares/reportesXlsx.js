const { MailController } = require('../controllers/email.controller')
const { ManipuladorCadenas } = require('./manipuladorCadenas');
const XLSX = require('xlsx');
const XLSXStyle = require('xlsx-style');
class ReportesXLSX{
    nombreReporte = ''
    elementos = []
    namesSheets = []
    idMarca
    constructor({nombreReporte:nombreReporte,elementos:elementos,namesSheets:namesSheets,idMarca:idMarca}){
        this.nombreReporte = "Reporte" + ManipuladorCadenas.toTitle(nombreReporte)
        this.elementos = elementos
        this.namesSheets = namesSheets
        this.idMarca = idMarca
    }

    async gerReporteOneSheet(res,req){
        const worksheet = XLSX.utils.json_to_sheet(this.elementos);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, this.namesSheets[0])
		const maxLengths = {};
		this.elementos.forEach(row => {
			Object.keys(row).forEach(key => {
				if(maxLengths[key] == undefined){
					maxLengths[key] = (key.length)
				}
				const auxValue = row[key] + ""
				if(auxValue.length > maxLengths[key] ){
					if(auxValue.length < 121){
						maxLengths[key] = (auxValue.length)
					}else{
						maxLengths[key] = (120)
					}
				}
			});
		});

		worksheet['!cols'] = Object.keys(maxLengths).map(key => ({
			wch: maxLengths[key]
		}));


		const range = XLSX.utils.decode_range(worksheet['!ref']);
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
				if (!worksheet[cellAddress]) continue;

				if (!worksheet[cellAddress].s) {
					worksheet[cellAddress].s = {};
				}
				if (worksheet[cellAddress].v && (typeof worksheet[cellAddress].v === 'string' || Array.isArray(worksheet[cellAddress].v))) {
                    if (worksheet[cellAddress].v.length > 120) {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center',
                            wrapText: true 
                        };
                    } else {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center'
                        };
                    }
                }
			}
		}
		const buffer = XLSXStyle.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        const asunto = `Envío de Reporte // ${this.nombreReporte}`
        var tpl = undefined
        tpl = await this.getMailTpl('email_generico_cxp.html')
        var htmlContent = undefined
        
        htmlContent = tpl

        const attachments = []
        attachments.push({
            filename: this.nombreReporte + '.xlsx',
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        let mailOptions = {
            to: [req.usuario.email],
            subject: asunto,
            html: htmlContent,
            attachments: attachments
        };
        const mainSender = new MailController(req.usuario.id,this.idMarca,mailOptions, null,true,true)
        await mainSender.sendMail()
        return null
    }



    async sendReporteOneSheet(mails){
        const worksheet = XLSX.utils.json_to_sheet(this.elementos);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, this.namesSheets[0])
		const maxLengths = {};
		this.elementos.forEach(row => {
			Object.keys(row).forEach(key => {
				if(maxLengths[key] == undefined){
					maxLengths[key] = (key.length)
				}
				const auxValue = row[key] + ""
				if(auxValue.length > maxLengths[key] ){
					if(auxValue.length < 121){
						maxLengths[key] = (auxValue.length)
					}else{
						maxLengths[key] = (120)
					}
				}
			});
		});

		worksheet['!cols'] = Object.keys(maxLengths).map(key => ({
			wch: maxLengths[key]
		}));


		const range = XLSX.utils.decode_range(worksheet['!ref']);
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
				if (!worksheet[cellAddress]) continue;

				if (!worksheet[cellAddress].s) {
					worksheet[cellAddress].s = {};
				}
				if (worksheet[cellAddress].v && (typeof worksheet[cellAddress].v === 'string' || Array.isArray(worksheet[cellAddress].v))) {
                    if (worksheet[cellAddress].v.length > 120) {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center',
                            wrapText: true 
                        };
                    } else {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center'
                        };
                    }
                }
			}
		}
		const buffer = XLSXStyle.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        
        const asunto = this.nombreReporte
        var tpl = undefined
        tpl = await this.getMailTpl('email_generico_cxp.html')
        var htmlContent = undefined
        
        htmlContent = tpl

        const attachments = []
        attachments.push({
            filename: this.nombreReporte + '.xlsx',
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        let mailOptions = {
            to: mails,
            subject: asunto,
            html: htmlContent,
            attachments: attachments
        };
        const mainSender = new MailController(null,this.idMarca,mailOptions, null,true,true)
        await mainSender.sendMail()
        return null
    }


    async gerReporteNSheet(res, req) {
        const workbook = XLSX.utils.book_new();  
        
        this.elementos.forEach((elemento, index) => {
            const worksheet = XLSX.utils.json_to_sheet(elemento); 
    
            // Establecer anchos de columnas para la hoja actual
            const maxLengths = {};
            elemento.forEach(row => {
                Object.keys(row).forEach(key => {
                    if (maxLengths[key] == undefined) {
                        maxLengths[key] = (key.length);
                    }
                    const auxValue = row[key] + "";
                    if (auxValue.length > maxLengths[key]) {
                        maxLengths[key] = auxValue.length < 121 ? auxValue.length : 120;
                    }
                });
            });
    
            worksheet['!cols'] = Object.keys(maxLengths).map(key => ({
                wch: maxLengths[key]
            }));
    
            // Ajustar alineación de celdas
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!worksheet[cellAddress]) continue;
    
                    if (!worksheet[cellAddress].s) {
                        worksheet[cellAddress].s = {};
                    }
                    if (worksheet[cellAddress].v && (typeof worksheet[cellAddress].v === 'string' || Array.isArray(worksheet[cellAddress].v))) {
                        if (worksheet[cellAddress].v.length > 120) {
                            worksheet[cellAddress].s.alignment = {
                                horizontal: 'center',
                                vertical: 'center',
                                wrapText: true
                            };
                        } else {
                            worksheet[cellAddress].s.alignment = {
                                horizontal: 'center',
                                vertical: 'center'
                            };
                        }
                    }
                }
            }
    
            // Añadir la hoja al libro de trabajo
            const sheetName = this.namesSheets[index] || `Sheet${index + 1}`;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });
    
        const buffer = XLSXStyle.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
        const asunto = `Envío de Reporte // ${this.nombreReporte}`;
        var tpl = await this.getMailTpl('email_generico_cxp.html');
        var htmlContent = tpl;
    
        const attachments = [{
                filename: this.nombreReporte + '.xlsx',
                content: buffer,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }];
    
        let mailOptions = {
                to: [req.usuario.email],
                subject: asunto,
                html: htmlContent,
                attachments: attachments
        };
            
        const mainSender = new MailController(req.usuario.id, this.idMarca, mailOptions, null,null,true);
        await mainSender.sendMail();
        return null;
    }
    

    async getExcelBuffer(){
        const worksheet = XLSX.utils.json_to_sheet(this.elementos);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, this.namesSheets[0])
		const maxLengths = {};
		this.elementos.forEach(row => {
			Object.keys(row).forEach(key => {
				if(maxLengths[key] == undefined){
					maxLengths[key] = (key.length)
				}
				const auxValue = row[key] + ""
				if(auxValue.length > maxLengths[key] ){
					if(auxValue.length < 121){
						maxLengths[key] = (auxValue.length)
					}else{
						maxLengths[key] = (120)
					}
				}
			});
		});

		worksheet['!cols'] = Object.keys(maxLengths).map(key => ({
			wch: maxLengths[key]
		}));


		const range = XLSX.utils.decode_range(worksheet['!ref']);
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
				if (!worksheet[cellAddress]) continue;

				if (!worksheet[cellAddress].s) {
					worksheet[cellAddress].s = {};
				}
				if(worksheet[cellAddress].v.length > 120){
					worksheet[cellAddress].s.alignment = {
						horizontal: 'center',
						vertical: 'center',
						wrapText: true 
					};
				}else{
					worksheet[cellAddress].s.alignment = {
						horizontal: 'center',
						vertical: 'center'
					};
				}
				if (worksheet[cellAddress].v && (typeof worksheet[cellAddress].v === 'string' || Array.isArray(worksheet[cellAddress].v))) {
                    if (worksheet[cellAddress].v.length > 120) {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center',
                            wrapText: true 
                        };
                    } else {
                        worksheet[cellAddress].s.alignment = {
                            horizontal: 'center',
                            vertical: 'center'
                        };
                    }
                }
			}
		}
		return XLSXStyle.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }

    _formatElementosForSheet() {
        const formatted = [];

        // Encabezados principales
        const mainHeaders = [
            'INFORMACIÓN DE CONTACTO', '', '', '', '', '', '', '',
            'INFORMACIÓN DE SEGUIMIENTO', '', '', '', '', '', '', '','', 
            'RESULTADOS FINALES', '', '', '', '', '', 
        ];
        formatted.push(mainHeaders);

        // Sub-encabezados
        const subHeaders = [
            'Campaña', 'Clave', 'Nombre del cliente', 'Correo', 'Teléfono', 'País',
            'Fecha del primer seguimiento','Hora del primer seguimiento', 'Tipo del primer seguimiento',
            'Agente de ventas 1', 'Agente de ventas 2','Fecha de creación del prospecto',
            'Hora de creación del prospecto', 'Fecha del último seguimiento ejecutado', 
            'Fecha conversión cliente', 'Número de operación primer factura', 'Folio factura', 
            'Estatus del último seguimiento', 
            'Facturación neta MXN', 'Facturación neta USD', 'Facturación neta acumulado MXN',
            'Profit MXN', 'Profit USD', 'Profit acumulado MXN'
        ];
        formatted.push(subHeaders);

        // Insertar los datos bajo los encabezados
        this.elementos.forEach(row => {
            formatted.push(row);
        });

        return formatted;
    }

    _generateSheet() {
        const ws = XLSX.utils.aoa_to_sheet(this._formatElementosForSheet());

        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },  // INFORMACIÓN DE CONTACTO
            { s: { r: 0, c: 9 }, e: { r: 0, c: 17 } }, // INFORMACIÓN DE SEGUIMIENTO
            { s: { r: 0, c: 18 }, e: { r: 0, c: 23 } }  // RESULTADOS FINALES
        ];
        
        // Definir estilos
        const styles = {
            contacto: { 
                fill: { fgColor: { rgb: "0000FF" } },
                font: { color: { rgb: "FFFFFF" }, sz: 12 }, 
                alignment: { horizontal: "center", vertical: "center" }
            },
            seguimiento: { 
                fill: { fgColor: { rgb: "FFFF00" } }, 
                font: { color: { rgb: "000000" }, sz: 12 }, 
                alignment: { horizontal: "center", vertical: "center" }
            },
            resultados: { 
                fill: { fgColor: { rgb: "00FF00" } }, 
                font: { color: { rgb: "000000" }, sz: 12 },
                alignment: { horizontal: "center", vertical: "center" }
            }
        };
        
        // Aplicar estilos y escribir los encabezados
        ['INFORMACIÓN DE CONTACTO', 'INFORMACIÓN DE SEGUIMIENTO', 'RESULTADOS FINALES'].forEach((header, index) => {
            const startCol = index === 0 ? 0 : (index === 1 ? 9 : 18);
            const endCol = index === 0 ? 8 : (index === 1 ? 17 : 23);
        
            // Escribir el encabezado en la primera celda del rango
            const cell = XLSX.utils.encode_cell({ r: 0, c: startCol });
            ws[cell] = { v: header, t: 's', s: styles[index === 0 ? 'contacto' : (index === 1 ? 'seguimiento' : 'resultados')] };
        
            // Aplicar estilos a todas las celdas en el rango definido
            for (let col = startCol + 1; col <= endCol; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = styles[index === 0 ? 'contacto' : (index === 1 ? 'seguimiento' : 'resultados')];
                }
            }
        });
        
        // Ajustar el ancho de las columnas
        const columnWidths = [
            { width: 100 }, { width: 100 }, { width: 120 }, { width: 120 }, { width: 100 },
            { width: 90 },  // Columna vacía después de las columnas 5
            { width: 100 }, { width: 100 }, { width: 120 }, { width: 120 }, { width: 120 },
            { width: 120 }, { width: 120 }, { width: 120 }, { width: 120 }, { width: 120 },
            { width: 120 },  // Columna vacía después de las columnas 15
            { width: 100 }, { width: 100 }, { width: 125 }, { width: 120 }, { width: 130 },
            { width: 120 }, { width: 120 }  // Columnas restantes
        ];
        
        ws['!cols'] = columnWidths.map(width => ({ wpx: width.width }));

        return ws;
    }

    async gerReporteHeadersColumns(res, req) {
        const workbook = XLSX.utils.book_new();
        const worksheet = this._generateSheet();
        XLSX.utils.book_append_sheet(workbook, worksheet, this.namesSheets[0])

        const buffer = XLSXStyle.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        const asunto = `Envío de Reporte ${this.nombreReporte}`;
        let tpl = await this.getMailTpl('email_generico_cxp.html');
        let htmlContent = tpl;

        const attachments = [{
            filename: `${this.nombreReporte}.xlsx`,
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }];
        let mailOptions = {
            to: [req.usuario.email],
            subject: asunto,
            html: htmlContent,
            attachments: attachments
        };
        const mainSender = new MailController(req.usuario.id, this.idMarca, mailOptions, null,true,true);
        await mainSender.sendMail();
        return null;
    }

    async getMailTpl(nameTpl){
        const fs = require('fs');
        const path = require('path');
        const rutaTpl = path.join(__dirname, '../tpls/emails', nameTpl);
        const contenido = fs.readFileSync(rutaTpl, 'utf8');
        return contenido
    }

}

module.exports = {
	ReportesXLSX
}