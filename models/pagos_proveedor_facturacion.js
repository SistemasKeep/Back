const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pagos_proveedor_facturacion', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_cuenta_por_pagar: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_por_pagar',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_pago_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'pagos_proveedor',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    saldo_anterior: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    saldo_nuevo: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    monto: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    tipo_cambio: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    parcialidad: {
      type: DataTypes.INTEGER.UNSIGNED,
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
    tableName: 'pagos_proveedor_facturacion',
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
        name: "id_cuenta_por_pagar",
        using: "BTREE",
        fields: [
          { name: "id_cuenta_por_pagar" },
        ]
      },
      {
        name: "id_pago_proveedor",
        using: "BTREE",
        fields: [
          { name: "id_pago_proveedor" },
        ]
      },
    ]
  });
};
