const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tpls', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    id_usuario_registro: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    certificado: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    correo_draft: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    correo_certificado: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    correo_draft_autoemisor: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    correo_certificado_autoemisor: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    terminos_condiciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nombre_terminos_condiciones: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
  }, {
    sequelize,
    tableName: 'tpls',
    timestamps: false,
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
    ]
  });
};
