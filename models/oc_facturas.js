const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('oc_facturas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_factura: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'facturas',
        key: 'id'
      },
    },
    id_orden_compra: {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'ordenes_compra',
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
    tableName: 'oc_facturas',
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
        name: "id_factura",
        using: "BTREE",
        fields: [
          { name: "id_factura" },
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
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
