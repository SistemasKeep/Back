class ValidKeepro{
    constructor(){}

    static async verif(req, res, next){
        const parametros = req.body;
        if(req.usuario.id == 1){
            return next();
        }
        if((req.usuario.es_autoemisor === true || req.usuario.es_mediador_mercantil === true) && (parametros.keepro === 0)){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
        } else if((req.usuario.es_autoemisor === true && req.usuario.es_colaborador != true) && (parametros.keepro == 0)){
			return res.status(400).send({ status: false, msg: "Parametro keepro inválido." });
        } else{
            next();
        }
    }

}

module.exports = {
	ValidKeepro
}