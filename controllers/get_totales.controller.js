'use strict'
const {db} = require('../models');
const moment = require('moment-timezone');
const {Validaciones} = require('../middlewares/validaciones');
const { Relaciones } = require('../middlewares/relaciones');
const { getPolizaDetalle } = require('../middlewares/getters');
const { getAtributo } = require('./atributos_keepro.controller');
const { ManipuladorCadenas } = require('../middlewares/manipuladorCadenas');
const { buscarActualiarTipoCambioSRes } = require('./tipos_cambio_futuro.controller')


async function getTotales(req, res) {
	const parametros = req.body;
    const totales = await getTotalesLocal(parametros,req, res)
    try {
        if(totales !== undefined){
            if(totales.status === true){
                totales.status = undefined
                return res.status(200).send({ status: true, data: totales});
            } else{
                return res.status(400).send(totales);
            }
        }
    } catch (error) {
        return res.status(400).send({ status: false, msg: "Error interno del servidor", error: error.toString()});
    }
}


async function getTotalesLocal(parametros,req, res) {
	try {
        var registro = {}
		var oficinaProductoAux = undefined
		var oficinaCliente = undefined
		var marcaAgenteOficina = undefined
		//Se obtiene la poliza detalle 
		try {
			oficinaProductoAux = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto,);
			if(oficinaProductoAux === null){
				res.status(400).send({ status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`});
                return undefined
			}
			marcaAgenteOficina = await db.sequelize.models.marca_agentes_oficinas.findByPk(oficinaProductoAux.id_marca_agente_oficina);
			oficinaCliente = await db.sequelize.models.oficinas_cliente.findByPk(marcaAgenteOficina.id_oficina_cliente);
			
		} catch (error) {
			res.status(400).send({ status: false, msg: "No existe poliza vigente", error:error.toString()});
            return undefined
		}
        let obligatorios = [{campo:'idEstadoOrigen', tipo:'model', model:db.sequelize.models.estados},
            {campo:'idRazonSocial', tipo:'modelRelacionado', model:db.sequelize.models.oficinas_razones_sociales, where:{where:{id_oficina:oficinaCliente.id_oficina,id_razon_social:parametros.idRazonSocial}}},
                            {campo:'idEstadoDestino', tipo:'model', model:db.sequelize.models.estados},
                            {campo:'idMoneda', tipo:'model', model:db.sequelize.models.monedas},
                            {campo:'idOficinaProducto', tipo:'model', model:db.sequelize.models.oficinas_productos},]
        registro = await Validaciones.validParametros(req, res,obligatorios,registro);
        if(!registro){
            return undefined;
        }
        const validosOpcionales =[{campo:'isDeducible', tipo:'boolean'}]
		const dataValidarOpcionales = await Validaciones.validParametrosOpcionales(registro,false,validosOpcionales,parametros,res)
		if(dataValidarOpcionales == undefined){
			return undefined;
		}
		registro = dataValidarOpcionales[0]
        const moneda = await db.sequelize.models.monedas.findByPk(parametros.idMoneda);
        const tipoCambio = await getTipoCambio(moneda)
        if(isNaN(parseFloat(tipoCambio))){
            res.status(400).send(tipoCambio)
            return undefined
        }
        var sumaAsegurada = undefined
        if(moneda.clave == "MXN"){
            sumaAsegurada = await round(parametros.sumaAsegurada / tipoCambio,4) 
        }else{
            sumaAsegurada = parametros.sumaAsegurada
        }
        const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
        const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);
        parametros.idPaisOrigen = estadoOrigen.id_pais
        parametros.idPaisDestino = estadoDestino.id_pais
        const isContenedor = await getIsContenedor(parametros)
        const isRc = await getIsRc(parametros)
        const atributoKeepro = await getatributoKeepro(parametros,isContenedor,sumaAsegurada)
        if(atributoKeepro == null){
            if(isContenedor){
                const atributosContendor = await getAtributosContenedor(parametros)
                const sumasValidas = []
                for (let index = 0; index < atributosContendor.length; index++) {
                    const atributo = atributosContendor[index];
                    if(!sumasValidas.includes(await round(atributo.limite_inferior * tipoCambio,4))){
                        sumasValidas.push(await round(atributo.limite_inferior * tipoCambio,4))
                    }
                }
                return { status: false, msg: "No existen atributos con la suma asegurada seleccionada", sumasValidas: sumasValidas};
            } else if(isRc){
                const atributosRC = await getAtributoRC(parametros)
                const sumasValidas = []
                for (let index = 0; index < atributosRC.length; index++) {
                    const atributo = atributosRC[index];
                    if(!sumasValidas.includes(await round(atributo.limite_inferior * tipoCambio,4))){
                        sumasValidas.push(await round(atributo.limite_inferior * tipoCambio,4))
                    }
                }
                return { status: false, msg: "No existen atributos con la suma asegurada seleccionada", sumasValidas: sumasValidas};
            }
            return { status: false, msg: "No existe un atributo para el oficina producto seleccionado"};
        }
        const polizaDetalles = await getPolizaDetalles(parametros,atributoKeepro);
        const tramoViaje = await getTramoViaje(parametros,atributoKeepro)
        parametros = await getMarca(parametros)
        const iva = await getIva(parametros)
        const atributoIsDeducible = await atributoIsDeducibleFn(parametros,atributoKeepro,polizaDetalles,isContenedor)
        let tarifaClienteFinal = undefined
        if(polizaDetalles.tarifa_commoditie === true){
            var whereFind = {
                where: {
                    [db.Sequelize.Op.and]: {
                        id_poliza_detalle: polizaDetalles.id,
                        id_commodity: parametros.idCommodity,
                        deletedAt: null
                    }
                }
            }
            const polizaCommoditie = await db.sequelize.models.polizas_commoditys.findOne(whereFind);
            if(polizaCommoditie !== null){
                if(polizaCommoditie.tarifa !== null && polizaCommoditie.tarifa !== undefined){
                    if(parseFloat(polizaCommoditie.tarifa) > 0){
                        tarifaClienteFinal = parseFloat(polizaCommoditie.tarifa)
                    }
                }
            }
        }
        if(tarifaClienteFinal === undefined){
            tarifaClienteFinal = await getTarifaClienteFinal(atributoKeepro,atributoIsDeducible)
        }
        var minimoVenta = await getMinimoVenta(atributoKeepro,atributoIsDeducible)
        const tarifaCompra = await getTarifaCompra(parametros,atributoKeepro,atributoIsDeducible,polizaDetalles,isContenedor,sumaAsegurada)
        if(tarifaCompra.status !== undefined){
            return tarifaCompra;
        }
        const tarifaMediadorMercantil = await getTarifaMediadorMercantil(atributoKeepro,atributoIsDeducible)
        
        if(moneda.clave == "MXN"){
            sumaAsegurada = sumaAsegurada * tipoCambio
            const parteEntera = parseInt(sumaAsegurada)
            const parteFlotante = parseFloat(sumaAsegurada) - parteEntera
            sumaAsegurada = (parteFlotante < 0.01) ? parteEntera : (parteFlotante > 0.99) ? (parteEntera + 1) : parseFloat(sumaAsegurada.toFixed(6))
        
        }else{
            sumaAsegurada = sumaAsegurada
        }
        const minimoVentaUSD = minimoVenta
        minimoVenta = minimoVenta * tipoCambio

        var costoPoliza = ((sumaAsegurada * tarifaClienteFinal) / 100);
        const parteEntera = parseInt(costoPoliza)
        const parteFlotante = parseFloat(costoPoliza) - parteEntera
        costoPoliza = (parteFlotante < 0.01) ? parteEntera : (parteFlotante > 0.99) ? (parteEntera + 1) : parseFloat(costoPoliza.toFixed(6))
        var subTotal = 0.0;
        if (costoPoliza < 0.07) {
            costoPoliza = 0.07;
        }
        var isMinimo = false
        if (costoPoliza < minimoVenta) {
          isMinimo = true;
          subTotal = minimoVentaUSD * tipoCambio;
        } else {
          isMinimo = false;
          subTotal = costoPoliza;
        }
        var ivaMonto = subTotal * iva / 100;
        var total = subTotal + ivaMonto;
        var tarifaProveedor = 0.0
        const minimoCompra = await getMinimoCompra(atributoKeepro,atributoIsDeducible,polizaDetalles)
        if(tarifaCompra < 1.0){
            let auxCompra = (sumaAsegurada * tarifaCompra) / 100
            if(auxCompra < minimoCompra){
                tarifaProveedor = minimoCompra
            }else{
                tarifaProveedor = (sumaAsegurada * tarifaCompra) / 100;
            }
        }else{
            tarifaProveedor =  tarifaCompra;
            tarifaProveedor = tarifaProveedor * tipoCambio;
        }
        const minimoMediadorMercantil = await getMinimoSobreVentaMediador(atributoKeepro,atributoIsDeducible,tipoCambio);
        const sobreVenta = await getSobreVenta(tarifaMediadorMercantil,tarifaClienteFinal,sumaAsegurada,subTotal,isMinimo,minimoMediadorMercantil);
        const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(atributoKeepro.id_oficina_producto, {include:['producto','marca_agente_oficina']});
        const totalComisionistas = await getComisioniastas(oficinaProducto);
        const comisionComisionistas = await getComisionComisioniastas(subTotal,sobreVenta,tarifaProveedor,totalComisionistas);
        const comisionAgentes = (comisionComisionistas[0] ?? 0) + (comisionComisionistas[1] ?? 0);
        const profit = await getProfit(subTotal,sobreVenta,tarifaProveedor);

        var tarifaCompraFinalreturn = tarifaCompra;
        if(tarifaCompraFinalreturn > 1.0){
            tarifaCompraFinalreturn = (tarifaCompraFinalreturn  / atributoKeepro.limite_inferior) * 100;
        }

        const dataReturn = {
            status: true,
            tarifaVentaCliente: tarifaClienteFinal,
            tipoCambioDocumento: await round(await getTipoCambioDoc(moneda),6),
            total: await round(total,6),
            minimoVenta: await round(minimoVentaUSD,6),
            minimoVentaMoneda: await round(minimoVenta,6),
            sumaAsegurada: await round(sumaAsegurada,6),
            montoIva:await round(ivaMonto,6) ,
            iva: await round(iva,6),
            subTotal: await round(subTotal,6),
            tramoEmbarge: tramoViaje,
            profit: await round(profit,6),
            sobreVenta: await round(sobreVenta,6),
            comisionAgentesArray: [comisionComisionistas[0] != null ? await round(comisionComisionistas[0],6):0.0000,comisionComisionistas[1] != null ? await round(comisionComisionistas[1],6):0.0000],
            costoCompra: await round(tarifaProveedor,6),
            tarifaCompraFinal: await round(tarifaCompraFinalreturn,6),
            minimoCompra: await round(minimoCompra,6),
            comisionAgente: await round(comisionAgentes,6),
            tarifaMediadorMercantil: await round(tarifaMediadorMercantil,6),
            minimoMediador:await round(minimoMediadorMercantil / tipoCambio,6),
            descuento: await round(0.0,6),
            montoDescuento: await round(0.0,6),
            retencion: await round(0.0,6),
            montoRetencion: await round(0.0,6)
        }
        
        return dataReturn;
	} catch (error) {
		return { status: false, msg: "Error interno del servidor", error: error.toString()};
	} 
}

function esRFCEExtranjero(rfc) {
    const regexExtranjero = /^XEXX010101\d{3}$/;
    return regexExtranjero.test(rfc);
}

async function getMarca(parametros){
    try {
        const razonSocialAux = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
        parametros.idMarca = razonSocialAux.id_nacionalidad_timbrado == 96 ? 1 : 1
    } catch (error) {
        parametros.idMarca = undefined
    }
    return parametros
}

async function getIsContenedor(parametros){
    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
    const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
    const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
    return cobertura.includes("contenedor")
}
async function getIsRc(parametros){
    const oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
    const tipoCobertura = await db.sequelize.models.tipos_cobertura.findByPk(oficinaProducto.producto.id_tipo_cobertura);
    const cobertura = tipoCobertura.nombre.toLowerCase().split(" ");
    return cobertura.includes("rc")
}

async function getatributoKeepro(parametros,isContenedor,sumaAsegurada) {
    if(parametros.idatributoKeepro !== undefined && parametros.idatributoKeepro !== null){
        const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(parametros.idatributoKeepro);
        if(atributoKeepro === undefined || atributoKeepro === null){
            return { status: false, msg: "Registro no existe" }
        }
        return atributoKeepro
    } else{
        var parametrosFindAtributo = {}
        const estadoOrigen = await db.sequelize.models.estados.findByPk(parametros.idEstadoOrigen);
        const estadoDestino = await db.sequelize.models.estados.findByPk(parametros.idEstadoDestino);

        parametrosFindAtributo.idPaisOrigen = estadoOrigen.id_pais
        parametrosFindAtributo.idPaisDestino = estadoDestino.id_pais
        parametrosFindAtributo.idBeneficiario = parametros.idBeneficiario
        if(isContenedor){
            parametrosFindAtributo.idTipoContenedor = parametros.idTipoContenedor
        } else{
            parametrosFindAtributo.idCommodity = parametros.idCommodity
        }
        parametrosFindAtributo.sumaAsegurada = sumaAsegurada
        parametrosFindAtributo.idOficinaProducto = parametros.idOficinaProducto
        const idatributoKeepro = await getAtributo(parametrosFindAtributo)
        const atributoKeepro = await db.sequelize.models.atributos_keepro.findByPk(idatributoKeepro.id);
        return atributoKeepro
    }
}

async function getTramoViaje(parametros,atributoKeepro){
    const proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
    if(proveedor.id_nacionalidad == parametros.idPaisOrigen && proveedor.id_nacionalidad == parametros.idPaisDestino){
        return 'Nacional'
    } else if(proveedor.id_nacionalidad == parametros.idPaisOrigen && proveedor.id_nacionalidad != parametros.idPaisDestino){
        return 'Exportación'
    } else if(proveedor.id_nacionalidad != parametros.idPaisOrigen && proveedor.id_nacionalidad == parametros.idPaisDestino){
        return 'Importación'
    } else {
        return 'Internacional'
    }

}

async function getTipoCambio(moneda){
    let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
    let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')

	let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
    if(doit !== true){
        return doit
    }
    const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
        where: {
            fecha: {
                [db.Sequelize.Op.like]: fechaBusqueda
            },
            deletedAt: null
        }
    });
    const tipoCambioSelected = registrosEncontrados[0]
    if(moneda.clave == "MXN"){
        return tipoCambioSelected.tipo_cambio
    } else if(moneda.clave == "USD"){
        return 1.0
    }
    return { status: false, msg: "La moneda seleccionada no es válida"}
}

async function getTipoCambioDoc(moneda){
    let fechaString = moment().tz('America/Mexico_City').format('YYYY-MM-DD')
    let fechaBusqueda = moment(fechaString).tz('America/Mexico_City')

	let doit = await buscarActualiarTipoCambioSRes(fechaBusqueda)
    if(doit !== true){
        return doit
    }
    const registrosEncontrados = await db.sequelize.models.tipos_cambio_futuro.findAll({
        where: {
            fecha: {
                [db.Sequelize.Op.like]: fechaBusqueda
            },
            deletedAt: null
        }
    });
    const tipoCambioSelected = registrosEncontrados[0]
    if(moneda.clave == "USD"){
        return tipoCambioSelected.tipo_cambio
    } else if(moneda.clave == "MXN"){
        return 1.0
    }
    return { status: false, msg: "La moneda seleccionada no es válida"}
}

async function getIva(parametros){
    const marca = await db.sequelize.models.marcas.findByPk(parametros.idMarca, {include: ['pais']});
    const paisDestino = await db.sequelize.models.paises.findByPk(parametros.idPaisDestino);
    const razonSocial = await db.sequelize.models.razones_sociales.findByPk(parametros.idRazonSocial);
    const isExtrajero = esRFCEExtranjero(razonSocial.no_identificacion)
    if(isExtrajero){
        return 0.0
    }

    const nombrePaisDestinoRedondo = await ManipuladorCadenas.quitarAcentos(paisDestino.descripcion.toLowerCase());
    const nombrePaisMarca = await ManipuladorCadenas.quitarAcentos(marca.pais.descripcion.toLowerCase());
    if(nombrePaisMarca == 'mexico' && nombrePaisDestinoRedondo == 'mexico'){
        return 16.0
    } else if(nombrePaisMarca == 'guatemala' && nombrePaisDestinoRedondo == 'guatemala'){
        return 12.0
    }
    return 0.0
}

async function atributoIsDeducibleFn(parametros,atributoKeepro,polizaDetalles,isContenedor){
    if(polizaDetalles.can_deducible === false){
        return false
    }
    if(parametros.isDeducible === true || parametros.deducible === true){
        if(isContenedor){
            return atributoKeepro.is_deducible
        }else{
            const commoditie = await db.sequelize.models.polizas_commoditys.findOne({
                where: {
                    [db.Sequelize.Op.and]: {
                        id_poliza_detalle: polizaDetalles.id,
                        id_commodity: parametros.idCommodity,
                        deletedAt: null
                    }
                }
            });
            if(commoditie == null){
                return false
            }
            return commoditie.is_sensible_robo !== true && atributoKeepro.is_deducible
        }
    }
    return false
}

async function getPolizaDetalles(parametros,atributoKeepro){
    var polizaDetalle = undefined
    var oficinaProducto = undefined
    try {
        oficinaProducto = await db.sequelize.models.oficinas_productos.findByPk(parametros.idOficinaProducto, {include: ['producto']});
        if(oficinaProducto === null){
            return { status: false, msg: `Registro con id: idOficinaProducto = ${parametros.idOficinaProducto} no encontrado`};
        }
        const proveedor = await db.sequelize.models.proveedores.findByPk(atributoKeepro.id_proveedor);
        if(proveedor === null){
            return { status: false, msg: `Registro con id: idProveedor = ${parametros.idProveedor} no encontrado`}
        }
        const wherePoliza = {where:{id_proveedor: proveedor.id,id_tipo_cobertura:oficinaProducto.producto.id_tipo_cobertura}};
        polizaDetalle =  await getPolizaDetalle(db.Sequelize.Op,db.sequelize.models.polizas,db.sequelize.models.poliza_detalles,wherePoliza);
        if(polizaDetalle === undefined){
            return { status: false, msg: "No existe poliza vigente"}
        } else if(polizaDetalle === null){
            return { status: false, msg: "No existe poliza detalle vigente"}
        }
        return polizaDetalle
    } catch (error) {
        return { status: false, msg: "No existe poliza vigente"}
    }
}

async function getTarifaClienteFinal(atributoKeepro,atributoIsDeducible){
    if(atributoIsDeducible){
        return atributoKeepro.tarifa_final_cliente_deducible ?? 0.0
    } else{
        return atributoKeepro.tarifa_final_cliente ?? 0.0
    }
}

async function getMinimoVenta(atributoKeepro,atributoIsDeducible){
    if(atributoIsDeducible){
        return atributoKeepro.minimo_venta_deducible ?? 0.0
    } else{
        return atributoKeepro.minimo_venta ?? 0.0
    }
}

async function getTarifaCompra(parametros,atributoKeepro,atributoIsDeducible,polizaDetalles,isContenedor,sumaAsegurada){

    if(atributoKeepro.tarifa_compra_forzosa){
        return atributoKeepro.tarifa_compra_especial ?? 0.0
    } else if(atributoIsDeducible){
        if(isContenedor){
            const polizasTiposContenedor = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle: polizaDetalles.id, id_tipo_contenedor: parametros.idTipoContenedor, suma_asegurada: sumaAsegurada}});
            if(polizasTiposContenedor.length == 0){
                const polizasTiposContenedorListAux = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle: polizaDetalles.id}});
                const tiposContenedor = []
                const tiposContenedorStr = []
                for (let index = 0; index < polizasTiposContenedorListAux.length; index++) {
                    const polizasTiposContenedorAux = await db.sequelize.models.polizas_tipo_contenedor.findByPk(polizasTiposContenedorListAux[index].id, {include: ['tipo_contenedor']});
                    if(!tiposContenedorStr.includes(polizasTiposContenedorAux.tipo_contenedor.descripcion)){
                        tiposContenedorStr.push(polizasTiposContenedorAux.tipo_contenedor.descripcion)
                        tiposContenedor.push({id:polizasTiposContenedorAux.tipo_contenedor.id, descripcion:polizasTiposContenedorAux.tipo_contenedor.descripcion, sumasAsegurada: [polizasTiposContenedorAux.suma_asegurada]})
                    }else{
                        const indexAux = tiposContenedorStr.indexOf(polizasTiposContenedorAux.tipo_contenedor.descripcion)
                        if(!tiposContenedor[indexAux].sumasAsegurada.includes(polizasTiposContenedorAux.suma_asegurada)){
                            tiposContenedor[indexAux].sumasAsegurada.push(polizasTiposContenedorAux.suma_asegurada)
                        }
                    }
                }
                return { status: false, msg: "No existen atributos con el tipo contenedor seleccionada", tiposContenedor: tiposContenedor};
            }
            const polizaTipoContenedor = await db.sequelize.models.polizas_tipo_contenedor.findByPk(polizasTiposContenedor[0].id);
            if(polizaTipoContenedor.is_precio_compra){
                return polizaTipoContenedor.precio_compra_deducible ?? 0.0
            }
        }
        return polizaDetalles.tarifa_compra_deducible ?? 0.0
    } else{
        if(isContenedor){
            const polizasTiposContenedor = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle: polizaDetalles.id, id_tipo_contenedor: parametros.idTipoContenedor, suma_asegurada: sumaAsegurada}});
            if(polizasTiposContenedor.length == 0){
                const polizasTiposContenedorListAux = await db.sequelize.models.polizas_tipo_contenedor.findAll({where:{id_poliza_detalle: polizaDetalles.id}});
                const tiposContenedor = []
                const tiposContenedorStr = []
                for (let index = 0; index < polizasTiposContenedorListAux.length; index++) {
                    const polizasTiposContenedorAux = await db.sequelize.models.polizas_tipo_contenedor.findByPk(polizasTiposContenedorListAux[index].id, {include: ['tipo_contenedor']});
                    if(!tiposContenedorStr.includes(polizasTiposContenedorAux.tipo_contenedor.descripcion)){
                        tiposContenedorStr.push(polizasTiposContenedorAux.tipo_contenedor.descripcion)
                        tiposContenedor.push({id:polizasTiposContenedorAux.tipo_contenedor.id, descripcion:polizasTiposContenedorAux.tipo_contenedor.descripcion, sumasAsegurada: [polizasTiposContenedorAux.suma_asegurada]})
                    }else{
                        const indexAux = tiposContenedorStr.indexOf(polizasTiposContenedorAux.tipo_contenedor.descripcion)
                        if(!tiposContenedor[indexAux].sumasAsegurada.includes(polizasTiposContenedorAux.suma_asegurada)){
                            tiposContenedor[indexAux].sumasAsegurada.push(polizasTiposContenedorAux.suma_asegurada)
                        }
                    }
                }
                return { status: false, msg: "No existen atributos con el tipo contenedor seleccionada", tiposContenedor: tiposContenedor};
            }
            const polizaTipoContenedor = await db.sequelize.models.polizas_tipo_contenedor.findByPk(polizasTiposContenedor[0].id);
            if(polizaTipoContenedor.is_precio_compra){
                return polizaTipoContenedor.precio_compra ?? 0.0
            }
        }
        return polizaDetalles.tarifa_compra ?? 0.0
    }
}

async function getMinimoCompra(atributoKeepro,atributoIsDeducible,polizaDetalles){
    if(atributoKeepro.tarifa_compra_forzosa){
        return atributoKeepro.minimo_compra_especial ?? 0.0
    } else if(atributoIsDeducible){
        return polizaDetalles.minimo_compra_deducible ?? 0.0
    } else{
        return polizaDetalles.minimo_compra ?? 0.0
    }
}

async function getTarifaMediadorMercantil(atributoKeepro,atributoIsDeducible){
    if(atributoIsDeducible){
        return atributoKeepro.tarifa_mediador_deducible ?? 0.0
    } else{
        return atributoKeepro.tarifa_mediador_mercantil ?? 0.0
    }
}

async function getMinimoSobreVentaMediador(atributoKeepro,atributoIsDeducible,tipoCambio){
    if(atributoIsDeducible){
        return atributoKeepro.minimo_mediador_mercantil_deducible * tipoCambio ?? 0.0
    } else{
        return atributoKeepro.minimo_mediador_mercantil * tipoCambio ?? 0.0
    }
}

async function getSobreVenta(tarifaMediadorMercantil,tarifaClienteFinal,sumaAsegurada,subTotal,isMinimo,minimoMediadorMercantil){
    if(tarifaMediadorMercantil == 0 && !isMinimo){
        return 0;
    } else if(tarifaMediadorMercantil > tarifaClienteFinal){
        return 0;
    } else{
        if(!isMinimo){
            const a = subTotal;
            const b = (tarifaMediadorMercantil * sumaAsegurada)/100;
            const c = a - b;
            return c;
        }else{
            const a = subTotal;
            const b = minimoMediadorMercantil
            if(b == 0.0){
                return 0.0;
            }
            if(b > a){
                return 0.0;
            }
            const c = a - b;
            return c;
        }
    }
}

async function getComisioniastas(oficinaProducto){
    const marcaAgenteOficina = oficinaProducto.marca_agente_oficina
    var totalComisionistas = 0
    if(marcaAgenteOficina.id_agente_venta_1 !== null){
        totalComisionistas = totalComisionistas + 1
    }
    if(marcaAgenteOficina.id_agente_venta_2 !== null){
        totalComisionistas = totalComisionistas + 1
    }
    return totalComisionistas
}

async function getComisionComisioniastas(subTotal,sobreVenta,tarifaProveedor,totalComisionistas){
    const comisionComisionistas = [];
    for (let i =0; i < totalComisionistas ; i++) {
        let comision = (subTotal - sobreVenta - tarifaProveedor) * ((0/totalComisionistas) / 100);
        comisionComisionistas.push(comision)
    }
    return comisionComisionistas;
}

async function getProfit(subTotal,sobreVenta,tarifaProveedor){
    return subTotal - sobreVenta - tarifaProveedor;
}

async function getAtributosContenedor(parametros){
		var whereFind = {
			where: {
                id_oficina_producto: parametros.idOficinaProducto ,
                id_tipo_contenedor: parametros.idTipoContenedor,
				num_movimientos: {
					[db.Sequelize.Op.or]: {
						[db.Sequelize.Op.ne]: 0,
						[db.Sequelize.Op.is]: null 
					} 
				},
				fecha_vencimiento: {
				  [db.Sequelize.Op.or]: {
					[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
					[db.Sequelize.Op.is]: null 
				  }
				},
				deletedAt: null
			}
		}
		return await db.sequelize.models.atributos_keepro.findAll(whereFind);
}

async function getAtributoRC(parametros){
		var whereFind = {
			where: {
                id_oficina_producto: parametros.idOficinaProducto ,
				num_movimientos: {
					[db.Sequelize.Op.or]: {
						[db.Sequelize.Op.ne]: 0,
						[db.Sequelize.Op.is]: null 
					} 
				},
				fecha_vencimiento: {
				  [db.Sequelize.Op.or]: {
					[db.Sequelize.Op.gte]: moment().tz('America/Mexico_City'),
					[db.Sequelize.Op.is]: null 
				  }
				},
				deletedAt: null
			}
		}
		return await db.sequelize.models.atributos_keepro.findAll(whereFind);
}

async function round(numero,decimas) {
    numero = parseFloat(numero)
    return Number(numero.toFixed(decimas));
}



module.exports = {
	getTotales,
    getTotalesLocal,
    getTipoCambio
}
