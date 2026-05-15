'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('clientes', 'can_tc_manual', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'nombre',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('clientes', 'can_tc_manual');
  }
};
