'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable('analisis_financiero');
    await queryInterface.dropTable('analisis_financiero_prospecto');
    await queryInterface.removeColumn('proveedores', 'id_proveedor_grupo');
    await queryInterface.dropTable('proveedor_grupos');
    await queryInterface.removeColumn('clientes', 'id_campania');
    await queryInterface.dropTable('campanias');
    await queryInterface.dropTable('cotizaciones_detalles');
    await queryInterface.dropTable('cotizaciones');
  },

  async down (queryInterface, Sequelize) {
  }
};
