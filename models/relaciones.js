module.exports = function(models) {
  models.proveedores.belongsTo(models.almacenes, { as: "almacen", foreignKey: "id_almacen"});
  models.proveedores.belongsTo(models.domicilios, { as: "domicilio", foreignKey: "id_domicilio"});
  models.proveedores.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.certificados_documentos_operaciones.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.certificados_documentos_operaciones.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.almacenes.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_almacen"});
  models.ubicaciones.belongsTo(models.almacenes, { as: "almacen", foreignKey: "id_almacen"});
  models.almacenes.hasMany(models.ubicaciones, { as: "ubicaciones", foreignKey: "id_almacen"});
  models.detalle_certificados.belongsTo(models.atributos_keepro, { as: "atributo", foreignKey: "id_atributo_keepro"});
  models.certificados.belongsTo(models.tamanios_contenedor, { as: "tamanio_contenedor", foreignKey: "id_tamanio_contenedor"});
  /* models.atributos_keepro.hasMany(models.detalle_certificados, { as: "detalle_certificados", foreignKey: "id_atributo_keepro"}); */
  models.atributos_keepro.belongsTo(models.beneficiarios, { as: "beneficiario", foreignKey: "id_beneficiario"});
  /* models.beneficiarios.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_beneficiario"}); */
  models.certificados.belongsTo(models.beneficiarios, { as: "beneficiario", foreignKey: "id_beneficiario"});
  /* models.beneficiarios.hasMany(models.certificados, { as: "certificados", foreignKey: "id_beneficiario"}); */
  models.clientes_beneficiarios.belongsTo(models.beneficiarios, { as: "beneficiario", foreignKey: "id_beneficiario"});
  /* models.beneficiarios.hasMany(models.clientes_beneficiarios, { as: "clientes_beneficiarios", foreignKey: "id_beneficiario"}); */
  models.config_smtp.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario"});
/* models.usuarios.hasMany(models.config_smtp, { as: "config_smtp", foreignKey: "id_config_smtp"}); */
  models.certificados.belongsTo(models.buques, { as: "buque", foreignKey: "id_buque"});
  /* models.buques.hasMany(models.certificados, { as: "certificados", foreignKey: "id_buque"}); */
  models.cliente_detalles.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.config_smtp_marcas.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.config_smtp_marcas, { as: "config_smtp_marcas", foreignKey: "id_config_smtp_marcas"}); */
  /* models.carga_archivos.hasMany(models.cliente_detalles, { as: "cliente_detalles", foreignKey: "id_carga_archivo"}); */
  models.marcas.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.marcas.belongsTo(models.datos_facturacion, { as: "dato_facturacion", foreignKey: "id_dato_facturacion"});
  /* models.carga_archivos.hasMany(models.marcas, { as: "marcas", foreignKey: "id_carga_archivo"}); */
  models.productos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  /* models.carga_archivos.hasMany(models.productos, { as: "productos", foreignKey: "id_carga_archivo"}); */
  models.usuarios.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  /* models.carga_archivos.hasMany(models.usuarios, { as: "usuarios", foreignKey: "id_carga_archivo"}); */
  models.certificados_rc.belongsTo(models.certificados, { as: "certificado", foreignKey: "id_certificado"});
  /* models.certificados.hasMany(models.certificados_rc, { as: "certificados_rcs", foreignKey: "id_certificado"}); */
  models.certificados_rc.belongsTo(models.certificados, { as: "certificado_rc", foreignKey: "id_certificado_rc"});
  /* models.certificados.hasMany(models.certificados_rc, { as: "id_certificado_rc_certificados_rcs", foreignKey: "id_certificado_rc"}); */
  models.detalle_certificados.belongsTo(models.certificados, { as: "certificado", foreignKey: "id_certificado"});
  models.certificados.hasMany(models.detalle_certificados, { as: "detalle_certificado", foreignKey: "id_certificado"});
  models.certificados.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  /* models.clientes.hasMany(models.certificados, { as: "certificados", foreignKey: "id_cliente"}); */
  models.clientes.belongsTo(models.categorias_cliente, { as: "categoria_cliente", foreignKey: "id_categoria_cliente"});
  //models.categorias_cliente.hasMany(models.clientes, { as: "clientes", foreignKey: "id_categoria_cliente"});
  models.clientes.belongsTo(models.cliente_detalles, { as: "detalles_cliente", foreignKey: "id_detalle_cliente"});
  models.cliente_detalles.hasMany(models.clientes, { as: "cliente", foreignKey: "id_detalle_cliente"});
  models.clientes_beneficiarios.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes.hasMany(models.clientes_beneficiarios, { as: "clientes_beneficiarios", foreignKey: "id_cliente"});
  models.clientes_razones_sociales.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes.hasMany(models.clientes_razones_sociales, { as: "clientes_razones_sociales", foreignKey: "id_cliente"});
  models.marca_agentes_clientes.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes.hasMany(models.marca_agentes_clientes, { as: "marcas_agentes_clientes", foreignKey: "id_cliente"});
  models.oficinas_cliente.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes.hasMany(models.oficinas_cliente, { as: "oficinas_cliente", foreignKey: "id_cliente"});
  models.oportunidades.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes.hasMany(models.oportunidades, { as: "oportunidades", foreignKey: "id_cliente"});
  models.usuarios.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  /* models.clientes.hasMany(models.usuarios, { as: "usuarios", foreignKey: "id_cliente"}); */
  models.cliente_detalles.belongsTo(models.comisionistas, { as: "comisionista", foreignKey: "id_comisionista"});
  models.comisionistas.hasMany(models.cliente_detalles, { as: "cliente_detalles", foreignKey: "id_comisionista"});
  models.commoditys.belongsTo(models.commodity_categorias, { as: "categoria", foreignKey: "id_commodity_categoria"});
  /* models.commodity_categorias.hasMany(models.commoditys, { as: "commodities", foreignKey: "id_commodity_categoria"}); */
  models.atributos_keepro.belongsTo(models.commoditys, { as: "commoditie", foreignKey: "id_commodity"});
  /* models.commoditys.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_commodity"}); */
  models.atributos_keepro.belongsTo(models.tipo_contenedor, { as: "tipo_contenedor", foreignKey: "id_tipo_contenedor"});
  /* models.tipo_contenedor.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_commodity"}); */
  models.certificados.belongsTo(models.tipo_contenedor, { as: "tipo_contenedor", foreignKey: "id_tipo_contenedor"});
  /* models.tipo_contenedor.hasMany(models.certificados, { as: "certificados", foreignKey: "id_commodity"}); */
  models.certificados.belongsTo(models.commoditys, { as: "commoditie", foreignKey: "id_commodity"});
  /* models.commoditys.hasMany(models.certificados, { as: "certificados", foreignKey: "id_commodity"}); */
  models.polizas_commoditys.belongsTo(models.commoditys, { as: "commoditie", foreignKey: "id_commodity"});
  /* models.commoditys.hasMany(models.polizas_commoditys, { as: "polizas_commodities", foreignKey: "id_commodity"}); */
  models.proveedores.belongsTo(models.conceptos_presupuesto, { as: "conceptos_presupuesto", foreignKey: "id_conceptos_presupuesto"});
  /* models.conceptos_presupuesto.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_conceptos_presupuesto"}); */
  models.paises.belongsTo(models.continentes, { as: "continente", foreignKey: "id_continente"});
  models.continentes.hasMany(models.paises, { as: "paises", foreignKey: "id_continente"});
  models.beneficiarios.belongsTo(models.domicilios, { as: "domicilio", foreignKey: "id_domicilio"});
  /* models.domicilios.hasMany(models.beneficiarios, { as: "beneficiarios", foreignKey: "id_domicilio"}); */
  models.marcas.belongsTo(models.domicilios, { as: "domicilio", foreignKey: "id_domicilio"});
  /* models.domicilios.hasMany(models.marcas, { as: "marcas", foreignKey: "id_domicilio"}); */
  models.razones_sociales_domicilios.belongsTo(models.domicilios, { as: "domicilio", foreignKey: "id_domicilio"});
  /* models.domicilios.hasMany(models.razones_sociales_domicilios, { as: "razones_sociales_domicilios", foreignKey: "domicilios_id"}); */
  models.certificados.belongsTo(models.estados, { as: "estado_origen", foreignKey: "id_estado_origen"});
  /* models.estados.hasMany(models.certificados, { as: "certificados", foreignKey: "id_estado_origen"}); */
  models.certificados.belongsTo(models.estados, { as: "estado_destino", foreignKey: "id_estado_destino"});
  /* models.estados.hasMany(models.certificados, { as: "id_estado_destino_certificados", foreignKey: "id_estado_destino"}); */
  models.certificados.belongsTo(models.estados, { as: "estado_destino_redondo", foreignKey: "id_estado_destino_redondo"});
  /* models.estados.hasMany(models.certificados, { as: "id_estado_destino_redondo_certificados", foreignKey: "id_estado_destino_redondo"}); */
  models.clientes.belongsTo(models.estados, { as: "estado", foreignKey: "id_estado"});
  /* models.estados.hasMany(models.clientes, { as: "clientes", foreignKey: "id_estado"}); */
  models.domicilios.belongsTo(models.estados, { as: "estado", foreignKey: "id_estado"});
  /* models.estados.hasMany(models.domicilios, { as: "domicilios", foreignKey: "id_estado"}); */
  models.razones_sociales.belongsTo(models.formas_pago, { as: "forma_pago", foreignKey: "id_forma_pago"});
  /* models.formas_pago.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_forma_pago"}); */
  models.oficinas_productos.belongsTo(models.marca_agentes_oficinas, { as: "marca_agente_oficina", foreignKey: "id_marca_agente_oficina"});
  models.marca_agentes_oficinas.hasMany(models.oficinas_productos, { as: "oficinas_productos", foreignKey: "id_marca_agente_oficina"});
  models.almacenes.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.marcas.hasMany(models.almacenes, { as: "almacenes", foreignKey: "id_marca"});
  models.certificados.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.certificados, { as: "certificados", foreignKey: "id_marca"}); */
  models.marca_agentes_clientes.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.marca_agentes_clientes, { as: "marca_agentes_clientes", foreignKey: "id_marca"}); */
  models.marca_agentes_oficinas.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.marca_agentes_oficinas, { as: "marca_agentes_oficinas", foreignKey: "id_marca"}); */
  models.marcas_monedas.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.marcas_monedas, { as: "marcas_monedas", foreignKey: "id_marca"}); */
  models.oportunidades.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.oportunidades, { as: "oportunidades", foreignKey: "id_marca"}); */
  models.productos.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.marcas.hasMany(models.productos, { as: "productos", foreignKey: "id_marca"});
  models.proveedores.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_marca"}); */
  models.razones_sociales.belongsTo(models.marcas, { as: "marca_preferente", foreignKey: "id_marca_preferente"});
  /* models.marcas.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_marca_preferente"}); */
  models.usuarios.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  /* models.marcas.hasMany(models.usuarios, { as: "usuarios", foreignKey: "id_marca"}); */
  models.razones_sociales.belongsTo(models.metodos_pago, { as: "metodo_pago", foreignKey: "id_metodo_pago"});
  /* models.metodos_pago.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_metodo_pago"}); */
  models.certificados.belongsTo(models.modalidades, { as: "modalidad_transporte", foreignKey: "id_modalidad"});
  /* models.modalidades.hasMany(models.certificados, { as: "certificados", foreignKey: "id_modalidad"}); */
  models.modalidades_ubicaciones.belongsTo(models.modalidades, { as: "modalidad_transporte", foreignKey: "id_modalidad"});
  /* models.modalidades.hasMany(models.modalidades_ubicaciones, { as: "modalidades_ubicaciones", foreignKey: "id_modalidad"}); */
  models.polizas_modalidades.belongsTo(models.modalidades, { as: "modalidad_transporte", foreignKey: "id_modalidad"});
  /* models.modalidades.hasMany(models.polizas_modalidades, { as: "polizas_modalidades", foreignKey: "id_modalidad"}); */
  models.atributos_keepro.belongsTo(models.monedas, { as: "moneda_compra", foreignKey: "id_moneda_compra"});
  /* models.monedas.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_moneda_compra"}); */
  models.atributos_keepro.belongsTo(models.monedas, { as: "moneda_venta", foreignKey: "id_moneda_venta"});
  /* models.monedas.hasMany(models.atributos_keepro, { as: "id_moneda_venta_atributos_keepros", foreignKey: "id_moneda_venta"}); */
  models.certificados.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  /* models.monedas.hasMany(models.certificados, { as: "certificados", foreignKey: "id_moneda"}); */
  models.marcas_monedas.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  /* models.monedas.hasMany(models.marcas_monedas, { as: "marcas_monedas", foreignKey: "id_moneda"}); */
  models.productos.belongsTo(models.monedas, { as: "moneda_compra", foreignKey: "id_moneda_compra"});
  /* models.monedas.hasMany(models.productos, { as: "productos", foreignKey: "id_moneda_compra"}); */
  models.productos.belongsTo(models.monedas, { as: "moneda_venta", foreignKey: "id_moneda_venta"});
  models.productos.hasMany(models.oficinas_productos, { as: "oficinas_productos", foreignKey: "id_producto"});
  /* models.monedas.hasMany(models.productos, { as: "id_moneda_venta_productos", foreignKey: "id_moneda_venta"}); */
  models.proveedores.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  /* models.monedas.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_moneda"}); */
  models.proveedores_monedas.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  /* models.monedas.hasMany(models.proveedores_monedas, { as: "proveedores_monedas", foreignKey: "id_moneda"}); */
  models.razones_sociales.belongsTo(models.monedas, { as: "moneda_credito", foreignKey: "id_moneda_credito"});
  /* models.monedas.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_moneda_credito"}); */
  models.clientes.belongsTo(models.oficinas, { as: "oficina_interno", foreignKey: "id_oficina_interno"});
  /* models.oficinas.hasMany(models.clientes, { as: "clientes", foreignKey: "id_oficina_interno"}); */
  // models.clientes.hasMany(models.oficinas, { as: "oficinas_interno", foreignKey: "id_oficina_interno"});
  models.clientes.hasMany(models.oficinas_cliente, { as: "oficinas_clientes", foreignKey: "id_cliente"});


  models.marca_agentes_oficinas.belongsTo(models.oficinas_cliente, { as: "oficina_cliente", foreignKey: "id_oficina_cliente"});
  models.oficinas_cliente.hasMany(models.marca_agentes_oficinas, { as: "marca_agentes", foreignKey: "id_oficina_cliente"});


  models.oficinas_cliente.belongsTo(models.oficinas, { as: "oficina", foreignKey: "id_oficina"});
  models.oficinas.hasMany(models.oficinas_cliente, { as: "oficina_clientes_oficinas", foreignKey: "id_oficina"});
  models.oficinas_razones_sociales.belongsTo(models.oficinas, { as: "oficina", foreignKey: "id_oficina"});
  models.oficinas.hasMany(models.oficinas_razones_sociales, { as: "razones_sociales", foreignKey: "id_oficina"});
  models.usuarios.belongsTo(models.oficinas, { as: "oficina", foreignKey: "id_oficina"});
  /* models.oficinas.hasMany(models.usuarios, { as: "usuarios", foreignKey: "id_oficina"}); */
  models.atributos_keepro.belongsTo(models.oficinas_productos, { as: "oficina_producto", foreignKey: "id_oficina_producto"});
  models.oficinas_productos.hasMany(models.atributos_keepro, { as: "atributos", foreignKey: "id_oficina_producto"});
  models.certificados.belongsTo(models.oficinas_razones_sociales, { as: "oficina_razon_social", foreignKey: "id_oficina_razon_social"});
  /* models.oficinas_razones_sociales.hasMany(models.certificados, { as: "certificados", foreignKey: "id_oficina_razon_social"}); */
  models.atributos_keepro.belongsTo(models.paises, { as: "pais_origen", foreignKey: "id_pais_origen"});
  /* models.paises.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_pais_origen"}); */
  models.atributos_keepro.belongsTo(models.paises, { as: "pais_destino", foreignKey: "id_pais_destino"});
  /* models.paises.hasMany(models.atributos_keepro, { as: "id_pais_destino_atributos_keepros", foreignKey: "id_pais_destino"}); */
  models.proveedores.belongsTo(models.paises, { as: "nacionalidad", foreignKey: "id_nacionalidad"});
  /* models.paises.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_nacionalidad"}); */
  models.beneficiarios.belongsTo(models.paises, { as: "nacionalidad", foreignKey: "id_nacionalidad"});
  models.beneficiarios.belongsTo(models.paises, { as: "pais_sat", foreignKey: "id_pais_sat"});
  /* models.paises.hasMany(models.beneficiarios, { as: "beneficiarios", foreignKey: "id_nacionalidad"}); */
  models.productos.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  models.productos.belongsTo(models.productos_unidades_medida, { as: "producto_unidad_medida", foreignKey: "id_productos_unidades_medida"});
  models.estados.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  models.paises.hasMany(models.estados, { as: "estados", foreignKey: "id_pais"});
  models.marcas.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  /* models.paises.hasMany(models.marcas, { as: "marcas", foreignKey: "id_pais"}); */
  models.poliza_territorialidad.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  /* models.paises.hasMany(models.poliza_territorialidad, { as: "poliza_territorialidads", foreignKey: "id_pais"}); */
  models.polizas_nacionalidades_interes_asegurado.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  /* models.paises.hasMany(models.polizas_nacionalidades_interes_asegurado, { as: "polizas_nacionalidades_interes_asegurados", foreignKey: "id_pais"}); */
  models.polizas_paises.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  /* models.paises.hasMany(models.polizas_paises, { as: "polizas_paises", foreignKey: "id_pais"}); */
  models.puertos_aeropuertos.belongsTo(models.paises, { as: "nacionalidad", foreignKey: "id_nacionalidad"});
  /* models.paises.hasMany(models.puertos_aeropuertos, { as: "puertos_aeropuertos", foreignKey: "id_nacionalidad"}); */
  models.razones_sociales.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  models.razones_sociales.belongsTo(models.paises, { as: "nacionalidad_timbrado", foreignKey: "id_nacionalidad_timbrado"});
  /* models.paises.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_pais"}); */
  models.certificados.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_detalle_poliza"});
  /* models.poliza_detalles.hasMany(models.certificados, { as: "certificados", foreignKey: "id_detalle_poliza"}); */
  models.poliza_territorialidad.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.poliza_detalles.hasMany(models.poliza_territorialidad, { as: "poliza_territorialidades", foreignKey: "id_poliza_detalle"});
  models.polizas_commoditys.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.poliza_detalles.hasMany(models.polizas_commoditys, { as: "polizas_commodities", foreignKey: "id_poliza_detalle"});
  models.polizas_nacionalidades_interes_asegurado.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.poliza_detalles.hasMany(models.polizas_nacionalidades_interes_asegurado, { as: "polizas_nacionalidades_interes_asegurados", foreignKey: "id_poliza_detalle"});
  models.polizas_paises.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.poliza_detalles.hasMany(models.polizas_paises, { as: "polizas_paises", foreignKey: "id_poliza_detalle"});
  models.certificados.belongsTo(models.polizas, { as: "poliza", foreignKey: "id_poliza"});
  /* models.polizas.hasMany(models.certificados, { as: "certificados", foreignKey: "id_poliza"}); */
  models.poliza_detalles.belongsTo(models.polizas, { as: "poliza", foreignKey: "id_poliza"});
  models.polizas.hasMany(models.poliza_detalles, { as: "polizas_detalles", foreignKey: "id_poliza"});


  models.polizas_modalidades.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  //models.poliza_detalles.hasMany(models.polizas_modalidades, { as: "polizas_modalidades", foreignKey: "id_poliza_detalle"});

  models.polizas_tipo_contenedor.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.polizas_tipo_contenedor.belongsTo(models.tipo_contenedor, { as: "tipo_contenedor", foreignKey: "id_tipo_contenedor"});


  models.oficinas_productos.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  /* models.productos.hasMany(models.oficinas_productos, { as: "oficinas_productos", foreignKey: "id_producto"}); */
  models.oportunidades.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  /* models.productos.hasMany(models.oportunidades, { as: "oportunidades", foreignKey: "id_producto"}); */
  models.proveedores.belongsTo(models.proveedor_tipos, { as: "proveedor_tipo", foreignKey: "id_proveedor_tipo"});
  /* models.proveedor_tipos.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_proveedor_tipo"}); */
  models.atributos_keepro.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  /* models.proveedores.hasMany(models.atributos_keepro, { as: "atributos_keepros", foreignKey: "id_proveedor"}); */
  models.certificados.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  /* models.proveedores.hasMany(models.certificados, { as: "certificados", foreignKey: "id_proveedor"}); */
  models.comisionistas.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  /* models.proveedores.hasMany(models.comisionistas, { as: "comisionista", foreignKey: "id_proveedor"}); */
  models.polizas.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  /* models.proveedores.hasMany(models.polizas, { as: "polizas", foreignKey: "id_proveedor"}); */
  models.proveedores_monedas.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.proveedores.hasMany(models.proveedores_monedas, { as: "proveedores_monedas", foreignKey: "id_proveedor"});
  models.usuarios.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  /* models.proveedores.hasMany(models.usuarios, { as: "usuarios", foreignKey: "id_proveedor"}); */
  models.certificados.belongsTo(models.puertos_aeropuertos, { as: "puerto_aeropuerto_origen", foreignKey: "id_puerto_aeropuerto_origen"});
  /* models.puertos_aeropuertos.hasMany(models.certificados, { as: "certificados", foreignKey: "id_puerto_aeropuerto_origen"}); */
  models.certificados.belongsTo(models.puertos_aeropuertos, { as: "puerto_aeropuerto_destino", foreignKey: "id_puerto_aeropuerto_destino"});
  /* models.puertos_aeropuertos.hasMany(models.certificados, { as: "id_puerto_aeropuerto_destino_certificados", foreignKey: "id_puerto_aeropuerto_destino"}); */
  models.razones_sociales.belongsTo(models.razones_bloqueo, { as: "razon_bloqueo", foreignKey: "id_razon_bloqueo"});
  /* models.razones_bloqueo.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_razon_bloqueo"}); */
  models.clientes_razones_sociales.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.razones_sociales_documentos_generales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.razones_sociales.hasMany(models.clientes_razones_sociales, { as: "clientes_razones_sociales", foreignKey: "id_razon_social"});
  models.razones_sociales_archivos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.razones_sociales_archivos.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.razones_sociales_archivos.belongsTo(models.razones_sociales_documentos_generales, { as: "documento_razon_social", foreignKey: "id_documento_razon_social"});
  models.razones_sociales_archivos.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});

  models.oficinas_razones_sociales.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.razones_sociales.hasMany(models.oficinas_razones_sociales, { as: "oficinas_razones_sociales", foreignKey: "id_razon_social"}); 
  models.razones_sociales_domicilios.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.razones_sociales.hasMany(models.razones_sociales_domicilios, { as: "razones_sociales_domicilios", foreignKey: "id_razon_social"});
  models.razones_sociales.belongsTo(models.regimenes_fiscal, { as: "regimen_fiscal", foreignKey: "id_regimen_fiscal"});
  /* models.regimenes_fiscal.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_regimen_fiscal"}); */
  models.tamanios_contenedor.belongsTo(models.tipo_contenedor, { as: "tipo_contenedor", foreignKey: "id_tipo_contenedor"});
  models.tipo_contenedor.hasMany(models.tamanios_contenedor, { as: "tamanios_contenedor", foreignKey: "id_tipo_contenedor"});
  models.certificados.belongsTo(models.tipos_bienes, { as: "tipo_bien", foreignKey: "id_tipo_bienes"});
  /* models.tipos_bienes.hasMany(models.certificados, { as: "certificados", foreignKey: "id_tipo_bienes"}); */
  models.buques.belongsTo(models.tipos_buque, { as: "tipo_buque", foreignKey: "id_tipo_buque"});
  /* models.tipos_buque.hasMany(models.buques, { as: "buques", foreignKey: "id_tipo_buque"}); */
  models.certificados.belongsTo(models.tipos_cambio_futuro, { as: "tipo_cambio_futuro", foreignKey: "id_tipo_cambio_futuro"});
  /* models.tipos_cambio_futuro.hasMany(models.certificados, { as: "certificados", foreignKey: "id_tipo_cambio_futuro"}); */
  models.clientes.belongsTo(models.tipos_cliente, { as: "tipo_cliente", foreignKey: "id_tipo_cliente"});
  /* models.tipos_cliente.hasMany(models.clientes, { as: "clientes", foreignKey: "id_tipo_cliente"}); */
  models.productos.belongsTo(models.tipos_cobertura, { as: "tipo_cobertura", foreignKey: "id_tipo_cobertura"});
  models.polizas.belongsTo(models.tipos_cobertura, { as: "tipo_cobertura", foreignKey: "id_tipo_cobertura"});
  /* models.tipos_cobertura.hasMany(models.polizas, { as: "polizas", foreignKey: "id_tipo_cobertura"}); */
  models.poliza_detalles.belongsTo(models.tpls, { as: "tpl", foreignKey: "id_tpl"});
  models.tpls.hasMany(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_tpl"});
  models.almacenes.belongsTo(models.ubicaciones, { as: "ubicacion_defecto", foreignKey: "id_ubicacion_defecto"});
  /* models.ubicaciones.hasMany(models.almacenes, { as: "almacenes", foreignKey: "id_ubicacion_defecto"}); */
  models.certificados.belongsTo(models.ubicaciones_bienes, { as: "ubicacion_bienes", foreignKey: "id_ubicaciones_bienes"});
  /* models.ubicaciones_bienes.hasMany(models.certificados, { as: "certificados", foreignKey: "id_ubicaciones_bienes"}); */
  models.modalidades_ubicaciones.belongsTo(models.ubicaciones_bienes, { as: "ubicacion_bienes", foreignKey: "id_ubicacion_bienes"});
  models.ubicaciones_bienes.hasMany(models.modalidades_ubicaciones, { as: "modalidades_ubicaciones", foreignKey: "id_ubicacion_bienes"});
  models.razones_sociales.belongsTo(models.usos_cfdi, { as: "uso_cfdi", foreignKey: "id_uso_cfdi"});
  /* models.usos_cfdi.hasMany(models.razones_sociales, { as: "razones_sociales", foreignKey: "id_uso_cfdi"}); */
  models.tipos_cliente.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.marcas_usuarios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tipos_cliente, { as: "tipos_cliente_registrados", foreignKey: "id_usuario_registro"});
  models.beneficiarios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.beneficiarios, { as: "beneficiarios_registrados", foreignKey: "id_usuario_registro"});
  models.almacenes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.almacenes, { as: "almacenes_registrados", foreignKey: "id_usuario_registro"});
  models.atributos_keepro.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.atributos_keepro, { as: "atributos_registrados", foreignKey: "id_usuario_registro"});
  models.buques.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.buques, { as: "buques_registrados", foreignKey: "id_usuario_registro"});
  models.carga_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.carga_archivos, { as: "carga_archivos_registrados", foreignKey: "id_usuario_registro"});
  models.certificados.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.certificados, { as: "certificados_registrados", foreignKey: "id_usuario_registro"});
  models.certificados_rc.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.certificados_rc, { as: "certificados_rc_registrados", foreignKey: "id_usuario_registro"});
  models.cliente_detalles.belongsTo(models.comisionistas, { as: "mediador_mercantil", foreignKey: "id_mediador_mercantil"});
  models.cliente_detalles.belongsTo(models.usuarios, { as: "agente_credito_cobranza", foreignKey: "id_agente_credito_cobranza"});
  models.usuarios.hasMany(models.cliente_detalles, { as: "clientes_agente_cyc", foreignKey: "id_agente_credito_cobranza"});

  models.cliente_detalles.belongsTo(models.usuarios, { as: "agente_customer", foreignKey: "id_agente_customer"});
  models.usuarios.hasMany(models.cliente_detalles, { as: "clientes_agente_customer", foreignKey: "id_agente_customer"});
  models.cliente_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.cliente_detalles, { as: "cliente_detalles_registrados", foreignKey: "id_usuario_registro"});
  models.clientes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.clientes, { as: "clientes_registrados", foreignKey: "id_usuario_registro"});
  models.clientes_beneficiarios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.clientes_beneficiarios, { as: "clientes_beneficiarios_registrados", foreignKey: "id_usuario_registro"});
  models.clientes_razones_sociales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.clientes_razones_sociales, { as: "clientes_razones_sociales_registrados", foreignKey: "id_usuario_registro"});
  models.comisionistas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.comisionistas, { as: "comisionista_registrados", foreignKey: "id_usuario_registro"});
  models.commodity_categorias.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.commodity_categorias, { as: "commodity_categoria_registrados", foreignKey: "id_usuario_registro"});
  models.commoditys.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.commoditys, { as: "commodities_registrados", foreignKey: "id_usuario_registro"});
  models.conceptos_presupuesto.belongsTo(models.conceptos_presupuesto, { as: "partida_padre", foreignKey: "id_partida_padre"});
  models.conceptos_presupuesto.hasMany(models.conceptos_presupuesto, { as: "patidas_hijos", foreignKey: "id_partida_padre"});
  models.conceptos_presupuesto.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.conceptos_presupuesto, { as: "conceptos_presupuestos_registrados", foreignKey: "id_usuario_registro"});
  models.continentes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.continentes, { as: "continentes_registrados", foreignKey: "id_usuario_registro"});
  models.detalle_certificados.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.detalle_certificados, { as: "detalle_certificados_registrados", foreignKey: "id_usuario_registro"});
  models.domicilios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.domicilios, { as: "domicilios_registrados", foreignKey: "id_usuario_registro"});
  models.estados.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.estados, { as: "estados_registrados", foreignKey: "id_usuario_registro"});
  models.formas_pago.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.formas_pago, { as: "formas_pagos_registrados", foreignKey: "id_usuario_registro"});
  models.historicos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  /* models.usuarios.hasMany(models.historicos, { as: "historicos_registrados", foreignKey: "id_usuario_registro"}); */
  models.marca_agentes_clientes.belongsTo(models.usuarios, { as: "agente_operativo", foreignKey: "id_agente_operativo"});
  models.usuarios.hasMany(models.marca_agentes_clientes, { as: "clientes_mac", foreignKey: "id_agente_operativo"});
  models.marca_agentes_clientes.belongsTo(models.usuarios, { as: "agente_venta_1", foreignKey: "id_agente_venta_1"});
  /* models.usuarios.hasMany(models.marca_agentes_clientes, { as: "marca_agentes_venta_1_registrados", foreignKey: "id_agente_venta_1"}); */
  models.marca_agentes_clientes.belongsTo(models.usuarios, { as: "agente_venta_2", foreignKey: "id_agente_venta_2"});
  /* models.usuarios.hasMany(models.marca_agentes_clientes, { as: "agentes_venta_2_registrados", foreignKey: "id_agente_venta_2"}); */
  models.marca_agentes_clientes.belongsTo(models.usuarios, { as: "inside_sales", foreignKey: "id_inside_sales"});
  /* models.usuarios.hasMany(models.marca_agentes_clientes, { as: "id_inside_sales_marca_agentes_clientes", foreignKey: "id_inside_sales"}); */
  models.roles_usuarios.belongsTo(models.usuarios, { as: 'usuario', foreignKey: 'id_usuario' });
  models.roles_usuarios.belongsTo(models.usuarios, { as: 'usuario_registro', foreignKey: 'id_usuario_registro' });
  models.usuarios.hasMany(models.roles_usuarios, { as: "roles", foreignKey: "id_usuario"});
  models.usuarios.belongsToMany(models.roles, {
    through: models.roles_usuarios,
    foreignKey: 'id_usuario',
    otherKey: 'id_role',
    as: 'listRoles'
  });
  models.roles.belongsToMany(models.usuarios, {
      through: models.roles_usuarios,
      foreignKey: 'id_role', 
      otherKey: 'id_usuario',
      as: 'usuarios'
  });
  models.roles.hasMany(models.permisos_roles, { as: "permisos", foreignKey: "id_role"});
  models.roles_usuarios.belongsTo(models.roles, { as: 'rol', foreignKey: 'id_role' });
  models.permisos_roles.belongsTo(models.roles, { as: 'rol', foreignKey: 'id_role' });
  models.permisos_roles.belongsTo(models.permisos, { as: 'permiso', foreignKey: 'id_permiso' });
  models.permisos_roles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  models.mantenimiento_keepro.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.marca_agentes_clientes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.marca_agentes_clientes, { as: "marca_agentes_clientes_registrados", foreignKey: "id_usuario_registro"});
  models.marca_agentes_oficinas.belongsTo(models.usuarios, { as: "agente_venta_1", foreignKey: "id_agente_venta_1"});
  models.marca_agentes_oficinas.belongsTo(models.usuarios, { as: "agente_venta_2", foreignKey: "id_agente_venta_2"});
  models.marca_agentes_oficinas.belongsTo(models.usuarios, { as: "inside_sales", foreignKey: "id_inside_sales"});
  models.marca_agentes_oficinas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.marca_agentes_oficinas, { as: "marca_agentes_oficinas_registrados", foreignKey: "id_usuario_registro"});
  models.marcas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.marcas, { as: "marcas_registrados", foreignKey: "id_usuario_registro"});
  models.marcas_monedas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.marcas_monedas, { as: "marcas_monedas_registrados", foreignKey: "id_usuario_registro"});
  models.metodos_pago.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.metodos_pago, { as: "metodos_pagos_registrados", foreignKey: "id_usuario_registro"});
  models.modalidades.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.modalidades, { as: "modalidades_transporte_registrados", foreignKey: "id_usuario_registro"});
  models.modalidades_ubicaciones.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.modalidades_ubicaciones, { as: "modalidades_ubicaciones_registrados", foreignKey: "id_usuario_registro"});
  models.monedas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.monedas, { as: "monedas_registrados", foreignKey: "id_usuario_registro"});
  models.oficinas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.oficinas, { as: "oficinas_registrados", foreignKey: "id_usuario_registro"});
  models.oficinas_cliente.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.oficinas_cliente, { as: "oficinas_clientes_registrados", foreignKey: "id_usuario_registro"});
  models.oficinas_productos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.oficinas_productos, { as: "oficinas_productos_registrados", foreignKey: "id_usuario_registro"});
  models.oficinas_razones_sociales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.oficinas_razones_sociales, { as: "oficinas_razones_sociales_registrados", foreignKey: "id_usuario_registro"});
  models.oportunidades.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.oportunidades, { as: "oportunidades_registrados", foreignKey: "id_usuario_registro"});
  models.paises.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.paises, { as: "paises_registrados", foreignKey: "id_usuario_registro"});
  models.poliza_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.poliza_detalles, { as: "poliza_detalles_registrados", foreignKey: "id_usuario_registro"});
  models.poliza_territorialidad.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.poliza_territorialidad, { as: "poliza_territorialidades_registrados", foreignKey: "id_usuario_registro"});
  models.polizas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas, { as: "polizas_registrados", foreignKey: "id_usuario_registro"});
  models.polizas_commoditys.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas_commoditys, { as: "polizas_commodities_registrados", foreignKey: "id_usuario_registro"});
  models.polizas_modalidades.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas_modalidades, { as: "polizas_modalidades_registrados", foreignKey: "id_usuario_registro"});
  models.polizas_nacionalidades_interes_asegurado.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas_nacionalidades_interes_asegurado, { as: "polizas_nacionalidades_interes_asegurados_registrados", foreignKey: "id_usuario_registro"});
  models.polizas_paises.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas_paises, { as: "polizas_paises_registrados", foreignKey: "id_usuario_registro"});
  models.productos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.productos, { as: "productos_registrados", foreignKey: "id_usuario_registro"});
  models.proveedor_tipos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.proveedor_tipos, { as: "proveedor_tipos_registrados", foreignKey: "id_usuario_registro"});
  models.proveedores.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.proveedores, { as: "proveedores_registrados", foreignKey: "id_usuario_registro"});
  models.proveedores_monedas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.proveedores_monedas, { as: "proveedores_monedas_registrados", foreignKey: "id_usuario_registro"});
  models.puertos_aeropuertos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.puertos_aeropuertos, { as: "puertos_aeropuertos_registrados", foreignKey: "id_usuario_registro"});
  models.razones_bloqueo.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.razones_bloqueo, { as: "razones_bloqueos_registrados", foreignKey: "id_usuario_registro"});
  models.razones_sociales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.razones_sociales, { as: "razones_sociales_registrados", foreignKey: "id_usuario_registro"});
  models.razones_sociales_domicilios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.razones_sociales_domicilios, { as: "razones_sociales_domicilios_registrados", foreignKey: "id_usuario_registro"});
  models.regimenes_fiscal.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.regimenes_fiscal, { as: "regimenes_fiscales_registrados", foreignKey: "id_usuario_registro"});
  models.tamanios_contenedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tamanios_contenedor, { as: "tamanios_contenedores_registrados", foreignKey: "id_usuario_registro"});
  models.tipo_contenedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tipo_contenedor, { as: "tipo_contenedores_registrados", foreignKey: "id_usuario_registro"});
  models.tipos_bienes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tipos_bienes, { as: "tipos_bienes_registrados", foreignKey: "id_usuario_registro"});
  models.tipos_buque.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tipos_buque, { as: "tipos_buques_registrados", foreignKey: "id_usuario_registro"});
  models.tipos_cambio_futuro.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario_registro"});
  /* models.usuarios.hasMany(models.tipos_cambio_futuro, { as: "tipos_cambio_futuros", foreignKey: "id_usuario_registro"}); */
  models.tipos_cobertura.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tipos_cobertura, { as: "tipos_coberturas_registrados", foreignKey: "id_usuario_registro"});
  models.tpls.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.tpls, { as: "tpls_registrados", foreignKey: "id_usuario_registro"});
  models.ubicaciones.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.ubicaciones, { as: "ubicaciones_registrados", foreignKey: "id_usuario_registro"});
  models.ubicaciones_bienes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.ubicaciones_bienes, { as: "ubicaciones_bienes_registrados", foreignKey: "id_usuario_registro"});
  models.unidades_medida.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.unidades_medida, { as: "unidades_medidas_registrados", foreignKey: "id_usuario_registro"});
  models.usos_cfdi.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.usos_cfdi, { as: "usos_cfdis_registrados", foreignKey: "id_usuario_registro"});
  models.usuarios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.usuarios, { as: "usuarios_registrados", foreignKey: "id_usuario_registro"});
  models.usuarios.belongsTo(models.comisionistas, { as: "mediador_mercantil", foreignKey: "id_mediador_mercantil"});
  models.proveedores_documentos_generales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  models.proveedores_expediente.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.proveedores.hasMany(models.proveedores_expediente, { as: "expediente_proveedor", foreignKey: "id_proveedor"});
  models.proveedores_expediente.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.proveedores_expediente.belongsTo(models.proveedores_documentos_generales, { as: "documento_proveedor", foreignKey: "id_documento_proveedor"});
  models.proveedores_expediente.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});


  models.proveedores.belongsTo(models.estados, { as: "estado", foreignKey: "id_estado"});
  /* models.zonas.hasMany(models.proveedores, { as: "proveedores", foreignKey: "id_zona"}); */
  models.contactos.belongsTo(models.oficinas, { as: "oficina", foreignKey: "id_oficina"});
  models.oficinas.hasMany(models.contactos, { as: "contactos", foreignKey: "id_oficina"});
  models.contactos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.contactos, { as: "contactos_registrados", foreignKey: "id_usuario_registro"});

  models.polizas_nacionalidades_razones_sociales.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.polizas_nacionalidades_razones_sociales, { as: "polizas_nacionalidades_razones_sociales_registrados", foreignKey: "id_usuario_registro"});
  models.polizas_nacionalidades_razones_sociales.belongsTo(models.poliza_detalles, { as: "poliza_detalle", foreignKey: "id_poliza_detalle"});
  models.poliza_detalles.hasMany(models.polizas_nacionalidades_razones_sociales, { as: "polizas_nacionalidades_razon_social", foreignKey: "id_poliza_detalle"});
  models.polizas_nacionalidades_razones_sociales.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  /* models.paises.hasMany(models.polizas_nacionalidades_razones_sociales, { as: "polizas_nacionalidades_razon_social", foreignKey: "id_pais"}); */

  models.marcas_usuarios.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.marcas_usuarios.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario"});
  models.metas_mensuales_usuarios.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario"});
  models.metas_mensuales_usuarios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  models.pedidos_factura.belongsTo(models.certificados, { as: "certificado", foreignKey: "id_certificado"});
  models.pedidos_factura.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.pedidos_factura.hasMany(models.factura_detalles, { as: "factura_detalle", foreignKey: "id_pedido_factura"});
  models.cfdis.belongsTo(models.metodos_pago, { as: "metodo_pago", foreignKey: "id_metodo_pago"});
  models.cfdis.belongsTo(models.formas_pago, { as: "forma_pago", foreignKey: "id_forma_pago"});
  models.cfdis.belongsTo(models.usos_cfdi, { as: "uso_cfdi", foreignKey: "id_uso_cfdi"});
  models.cfdis.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.cfdis.belongsTo(models.motivos_cancelacion_facturas, { as: "motivo_cancelacion", foreignKey: "id_motivo_cancelacion_factura"});
  models.motivos_cancelacion_facturas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.facturas.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.facturas.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.facturas.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.facturas.belongsTo(models.cfdis, { as: "cfdi", foreignKey: "id_cfdi"});
  models.facturas.hasMany(models.factura_detalles, { as: "factura_detalles", foreignKey: "id_factura"});
  models.facturas.belongsTo(models.oficinas, { as: "oficina", foreignKey: "id_oficina"});
  models.facturas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.factura_detalles.belongsTo(models.facturas, { as: "factura", foreignKey: "id_factura"});
  models.factura_detalles.belongsTo(models.pedidos_factura, { as: "pedido_factura", foreignKey: "id_pedido_factura"});
  models.factura_detalles.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  models.factura_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.cuentas_por_cobrar.belongsTo(models.facturas, { as: "factura", foreignKey: "id_factura"});
  models.cuentas_por_cobrar.hasMany(models.pagos_facturacion, { as: "pagos", foreignKey: "id_cuenta_por_cobrar"});
  models.cuentas_por_cobrar.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.notas_credito.belongsTo(models.facturas, { as: "factura", foreignKey: "id_factura"});
  models.notas_credito.belongsTo(models.cfdis, { as: "cfdi", foreignKey: "id_cfdi"});
  models.notas_credito.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.pagos.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.pagos.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.pagos.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.pagos.belongsTo(models.cfdis, { as: "cfdi", foreignKey: "id_cfdi"});
  models.pagos.belongsTo(models.metodos_pago, { as: "metodo_pago", foreignKey: "id_metodo_pago"});
  models.pagos.hasMany(models.pagos_facturacion, { as: "pagos_facturacion", foreignKey: "id_pago"});
  models.pagos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.pagos_facturacion.belongsTo(models.pagos, { as: "pago", foreignKey: "id_pago"});
  models.pagos_facturacion.belongsTo(models.cuentas_por_cobrar, { as: "cuenta_por_cobrar", foreignKey: "id_cuenta_por_cobrar"});
  models.pagos_facturacion.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.razones_sociales_validaciones.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.razones_sociales_validaciones.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  models.razones_sociales_validaciones.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario_solicita"});
  models.clientes_api_key.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.usuarios_api_key.belongsTo(models.usuarios, { as: "usuario", foreignKey: "id_usuario"});

 
  models.datos_facturacion.belongsTo(models.paises, { as: "pais", foreignKey: "id_pais"});
  models.datos_facturacion.belongsTo(models.paises, { as: "nacionalidad_timbrado", foreignKey: "id_nacionalidad_timbrado"});
  models.datos_facturacion.belongsTo(models.regimenes_fiscal, { as: "regimen_fiscal", foreignKey: "id_regimen_fiscal"});

  models.datos_facturacion_domicilios.belongsTo(models.datos_facturacion, { as: "dato_facturacion", foreignKey: "id_dato_facturacion"});
  models.datos_facturacion_domicilios.belongsTo(models.domicilios, { as: "domicilio", foreignKey: "id_domicilio"});
  models.datos_facturacion.hasMany(models.datos_facturacion_domicilios, { as: "datos_facturacion_domicilios", foreignKey: "id_dato_facturacion"});
  models.datos_facturacion.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.datos_facturacion, { as: "datos_facturacion_registrados", foreignKey: "id_usuario_registro"});


  models.contactos_proveedor.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.proveedores.hasMany(models.contactos_proveedor, { as: "contactos_proveedor", foreignKey: "id_proveedor"});
  models.contactos_proveedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.contactos_proveedor, { as: "contactos_proveedor_registrados", foreignKey: "id_usuario_registro"});


  models.clientes_saldos_a_favor.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.clientes_saldos_a_favor.belongsTo(models.pagos, { as: "pago", foreignKey: "id_pago"});
  models.clientes_saldos_a_favor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.clientes.hasMany(models.clientes_saldos_a_favor, { as: "saldos_a_favor", foreignKey: "id_cliente"});
  models.usuarios.hasMany(models.clientes_saldos_a_favor, { as: "clientes_saldos_a_favor_registrados", foreignKey: "id_usuario_registro"});

  models.fuentes.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.fuentes, { as: "fuentes_registrados", foreignKey: "id_usuario_registro"});

  models.clientes.belongsTo(models.fuentes, { as: "fuente", foreignKey: "id_fuente"});
  models.fuentes.hasMany(models.clientes, { as: "clientes", foreignKey: "id_fuente"});

  //Cuentas por Pagar (CXP)

  //Ordenes compra
  models.ordenes_compra.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.marcas.hasMany(models.ordenes_compra, { as: "ordenes_compra", foreignKey: "id_marca"});
  models.ordenes_compra.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.proveedores.hasMany(models.ordenes_compra, { as: "ordenes_compra", foreignKey: "id_proveedor"});
  models.ordenes_compra.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.ordenes_compra.belongsTo(models.usuarios, { as: "usuario_solicita", foreignKey: "id_usuario_solicita"});
  models.usuarios.hasMany(models.ordenes_compra, { as: "ordenes_compra_solicitadas", foreignKey: "id_usuario_solicita"});
  models.ordenes_compra.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.ordenes_compra, { as: "ordenes_compra_registrados", foreignKey: "id_usuario_registro"});

  //Ordenes compra archivos
  models.ordenes_compra_archivos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.ordenes_compra_archivos.belongsTo(models.ordenes_compra, { as: "orden_compra", foreignKey: "id_orden_compra"});
  models.ordenes_compra.hasMany(models.ordenes_compra_archivos, { as: "ordenes_compra_archivos", foreignKey: "id_orden_compra"});
  models.ordenes_compra_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.ordenes_compra_archivos, { as: "ordenes_compra_archivos_registrados", foreignKey: "id_usuario_registro"});

  //Facturas proveedor
  models.facturas_proveedor.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.marcas.hasMany(models.facturas_proveedor, { as: "facturas_proveedor", foreignKey: "id_marca"});
  models.facturas_proveedor.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.proveedores.hasMany(models.facturas_proveedor, { as: "facturas_proveedor", foreignKey: "id_proveedor"});
  models.facturas_proveedor.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.facturas_proveedor.belongsTo(models.usuarios, { as: "usuario_solicita", foreignKey: "id_usuario_solicita"});
  models.usuarios.hasMany(models.facturas_proveedor, { as: "facturas_proveedor_solicitadas", foreignKey: "id_usuario_registro"});
  models.facturas_proveedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.facturas_proveedor, { as: "facturas_proveedor_registrados", foreignKey: "id_usuario_registro"});

  //Facturas proveedor detalles
  models.facturas_proveedor_detalles.belongsTo(models.ordenes_compra, { as: "orden_compra", foreignKey: "id_orden_compra"});
  models.ordenes_compra.hasMany(models.facturas_proveedor_detalles, { as: "ordenes_compra_detalles", foreignKey: "id_orden_compra"});
  models.facturas_proveedor_detalles.belongsTo(models.conceptos_presupuesto, { as: "concepto_presupuesto", foreignKey: "id_concepto_presupuesto"});
  models.facturas_proveedor_detalles.belongsTo(models.facturas_proveedor, { as: "factura_proveedor", foreignKey: "id_factura_proveedor"});
  models.facturas_proveedor.hasMany(models.facturas_proveedor_detalles, { as: "facturas_proveedor_detalles", foreignKey: "id_factura_proveedor"});
  models.facturas_proveedor_detalles.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  models.facturas_proveedor_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.facturas_proveedor_detalles, { as: "facturas_proveedor_detalles_registrados", foreignKey: "id_usuario_registro"});
  
  //Facturas proveedor archivos
  models.facturas_proveedor_archivos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.facturas_proveedor_archivos.belongsTo(models.facturas_proveedor, { as: "factura_proveedor", foreignKey: "id_factura_proveedor"});
  models.facturas_proveedor.hasMany(models.facturas_proveedor_archivos, { as: "facturas_proveedor_archivos", foreignKey: "id_factura_proveedor"});
  models.facturas_proveedor_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.facturas_proveedor_archivos, { as: "facturas_proveedor_archivos_registrados", foreignKey: "id_usuario_registro"});

  //Cuentas por pagar
  models.cuentas_por_pagar.belongsTo(models.facturas_proveedor, { as: "factura_proveedor", foreignKey: "id_factura_proveedor"});
  models.facturas_proveedor.hasMany(models.cuentas_por_pagar, { as: "cuentas_por_pagar", foreignKey: "id_factura_proveedor"});
  models.cuentas_por_pagar.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.cuentas_por_pagar, { as: "cuentas_por_pagar_registrados", foreignKey: "id_usuario_registro"});

  //Pagos proveedor
  models.pagos_proveedor.belongsTo(models.cuentas_bancarias_internas, { as: "cuenta_bancaria_interna", foreignKey: "id_cuenta_bancaria_interna"});
  models.pagos_proveedor.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.pagos_proveedor.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.pagos_proveedor.belongsTo(models.metodos_pago, { as: "metodo_pago", foreignKey: "id_metodo_pago"});
  models.pagos_proveedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.pagos_proveedor, { as: "pagos_proveedor_registrados", foreignKey: "id_usuario_registro"});

  //Pagos proveedor archivos
  models.pagos_proveedor_archivos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.pagos_proveedor_archivos.belongsTo(models.pagos_proveedor, { as: "pago_proveedor", foreignKey: "id_pago_proveedor"});
  models.pagos_proveedor.hasMany(models.pagos_proveedor_archivos, { as: "pagos_proveedor_archivos", foreignKey: "id_pago_proveedor"});
  models.pagos_proveedor_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.pagos_proveedor_archivos, { as: "pagos_proveedor_archivos_registrados", foreignKey: "id_usuario_registro"});

  //Pagos proveedor facturacion
  models.pagos_proveedor_facturacion.belongsTo(models.cuentas_por_pagar, { as: "cuenta_por_pagar", foreignKey: "id_cuenta_por_pagar"});
  models.cuentas_por_pagar.hasMany(models.pagos_proveedor_facturacion, { as: "pagos_proveedor", foreignKey: "id_cuenta_por_pagar"});
  models.pagos_proveedor_facturacion.belongsTo(models.pagos_proveedor, { as: "pago_proveedor", foreignKey: "id_pago_proveedor"});
  models.pagos_proveedor.hasMany(models.pagos_proveedor_facturacion, { as: "cuentas_por_pagar", foreignKey: "id_pago_proveedor"});
  models.pagos_proveedor_facturacion.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.pagos_proveedor_facturacion, { as: "pagos_proveedor_facturacion_registrados", foreignKey: "id_usuario_registro"});
  

  models.cuentas_bancarias_proveedores.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.cuentas_bancarias_proveedores.belongsTo(models.entidades_bancarias, { as: "entidad_bancaria", foreignKey: "id_entidad_bancaria"});
  models.cuentas_bancarias_proveedores.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.cuentas_bancarias_proveedores.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.entidades_bancarias.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});


  models.cuentas_bancarias_internas.belongsTo(models.datos_facturacion, { as: "dato_facturacion", foreignKey: "id_datos_facturacion"});
  models.cuentas_bancarias_internas.belongsTo(models.entidades_bancarias, { as: "entidad_bancaria", foreignKey: "id_entidad_bancaria"});
  models.cuentas_bancarias_internas.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.cuentas_bancarias_internas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.pagos.belongsTo(models.cuentas_bancarias_internas, { as: "cuenta_bancaria_interna", foreignKey: "id_cuenta_bancaria_interna"});


  models.categorias_cliente.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.clientes_api_key.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.config_smtp_marcas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.config_smtp.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.datos_facturacion_domicilios.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  
  
  models.permisos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.polizas_tipo_contenedor.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.productos_unidades_medida.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.razones_sociales_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.razones_sociales_validaciones.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.roles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios_api_key.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  

   

  //models.cotizaciones.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  //models.cotizaciones.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  //models.cotizaciones.belongsTo(models.metodos_pago, { as: "metodo_pago", foreignKey: "id_metodo_pago"});
  //models.cotizaciones.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  //models.cotizaciones.belongsTo(models.razones_sociales, { as: "razon_social", foreignKey: "id_razon_social"});
  //models.cotizaciones.belongsTo(models.contactos, { as: "contacto", foreignKey: "id_contacto"});
  //models.cotizaciones.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  //models.usuarios.hasMany(models.cotizaciones, { as: "cotizaciones_registrados", foreignKey: "id_usuario_registro"});



  //models.cotizaciones_detalles.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  //models.cotizaciones_detalles.belongsTo(models.cotizaciones, { as: "cotizacion", foreignKey: "id_cotizacion"});
  //models.cotizaciones_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  //models.usuarios.hasMany(models.cotizaciones_detalles, { as: "cotizaciones_detalles_registrados", foreignKey: "id_usuario_registro"});


  //Pagos archivos
  models.pagos_archivos.belongsTo(models.carga_archivos, { as: "archivo", foreignKey: "id_carga_archivo"});
  models.pagos_archivos.belongsTo(models.pagos, { as: "pagos", foreignKey: "id_pago"});
  models.pagos_proveedor.hasMany(models.pagos_archivos, { as: "pagos_archivos", foreignKey: "id_pago"});
  models.pagos_archivos.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.usuarios.hasMany(models.pagos_archivos, { as: "pagos_archivos_registrados", foreignKey: "id_usuario_registro"});


  // Temporalidad
  models.temporalidad.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  
  //Estatus OnTrack
  models.estatus_ontrack.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});


  //Servicios OnTrack
  models.servicios_ontrack.belongsTo(models.certificados, { as: "certificado", foreignKey: "id_certificado"});
  models.servicios_ontrack.belongsTo(models.clientes, { as: "cliente", foreignKey: "id_cliente"});
  models.servicios_ontrack.belongsTo(models.oficinas_razones_sociales, { as: "oficina_razon_social", foreignKey: "id_oficina_razon_social"});
  models.servicios_ontrack.belongsTo(models.marcas, { as: "marca", foreignKey: "id_marca"});
  models.servicios_ontrack.belongsTo(models.tipos_cambio_futuro, { as: "tipo_cambio_futuro", foreignKey: "id_tipo_cambio_futuro"});
  models.servicios_ontrack.belongsTo(models.proveedores, { as: "proveedor", foreignKey: "id_proveedor"});
  models.servicios_ontrack.belongsTo(models.estados, { as: "estado_origen", foreignKey: "id_estado_origen"});
  models.servicios_ontrack.belongsTo(models.estados, { as: "estado_destino", foreignKey: "id_estado_destino"});
  models.servicios_ontrack.belongsTo(models.contactos, { as: "contacto", foreignKey: "id_contacto"});
  models.servicios_ontrack.belongsTo(models.estatus_ontrack, { as: "estatus_ontrack", foreignKey: "id_estatus_ontrack"});
  models.servicios_ontrack.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.servicios_ontrack.belongsTo(models.monedas, { as: "moneda", foreignKey: "id_moneda"});
  models.servicios_ontrack.belongsTo(models.monedas, { as: "moneda_compra", foreignKey: "id_moneda_compra"});
  models.pedidos_factura.belongsTo(models.servicios_ontrack, { as: "servicios_ontrack", foreignKey: "id_servicio_ontrack"});

  //Contactos Transportistas
  models.contactos_transportistas.belongsTo(models.servicios_ontrack, { as: "servicio_ontrack", foreignKey: "id_servicio_ontrack"});
  models.servicios_ontrack.hasMany(models.contactos_transportistas, { as: "contactos_transportistas", foreignKey: "id_servicio_ontrack"});
  models.contactos_transportistas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  //Servicios OnTrack Detalles
  models.servicios_ontrack_detalles.belongsTo(models.atributos_ontrack, { as: "atributo_ontrack", foreignKey: "id_atributo_ontrack"});
  models.servicios_ontrack_detalles.belongsTo(models.servicios_ontrack, { as: "servicio_ontrack", foreignKey: "id_servicio_ontrack"});
  models.servicios_ontrack.hasMany(models.servicios_ontrack_detalles, { as: "servicios_ontrack_detalles", foreignKey: "id_servicio_ontrack"});
  models.servicios_ontrack_detalles.belongsTo(models.productos, { as: "producto", foreignKey: "id_producto"});
  models.servicios_ontrack_detalles.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  //Atributos OnTrack
  models.atributos_ontrack.belongsTo(models.monedas, { as: "moneda_compra", foreignKey: "id_moneda_compra"});
  models.atributos_ontrack.belongsTo(models.monedas, { as: "moneda_venta", foreignKey: "id_moneda_venta"});
  models.atributos_ontrack.belongsTo(models.oficinas_productos, { as: "oficina_producto", foreignKey: "id_oficina_producto"});
  models.oficinas_productos.hasMany(models.atributos_ontrack, { as: "atributos_ontrack", foreignKey: "id_oficina_producto"});
  models.atributos_ontrack.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  //Seguimiento Estatus OnTrack
  models.seguimiento_estatus_ontrack.belongsTo(models.servicios_ontrack, { as: "servicio_ontrack", foreignKey: "id_servicio_ontrack"});
  models.seguimiento_estatus_ontrack.belongsTo(models.estatus_ontrack, { as: "estatus_ontrack", foreignKey: "id_estatus_ontrack"});
  models.servicios_ontrack.hasMany(models.seguimiento_estatus_ontrack, { as: "seguimiento_estatus", foreignKey: "id_servicio_ontrack"});
  models.seguimiento_estatus_ontrack.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});

  //Ordenes Compra Facturas
  models.oc_facturas.belongsTo(models.facturas, { as: "factura", foreignKey: "id_factura"});
  models.oc_facturas.belongsTo(models.ordenes_compra, { as: "orden_compra", foreignKey: "id_orden_compra"});
  models.oc_facturas.belongsTo(models.usuarios, { as: "usuario_registro", foreignKey: "id_usuario_registro"});
  models.facturas.hasMany(models.oc_facturas, { as: "oc_factura", foreignKey: "id_factura"});
  models.ordenes_compra.hasMany(models.oc_facturas, { as: "oc_factura", foreignKey: "id_factura"});
};





