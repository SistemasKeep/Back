const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('contactos_transportistas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_servicio_ontrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'servicios_ontrack',
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
    nombre_contacto: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    correo_electronico: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    puesto: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    extension_telefono: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    telefono_principal: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    extension_telefono_principal: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    telefono_secundario: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    extension_telefono_secundario: {
      type: DataTypes.STRING(10),
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
    tableName: 'contactos_transportistas',
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
      {
        name: "id_servicio_ontrack",
        using: "BTREE",
        fields: [
          { name: "id_servicio_ontrack" },
        ]
      }
    ]
  });
};
