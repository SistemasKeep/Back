const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('historicos', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_registro: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tabla: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    accion: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    encriptacion_previa: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    encriptacion_posterior: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'historicos',
    timestamps: false,
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
    ]
  });
};
