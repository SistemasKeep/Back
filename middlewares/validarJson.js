exports.validarJson =async function(err, req, res, next){
  if (req.headers['content-type'] === 'application/json') {
    res.status(400).json({ error: 'El cuerpo de la solicitud no es un JSON válido' });
  }else{
    res.status(500).json({ error: err.stack });
  }
}