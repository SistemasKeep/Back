const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('beneficiarios', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_nacionalidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_pais_sat: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'paises',
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
    id_domicilio: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'domicilios',
        key: 'id'
      }
    },
    bloqueado: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    clave: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(175),
      allowNull: false
    },
    rfc: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
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
    tableName: 'beneficiarios',
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
        name: "fk_beneficiarios_domicilios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_domicilio" },
        ]
      },
      {
        name: "fk_beneficiarios_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_nacionalidad" },
        ]
      },
      {
        name: "beneficiarios_id_pais_sat_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais_sat" },
        ]
      },
      {
        name: "fk_beneficiarios_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
