const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('marcas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_domicilio: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'domicilios',
        key: 'id'
      }
    },
    id_dato_facturacion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'datos_facturacion',
        key: 'id'
      }
    },
    id_pais: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
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
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    clave: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    allow_facturacion: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    gard_pcnt: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gard_pcnt_2: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reporte_global: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    contacto: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mostar_en_presupuesto: {
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
    tableName: 'marcas',
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
        name: "fk_marcas_domicilios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_domicilio" },
        ]
      },
      {
        name: "marcas_id_dato_facturacion_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_dato_facturacion" },
        ]
      },
      {
        name: "fk_marcas_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais" },
        ]
      },
      {
        name: "fk_marcas_carga_archivos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_carga_archivo" },
        ]
      },
      {
        name: "fk_marcas_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
