const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('cfdis', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_uso_cfdi: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'usos_cfdi',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_metodo_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'metodos_pago',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_forma_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'formas_pago',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    id_motivo_cancelacion_factura: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'motivos_cancelacion_facturas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    xml: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    folio_fiscal: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    acuse_cancelacion: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    folio_cancelacion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cadena_original: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
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
    tableName: 'cfdis',
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
        name: "id_uso_cfdi",
        using: "BTREE",
        fields: [
          { name: "id_uso_cfdi" },
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
        name: "id_forma_pago",
        using: "BTREE",
        fields: [
          { name: "id_forma_pago" },
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
