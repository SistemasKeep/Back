const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('marca_agentes_clientes', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'marcas',
        key: 'id'
      }
    },
    id_agente_operativo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_agente_venta_1: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_agente_venta_2: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_inside_sales: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
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
    facturacion_promedio: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    profit_promedio: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    grupo_whatsapp: {
      type: DataTypes.STRING(255),
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
    tableName: 'marca_agentes_clientes',
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
        name: "fk_timestamps_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_clientes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_cliente" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_operativo" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_venta_1" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_usuarios3_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_venta_2" },
        ]
      },
      {
        name: "fk_marca_agentes_clientes_usuarios4_idx",
        using: "BTREE",
        fields: [
          { name: "id_inside_sales" },
        ]
      },
    ]
  });
};
