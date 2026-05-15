'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV;
const db = {};

const configs = {
  'development': {
    "username": process.env.DB_USERNAME_DEVELOPMENT,
    "password": process.env.DB_PASSWORD_DEVELOPMENT,
    "database": process.env.DB_DATABASE_DEVELOPMENT,
    "host": process.env.DB_HOST_DEVELOPMENT,
    "dialect": process.env.DB_DIALECT_DEVELOPMENT,
    'timezone': '-06:00',
    "logging": false
  },
  'test': {
    "username": process.env.DB_USERNAME_TEST,
    "password": process.env.DB_PASSWORD_TEST,
    "database": process.env.DB_DATABASE_TEST,
    "host": process.env.DB_HOST_TEST,
    "dialect": process.env.DB_DIALECT_TEST,
    'timezone': '-06:00',
    "logging": false
  },
  'producction': {
    "username": process.env.DB_USERNAME_PRODUCCTION,
    "password": process.env.DB_PASSWORD_PRODUCCTION,
    "database": process.env.DB_DATABASE_PRODUCCTION,
    "host": process.env.DB_HOST_PRODUCCTION,
    "dialect": process.env.DB_DIALECT_PRODUCCTION,
    'timezone': '-06:00',
    "logging": false
  }
};
const config = configs[env];
let sequelize;
sequelize = new Sequelize(config.database, config.username, config.password, config);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    if(file != 'relaciones.js'){
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    }
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
require('./relaciones.js')(db.sequelize.models);


module.exports = {
  db
}
