'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('oc_facturas', { 
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true
      },
      id_orden_compra: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'ordenes_compra',
          key: 'id'
        },
      },
      id_factura: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'facturas',
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
        defaultValue: null,
      }
    });

    // Índices
    await queryInterface.addIndex('oc_facturas', ['id_orden_compra']);
    await queryInterface.addIndex('oc_facturas', ['id_factura']);
    await queryInterface.addIndex('oc_facturas', ['id_usuario_registro']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('oc_facturas');
  }
};
