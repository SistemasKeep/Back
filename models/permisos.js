const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('permisos', {
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
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        display_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        descripcion: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        tipo: {
            type: DataTypes.ENUM('C', 'L', 'A', 'E', 'R', 'M'),
            allowNull: false,
            defaultValue: 'L',
            comment: 'C => Crear, L => Leer, A => Actualizar, E => Eliminar, R => Restaurar, M =>Acceso al modulo. Por default se setea "L"'
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
        tableName: 'permisos',
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
                name: "id_usuario_registro",
                using: "BTREE",
                fields: [
                    { name: "id_usuario_registro" }
                ]
            }
        ]
    });
};
