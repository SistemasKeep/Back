const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('razones_sociales_validaciones', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_razon_social: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'razones_sociales',
        key: 'id'
      }
    },
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'marcas',
        key: 'id'
      }
    },
    id_usuario_solicita: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
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

    validado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    prevalidado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    fecha_validado: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    fecha_prevalidado: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    fecha_solicitud: {
        type: DataTypes.DATE(3),
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
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'razones_sociales_validaciones',
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
        name: "id_razon_social",
        using: "BTREE",
        fields: [
          { name: "id_razon_social" },
        ]
      },
      {
        name: "id_marca",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "id_usuario_solicita",
        using: "BTREE",
        fields: [
          { name: "id_usuario_solicita" },
        ]
      },
      {
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      }
    ]
  });
};
