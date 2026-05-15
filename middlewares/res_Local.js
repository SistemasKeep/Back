'use strict'

exports.resLocal = function(){
	let respuesta = {
		statusCode: 200,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		send(data) {
			this.body = data;
			return this;
		},
		json(data) {
			this.body = data;
			return this;
		}
	};
	return respuesta;
};