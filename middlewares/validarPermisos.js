'use strict'

const {db} = require('../models');


exports.addPermiso = function (nombre, tipo) {
    return function (req, res, next) {
        req.nombrePermiso = nombre;
        req.tipoPermiso = tipo;
        next();
    };
};

exports.validarPermiso = async function(req, res, next){
    let permisoValidado = false;
    let idRolesUsuario = [];
    if(req.usuario.id == 1){
        next();
    }else{
        const rolesUsuario = await db.sequelize.models.roles_usuarios.findAll({
            where: {
                [db.Sequelize.Op.and]: {
                    id_usuario: req.usuario.id,
                    deletedAt: null
                }
            }
        });
    
        //obtiene solamente el id del rol para posteriormente validar los permisos de dicho rol
        await rolesUsuario.forEach(rol => {
            idRolesUsuario.push(rol.id_role);
        });
    
        // busca el permiso de la acción específica.
        let idPermiso = await db.sequelize.models.permisos.findAll({
            where: {
                [db.Sequelize.Op.and]: {
                    name: req.nombrePermiso,
                    tipo: req.tipoPermiso,
                    deletedAt: null
                }
            }
        });
        
        if(idPermiso.length > 0){
            idPermiso = idPermiso[0].id;
        }else{
            return res.status(400).send({status:false , msg:'Ningun rol registrado cuenta con un permiso para esta acción'});
        }
        
        //busca el permiso específico en todos los roles del usuario
        for (let i = 0; i < idRolesUsuario.length; i++) {
            let permiso = await db.sequelize.models.permisos_roles.findAll({
                where: {
                    [db.Sequelize.Op.and]: {
                        id_permiso: idPermiso,
                        id_role: idRolesUsuario[i],
                        deletedAt: null
                    }
                }
            });
    
            if(permiso.length > 0){
                permisoValidado = true;
            }
        }
    
        if(permisoValidado){
            next();
        }else{
            return res.status(400).send({status:false , msg:'El usuario no cuenta con ningún rol con el permiso para realizar esa acción'});
        }
    }
}