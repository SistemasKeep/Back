const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('mantenimiento_keepro', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    imagen: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fecha_inicio: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: false
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
    tableName: 'mantenimiento_keepro',
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
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
