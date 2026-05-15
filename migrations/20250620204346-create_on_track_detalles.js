'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('servicios_ontrack_detalles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      id_servicio_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'servicios_ontrack',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_atributo_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'atributos_ontrack',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_producto: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'productos',
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
      cantidad: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      monto_iva: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      porcentaje_iva: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      descuento_porcentaje: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      descuento_monto: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      total: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      retencion_porcentaje: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      retencion_monto: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      subtotal_sobreventa: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      costo_compra: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      profit: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
      },
      cortesia: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      precio_unitario: {
        type: Sequelize.DOUBLE(15, 6),
        allowNull: false
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
    await queryInterface.addIndex('servicios_ontrack_detalles', ['id_servicio_ontrack']);
    await queryInterface.addIndex('servicios_ontrack_detalles', ['id_atributo_ontrack']);
    await queryInterface.addIndex('servicios_ontrack_detalles', ['id_producto']);
    await queryInterface.addIndex('servicios_ontrack_detalles', ['id_usuario_registro']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servicios_ontrack_detalles');
  }
};
