'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contactos_transportistas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      id_servicio_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'servicios_ontrack',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nombre_contacto: {
        type: Sequelize.STRING(300),
        allowNull: true
      },
      correo_electronico: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      puesto: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      telefono: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      extension_telefono: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      telefono_principal: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      extension_telefono_principal: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      telefono_secundario: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      extension_telefono_secundario: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE(3),
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE(3),
        allowNull: true
      },
      deletedAt: {
        type: Sequelize.DATE(3),
        allowNull: true,
        defaultValue: null
      }
    });

    // Índices
    await queryInterface.addIndex('contactos_transportistas', ['id_usuario_registro']);
    await queryInterface.addIndex('contactos_transportistas', ['id_servicio_ontrack']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('contactos_transportistas');
  }
};
