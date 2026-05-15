
const {db} = require('../models');
const { Relaciones } = require('./relaciones');

class KeePro{
    constructor(){}

    static async certificado(req, res, next){
        if(req.body.keepro === 0 || req.body.keepro === 3 || req.body.keepro === undefined || req.body.keepro === null){
            req.body.keepro = 1
        }
        if(req.body.idCliente === null || req.body.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.body.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = req.body.idCliente == req.usuario.id_cliente
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.body.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        req.body.draftCertificado = false
        req.body.retroactividad = false
        next();
    }

    static async indexCertificado(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        
        if(req.query.idCliente === null || req.query.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.query.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = req.query.idCliente == req.usuario.id_cliente
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.query.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        var filtros
        try {
            filtros = JSON.parse(req.query.filter)
        } catch (error) {
            filtros = {or:[],and:[]}
        }
        let encontrado = false
        for(const key in filtros){
            for(const filtro of filtros[key]){
                if(filtro.property == 'id_cliente'){
                    encontrado = true
                    filtro.value = parseInt(req.query.idCliente)
                }
            }
        }
        if(!encontrado){
            if(filtros.and == undefined){
                filtros.and = []
            }
            filtros.and.push( { property: 'id_cliente', value: parseInt(req.query.idCliente), operator: '==' })
        }
        const filterString = JSON.stringify(filtros);
        req.query.filter = filterString
        next();
    }

    static async validClienteOperacion(req, res, next){
        const { id } = req.params;
        if(req.body.keepro === 0 || req.body.keepro === 3 || req.body.keepro === undefined || req.body.keepro === null){
            req.body.keepro = 1
        }
        const certificado = await db.sequelize.models.certificados.findByPk(id, { paranoid: false });
        if(certificado == null){
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        if(certificado.deletedAt != null){
            return res.status(400).send({ status: false, msg: "Registro eliminado" });
        }
        if(certificado.estatus == 'C'){
            return res.status(400).send({ status: false, msg: "Registro cancelado" });
        }
        if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind = certificado.id_cliente
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "El cliente no esta asignado al usuario." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "El cliente no esta asignado al usuario." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "El cliente no esta asignado al usuario." });
            }
        } 
        if(req.usuario.id_cliente != certificado.id_cliente){
            return res.status(400).send({ status: false, msg: "El cliente no esta asignado al usuario." });
        }
        next();
    }

    static async beneficiario(req, res, next){
        if(req.body.keepro === 0 || req.body.keepro === 3 || req.body.keepro === undefined || req.body.keepro === null){
            req.body.keepro = 1
        }
        let clienteToFind
        if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            clienteToFind = req.body.idCliente
        } else{
            clienteToFind = req.usuario.id_cliente
        }
        if(clienteToFind === undefined || clienteToFind === null){
            return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
        }
        let clienteValido = false
        if(req.usuario.es_mediador_mercantil === true){
            const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
            const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
            const relaciones = await findRelaciones.getRelaciones()

            const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
            if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                clienteValido = false
            }else{
                if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                    return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                }
                clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
            }
            
        } else{
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
            }
            clienteValido = req.body.idCliente == req.usuario.id_cliente
            clienteToFind = req.body.idCliente
        }
        if(!clienteValido){
            return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
        }else {
            req.usuario.id_cliente = clienteToFind
            req.body.idCliente = clienteToFind
        }
        next();
    }

    static async indexBeneficiario(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        let clienteToFind
        if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            clienteToFind = req.query.idCliente
        } else{
            clienteToFind = req.usuario.id_cliente
        }
        if(clienteToFind === undefined || clienteToFind === null){
            return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
        }
        let clienteValido = false
        if(req.usuario.es_mediador_mercantil === true){
            const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
            const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
            const relaciones = await findRelaciones.getRelaciones()

            const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
            if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                clienteValido = false
            }else{
                if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                    return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                }
                clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
            }
            
        } else{
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
            }
            clienteValido = req.query.idCliente == req.usuario.id_cliente
            clienteToFind = req.query.idCliente
        }
        if(!clienteValido){
            return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
        }else {
            req.usuario.id_cliente = clienteToFind
            req.query.idCliente = clienteToFind
        }
        var filtros
        try {
            filtros = JSON.parse(req.query.filter)
        } catch (error) {
            filtros = {or:[],and:[]}
        }
        var whereFindMarcas = {
            where: {
                nombre: {[db.Sequelize.Op.like]: `%keepro%`} ,
                deletedAt: null
            }
        }
        const marcaSelected = await db.sequelize.models.marcas.findByPk(1);
        const clienteSelected = await db.sequelize.models.clientes.findByPk(parseInt(req.query.idCliente));
        if(clienteSelected == null){
            return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} no encontrado` });
        }
        if(clienteSelected.deletedAt != null){
            return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} eliminado` });
        }
        if(clienteSelected.cliente_prospecto !== true){
            return res.status(400).send({ status: false, msg: `Registro con id: idCliente = ${req.query.idCliente} es prospecto` });
        }
        const claveBeneficiario = `${marcaSelected.clave}-${clienteSelected.id}`
        let encontrado = false
        for(const key in filtros){
            for(const filtro of filtros[key]){
                if(filtro.property == 'clave'){
                    encontrado = true
                    filtro.value = claveBeneficiario
                    filtro.operator = 'like'
                }
            }
        }
        if(!encontrado){
            if(filtros.and == undefined){
                filtros.and = []
            }
            filtros.and.push({ property: 'clave', value: claveBeneficiario, operator: 'like' })
        }
        const filterString = JSON.stringify(filtros);
        req.query.filter = filterString
        next();
    }

    static async validarBeneficiarioCliente(req, res, next){
        const { id } = req.params;
        const registroEncontrado = await db.sequelize.models.beneficiarios.findByPk(id,{paranoid: false});
		if(registroEncontrado != null){
			if(registroEncontrado.bloqueado == true){
				return res.status(400).send({ status: false, msg: "Beneficiario bloqueado" });
			}
            if(registroEncontrado.deletedAt != null){
                return res.status(400).send({ status: false, msg: "Registro eliminado" });
            }
            if(!Number.isInteger(parseInt(req.query.idCliente))){
                if(!Number.isInteger(parseInt(req.body.idCliente))){
                    res.status(400).send({status:false , msg: `El parametro idCliente debe ser int.` });
                    return false
                }
            } 

            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()
    
                let cliente = await db.sequelize.models.clientes.findByPk(req.query.idCliente,{include: relaciones})
                if(cliente == null){
                    cliente = await db.sequelize.models.clientes.findByPk(req.body.idCliente,{include: relaciones})
                }
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = (req.usuario.id_cliente == req.query.idCliente) || (req.usuario.id_cliente == req.body.idCliente)
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
                req.query.keepro = 1
            }
            return next();
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
    }

    static async indexRazonesSociales(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        
        if(req.query.idCliente === null || req.query.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.query.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = true
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.query.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:req.usuario.id_cliente}, order: [['id', 'ASC']]});
        const razonesSociales = [];
        for(const cliente_razon_social of clientesRazonesSociales){
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social);
            if(razonSocial != null){
                razonesSociales.push(razonSocial);
            }
        }
        if(razonesSociales.length > 0){
            const idsRS = [];
            for(const rs of razonesSociales){
                idsRS.push(rs.id);
            }
            req.query.specialFilter = {id:{[db.Sequelize.Op.or]: idsRS}}
        }
        next();
    }

    static async showRazonesSociales(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        
        if(req.query.idCliente === null || req.query.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.query.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = true
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.query.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:req.usuario.id_cliente}, order: [['id', 'ASC']]});
        const razonesSociales = [];
        for(const cliente_razon_social of clientesRazonesSociales){
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social);
            if(razonSocial != null){
                razonesSociales.push(razonSocial);
            }
        }
        if(razonesSociales.length > 0){
            const idsRS = [];
            for(const rs of razonesSociales){
                idsRS.push(rs.id);
            }
            const { id } = req.params;
            if(!Number.isInteger(parseInt(id))){
                res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
                return false
            } 
            if(!idsRS.includes(parseInt(id))){
                return res.status(400).send({ status: false, msg: "Registro no existe" });
            }
        }else{
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        next();
    }

    static async indexRazonesSocialesArchivos(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        
        if(req.query.idCliente === null || req.query.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.query.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = true
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.query.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:req.usuario.id_cliente}, order: [['id', 'ASC']]});
        const razonesSociales = [];
        for(const cliente_razon_social of clientesRazonesSociales){
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social);
            if(razonSocial != null){
                razonesSociales.push(razonSocial);
            }
        }
        if(razonesSociales.length > 0){
            const idsRS = [];
            for(const rs of razonesSociales){
                idsRS.push(rs.id);
            }
            req.query.specialFilter = {id_razon_social:{[db.Sequelize.Op.or]: idsRS}}
        }
        next();
    }

    static async showRazonesSocialesArchivos(req, res, next){
        if(req.query.keepro === 0 || req.query.keepro === 3 || req.query.keepro === undefined || req.query.keepro === null){
            req.query.keepro = 1
        }
        
        if(req.query.idCliente === null || req.query.idCliente === undefined || req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
            let clienteToFind
            if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                clienteToFind = req.query.idCliente
            } else{
                clienteToFind = req.usuario.id_cliente
            }
            if(clienteToFind === undefined || clienteToFind === null){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
            let clienteValido = false
            if(req.usuario.es_mediador_mercantil === true){
                const relacionesData = [ 'detalles_cliente.comisionista','detalles_cliente.comisionista.proveedor','detalles_cliente.mediador_mercantil','detalles_cliente.agente_credito_cobranza','detalles_cliente.agente_customer','categoria_cliente','tipo_cliente','estado.pais.continente','oficina_interno']
                const findRelaciones = new Relaciones(relacionesData,relacionesData,db.sequelize.models)
                const relaciones = await findRelaciones.getRelaciones()

                const cliente = await db.sequelize.models.clientes.findByPk(clienteToFind,{include: relaciones})
                if(cliente == null || cliente.detalles_cliente == null || cliente.detalles_cliente == undefined){
                    clienteValido = false
                }else{
                    if(cliente.detalles_cliente.id_mediador_mercantil === null || req.usuario.id_mediador_mercantil === null){
                        return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
                    }
                    clienteValido = cliente.detalles_cliente.id_mediador_mercantil == req.usuario.id_mediador_mercantil
                }
                if(clienteValido){
                    req.usuario.id_cliente = clienteToFind
                }
            } else{
                if(req.usuario.id_cliente === null || req.usuario.id_cliente === undefined){
                    return res.status(400).send({ status: false, msg: "El usuario no es mediador ni tiene cliente asignado." });
                }
                clienteValido = true
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }else{
            let clienteValida2 = req.query.idCliente == req.usuario.id_cliente
            if(!clienteValida2){
                return res.status(400).send({ status: false, msg: "Parametro idCliente inválido." });
            }
        }
        const clientesRazonesSociales = await db.sequelize.models.clientes_razones_sociales.findAll({where: {id_cliente:req.usuario.id_cliente}, order: [['id', 'ASC']]});
        const razonesSociales = [];
        for(const cliente_razon_social of clientesRazonesSociales){
            const razonSocial = await db.sequelize.models.razones_sociales.findByPk(cliente_razon_social.id_razon_social);
            if(razonSocial != null){
                razonesSociales.push(razonSocial);
            }
        }
        if(razonesSociales.length > 0){
            const idsRS = [];
            for(const rs of razonesSociales){
                idsRS.push(rs.id);
            }
            const { id } = req.params;
            if(!Number.isInteger(parseInt(id))){
                res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
                return false
            } 
            const razonSocial = await db.sequelize.models.razones_sociales_archivos.findByPk(id);
            if(razonSocial == null){
                return res.status(400).send({ status: false, msg: "Registro no existe" });
            }
            if(!idsRS.includes(razonSocial.id_razon_social)){
                return res.status(400).send({ status: false, msg: "Registro no existe" });
            }
            req.idsRS = idsRS
        }else{
            return res.status(400).send({ status: false, msg: "Registro no existe" });
        }
        next();
    }



}

module.exports = {
	KeePro
}