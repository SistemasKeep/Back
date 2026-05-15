const { ManipuladorCadenas } = require('./manipuladorCadenas');
const moment = require('moment');
class Validaciones{
    static typesParametros = {
      'string': this.validString,
      'stringInt': this.validStringInt,
      'stringWhatsApp': this.validStringWhatsApp,
      'model': this.validModel,
      'modelRelacionado': this.validModelRelacionado,
      'correo': this.validCorreo,
      'enum': this.validEnum,
      'password': this.validPassword
    }

    constructor() {}

    static async validParametros(req,res,obligatorios,registro){
        var parametros
        try {
          parametros = req.body;
          const aux = [];
          for (const key in parametros) {
            if (parametros.hasOwnProperty(key)) {
              aux.push(key)
            }
          }
          if(aux.length == 0){
            parametros = req.query;
          }
        } catch (error) {
          parametros = req
        }
        const parametrosValid = [];
        for (const key in parametros) {
          if (parametros.hasOwnProperty(key)) {
            parametrosValid.push(key)
          }
        }
        
        for (let index = 0; index < obligatorios.length; index++) {
          const obligatorio = obligatorios[index]
          let valor = parametros[obligatorio.campo]
          if((!parametrosValid.includes(obligatorio.campo))){
            res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro:obligatorio.campo});
            return false
          }
          const funcion = this.typesParametros[obligatorio.tipo]

