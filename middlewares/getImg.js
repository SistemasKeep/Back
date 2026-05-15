const fs = require('fs').promises;
const path = require('path');

async function draft(tpl,isCertificado){
    if(isCertificado){
        return tpl.replace(/\{\{\$isDraft\}\}/g, '');
    }
    const img = await getImg('middlewares/img/draft.txt')
    const draftImg = `<img src="data:image/png;base64,${img}" style="position: absolute; margin:auto; top:0; left:0; right:0; bottom:0; opacity: 0.3; height: 630px">`
    return tpl.replace(/\{\{\$isDraft\}\}/g, draftImg);
}

async function noValido(tpl){
    const img = await getImg('middlewares/img/noValido.txt')
    const draftImg = `<img src="data:image/png;base64,${img}" style="position: absolute; margin:auto; top:0; left:0; right:0; bottom:0; opacity: 0.3; height: 630px">`
    return tpl.replace(/\{\{\$isDraft\}\}/g, draftImg);
}

async function cancelada(tpl,cancelada){
    if(!cancelada){
        return tpl.replace(/\{\{\$isDraft\}\}/g, '');
    }
    const img = await getImg('middlewares/img/cancelar.txt')
    const canceladaImg = `<img src="data:image/png;base64,${img}" style="position: absolute; margin:auto; top:0; left:0; right:0; bottom:0; opacity: 0.6; height: 600px">`
    return tpl.replace(/\{\{\$isDraft\}\}/g, canceladaImg);
}

async function cancelado(tpl,cancelada){
    if(!cancelada){
        return tpl.replace(/\{\{\$isCancelada\}\}/g, '');
    }
    const img = await getImg('middlewares/img/cancelar.txt')
    const canceladaImg = `<img src="data:image/png;base64,${img}" style="position: absolute; margin:auto; top:0; left:0; right:0; bottom:0; opacity: 0.6; height: 600px">`
    return tpl.replace(/\{\{\$isCancelada\}\}/g, canceladaImg);
}

async function getImg(pathImg) {
    const filePath = path.resolve(pathImg)
    return await fs.readFile(filePath, 'utf-8');
}

async function onTrack(){
    const img = await getImg('middlewares/img/onTrack.txt')
    return img
}

async function keepro(){
    const img = await getImg('middlewares/img/keepro.txt')
    return img
}

module.exports = {
    draft,
    noValido,
    cancelada,
    cancelado,
    keepro,
    onTrack
}