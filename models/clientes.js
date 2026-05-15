const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('clientes', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_tipo_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'tipos_cliente',
        key: 'id'
      }
    },
    id_estado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'estados',
        key: 'id'
      }
    },
    id_fuente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'fuentes',
        key: 'id'
      }
    },
    id_oficina_interno: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'oficinas',
        key: 'id'
      }
    },
    id_categoria_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'categorias_cliente',
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
    id_detalle_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'cliente_detalles',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    can_tc_manual: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    cliente_prospecto: {
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
    tableName: 'clientes',
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
        name: "fk_clientes_tipos_cliente1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tipo_cliente" },
        ]
      },
      {
        name: "fk_clientes_estados1_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado" },
        ]
      },
      {
        name: "fk_clientes_oficinas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_oficina_interno" },
        ]
      },
      {
        name: "fk_clientes_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "cliente_id_categoria_cliente",
        using: "BTREE",
        fields: [
          { name: "id_categoria_cliente" },
        ]
      },
      {
        name: "clientes_id_detalle_cliente_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_detalle_cliente" },
        ]
      },
    ]
  });
};
