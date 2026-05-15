const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('detalle_certificados', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_certificado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'certificados',
        key: 'id'
      }
    },
    id_atributo_keepro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'atributos_keepro',
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
    tarifa_final_cliente: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: true
    },
    minimo_venta: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    tarifa_mediador: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    minimo_mediador: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    monto_iva: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    porcentaje_iva: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    descuento_porcentaje: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    descuento_monto: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    total: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    retencion_porcentaje: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    retencion_monto: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    subtotal_sobreventa: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    tarifa_compra: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    minimo_compra: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    costo_compra: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    profit: {
      type: DataTypes.DOUBLE(15,6),
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
    tableName: 'detalle_certificados',
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
        name: "fk_detalle_certificados_certificados1_idx",
        using: "BTREE",
        fields: [
          { name: "id_certificado" },
        ]
      },
      {
        name: "fk_detalle_certificados_atributos_keepro1_idx",
        using: "BTREE",
        fields: [
          { name: "id_atributo_keepro" },
        ]
      },
    ]
  });
};
