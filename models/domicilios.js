const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('domicilios', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_estado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'estados',
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
    municipio: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    codigo_postal: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    ciudad_localidad: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    colonia: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    calle: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    num_int: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    num_ext: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    referencia: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    calle_izq: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    calle_der: {
      type: DataTypes.STRING(255),
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
    tableName: 'domicilios',
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
        name: "fk_domicilios_estados1_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado" },
        ]
      },
      {
        name: "fk_domicilios_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
