const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('servicios_ontrack_detalles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_servicio_ontrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'servicios_ontrack',
        key: 'id'
      }
    },
    id_atributo_ontrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'atributos_ontrack',
        key: 'id'
      }
    },
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'productos',
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
    cantidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    monto_iva: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    porcentaje_iva: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    descuento_porcentaje: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    descuento_monto: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    total: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    retencion_porcentaje: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    retencion_monto: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    subtotal_sobreventa: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    costo_compra: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    profit: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    cortesia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    precio_unitario: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
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
    tableName: 'servicios_ontrack_detalles',
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
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "id_servicio_ontrack",
        using: "BTREE",
        fields: [
          { name: "id_servicio_ontrack" },
        ]
      },
      {
        name: "id_producto",
        using: "BTREE",
        fields: [
          { name: "id_producto" },
        ]
      },
      {
        name: "id_atributo_ontrack",
        using: "BTREE",
        fields: [
          { name: "id_atributo_ontrack" },
        ]
      }
    ]
  });
};
