const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pagos_facturacion', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'pagos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_cuenta_por_cobrar: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_por_cobrar',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
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
    tableName: 'pagos_facturacion',
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
        name: "id_pago",
        using: "BTREE",
        fields: [
          { name: "id_pago" },
        ]
      },
      {
        name: "id_cuenta_por_cobrar",
        using: "BTREE",
        fields: [
          { name: "id_cuenta_por_cobrar" },
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
