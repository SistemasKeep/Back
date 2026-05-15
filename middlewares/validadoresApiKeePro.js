
const {db} = require('../models');
const { Relaciones } = require('../middlewares/relaciones');
const { resLocal } = require('./res_Local')
const certificados = require('../controllers/certificados.controller')

class ApiKeePro{
    constructor(){}

    static async certificado(req, res, next){
        req.body.keepro = 3
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
        req.body.retroactividad = false
        next();
    }

    static async indexCertificado(req, res, next){
        req.query.keepro = 3
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
        req.body.keepro = 3
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
        req.body.keepro = 3
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
        req.query.keepro = 3
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
        //var whereFindMarcas = {
        //    where: {
        //        nombre: {[db.Sequelize.Op.like]: `%keepro%`} ,
        //        deletedAt: null
        //    }
        //}
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
            const claveList = registroEncontrado.clave.split("-")
            let clienteToFind = parseInt(claveList[2])
            if(isNaN(parseInt(claveList[2]))){
                clienteToFind = parseInt(claveList[3])
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
                clienteValido = req.usuario.id_cliente == clienteToFind
            }
            if(!clienteValido){
                return res.status(400).send({ status: false, msg: "Registro no existe" });
            }
            req.query.keepro = 3
            return next();
		}
		return res.status(400).send({ status: false, msg: "Registro no existe" });
    }

    static async addKeepro(req,res,next){
        req.body.keepro = 3
        req.query.keepro = 3
        next();
    }

     static async getDatosClienteDeMediador(req, res){
        const parametrosBody = req.body;
        const parametros = {
            idCliente: parametrosBody.idNuevoCliente,
            idBeneficiario: parametrosBody.idBeneficiario,
            idCommodity: parametrosBody.idCommodity,
            idTipoContenedor: parametrosBody.idTipoContenedor,
            idTamanioContenedor: parametrosBody.idTamanioContenedor,
            numContenedor: parametrosBody.numContenedor,
            idMoneda: parametrosBody.idMoneda,
            idModalidad: parametrosBody.idModalidad,
            idTipoBienes: parametrosBody.idTipoBienes,
            idUbicacionesBienes: parametrosBody.idUbicacionesBienes,
            idPuertoAeropuertoOrigen: parametrosBody.idPuertoAeropuertoOrigen,
            idPuertoAeropuertoDestino: parametrosBody.idPuertoAeropuertoDestino,
            idEstadoOrigen: parametrosBody.idEstadoOrigen,
            idEstadoDestino: parametrosBody.idEstadoDestino,
            sumaAsegurada: parametrosBody.sumaAsegurada,
            ciudadOrigen: parametrosBody.ciudadOrigen,
            ciudadDestino: parametrosBody.ciudadDestino,
            fechaInicioCobertura: parametrosBody.fechaInicioCobertura,
            fechaFinCobertura: parametrosBody.fechaFinCobertura,
            descripcionCarga: parametrosBody.descripcionCarga,
            datosAdicionales: parametrosBody.datosAdicionales,
            ruta: parametrosBody.ruta,
            referencias: parametrosBody.referencias,
            draftCertificado: parametrosBody.draftCertificado,
            keepro: parametrosBody.keepro,
            retroactividad: parametrosBody.retroactividad,
        }
        const cliente = await db.sequelize.models.clientes.findByPk(parametrosBody.idNuevoCliente);
        const oficinaCliente = await db.sequelize.models.oficinas_cliente.findOne({
            where:{
                id_cliente: cliente.id
            }
        });
        const oficinaRazonSocial = await db.sequelize.models.oficinas_razones_sociales.findOne({where:{id_oficina:oficinaCliente.id_oficina}})
        const mao = await db.sequelize.models.marca_agentes_oficinas.findOne({
            where:{
                id_oficina_cliente: oficinaCliente.id,
                id_marca: 1
            }
        });
        const oficinaProductoOriginal = await db.sequelize.models.oficinas_productos.findByPk(parametrosBody.idServicio);
        const oficinaProducto = await db.sequelize.models.oficinas_productos.findOne({
            where:{
                id_marca_agente_oficina: mao.id,
                id_producto: oficinaProductoOriginal.id_producto
            }
        });
        parametros.idRazonSocial = oficinaRazonSocial.id_razon_social
        parametros.idServicio = oficinaProducto.id
        const respuesta = resLocal();

        req.body = parametros
        await certificados.store(req, respuesta);

        return res.status(respuesta.statusCode).send(respuesta.body);
    }
    
    static async getPedidoFactura(req, res, next){
        req.body.keepro = 3
        const { id } = req.params;
        if(!Number.isInteger(parseInt(id))){
            res.status(400).send({status:false , msg: `El parametro id debe ser int.` });
            return false
        } 
		const registroEncontrado = await db.sequelize.models.certificados.findByPk(id, {paranoid: false});
        if(registroEncontrado != null){
            const pedidoFactura = await db.sequelize.models.pedidos_factura.findOne({ where:{ id_certificado: id } })
            if(pedidoFactura == null){
		        return res.status(400).send({ status: false, msg: "La Operación no cuenta con pedido de factura." });
            }
            if(pedidoFactura.estatus == "F"){
		        return res.status(400).send({ status: false, msg: "La Operación ya se encuentra facturada." });
            }
            req.body.pedidosFactura = [pedidoFactura.id]
            next();
		} else{
		    return res.status(400).send({ status: false, msg: "No existe la operación." });
        }
    }

}

module.exports = {
	ApiKeePro
}