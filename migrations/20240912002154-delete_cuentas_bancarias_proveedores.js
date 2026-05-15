'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pagos_proveedor', 'id_cuenta_bancaria_proveedor');
    await queryInterface.addColumn('pagos_proveedor', 'id_cuenta_bancaria_interna', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_bancarias_internas',
        key: 'id'
      },
    });
  },

  async down (queryInterface, Sequelize) {
  }
};
