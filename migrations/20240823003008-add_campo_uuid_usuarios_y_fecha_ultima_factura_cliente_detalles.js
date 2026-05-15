'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'uuid', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    await queryInterface.addColumn('cliente_detalles', 'fecha_ultima_factura', {
      type: Sequelize.DATE(3),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'uuid');
    await queryInterface.removeColumn('cliente_detalles', 'fecha_ultima_factura');
  }
};
