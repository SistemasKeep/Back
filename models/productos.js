const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('productos', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_productos_unidades_medida: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'productos_unidades_medida',
        key: 'id'
      }
    },
    id_moneda_compra: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_moneda_venta: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'monedas',
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
    id_marca: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'marcas',
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
    id_tipo_cobertura: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'tipos_cobertura',
        key: 'id'
      }
    },
    clave: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    leyenda_cfdi: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    clave_producto_servicio_sat: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    producto_servicio_sat: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    visualizar_venta: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    tiene_iva: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    estatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    iva: {
      type: DataTypes.DECIMAL(15,4),
      allowNull: true
    },
    precio: {
      type: DataTypes.DECIMAL(15,4),
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
    tableName: 'productos',
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
        name: "productos_id_productos_unidades_medida_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_productos_unidades_medida" },
        ]
      },
      {
        name: "fk_productos_monedas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda_compra" },
        ]
      },
      {
        name: "fk_productos_monedas2_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda_venta" },
        ]
      },
      {
        name: "fk_productos_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "fk_productos_carga_archivos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_carga_archivo" },
        ]
      },
      {
        name: "fk_productos_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_productos_tipos_cobertura1_idx",
        using: "BTREE",
        fields: [
          { name: "id_tipo_cobertura" },
        ]
      },
      {
        name: "fk_productos_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais" },
        ]
      }
    ]
  });
};
