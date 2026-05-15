'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('atributos_ontrack', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      id_oficina_producto: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'oficinas_productos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_moneda_compra: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_moneda_venta: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      descripcion: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      precio: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      porcentaje_sobreventa: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      porcentaje_comisionista: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      fecha_vencimiento: {
        type: Sequelize.DATE(3),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE(3),
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE(3),
        allowNull: true
      },
      deletedAt: {
        type: Sequelize.DATE(3),
        allowNull: true,
        defaultValue: null
      }
    });

    // Índices
    await queryInterface.addIndex('atributos_ontrack', ['id_oficina_producto']);
    await queryInterface.addIndex('atributos_ontrack', ['id_moneda_compra']);
    await queryInterface.addIndex('atributos_ontrack', ['id_moneda_venta']);
    await queryInterface.addIndex('atributos_ontrack', ['id_usuario_registro']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('atributos_ontrack');
  }
};
