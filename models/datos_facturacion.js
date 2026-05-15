const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('datos_facturacion', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_pais: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_nacionalidad_timbrado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_regimen_fiscal: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
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
    no_identificacion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    razon_social: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    cer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo_persona: {
      type: DataTypes.ENUM('F', 'M'),
      allowNull: true,
      defaultValue: 'F',
      comment: 'F => FISICA, M => MORAL'
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
    tableName: 'datos_facturacion',
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
        name: "id_pais",
        using: "BTREE",
        fields: [
          { name: "id_pais" },
        ]
      },
      {
        name: "id_nacionalidad_timbrado",
        using: "BTREE",
        fields: [
          { name: "id_nacionalidad_timbrado" },
        ]
      },
      {
        name: "id_regimen_fiscal",
        using: "BTREE",
        fields: [
          { name: "id_regimen_fiscal" },
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
