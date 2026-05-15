'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('permisos', 'tipo', {
      type: Sequelize.ENUM('C', 'L', 'A', 'E', 'R', 'M'),
      allowNull: false,
      defaultValue: 'L',
      comment: 'C => Crear, L => Leer, A => Actualizar, E => Eliminar, R => Restaurar, M =>Acceso al modulo. Por default se setea "L"'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('permisos', 'tipo', {
      type: Sequelize.ENUM('C', 'L', 'A', 'E', 'R'),
      allowNull: false,
      defaultValue: 'L',
      comment: 'C => Crear, L => Leer, A => Actualizar, E => Eliminar, R => Restaurar. Por default se setea "L"'
    });
  }
};
