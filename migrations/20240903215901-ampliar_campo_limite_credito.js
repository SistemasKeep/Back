'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('razones_sociales', 'limite_credito', {
      type: Sequelize.DECIMAL(15,3),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('razones_sociales', 'limite_credito', {
      type: Sequelize.DECIMAL(8,2),
      allowNull: true
    });
  }
};