          if(funcion === undefined){
            const tipo = obligatorio.tipo
            if(valor == null || valor == undefined){
              res.status(400).send({status:false , msg: 'No se recibieron todos los parametros.', parametro: obligatorio.campo });
              return false
            }
            const validType = await this.validType(valor,obligatorio.campo,tipo,obligatorio.largo,valor.length)
            if(validType === true){
              const key = this.getCampoName(obligatorio.campo)
              if(obligatorio.textoCase == 'title'){
                valor = ManipuladorCadenas.toTitle(valor)
              } else if(obligatorio.textoCase == 'up'){
                valor = valor.toUpperCase()
              } else if(obligatorio.textoCase == 'low'){
                valor = valor.toLowerCase()
              }
              registro[key] = valor
              
            }else{
              res.status(400).send(validType)
              return false
            }
          }else{
            const respuesta = await funcion(this.validType,this.validarSinEspacios,this.getCampoName,obligatorio,parametros,registro)
            if(respuesta !== undefined){
              res.status(400).send(respuesta)
              return false
            }
          }
        }
        return registro
    }

    static async validParametrosOpcionales(registro,seEdita = true,opcionales,parametros,res){
      for (let index = 0; index < opcionales.length; index++) {
        const opcional = opcionales[index];
        var clavesActuales = opcional.campo
        let valor = parametros[clavesActuales]
        if(clavesActuales !== null || opcional.canNull === true){
          if(valor !== undefined && valor !== null){
            const funcion = this.typesParametros[opcional.tipo]
            if(funcion === undefined){
              const tipo = opcional.tipo
              const validType = await this.validType(valor,opcional.campo,tipo,opcional.largo,valor.length)
              if(validType === true){
                const key = this.getCampoName(opcional.campo)
                if(opcional.textoCase == 'title'){
                  valor = ManipuladorCadenas.toTitle(valor)
                } else if(opcional.textoCase == 'up'){
                  valor = valor.toUpperCase()
                } else if(opcional.textoCase == 'low'){
                  valor = valor.toLowerCase()
                }
                registro[key] = valor
                seEdita = true
              }else{
                res.status(400).send(validType)
                return undefined
              }
            }else{
              const respuesta = await funcion(this.validType,this.validarSinEspacios,this.getCampoName,opcional,parametros,registro,true)
              if(respuesta !== undefined){
                res.status(400).send(respuesta)
                return undefined
              }
              seEdita = true
            }
            if(valor === null && opcional.canNull === true){
              const key = this.getCampoName(clavesActuales)
              registro[key] = valor
              seEdita = true
            }
          } else if(valor === null && opcional.canNull === true){
            const key = this.getCampoName(clavesActuales)
            registro[key] = valor
            seEdita = true
          }
        }
      }
      return [registro, seEdita]
    }

    static async validString(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor == '' || valor === null || valor === undefined) && isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      if(parametro.verifNoSpace){
        const isValid = validarSinEspaciosFn(valor)
        if(!isValid){
          return { status: false, msg: `Campo ${parametro.campo} formato inválido` }
        }
      } 
      const key = getCampoNameFn(parametro.campo)
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }
    
    static async validStringWhatsApp(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      const key = getCampoNameFn(parametro.campo)
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor == '' || valor === null || valor === undefined) && isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      if(parametro.verifNoSpace){
        const isValid = validarSinEspaciosFn(valor)
        if(!isValid){
          return { status: false, msg: `Campo ${parametro.campo} formato inválido` }
        }
      } 
      const regex = /^https?:\/\/chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})$/;
      const isValidFormatoWhatsApp = regex.test(valor);
      if(!isValidFormatoWhatsApp){
        return { status: false, msg: `Campo ${parametro.campo} formato inválido. El formato debe ser: https://chat.whatsapp.com/código-del-grupo` }
      }
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }

    static async validStringInt(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor == '' || valor === null || valor === undefined)&& isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      const key = getCampoNameFn(parametro.campo)
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }

    static async validModel(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor === null || valor === undefined) && isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } else if(!Number.isInteger(parseInt(valor))){
          return {status:false , msg: `El parametro ${parametro.campo} debe ser int.` }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'number',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      try {
        if(parametro.model.name == 'clientes_beneficiarios' || parametro.model.name == 'beneficiarios'){
          let registrosEncontrado = await parametro.model.findByPk(valor);
          if(parametro.model.name == 'clientes_beneficiarios'){
            registrosEncontrado = await parametro.model.findByPk(valor, {include: ['beneficiario']});
            for(const registroEncontrado of registrosEncontrado){
              if(registroEncontrado.beneficiario.bloqueado){
                return { status: false, msg: "Beneficiario bloqueado" }
              }
            }
          } else if(parametro.model.name == 'beneficiarios'){
            for(const registroEncontrado of registrosEncontrado){
              if(registroEncontrado.bloqueado){
                return { status: false, msg: "Beneficiario bloqueado" }
              }
            }
          }
          if(registrosEncontrado == undefined){
            return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} no encontrado` };
          }
          if(registrosEncontrado.deletedAt != null){
            return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} eliminado` };
          }
          const key = getCampoNameFn(parametro.campo)
          registro[key] = valor
        }else{
          const registroEncontrado = await parametro.model.findByPk(valor);
          if(registroEncontrado == undefined){
            return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} no encontrado` };
          }
          if(registroEncontrado.deletedAt != null){
            return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} eliminado` };
          }
          const key = getCampoNameFn(parametro.campo)
          registro[key] = valor
        }
      } catch (error) {
        return { status: false, msg: `Error al buscar registro con id: ${parametro.campo} = ${valor}`, error: error.toString()};
      } 
    }

    static async validModelRelacionado(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor === null || valor === undefined) && isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } else if(!Number.isInteger(parseInt(valor))){
          return {status:false , msg: `El parametro ${parametro.campo} debe ser int.` }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'number',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      try {
        if(parametro.where.where.suma_asegurada != undefined){
          const intSumaAseguradaAux = parseInt(parametro.where.where.suma_asegurada);
          const floatSumaAseguradaAux = parseFloat(parametro.where.where.suma_asegurada) - intSumaAseguradaAux
          if(floatSumaAseguradaAux < 1 && floatSumaAseguradaAux > 0.99){
            parametro.where.where.suma_asegurada = parseInt(parametro.where.where.suma_asegurada)  + 1 
          }
        }
        if(parametro.model.name == 'clientes_beneficiarios'){
          parametro.where.include = ['beneficiario']
        }
        const registrosEncontrado = await parametro.model.findAll(parametro.where);
        if(parametro.model.name == 'clientes_beneficiarios'){
          for(const registroEncontrado of registrosEncontrado){
            if(registroEncontrado.beneficiario.bloqueado){
              return { status: false, msg: "Beneficiario bloqueado" }
            }
          }
        } else if(parametro.model.name == 'beneficiarios'){
          for(const registroEncontrado of registrosEncontrado){
            if(registroEncontrado.bloqueado){
              return { status: false, msg: "Beneficiario bloqueado" }
            }
          }
        }
        if(registrosEncontrado.length != 1){
          return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} no encontrado` };
        }
        const registroEncontrado = registrosEncontrado[0]
        if(registroEncontrado.deletedAt != null){
          return { status: false, msg: `Registro con id: ${parametro.campo} = ${valor} eliminado` };
        }
        const key = getCampoNameFn(parametro.campo)
        registro[key] = valor
      } catch (error) {
        return { status: false, msg: `Error al buscar registro con id: ${parametro.campo} = ${valor}`, error: error.toString()};
      } 
    }

    static async validCorreo(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailIsValid = emailRegex.test(valor)
      if(!emailIsValid){
        return {status:false , msg: 'Parametro con formato inválido.', parametro: parametro.campo }
      } 
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      const key = getCampoNameFn(parametro.campo)
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }

    static async validEnum(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo].toUpperCase()
      if(!parametro.enum.includes(valor)){
        valor = parametros[parametro.campo].toLowerCase()
        if(!parametro.enum.includes(valor)){
          return { status: false, msg: `El campo ${parametro.campo} debe ser uno de los siguientes: ${parametro.enum}. Por favor, proporcione un valor válido.` };
        }
      }
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor == '' || valor === null || valor === undefined)&& isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      const key = getCampoNameFn(parametro.campo)
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }

    static async validPassword(validTypeFn,validarSinEspaciosFn,getCampoNameFn,parametro,parametros,registro,isOpcional = false){
      let valor = parametros[parametro.campo]
      if((isOpcional === true && parametro.canNull !== true) || (isOpcional !== true)){
        if(( valor == '' || valor === null || valor === undefined)&& isOpcional == false){
          return {status:false , msg: 'No se recibieron todos los parametros.', parametro: parametro.campo }
        } 
        const validType = await validTypeFn(valor,parametro.campo,'string',parametro.largo,valor.length)
        if(validType !== true){
          return validType
        }
      }
      const key = getCampoNameFn(parametro.campo)
      if(parametro.textoCase == 'title'){
        valor = ManipuladorCadenas.toTitle(valor)
      } else if(parametro.textoCase == 'up'){
        valor = valor.toUpperCase()
      } else if(parametro.textoCase == 'low'){
        valor = valor.toLowerCase()
      }
      registro[key] = valor
    }
    



    static async validType(variable,nameVariable,type,largo,limite){
      if((type == 'stringInt' || type == 'string') && !isNaN(parseInt(largo))){
        if(limite > largo){
          return {status:false , msg: `El parámetro ${nameVariable} tiene una longitud de ${limite} caracteres, lo cual supera la longitud permitida de ${largo} caracteres.`}
        }
      }
      if(type == 'stringInt'){
        if(!Number.isInteger(parseInt(variable))){
          return {status:false , msg: `El parametro ${nameVariable} debe ser un número como string pero se recibio ${typeof variable}.`};
        }
        if(parseInt(variable) <= -1){
          return {status:false , msg: `El parametro ${nameVariable} debe ser un número positivo.`};
        }
      } else if(type == 'number'){
        if(variable <= -1 || !Number.isInteger(parseInt(variable))){
          return {status:false , msg: `El parametro ${nameVariable} debe ser un número positivo.`};
        }
      } else if(type == 'stringDate'){
        if(!moment(variable, 'YYYY-MM-DD', true).isValid() && ( nameVariable != 'fechaVencimientoOriginal' && nameVariable != 'fechaVencimientoActual')){
          return {status:false , msg: `El parametro ${nameVariable} debe ser string con formato YYYY-MM-DD${typeof variable == "string" ? "" : ` pero se recibio ${typeof variable}`}.`}
        }
      } else if(type == 'stringDateTime'){
        if(!moment(variable, 'YYYY-MM-DD HH:mm', true).isValid()){
          return {status:false , msg: `El parametro ${nameVariable} debe ser string con formato YYYY-MM-DD HH:mm${typeof variable == "string" ? "" : ` pero se recibio ${typeof variable}`}.`}
        }
      } else if(type == 'stringDateFullTime'){
        if(!moment(variable, 'YYYY-MM-DD HH:mm:ss', true).isValid()){
          return {status:false , msg: `El parametro ${nameVariable} debe ser string con formato YYYY-MM-DD HH:mm${typeof variable == "string" ? "" : ` pero se recibio ${typeof variable}`}.`}
        }
      } else if(type == 'enum'){
        if(limite > largo){
          return {status:false , msg: `El parámetro ${nameVariable} tiene una longitud de ${limite} caracteres, lo cual supera la longitud permitida de ${largo} caracteres.`}
        }
        if(!(typeof variable === 'string')){
          return {status:false , msg: `El parametro ${nameVariable} debe ser string pero se recibio ${typeof variable}.`};
        }
      }else if(!(typeof variable === type)){
        return {status:false , msg: `El parametro ${nameVariable} debe ser ${type} pero se recibio ${typeof variable}.`};
      }
      return true;
    }

    static getCampoName(campo) {
      return campo.replace(/[A-Z0-9]/g, letter => `_${letter.toLowerCase()}`);
    }

    static validarSinEspacios(texto) {
      const regex = /\s/;
      return !regex.test(texto);
    }

    static async  esperar(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms);
      });
    }

    
}

module.exports = {
	Validaciones
}