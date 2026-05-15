'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('proveedores', 'clave', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: "Clave distintiva del proveedor para teclearla en el selector de proveedores de las pantallas de compras y cuentas por pagar"
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('proveedores', 'clave', {
      type: Sequelize.STRING(10),
      allowNull: false,
      comment: "Clave distintiva del proveedor para teclearla en el selector de proveedores de las pantallas de compras y cuentas por pagar"
    });
  }
};