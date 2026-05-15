const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('polizas_commoditys', {
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
    id_commodity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'commoditys',
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
    limite_ferroviario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    limite_aereo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    limite_terrestre: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    limite_maritimo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    is_sensible_robo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    tarifa: {
      type: DataTypes.DOUBLE(15,6),
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
    tableName: 'polizas_commoditys',
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
        name: "fk_polizas_commoditys_poliza_detalles1_idx",
        using: "BTREE",
        fields: [
          { name: "id_poliza_detalle" },
        ]
      },
      {
        name: "fk_polizas_commoditys_commoditys1_idx",
        using: "BTREE",
        fields: [
          { name: "id_commodity" },
        ]
      },
    ]
  });
};
