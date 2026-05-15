const crypto = require('crypto-js');

var key = '8jHw7YkL3pZqRsE5xU9vGtF6nJmD4yX2'; // Clave para encriptado/desencriptado
var iv = ' 4sD9pRwX2jLqA7fG';// IV  para encriptado/desencriptado

class CryptoMiddleware {
    constructor() {}

    static async encriptarJSON(objeto) {
        const encriptar = crypto.AES.encrypt(JSON.stringify(objeto), key,  {
            iv: iv,
            mode: crypto.mode.CBC,
            padding: crypto.pad.Pkcs7
        });
        return encriptar.toString();
    }

    static async desencriptarJSON(stringEncriptado) {
        const decrypted = crypto.AES.decrypt(stringEncriptado, key, {
            iv: iv,
            mode: crypto.mode.CBC,
            padding: crypto.pad.Pkcs7
        });
        return JSON.parse(decrypted.toString(crypto.enc.Utf8));
    }


    static async encriptarString(string) {
        const encriptar = crypto.AES.encrypt(string, key,  {
            iv: iv,
            mode: crypto.mode.CBC,
            padding: crypto.pad.Pkcs7
        });
        return encriptar.toString();
    }

    static async desencriptarString(stringEncriptado) {
        const decrypted = crypto.AES.decrypt(stringEncriptado, key, {
            iv: iv,
            mode: crypto.mode.CBC,
            padding: crypto.pad.Pkcs7
        });
        return decrypted.toString(crypto.enc.Utf8);
    }

}
module.exports = {
	CryptoMiddleware
}