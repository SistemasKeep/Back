const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('config_smtp', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_usuario: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    mail_driver: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    mail_host: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    mail_port: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    mail_username: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    mail_password: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    mail_encryption: {
      type: DataTypes.ENUM('ssl', 'tls', 'starttls'),
      allowNull: false,
      defaultValue: 'tls',
    },
    sender_address: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    sender_name: {
      type: DataTypes.STRING(100),
      allowNull: false
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
  },
  {
    sequelize,
    tableName: 'config_smtp',
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
        name: "id_usuario",
        using: "BTREE",
        fields: [
          { name: "id_usuario" },
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
