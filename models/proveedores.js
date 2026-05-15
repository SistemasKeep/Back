const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('proveedores', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_carga_archivo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'carga_archivos',
        key: 'id'
      }
    },
    id_moneda: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_domicilio: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'domicilios',
        key: 'id'
      }
    },
    id_conceptos_presupuesto: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'conceptos_presupuesto',
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
    id_nacionalidad: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
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
    id_almacen: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'almacenes',
        key: 'id'
      }
    },
    id_proveedor_tipo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'proveedor_tipos',
        key: 'id'
      }
    },
    id_estado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'estados',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    clave: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Clave distintiva del proveedor para teclearla en el selector de proveedores de las pantallas de compras y cuentas por pagar"
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    telefono_2: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    nombre_fiscal: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    rfc: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    nombre_comercial: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tipo: {
      type: DataTypes.ENUM('CR', 'CO'),
      allowNull: false,
      defaultValue: 'CR',
      comment: 'CR => CREDITO, CO => CONTADO'
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    porcentaje: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dias_planeacion: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    validado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    iva: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    generar_iva: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    dias_credito: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    limite_credito: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    descuento: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    monto: {
      type: DataTypes.DECIMAL(15,6),
      allowNull: true
    },
    plazo: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nacional_extranjero: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    dir_internet: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    maquilador: {
      type: DataTypes.BOOLEAN,
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
      defaultValue: null,
    }
  }, {
    sequelize,
    tableName: 'proveedores',
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
        name: "fk_proveedores_conceptos_presupuesto_idx",
        using: "BTREE",
        fields: [
          { name: "id_conceptos_presupuesto" },
        ]
      },
      {
        name: "fk_proveedores_monedas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda" },
        ]
      },
      {
        name: "proveedores_id_domicilio_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_domicilio" },
        ]
      },
      {
        name: "fk_proveedores_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca" },
        ]
      },
      {
        name: "fk_proveedores_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_nacionalidad" },
        ]
      },
      {
        name: "fk_proveedores_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
      {
        name: "fk_proveedores_proveedor_tipos1_idx",
        using: "BTREE",
        fields: [
          { name: "id_proveedor_tipo" },
        ]
      },
      {
        name: "fk_proveedores_almacenes1_idx",
        using: "BTREE",
        fields: [
          { name: "id_almacen" },
        ]
      },
      {
        name: "proveedores_id_estado_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_estado" },
        ]
      },
      {
        name: "proveedores_id_cuenta_bancaria_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_cuenta_bancaria" },
        ]
      },
      {
        name: "proveedores_id_carga_archivo_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_carga_archivo" },
        ]
      },
    ]
  });
};
