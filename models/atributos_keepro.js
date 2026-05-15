const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('atributos_keepro', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    id_oficina_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'oficinas_productos',
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
    id_moneda_venta: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_beneficiario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'beneficiarios',
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
    id_tipo_contenedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'tipo_contenedor',
        key: 'id'
      }
    },
    id_pais_origen: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_pais_destino: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    descripcion: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    tarifa_compra_forzosa: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_deducible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    limite_inferior: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    limite_superior: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    tarifa_final_cliente: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    tarifa_final_cliente_deducible: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_venta: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    tarifa_mediador_mercantil: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_mediador_mercantil: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_venta_deducible: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    tarifa_mediador_deducible: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_mediador_mercantil_deducible: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    tarifa_compra_especial: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_compra_especial: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    comision_externa: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    comision_interna: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    num_movimientos: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    fecha_vencimiento: {
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
    tableName: 'atributos_keepro',
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
        name: "fk_timestamps_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_atributos_keepro_proveedores1_idx",
        using: "BTREE",
        fields: [
          { name: "id_proveedor" },
        ]
      },
      {
        name: "fk_atributos_keepro_oficinas_productos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_oficina_producto" },
        ]
      },
      {
        name: "fk_atributos_keepro_monedas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda_compra" },
        ]
      },
      {
        name: "fk_atributos_keepro_monedas2_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda_venta" },
        ]
      },
      {
        name: "fk_atributos_keepro_beneficiarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_beneficiario" },
        ]
      },
      {
        name: "fk_atributos_keepro_commoditys1_idx",
        using: "BTREE",
        fields: [
          { name: "id_commodity" },
        ]
      },
      {
        name: "fk_atributos_keepro_tipo_contenedor1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tipo_contenedor" },
        ]
      },
      {
        name: "fk_atributos_keepro_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais_origen" },
        ]
      },
      {
        name: "fk_atributos_keepro_paises2_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais_destino" },
        ]
      },
    ]
  });
};
