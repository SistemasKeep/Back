'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable('categorias_estatus_seguimientos'); 
    await queryInterface.dropTable('categorias_tipos_seguimientos'); 
    await queryInterface.dropTable('tipos_seguimientos'); 
    await queryInterface.dropTable('seguimientos_documentos_generales'); 
    await queryInterface.dropTable('estatus_seguimientos'); 
    await queryInterface.dropTable('categorias_seguimientos'); 
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
