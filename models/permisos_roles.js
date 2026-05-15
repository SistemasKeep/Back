const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('permisos_roles', {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          primaryKey: true 
        },
        id_role: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: 'roles',
                key: 'id'
            }
        },
        id_permiso: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: 'permisos',
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
            defaultValue: null
        }
    },
    {
        sequelize,
        tableName: 'permisos_roles',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                name: "PRIMARY",
                unique: true,
                using: "BTREE",
                fields: [
                    { name: "id" }
                ]
            },
            {
                name: "id_role",
                using: "BTREE",
                fields: [
                    { name: "id_role" }
                ]
            },
            {
                name: "id_permiso",
                using: "BTREE",
                fields: [
                    { name: "id_permiso" }
                ]
            },
            {
                name: "id_usuario_registro",
                using: "BTREE",
                fields: [
                    { name: "id_usuario_registro" }
                ]
            }
        ]
    });
};
