'use strict'
//se Carga las paqueterias necesarias para trabajar 
require('express-async-errors');
var express = require('express')
const cors = require('cors');
var bodyParser = require('body-parser')
var app = express()
const fileUpload = require('express-fileupload')
var Ddos = require('./middlewares/ddos/index') 
var ddos = new Ddos({burst:10, limit:1000, testmode:false})
const { validarJson } = require("./middlewares/validarJson")
const { validarMantenimiento } = require("./middlewares/validMantenimiento")
const { sendMailError } = require('./controllers/errores_sistema.controllers')
const fs = require('fs');
const path = require('path');
const pathRutas = __dirname + "/routes"
const basename = path.basename(pathRutas);
const pathRutasKeepro = __dirname + "/routes/keepro"
const basenameKeepro = path.basename(pathRutasKeepro);
const pathRutasApi = __dirname + "/routes/api"
const basenameApi = path.basename(pathRutasApi);
const pathRutasOperaciones = __dirname + "/routes/operaciones"
const basenameOperaciones = path.basename(pathRutasOperaciones);

const corsOptions = {
  origin: process.env.HOSTSERVER,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-token', 'x-api-key', 'x-id-cliente'],
  exposedHeaders: ['x-token'] 
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
//app.use(ddos.express)
app.use(fileUpload({ limits: { fileSize: 100 * 1024 * 1024 }}))

app.use(validarJson);
app.use(validarMantenimiento);

app.use(function(req, res, next) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin , X-Requested-With , Content-Type , Accept , Access-Control-Allow-Request-Method')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT , DELETE')
    res.setHeader('Allow', 'GET, POST, OPTIONS, PUT , DELETE')
    next()
})

//Se cargan las rutas ubicadas en la carpeta routes
fs.readdirSync(pathRutas)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    if(file){
        //Se le define la ruta /api a las variables que contienen los metodos de cada modelo de gestion de base de datos
        //por cada archivo que exita en la carpeta routes se debe ejecutar este comando para habilitar la ruta y sea funcional sus metodos
        //no importa el contenido del primer parametro "/api", pero para llamar los metodos de esos modelos se debe poner la ruta que se introdujo 
        //para hacer uso de los metos la ruta hasta aqui es "http://localhost:5050/api"
        let ruta = require(path.join(pathRutas, file));
        app.use('/api', ruta)
    }
  });


//Se cargan las rutas ubicadas en la carpeta routes/keepro
fs.readdirSync(pathRutasKeepro)
.filter(file => {
  return (
    file.indexOf('.') !== 0 &&
    file !== basenameKeepro &&
    file.slice(-3) === '.js'
  );
})
.forEach(file => {
  if(file){
      //Se le define la ruta /api a las variables que contienen los metodos de cada modelo de gestion de base de datos
      //por cada archivo que exita en la carpeta routes se debe ejecutar este comando para habilitar la ruta y sea funcional sus metodos
      //no importa el contenido del primer parametro "/api", pero para llamar los metodos de esos modelos se debe poner la ruta que se introdujo 
      //para hacer uso de los metos la ruta hasta aqui es "http://localhost:5050/api"
      let ruta = require(path.join(pathRutasKeepro, file));
      app.use('/api/keepro', ruta)
  }
});

//Se cargan las rutas ubicadas en la carpeta routes/keepro
fs.readdirSync(pathRutasOperaciones)
.filter(file => {
  return (
    file.indexOf('.') !== 0 &&
    file !== basenameOperaciones &&
    file.slice(-3) === '.js'
  );
})
.forEach(file => {
  if(file){
      //Se le define la ruta /api a las variables que contienen los metodos de cada modelo de gestion de base de datos
      //por cada archivo que exita en la carpeta routes se debe ejecutar este comando para habilitar la ruta y sea funcional sus metodos
      //no importa el contenido del primer parametro "/api", pero para llamar los metodos de esos modelos se debe poner la ruta que se introdujo 
      //para hacer uso de los metos la ruta hasta aqui es "http://localhost:5050/api"
      let ruta = require(path.join(pathRutasOperaciones, file));
      app.use('/api/operaciones', ruta)
  }
});

