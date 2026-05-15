'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('pedidos_factura', 'id_servicio_ontrack', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'servicios_ontrack',
        key: 'id'
      },
      after: 'id_certificado',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pedidos_factura', 'id_servicio_ontrack');
  }
};
