'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('servicios_ontrack', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      id_certificado: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'certificados',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_cliente: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_oficina_razon_social: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'oficinas_razones_sociales',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_marca: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'marcas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_moneda: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'monedas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_tipo_cambio_futuro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'tipos_cambio_futuro',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_proveedor: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'proveedores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      id_estado_origen: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'estados',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_estado_destino: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'estados',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_contacto: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'contactos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      id_estatus_ontrack: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'estatus_ontrack',
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
      no_operacion: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      ciudad_origen: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      ciudad_destino: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      fecha_salida: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
      fecha_llegada: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
      num_conocimiento: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      num_contenedor: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      nombre_transportista: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      telefono_transportista: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      correo_transportista: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      comentarios: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      estatus: {
        type: Sequelize.ENUM('N','F','C'),
        allowNull: false,
        defaultValue: 'N',
        comment: 'N => ACTIVO, F => FACTURADO, C => CANCELADO'
      },
      have_notificaciones: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      temporalidad: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: ''
      },
      keepro: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      correos: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      referencia_interna: {
        type: Sequelize.STRING(255),
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

    // Indexes
    await queryInterface.addIndex('servicios_ontrack', ['id_certificado']);
    await queryInterface.addIndex('servicios_ontrack', ['id_cliente']);
    await queryInterface.addIndex('servicios_ontrack', ['id_oficina_razon_social']);
    await queryInterface.addIndex('servicios_ontrack', ['id_marca']);
    await queryInterface.addIndex('servicios_ontrack', ['id_moneda']);
    await queryInterface.addIndex('servicios_ontrack', ['id_tipo_cambio_futuro']);
    await queryInterface.addIndex('servicios_ontrack', ['id_proveedor']);
    await queryInterface.addIndex('servicios_ontrack', ['id_estado_origen']);
    await queryInterface.addIndex('servicios_ontrack', ['id_estado_destino']);
    await queryInterface.addIndex('servicios_ontrack', ['id_contacto']);
    await queryInterface.addIndex('servicios_ontrack', ['id_estatus_ontrack']);
    await queryInterface.addIndex('servicios_ontrack', ['id_usuario_registro']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servicios_ontrack');
  }
};
