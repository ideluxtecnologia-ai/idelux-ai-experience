const {list,put}=require('@vercel/blob');
const crypto=require('crypto');
const OLD='idelux/events-config-v1.json';
const PREFIX='idelux/events-v2/';
const validName=x=>typeof x==='string'&&x.trim().length>0&&x.length<=120;
async function readJson(url){const r=await fetch(url+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('No se pudo leer un evento guardado');return r.json()}
async function legacyProfiles(){
 const found=await list({prefix:OLD,limit:10});
 const target=found.blobs.find(b=>b.pathname===OLD);
 if(!target)return {};
 const d=await readJson(target.url);return d.profiles&&typeof d.profiles==='object'?d.profiles:{};
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');res.setHeader('Pragma','no-cache');
 if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Falta conectar Vercel Blob'});
 try{
 if(req.method==='GET'){
  const remote=await list({prefix:PREFIX,limit:1000});
  const profiles=await legacyProfiles();
  const files=remote.blobs.filter(b=>b.pathname.startsWith(PREFIX)&&b.pathname.endsWith('.json'));
  // Descarga eventos nuevos individualmente; nunca sobrescribe por un navegador incompleto.
  const results=await Promise.allSettled(files.map(async b=>readJson(b.url)));
  let errors=0;
  for(const result of results){if(result.status==='fulfilled'&&validName(result.value?.name)&&result.value?.event){profiles[result.value.name]=result.value.event}else errors++}
  if(errors)return res.status(502).json({error:'Algunos eventos no pudieron leerse del servidor. Reintenta la sincronización.'});
  return res.status(200).json({profiles,count:Object.keys(profiles).length,updatedAt:new Date().toISOString()});
 }
 if(req.method==='PUT'){
  if(!process.env.IDELUX_ADMIN_PIN)return res.status(503).json({error:'Falta configurar IDELUX_ADMIN_PIN'});
  if(req.headers['x-admin-pin']!==process.env.IDELUX_ADMIN_PIN)return res.status(403).json({error:'PIN del administrador incorrecto'});
  const name=req.body?.name,event=req.body?.event;
  if(!validName(name)||!event||typeof event!=='object'||Array.isArray(event))return res.status(400).json({error:'Datos del evento inválidos'});
  const data=JSON.stringify({name,event,updatedAt:new Date().toISOString()});
  if(data.length>1500000)return res.status(413).json({error:'El evento contiene logos, marcos o referencias demasiado grandes. Reduce sus imágenes.'});
  const id=crypto.createHash('sha256').update(name).digest('hex').slice(0,32);
  await put(PREFIX+id+'.json',data,{access:'public',contentType:'application/json',allowOverwrite:true,cacheControlMaxAge:0});
  return res.status(200).json({saved:true,name});
 }
 return res.status(405).json({error:'Método no permitido'});
 }catch(e){return res.status(502).json({error:'Error de sincronización: '+e.message})}
};