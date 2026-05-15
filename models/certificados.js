const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('certificados', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    id_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'marcas',
        key: 'id'
      }
    },
    id_estado_origen: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'estados',
        key: 'id'
      }
    },
    id_estado_destino: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'estados',
        key: 'id'
      }
    },
    id_estado_destino_redondo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'estados',
        key: 'id'
      }
    },
    id_commodity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'commoditys',
        key: 'id'
      }
    },
    id_tamanio_contenedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'tamanios_contenedor',
        key: 'id'
      }
    },
    id_oficina_razon_social: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'oficinas_razones_sociales',
        key: 'id'
      }
    },
    id_beneficiario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'beneficiarios',
        key: 'id'
      }
    },
    id_tipo_cambio_futuro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'tipos_cambio_futuro',
        key: 'id'
      }
    },
    id_buque: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'buques',
        key: 'id'
      }
    },
    id_modalidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'modalidades',
        key: 'id'
      }
    },
    id_poliza: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'polizas',
        key: 'id'
      }
    },
    id_detalle_poliza: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'poliza_detalles',
        key: 'id'
      }
    },
    id_puerto_aeropuerto_origen: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'puertos_aeropuertos',
        key: 'id'
      }
    },
    id_puerto_aeropuerto_destino: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'puertos_aeropuertos',
        key: 'id'
      }
    },
    id_moneda: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_tipo_bienes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'tipos_bienes',
        key: 'id'
      }
    },
    id_ubicaciones_bienes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'ubicaciones_bienes',
        key: 'id'
      }
    },
    tipo_cobertura: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    have_rc: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    retroactividad: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    tramo_embarque: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    tipo_operacion: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    descripcion_carga: {
      type: DataTypes.STRING(1600),
      allowNull: true
    },
    no_aleatorieo: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    no_seguridad: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ciudad_origen: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ciudad_destino: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ciudad_destino_redondo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    no_operacion: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    referencias: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    datos_adicionales: {
      type: DataTypes.STRING(6000),
      allowNull: true
    },
    ruta: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    estatus: {
      type: DataTypes.ENUM('N','R','A','F','C','B'),
      allowNull: false,
      defaultValue: 'N',
      comment: 'N => ACTIVO, R => REFERENCIADO, A => AUTORIZADO, F => FACTURADO, C => CANCELADO, B => BLOQUEADO'
    },
    num_contenedor: {
      type: DataTypes.STRING(11),
      allowNull: true
    },
    num_viaje: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    venta_cliente_final: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    suma_asegurada: {
      type: DataTypes.DECIMAL(20,6),
      allowNull: true
    },
    draft_certificado: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    redondo: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    deducible: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    keepro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    keepro_last_edit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    fecha_inicio_cobertura: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_fin_cobertura: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    certifiedAt: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
      defaultValue: null,
    }
  }, {
    sequelize,
    tableName: 'certificados',
    timestamps: false,
    paranoid: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_timestamps_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_certificados_proveedores1_idx",
        using: "BTREE",
        fields: [
          { name: "id_proveedor" },
        ]
      },
      {
        name: "fk_certificados_clientes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_cliente" },
        ]
      },
      {
        name: "fk_certificados_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "fk_certificados_estados1_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado_origen" },
        ]
      },
      {
        name: "fk_certificados_estados2_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado_destino" },
        ]
      },
      {
        name: "fk_certificados_commoditys1_idx",
        using: "BTREE",
        fields: [
          { name: "id_commodity" },
        ]
      },
      {
        name: "fk_certificados_tamanios_contenedor1_idx",
        using: "BTREE",
        fields: [
          { name: "tamanios_contenedor" },
        ]
      },
      {
        name: "fk_certificados_oficinas_razones_sociales1_idx",
        using: "BTREE",
        fields: [
          { name: "id_oficina_razon_social" },
        ]
      },
      {
        name: "fk_certificados_beneficiarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_beneficiario" },
        ]
      },
      {
        name: "fk_certificados_tipos_cambio_futuro1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tipo_cambio_futuro" },
        ]
      },
      {
        name: "fk_certificados_buques1_idx",
        using: "BTREE",
        fields: [
          { name: "id_buque" },
        ]
      },
      {
        name: "fk_certificados_modalidades1_idx",
        using: "BTREE",
        fields: [
          { name: "id_modalidad" },
        ]
      },
      {
        name: "fk_certificados_polizas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_poliza" },
        ]
      },
      {
        name: "fk_certificados_poliza_detalles1_idx",
        using: "BTREE",
        fields: [
          { name: "id_detalle_poliza" },
        ]
      },
      {
        name: "fk_certificados_puertos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_puerto_aeropuerto_origen" },
        ]
      },
      {
        name: "fk_certificados_puertos2_idx",
        using: "BTREE",
        fields: [
          { name: "id_puerto_aeropuerto_destino" },
        ]
      },
      {
        name: "fk_certificados_monedas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda" },
        ]
      },
      {
        name: "fk_certificados_tipos_bienes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tipo_bienes" },
        ]
      },
      {
        name: "fk_certificados_ubicaciones_bienes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_ubicaciones_bienes" },
        ]
      },
      {
        name: "fk_certificados_estados3_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado_destino_redondo" },
        ]
      },
    ]
  });
};
