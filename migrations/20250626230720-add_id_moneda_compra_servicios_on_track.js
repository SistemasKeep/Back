'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('servicios_ontrack', 'id_moneda_compra', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 2,
      references: {
        model: 'monedas',
        key: 'id'
      },
      after: 'id_moneda',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('servicios_ontrack', 'id_moneda_compra');
  }
};