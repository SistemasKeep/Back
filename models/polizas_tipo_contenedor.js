const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('polizas_tipo_contenedor', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_poliza_detalle: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'poliza_detalles',
        key: 'id'
      }
    },
    id_tipo_contenedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'tipo_contenedor',
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
    suma_asegurada: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    precio_compra: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    precio_compra_deducible: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    is_precio_compra: {
      type: DataTypes.BOOLEAN,
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
    tableName: 'polizas_tipo_contenedor',
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
        name: "id_poliza_detalle",
        using: "BTREE",
        fields: [
          { name: "id_poliza_detalle" },
        ]
      },
      {
        name: "id_tipo_contenedor",
        using: "BTREE",
        fields: [
          { name: "id_tipo_contenedor" },
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
