const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('cliente_detalles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_comisionista: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'comisionistas',
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
    id_agente_credito_cobranza: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    id_agente_customer: {
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
    fecha_automatica: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    fecha_factura: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    autoemisor: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.STRING(600),
      allowNull: true
    },
    fecha_ultima_factura: {
      type: DataTypes.DATE(3),
      allowNull: true,
      defaultValue: null,
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
    tableName: 'cliente_detalles',
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
        name: "fk_cliente_detalles_comisionistas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_comisionista" },
        ]
      },
      {
        name: "fk_cliente_detalles_carga_archivos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_carga_archivo" },
        ]
      },
      {
        name: "cliente_detalles_id_mediador_mercantil_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_mediador_mercantil" },
        ]
      },
      {
        name: "fk_cliente_detalles_usuarios2_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_credito_cobranza" },
        ]
      },
      {
        name: "fk_cliente_detalles_usuarios3_idx",
        using: "BTREE",
        fields: [
          { name: "id_agente_customer" },
        ]
      },
      {
        name: "fk_cliente_detalles_usuarios4_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
