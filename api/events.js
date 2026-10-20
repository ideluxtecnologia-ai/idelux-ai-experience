const {list,put}=require('@vercel/blob');
const KEY='idelux/events-config-v1.json';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Conecta Vercel Blob al proyecto para sincronizar los eventos entre computadores.'});
 try{
 if(req.method==='GET'){
  const found=await list({prefix:KEY,limit:20});
  const file=found.blobs.find(x=>x.pathname===KEY);
  if(!file)return res.status(200).json({profiles:{},selected:null});
  const r=await fetch(file.url,{cache:'no-store'});
  if(!r.ok)throw Error('No fue posible leer la configuración compartida');
  const data=await r.json();return res.status(200).json(data);
 }
 if(req.method==='PUT'){
  const secret=process.env.IDELUX_ADMIN_PIN;
  if(!secret)return res.status(503).json({error:'Configura IDELUX_ADMIN_PIN en Vercel para autorizar los cambios compartidos.'});
  if(req.headers['x-admin-pin']!==secret)return res.status(403).json({error:'Clave de administrador incorrecta'});
  const body=req.body||{};
  const profiles=body.profiles;
  if(!profiles||typeof profiles!=='object'||Array.isArray(profiles)||Object.keys(profiles).length>50)return res.status(400).json({error:'Configuración inválida'});
  const payload=JSON.stringify({profiles,selected:typeof body.selected==='string'?body.selected:'',updatedAt:new Date().toISOString()});
  if(payload.length>1800000)return res.status(413).json({error:'Referencias demasiado grandes para sincronizar. Reduce las imágenes.'});
  const blob=await put(KEY,payload,{access:'public',contentType:'application/json',allowOverwrite:true,cacheControlMaxAge:0});
  return res.status(200).json({saved:true,updatedAt:new Date().toISOString()});
 }
 res.setHeader('Allow','GET, PUT');return res.status(405).json({error:'Método no permitido'});
 }catch(e){return res.status(502).json({error:'Error al guardar configuración: '+e.message})}
};