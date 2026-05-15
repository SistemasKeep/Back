class ManipuladorCadenas{
    constructor(){}

    static toTitle(palabra){
        var palabraTitle = '';
        var palabras = palabra.trim().toLowerCase().split(' ');
        palabras.forEach(pal => {
            if(pal != ''){
                palabraTitle = palabraTitle + pal[0].toUpperCase()+pal.substring(1)+" "
            }
        });
        return palabraTitle.trim();
    }

    static async quitarAcentos(texto) {
        var patrones = [/[\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5]/g, /[\u00E8\u00E9\u00EA\u00EB]/g, /[\u00EC\u00ED\u00EE\u00EF]/g, /[\u00F2\u00F3\u00F4\u00F5\u00F6]/g, /[\u00F9\u00FA\u00FB\u00FC]/g];
        var reemplazos = ['a', 'e', 'i', 'o', 'u'];
        for (var i = 0; i < patrones.length; i++) {
            texto = texto.replace(patrones[i], reemplazos[i]);
        }
        return texto;
    }


    static formatMoney(valor,decimales = undefined){
        const formatoMoneda = new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimales !== undefined && decimales !== null ? decimales :6,
            maximumFractionDigits: decimales !== undefined && decimales !== null ? decimales :6
        }).format(parseFloat(valor !== null && valor !== undefined ? valor : 0));
        return formatoMoneda
    }

    static formatTarifa(valor){
        return parseFloat((parseFloat(valor !== null && valor !== undefined ? valor : 0)).toFixed(6)) + ""
    }

    static obtenerLetra(indice) {
        let resultado = '';
        while (indice >= 0) {
            resultado = String.fromCharCode((indice % 26) + 64) + resultado;
            indice = Math.floor(indice / 26) - 1;
        }
        return resultado;
    }
}

module.exports = {
	ManipuladorCadenas
}