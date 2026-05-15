const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('contactos', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_oficina: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'oficinas',
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
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apellido_paterno: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apellido_materno: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    puesto: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    extension: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    enviar_correo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    comentarios: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    intereses: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    cumpleanos: {
      type: DataTypes.DATE,
      allowNull: true
    },
    parentesco: {
      type: DataTypes.ENUM('0','1','2'),
      allowNull: true,
      defaultValue: "0",
      comment: "0 => MAMÁ, 1 => PAPÁ, 2 => NINGUNO"
    },
    genero: {
      type: DataTypes.ENUM('0','1'),
      allowNull: true,
      defaultValue: "0",
      comment: "0 => HOMBRE, 1 => MUJER"
    },
    tipo_correo: {
      type: DataTypes.ENUM('0','1','2'),
      allowNull: true,
      defaultValue: "0",
      comment: "0 => COTIZACIÓN, 1 => NOTA DE CRÉDITO, 2 => FACTURACIÓN"
    },
    enviar_estado_cuenta: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    enviar_factura: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    enviar_certificado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    enviar_contactos_oficinas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    manera_enviar: {
      type: DataTypes.ENUM('S', 'Q', 'M'),
      allowNull: true,
      comment: 'S => SEMANAL, Q => QUINCENAL, M => MENSUAL'
    },
    dia_envio: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    recibir_reporte_operacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    email_rep_op_1: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email_rep_op_2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email_rep_op_3: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    es_usuario: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
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
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'contactos',
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
        name: "contactos_id_oficina_foreign",
        using: "BTREE",
        fields: [
          { name: "id_oficina" },
        ]
      },
      {
        name: "contactos_id_usuario_registro",
        using: "BTREE",
        fields: [
          { name: "id_usuario_registro" },
        ]
      },
    ]
  });
};
