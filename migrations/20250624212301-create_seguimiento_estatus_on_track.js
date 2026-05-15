'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('seguimiento_estatus_ontrack', { 
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true
      },
      id_servicio_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'servicios_ontrack',
          key: 'id'
        },
      },
      id_estatus_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'estatus_ontrack',
          key: 'id'
        },
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        }
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
    await queryInterface.addIndex('seguimiento_estatus_ontrack', ['id_servicio_ontrack']);
    await queryInterface.addIndex('seguimiento_estatus_ontrack', ['id_estatus_ontrack']);
    await queryInterface.addIndex('seguimiento_estatus_ontrack', ['id_usuario_registro']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('seguimiento_estatus_ontrack');
  }
};
