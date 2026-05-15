
const {db} = require("../models");
const moment = require('moment-timezone');
class Filtros{
    operadores = {
        "==": db.Sequelize.Op.eq,
        "!=": db.Sequelize.Op.ne,
        ">=": db.Sequelize.Op.gte,
        ">": db.Sequelize.Op.gt,
        "<=": db.Sequelize.Op.lte,
        "<": db.Sequelize.Op.lt,
        "like": db.Sequelize.Op.like,
        "notlike": db.Sequelize.Op.notLike,
    }
    filtros = undefined
    eliminados = undefined
    constructor({filtros, eliminados}){
        this.filtros = filtros
        this.eliminados = eliminados
    }

    async get(){
        const _filtro = {}
        if(this.eliminados == 'false' || this.eliminados === undefined){
            _filtro.deletedAt = null;
        } else if(this.eliminados == 'only'){
            _filtro.deletedAt = {
                [db.Sequelize.Op.ne]: null, 
            }
        }
        try {
            for (const key in this.filtros) {
                if (Object.hasOwnProperty.call(this.filtros, key)) {
                    const filtro = this.filtros[key];
                    if(key == 'or'){
                        const or = {}
                        var vacio = true
                        for (let index = 0; index < filtro.length; index++) {
                            const element = filtro[index];
                            element.operator = element.operator.toLowerCase()
                            if(this.operadores[element.operator] != undefined && element.value !== undefined){
                                try {
                                    if(moment(element.value, 'YYYY-MM-DD HH:mm', true).isValid()){
                                        const aux = moment.utc(element.value, 'YYYY-MM-DD HH:mm').format("YYYY-MM-DD HH:mm:ss");
                                        element.value = aux
                                    }else if(moment(element.value, 'YYYY-MM-DD', true).isValid()){
                                        const aux = moment.utc(element.value, 'YYYY-MM-DD').startOf('day').format("YYYY-MM-DD HH:mm:ss")
                                        element.value = aux
                                    }
                                } catch (error) {
                                }
                                vacio = false
                                if(element.property.includes(".")){
                                    if(or[`\$${element.property}\$`] === undefined){
                                        or[`\$${element.property}\$`] = {
                                            [db.Sequelize.Op.or] : [{[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}]
                                        }
                                    } else{
                                        or[`\$${element.property}\$`][db.Sequelize.Op.or].push({[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}) 
                                    }
                                } else {
                                    if(or[element.property] === undefined){
                                        or[element.property] = {
                                            [db.Sequelize.Op.or] : [{[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}]
                                        }
                                    } else{
                                        or[element.property][db.Sequelize.Op.or].push({[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}) 
                                    }
                                    
                                }
                            }
                        }
                        if(!vacio){
                            _filtro[db.Sequelize.Op.or] = or;
                        }
                    } else if(key == 'and'){
                        for (let index = 0; index < filtro.length; index++) {
                            const element = filtro[index];
                            element.operator = element.operator.toLowerCase()
                            if(this.operadores[element.operator] != undefined && element.value !== undefined){
                                try {
                                    if(moment(element.value, 'YYYY-MM-DD HH:mm', true).isValid()){
                                        const aux = moment.utc(element.value, 'YYYY-MM-DD HH:mm').format("YYYY-MM-DD HH:mm:ss");
                                        element.value = aux
                                    }else if(moment(element.value, 'YYYY-MM-DD', true).isValid()){
                                        const aux = moment.utc(element.value, 'YYYY-MM-DD').startOf('day').format("YYYY-MM-DD HH:mm:ss")
                                        element.value = aux
                                    }
                                } catch (error) {
                                }
                                if(element.property.includes(".")){
                                    if(_filtro[`\$${element.property}\$`] === undefined){
                                        _filtro[`\$${element.property}\$`] = {[db.Sequelize.Op.and] : [{[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}]} 
                                    }else{
                                        _filtro[`\$${element.property}\$`][db.Sequelize.Op.and].push({[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value})
                                    }
                                }else{
                                    if( _filtro[`${element.property}`] === undefined){
                                        _filtro[`${element.property}`] = {[db.Sequelize.Op.and] : [{[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value}]} 
                                    }else{
                                        _filtro[`${element.property}`][db.Sequelize.Op.and].push({[this.operadores[element.operator]]: element.operator == "like" || element.operator == "notlike" ? `%${element.value}%` : element.value})
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return _filtro
        } catch (error) {
            return _filtro
        }
    }

}

module.exports = {
	Filtros
}


