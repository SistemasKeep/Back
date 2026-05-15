'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('poliza_detalles', 'tarifa_commoditie', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_deducible',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('poliza_detalles', 'tarifa_commoditie');
  }
};
