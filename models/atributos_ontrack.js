const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('atributos_ontrack', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_oficina_producto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'oficinas_productos',
        key: 'id'
      }
    },
    id_moneda_compra: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_moneda_venta: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'monedas',
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
    descripcion: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    precio: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    porcentaje_sobreventa: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    porcentaje_comisionista: {
      type: DataTypes.DOUBLE(15,6),
      allowNull: false
    },
    fecha_vencimiento: {
      type: DataTypes.DATE(3),
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
    tableName: 'atributos_ontrack',
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
        name: "id_oficina_producto",
        using: "BTREE",
        fields: [
          { name: "id_oficina_producto" },
        ]
      },
      {
        name: "id_moneda_compra",
        using: "BTREE",
        fields: [
          { name: "id_moneda_compra" },
        ]
      },
      {
        name: "id_moneda_venta",
        using: "BTREE",
        fields: [
          { name: "id_moneda_venta" },
        ]
      },
      {
        name: "id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
