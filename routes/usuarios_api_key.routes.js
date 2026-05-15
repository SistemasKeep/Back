'use strict'

let express = require('express');
let usuariosApiKey = require('../controllers/usuarios_api_key.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')

api.post('/usuariosApiKey', token.validarToken, token.updateToken, usuariosApiKey.store);
api.get('/usuariosApiKey', token.validarToken, token.updateToken, usuariosApiKey.index);
api.get('/usuariosApiKey/:id', token.validarToken, token.updateToken, usuariosApiKey.show);
api.put('/usuariosApiKey/:id', token.validarToken, token.updateToken, usuariosApiKey.update);
api.delete('/usuariosApiKey/:id', token.validarToken, token.updateToken, usuariosApiKey.destroy);
api.patch('/usuariosApiKey/:id', token.validarToken, token.updateToken, usuariosApiKey.restaurar);

module.exports = api;