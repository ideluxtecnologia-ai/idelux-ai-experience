const {put,list}=require('@vercel/blob');
const crypto=require('crypto');
const good=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Falta conectar Vercel Blob'});
 const channel=req.method==='GET'?req.query.channel:req.body?.channel;
 if(!good(channel))return res.status(400).json({error:'Canal de proyección inválido'});
 const prefix='proyecciones/'+channel+'/';
 try{
  if(req.method==='GET'){
   const results=await list({prefix,limit:100});
   const photos=results.blobs.filter(b=>b.pathname.endsWith('.jpg')).map(b=>({url:b.url,time:new Date(b.uploadedAt).getTime()})).sort((a,b)=>a.time-b.time).slice(-40);
   return res.status(200).json({photos});
  }
  if(req.method==='POST'){
   const img=req.body?.image;
   if(typeof img!=='string'||!img.startsWith('data:image/jpeg;base64,')||img.length>8e6)return res.status(400).json({error:'Imagen inválida o demasiado grande'});
   const raw=Buffer.from(img.split(',')[1],'base64');
   const name=prefix+Date.now()+'-'+crypto.randomBytes(6).toString('hex')+'.jpg';
   const blob=await put(name,raw,{access:'public',contentType:'image/jpeg',addRandomSuffix:false});
   return res.status(200).json({url:blob.url});
  }
  return res.status(405).json({error:'Método no permitido'});
 }catch(e){return res.status(502).json({error:'No se pudo sincronizar la proyección: '+e.message})}
};