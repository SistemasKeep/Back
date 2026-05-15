const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('razones_sociales', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_pais: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_nacionalidad_timbrado: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'paises',
        key: 'id'
      }
    },
    id_regimen_fiscal: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regimenes_fiscal',
        key: 'id'
      }
    },
    id_uso_cfdi: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'usos_cfdi',
        key: 'id'
      }
    },
    id_metodo_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'metodos_pago',
        key: 'id'
      }
    },
    id_forma_pago: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'formas_pago',
        key: 'id'
      }
    },
    id_razon_bloqueo: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'razones_bloqueo',
        key: 'id'
      }
    },
    id_moneda_credito: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'monedas',
        key: 'id'
      }
    },
    id_marca_preferente: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'marcas',
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
    no_identificacion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    razon_social: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    limite_credito: {
      type: DataTypes.DECIMAL(15,3),
      allowNull: true
    },
    dias_credito: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    credito_validado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    tipo_persona: {
      type: DataTypes.ENUM('F', 'M'),
      allowNull: true,
      defaultValue: 'F',
      comment: 'F => FISICA, M => MORAL'
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
    tableName: 'razones_sociales',
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
        name: "fk_razones_sociales_paises1_idx",
        using: "BTREE",
        fields: [
          { name: "id_pais" },
        ]
      },
      {
        name: "razones_sociales_id_nacionalidad_timbrado_foreign_idx",
        using: "BTREE",
        fields: [
          { name: "id_nacionalidad_timbrado" },
        ]
      },
      {
        name: "fk_razones_sociales_regimenes_fiscal1_idx",
        using: "BTREE",
        fields: [
          { name: "id_regimen_fiscal" },
        ]
      },
      {
        name: "fk_razones_sociales_usos_cfdi1_idx",
        using: "BTREE",
        fields: [
          { name: "id_uso_cfdi" },
        ]
      },
      {
        name: "fk_razones_sociales_metodos_pago1_idx",
        using: "BTREE",
        fields: [
          { name: "id_metodo_pago" },
        ]
      },
      {
        name: "fk_razones_sociales_formas_pago1_idx",
        using: "BTREE",
        fields: [
          { name: "id_forma_pago" },
        ]
      },
      {
        name: "fk_razones_sociales_razones_bloqueo1_idx",
        using: "BTREE",
        fields: [
          { name: "id_razon_bloqueo" },
        ]
      },
      {
        name: "fk_razones_sociales_monedas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_moneda_credito" },
        ]
      },
      {
        name: "fk_razones_sociales_marcas1_idx",
        using: "BTREE",
        fields: [
          { name: "id_marca_preferente" },
        ]
      },
      {
        name: "fk_razones_sociales_usuarios1_idx",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
