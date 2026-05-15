const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pagos_proveedor', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_cuenta_bancaria_interna: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'cuentas_bancarias_internas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'marcas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_moneda: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'monedas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    id_metodo_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'metodos_pago',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    folio: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    impuestos: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    referencia: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fecha_pago: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    comentarios: {
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
      defaultValue: null
    }
  }, {
    sequelize,
    tableName: 'pagos_proveedor',
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
        name: "id_cuenta_bancaria_interna",
        using: "BTREE",
        fields: [
          { name: "id_cuenta_bancaria_interna" },
        ]
      },
      {
        name: "id_marca",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "id_moneda",
        using: "BTREE",
        fields: [
          { name: "id_moneda" },
        ]
      },
      {
        name: "id_metodo_pago",
        using: "BTREE",
        fields: [
          { name: "id_metodo_pago" },
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
