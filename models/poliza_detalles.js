const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('poliza_detalles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_poliza: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'polizas',
        key: 'id'
      }
    },
    id_tpl: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'tpls',
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
    inicio_vigencia: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    fin_vigencia: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    no_poliza: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    liga_pdf_tyc: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tarifa_compra: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    minimo_compra: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    tarifa_compra_deducible: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    minimo_compra_deducible: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    tarifa_venta: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    tarifa_venta_deducible: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    minimo_venta: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    minimo_venta_deducible: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: false
    },
    limite_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    limite_minimo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_redondo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    can_deducible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    tarifa_commoditie: {
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
    tableName: 'poliza_detalles',
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
        name: "fk_poliza_detalles_polizas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_poliza" },
        ]
      },
      {
        name: "fk_poliza_detalles_tpls1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tpl" },
        ]
      },
    ]
  });
};
