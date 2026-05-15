class NumberConverter {
    constructor() {
      this.unidades = [
        '',
        'UNO ',
        'DOS ',
        'TRES ',
        'CUATRO ',
        'CINCO ',
        'SEIS ',
        'SIETE ',
        'OCHO ',
        'NUEVE ',
        'DIEZ ',
        'ONCE ',
        'DOCE ',
        'TRECE ',
        'CATORCE ',
        'QUINCE ',
        'DIECISÉIS ',
        'DIECISIETE ',
        'DIECIOCHO ',
        'DIECINUEVE ',
        'VEINTE '
      ];
      this.decenas = [
        'VEINTI',
        'TREINTA ',
        'CUARENTA ',
        'CINCUENTA ',
        'SESENTA ',
        'SETENTA ',
        'OCHENTA ',
        'NOVENTA ',
        'CIEN '
      ];
      this.centenas = [
        'CIENTO ',
        'DOSCIENTOS ',
        'TRESCIENTOS ',
        'CUATROCIENTOS ',
        'QUINIENTOS ',
        'SEISCIENTOS ',
        'SETECIENTOS ',
        'OCHOCIENTOS ',
        'NOVECIENTOS '
      ];
      this.acentosExcepciones = {
        'VEINTIDOS': 'VEINTIDÓS ',
        'VEINTITRES': 'VEINTITRÉS ',
        'VEINTISEIS': 'VEINTISÉIS '
      };
    }
  
    convertNumber(number) {
      let converted = '';
  
      if (number < 0 || number > 999999999) {
        throw new Error('Wrong parameter number');
      }
  
      const numberStrFill = number.toString().padStart(9, '0');
      const millones = numberStrFill.substring(0, 3);
      const miles = numberStrFill.substring(3, 6);
      const cientos = numberStrFill.substring(6);
  
      if (parseInt(millones) > 0) {
        if (millones === '001') {
          converted += 'UN MILLÓN ';
        } else {
          converted += `${this.convertGroup(millones)}MILLONES `;
        }
      }
  
      if (parseInt(miles) > 0) {
        if (miles === '001') {
          converted += 'MIL ';
        } else {
          converted += `${this.convertGroup(miles)}MIL `;
        }
      }
  
      if (parseInt(cientos) > 0) {
        if (cientos === '001') {
          converted += 'UN ';
        } else {
          converted += `${this.convertGroup(cientos)} `;
        }
      }
  
      return converted.trim();
    }
  
    convertGroup(n) {
      let output = '';
  
      if (n === '100') {
        output = 'CIEN ';
      } else if (n[0] !== '0') {
        output = this.centenas[parseInt(n[0]) - 1];
      }
  
      const k = parseInt(n.substring(1));
  
      let unidades = '';
      if (k <= 20) {
        unidades = this.unidades[k];
      } else {
        if (k > 30 && n[2] !== '0') {
          unidades = `${this.decenas[parseInt(n[1]) - 2]}Y ${this.unidades[parseInt(n[2])]}`;
        } else {
          unidades = `${this.decenas[parseInt(n[1]) - 2]}${this.unidades[parseInt(n[2])]}`;
        }
      }
  
      output += this.acentosExcepciones[unidades.trim()] || unidades;
  
      return output;
    }
  }

module.exports = {
	NumberConverter
}