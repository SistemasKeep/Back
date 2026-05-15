const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('facturas_proveedor_detalles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_orden_compra: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'ordenes_compra',
        key: 'id'
      }
    },
    id_concepto_presupuesto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'conceptos_presupuesto',
        key: 'id'
      }
    },
    id_factura_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'facturas_proveedor',
        key: 'id'
      }
    },
    id_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'productos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    cantidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    subtotal: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    impuestos: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    comentarios: {
      type: DataTypes.STRING(1500),
      allowNull: true
    },
    descuentos: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    impuesto_adicional: {
      type: DataTypes.DECIMAL(15,6),
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
      defaultValue: null
    }
  }, {
    sequelize,
    tableName: 'facturas_proveedor_detalles',
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
        name: "id_orden_compra",
        using: "BTREE",
        fields: [
          { name: "id_orden_compra" },
        ]
      },
      {
        name: "id_concepto_presupuesto",
        using: "BTREE",
        fields: [
          { name: "id_concepto_presupuesto" },
        ]
      },
      {
        name: "id_factura_proveedor",
        using: "BTREE",
        fields: [
          { name: "id_factura_proveedor" },
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
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
