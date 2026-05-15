const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('servicios_ontrack', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_certificado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'certificados',
        key: 'id'
      },
    },
    id_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clientes',
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
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'marcas',
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
    id_moneda_compra: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'monedas',
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
    id_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'proveedores',
        key: 'id'
      },
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
    id_contacto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contactos',
        key: 'id'
      },
    },
    id_estatus_ontrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'estatus_ontrack',
        key: 'id'
      },
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    no_operacion: {
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
    fecha_salida: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    fecha_llegada: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    num_conocimiento: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    num_contenedor: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    nombre_transportista: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    telefono_transportista: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    correo_transportista: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    comentarios: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    estatus: {
      type: DataTypes.ENUM('N','F','C'),
      allowNull: false,
      defaultValue: 'N',
      comment: 'N => ACTIVO, F => FACTURADO, C => CANCELADO'
    },
    have_notificaciones: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    temporalidad: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: "",
    },
    keepro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    correos: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    referencia_interna: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: 'servicios_ontrack',
    timestamps: true,
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
        name: "id_certificado",
        using: "BTREE",
        fields: [
          { name: "id_certificado" },
        ]
      },
      {
        name: "id_cliente",
        using: "BTREE",
        fields: [
          { name: "id_cliente" },
        ]
      },
      {
        name: "id_oficina_razon_social",
        using: "BTREE",
        fields: [
          { name: "id_oficina_razon_social" },
        ]
      },
      {
        name: "id_marca",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "id_moneda",
        using: "BTREE",
        fields: [
          { name: "id_moneda" },
        ]
      },
      {
        name: "id_tipo_cambio_futuro",
        using: "BTREE",
        fields: [
          { name: "id_tipo_cambio_futuro" },
        ]
      },
      {
        name: "id_proveedor",
        using: "BTREE",
        fields: [
          { name: "id_proveedor" },
        ]
      },
      {
        name: "id_estado_origen",
        using: "BTREE",
        fields: [
          { name: "id_estado_origen" },
        ]
      },
      {
        name: "id_estado_destino",
        using: "BTREE",
        fields: [
          { name: "id_estado_destino" },
        ]
      },
      {
        name: "id_contacto",
        using: "BTREE",
        fields: [
          { name: "id_contacto" },
        ]
      },
      {
        name: "id_estatus_ontrack",
        using: "BTREE",
        fields: [
          { name: "id_estatus_ontrack" },
        ]
      },
      {
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};