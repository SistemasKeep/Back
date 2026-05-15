'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('pagos_proveedor', 'comentarios', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('pagos', 'comentarios', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('notas_credito', 'comentarios', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.addColumn('datos_facturacion', 'tipo_persona', {
      type: Sequelize.ENUM('F', 'M'),
      allowNull: true,
      defaultValue: 'F',
      comment: 'F => FISICA, M => MORAL'
    });
    await queryInterface.removeColumn('datos_facturacion', 'id_regimen_fiscal');
    await queryInterface.addColumn('datos_facturacion', 'id_regimen_fiscal', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
        key: 'id'
      }
    });
    await queryInterface.addColumn('razones_sociales', 'tipo_persona', {
      type: Sequelize.ENUM('F', 'M'),
      allowNull: true,
      defaultValue: 'F',
      comment: 'F => FISICA, M => MORAL'
    });
    await queryInterface.removeColumn('razones_sociales', 'id_regimen_fiscal');
    await queryInterface.addColumn('razones_sociales', 'id_regimen_fiscal', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
        key: 'id'
      }
    });
    await queryInterface.addColumn('regimenes_fiscal', 'tipo_persona', {
      type: Sequelize.ENUM('F', 'M', 'FM'),
      allowNull: true,
      defaultValue: 'FM',
      comment: 'F => FISICA, M => MORAL, FM => FISICA y MORAL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pagos_proveedor', 'comentarios');
    await queryInterface.removeColumn('pagos', 'comentarios');
    await queryInterface.removeColumn('notas_credito', 'comentarios');

    await queryInterface.removeColumn('datos_facturacion', 'tipo_persona');
    await queryInterface.removeColumn('razones_sociales', 'tipo_persona');
    await queryInterface.removeColumn('regimenes_fiscal', 'tipo_persona');

    await queryInterface.removeColumn('datos_facturacion', 'id_regimen_fiscal');
    await queryInterface.addColumn('datos_facturacion', 'id_regimen_fiscal', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
        key: 'id'
      }
    });
    await queryInterface.removeColumn('razones_sociales', 'id_regimen_fiscal');
    await queryInterface.addColumn('razones_sociales', 'id_regimen_fiscal', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
        key: 'id'
      }
    });
  }
};
