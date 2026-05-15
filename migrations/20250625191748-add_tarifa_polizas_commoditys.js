'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('polizas_commoditys', 'tarifa', {
      type: Sequelize.DOUBLE(15,6),
      allowNull: true,
      after: 'is_sensible_robo'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('polizas_commoditys', 'tarifa');
  }
};
