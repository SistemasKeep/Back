'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('carga_archivos', 'id_google', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'ruta'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('carga_archivos', 'id_google');
  }
};
