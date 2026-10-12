const {put}=require('@vercel/blob');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Falta conectar Vercel Blob al proyecto. En Vercel abre Storage, crea un Blob Store y conéctalo a IDELUX AI Experience.'});
 try{
  const image=req.body?.image;
  if(typeof image!=='string'||image.length>8_000_000||!/^data:image\/(png|jpeg);base64,/.test(image))return res.status(400).json({error:'Imagen no válida'});
  const mimetype=image.match(/^data:(image\/(?:png|jpeg));/)[1];
  const buffer=Buffer.from(image.slice(image.indexOf(',')+1),'base64');
  if(buffer.length>6_000_000)return res.status(413).json({error:'Imagen demasiado grande'});
  const ext=mimetype==='image/png'?'png':'jpg';
  const filename='recuerdos/idelux-'+crypto.randomUUID()+'.'+ext;
  const blob=await put(filename,buffer,{access:'public',contentType:mimetype,addRandomSuffix:false});
  return res.json({url:blob.url,note:'El enlace es público para quien tenga el QR. El almacenamiento debe gestionarse y eliminarse según política de privacidad.'});
 }catch(e){return res.status(502).json({error:'No fue posible crear el enlace de la foto: '+e.message})}
};