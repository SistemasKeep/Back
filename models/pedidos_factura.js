const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pedidos_factura', {
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
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    id_servicio_ontrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'servicios_ontrack',
        key: 'id'
      }
    },
    estatus: {
      type: DataTypes.ENUM('P', 'F'),
      allowNull: false,
      defaultValue: 'P',
      comment: 'P => PENDIENTE, F => FACTURADO'
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
    tableName: 'pedidos_factura',
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
        name: "pedidos_factura_id_servicio_ontrack_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_servicio_ontrack" },
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
