'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable('siniestros_documento_general');
    await queryInterface.dropTable('siniestros_tramo');
    await queryInterface.dropTable('siniestros_historico_correos');
    await queryInterface.dropTable('siniestros_expediente'); 
    await queryInterface.dropTable('siniestros_contacto'); 
    await queryInterface.dropTable('siniestros'); 
    await queryInterface.dropTable('tipo_embalaje'); 
    await queryInterface.dropTable('agencia_aduanal'); 
    await queryInterface.dropTable('tipo_contacto');  
    await queryInterface.dropTable('responsables'); 
    await queryInterface.dropTable('siniestros_documento_etapa');
    await queryInterface.dropTable('siniestros_etapas'); 
    await queryInterface.dropTable('siniestros_historico');
    await queryInterface.dropTable('siniestros_documento');  
    await queryInterface.dropTable('siniestros_etapas'); 
    await queryInterface.dropTable('siniestros_tipo'); 
    await queryInterface.dropTable('siniestros_tipo_tramo'); 
    await queryInterface.dropTable('siniestros_detalle'); 
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
