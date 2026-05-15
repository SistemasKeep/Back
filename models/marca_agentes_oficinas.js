const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('marca_agentes_oficinas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_oficina_cliente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'oficinas_cliente',
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
    grupo_whatsapp: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    clave: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reasignado_av_1: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    reasignado_av_2: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
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
    tableName: 'marca_agentes_oficinas',
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
        name: "fk_marca_agentes_oficinas_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_venta_1" },
        ]
      },
      {
        name: "fk_marca_agentes_oficinas_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_venta_2" },
        ]
      },
      {
        name: "fk_marca_agentes_oficinas_usuarios3_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_marca_agentes_oficinas_oficinas_cliente1_idx",
        using: "BTREE",
        fields: [
          { name: "id_oficina_cliente" },
        ]
      },
      {
        name: "fk_marca_agentes_oficinas_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "marca_agentes_oficinas_id_inside_sales_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_inside_sales" },
        ]
      },
    ]
  });
};
