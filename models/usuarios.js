const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuarios', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    id_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    id_oficina: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'oficinas',
        key: 'id'
      }
    },
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'marcas',
        key: 'id'
      }
    },
    id_proveedor: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_carga_archivo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'carga_archivos',
        key: 'id'
      }
    },
    id_mediador_mercantil: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'comisionistas',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "email_UNIQUE"
    },
    es_mediador_mercantil: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    es_colaborador: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    es_autoemisor: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    es_proveedor: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    es_nuevo_autoemisor: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    hora_emision_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    google_code: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fecha_terminos_condiciones: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    envio_automatico: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    code_pass: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    key_str: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fecha_code_gen: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    filtro_visualizacion: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
      defaultValue: null,
    }
  }, {
    sequelize,
    tableName: 'usuarios',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "email_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "fk_usuarios_clientes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_cliente" },
        ]
      },
      {
        name: "fk_usuarios_oficinas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_oficina" },
        ]
      },
      {
        name: "fk_usuarios_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "fk_usuarios_proveedores1_idx",
        using: "BTREE",
        fields: [
          { name: "id_proveedor" },
        ]
      },
      {
        name: "fk_usuarios_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_usuarios_carga_archivos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_carga_archivo" },
        ]
      },
      {
        name: "usuarios_id_mediador_mercantil_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_mediador_mercantil" },
        ]
      },
    ]
  });
};
