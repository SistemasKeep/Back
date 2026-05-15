'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable('entidades_bancarias_proveedores'); 
    //await queryInterface.removeColumn('pagos', 'id_cuenta_bancaria');
    //await queryInterface.removeColumn('pagos_proveedor', 'id_cuenta_bancaria');
    await queryInterface.dropTable('cuentas_bancarias'); 
    await queryInterface.createTable('cuentas_bancarias_proveedores', { 
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true
      },
      id_proveedor: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'proveedores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_entidad_bancaria: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'entidades_bancarias',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_moneda: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      alias: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      numero_cuenta_banco: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      clabe: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        }
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
        defaultValue: null,
      }
    });
    await queryInterface.createTable('cuentas_bancarias_internas', { 
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true
      },
      id_entidad_bancaria: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'entidades_bancarias',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_datos_facturacion: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'datos_facturacion',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_moneda: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      alias: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      numero_cuenta_banco: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      clabe: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      caja_chica: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        }
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
        defaultValue: null,
      }
    });
    await queryInterface.addColumn('pagos', 'id_cuenta_bancaria_interna', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_bancarias_internas',
        key: 'id'
      },
    });
    await queryInterface.addColumn('pagos_proveedor', 'id_cuenta_bancaria_proveedor', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_bancarias_proveedores',
        key: 'id'
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pagos', 'id_cuenta_bancaria_interna');
    await queryInterface.removeColumn('pagos_proveedor', 'id_cuenta_bancaria_proveedor');
    await queryInterface.dropTable('cuentas_bancarias_proveedores'); 
    await queryInterface.dropTable('cuentas_bancarias_internas'); 
    await queryInterface.createTable('cuentas_bancarias', { 
      id: {
        autoIncrement: true,
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true
      },
      id_entidad_bancaria: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'entidades_bancarias',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_datos_facturacion: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'datos_facturacion',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_moneda: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      alias: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      numero_cuenta_banco: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      clabe: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      caja_chica: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      id_usuario_registro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        }
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
        defaultValue: null,
      }
    });
    await queryInterface.addColumn('pagos', 'id_cuenta_bancaria', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_bancarias',
        key: 'id'
      },
    });
    await queryInterface.addColumn('pagos_proveedor', 'id_cuenta_bancaria', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'cuentas_bancarias',
        key: 'id'
      },
    });
  }
};
