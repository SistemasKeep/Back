'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('certificados', 'descripcion_carga', {
      type: Sequelize.STRING(1600),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('certificados', 'descripcion_carga', {
      type: Sequelize.STRING(600),
      allowNull: true
    });
  }
};
