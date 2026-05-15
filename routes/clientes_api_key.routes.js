'use strict'

let express = require('express');
let clientesApiKey = require('../controllers/clientes_api_key.controller');
let api =  express.Router();
let token = require('../middlewares/gentoken')

api.post('/clientesApiKey', token.validarToken, token.updateToken, clientesApiKey.store);
api.get('/clientesApiKey', token.validarToken, token.updateToken, clientesApiKey.index);
api.get('/clientesApiKey/:id', token.validarToken, token.updateToken, clientesApiKey.show);
api.put('/clientesApiKey/:id', token.validarToken, token.updateToken, clientesApiKey.update);
api.delete('/clientesApiKey/:id', token.validarToken, token.updateToken, clientesApiKey.destroy);
api.patch('/clientesApiKey/:id', token.validarToken, token.updateToken, clientesApiKey.restaurar);

module.exports = api;