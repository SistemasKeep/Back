const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notas_credito', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_factura: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'facturas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_cfdi: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'cfdis',
        key: 'id'
      }
    },
    tipo: {
      type: DataTypes.ENUM('B', 'C'),
      allowNull: false,
      defaultValue: 'B',
      comment: 'B => BONIFICACION C => COMPLETA (Esta debe colocar el estatus de los pedidodos factura como PENDIENTE)'
    },
    folio: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    impuesto: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    comentarios: {
      type: DataTypes.STRING(255),
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
    tableName: 'notas_credito',
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
        name: "id_cfdi",
        using: "BTREE",
        fields: [
          { name: "id_cfdi" },
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
