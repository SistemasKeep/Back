'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('contactos', 'manera_enviar', {
      type: Sequelize.ENUM('S', 'Q', 'M'),
      allowNull: true,
      comment: 'S => SEMANAL, Q => QUINCENAL, M => MENSUAL'
    });

    await queryInterface.changeColumn('contactos', 'dia_envio', {
      type: Sequelize.INTEGER(11),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('contactos', 'manera_enviar', {
      type: Sequelize.ENUM('S', 'Q', 'M'),
      allowNull: false,
      defaultValue: 'S',
      comment: 'S => SEMANAL, Q => QUINCENAL, M => MENSUAL'
    });

    await queryInterface.changeColumn('contactos', 'dia_envio', {
      type: Sequelize.INTEGER(11),
      allowNull: false
    });
  }
};