//Se cargan las rutas ubicadas en la carpeta routes/api
fs.readdirSync(pathRutasApi)
.filter(file => {
  return (
    file.indexOf('.') !== 0 &&
    file !== basenameApi &&
    file.slice(-3) === '.js'
  );
})
.forEach(file => {
  if(file){
      //Se le define la ruta /api a las variables que contienen los metodos de cada modelo de gestion de base de datos
      //por cada archivo que exita en la carpeta routes se debe ejecutar este comando para habilitar la ruta y sea funcional sus metodos
      //no importa el contenido del primer parametro "/api", pero para llamar los metodos de esos modelos se debe poner la ruta que se introdujo 
      //para hacer uso de los metos la ruta hasta aqui es "http://localhost:5050/api"
      let ruta = require(path.join(pathRutasApi, file));
      app.use('/api/KeeproOpen', ruta)
  }
});


//Carga de funciones automáticas
const carpetaFuncionesAuto = path.join(__dirname, 'funciones_automaticas');
fs.readdir(carpetaFuncionesAuto, (err, files) => {
  if (err) {
      return console.error('No se pudo leer la carpeta de funciones automáticas', err);
  }

  const jsFiles = files.filter(file => file.endsWith('.js'));
  jsFiles.forEach(file => {
      const filePath = path.join(carpetaFuncionesAuto, file);
      require(filePath);
  });
});

//Errores 404, cualquier otra ruta despues de "http://localhost:5050" que no sea /api, sea cual sea el tipo de consulta
//dara error 
//las consultas son:

//get: obtener datos del servidor
app.get('*', function(req, res){
    res.status(404).send({status:false , msg:'ENDPOINT NO EXISTENTE'})
})
//post: enviar datos al servidor
app.post('*', function(req, res){
    res.status(404).send({status:false , msg:'ENDPOINT NO EXISTENTE'})
})
//put: actualizar datos del servidor
app.put('*', function(req, res){
    res.status(404).send({status:false , msg:'ENDPOINT NO EXISTENTE'})
})
//delete: eliminar datos del servidor
app.delete('*', function(req, res){
    res.status(404).send({status:false , msg:'ENDPOINT NO EXISTENTE'})
})
//patch: eliminar datos del servidor
app.patch('*', function(req, res){
    res.status(404).send({status:false , msg:'ENDPOINT NO EXISTENTE'})
})

// Manejo global de errores
app.use((err, req, res, next) => {
  sendMailError({message: err.message, stack: err.stack}, ['kpsoft80@gmail.com'])
  console.log("Mensaje:",err.message,"Stack:",err.stack )
  try {
    res.status(500).json({ status: false, message: err.toString() });
  } catch (error) {
    console.log("Mensaje:",err.message,"Stack:",err.stack )
  }
});

process.on('unhandledRejection', (reason, promise) => {
  sendMailError({message: reason.message, stack: reason.stack}, ['kpsoft80@gmail.com'])
  console.log("Mensaje:",reason.message,"Stack:",reason.stack )
  try {
    console.log("Mensaje:",reason.message,"Stack:",reason.stack )
  } catch (error) {
    console.log("Mensaje:",reason.message,"Stack:",reason.stack )
  }
});

process.on('uncaughtException', (error) => {
  sendMailError({message: error.message, stack: error.stack}, ['kpsoft80@gmail.com'])
  console.log("Mensaje:",error.message,"Stack:",error.stack )
  try {
    console.log("Mensaje:",error.message,"Stack:",error.stack )
  } catch (error) {
    console.log("Mensaje:",error.message,"Stack:",error.stack )
  }
});



//se exporta el objeto app para hacerlo global entre el proyecto
module.exports = app