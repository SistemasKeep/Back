'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('certificados', 'suma_asegurada', {
      type: Sequelize.DECIMAL(20,6),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('certificados', 'suma_asegurada', {
      type: Sequelize.DECIMAL(15,6),
      allowNull: true
    });
  }
};
