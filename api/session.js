module.exports.config = { api: { bodyParser: false } };
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return res.status(405).json({error:'Método no permitido'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'Falta configurar OPENAI_API_KEY'});
  try {
    const chunks=[];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const sdp=Buffer.concat(chunks).toString('utf8');
    if(!sdp.startsWith('v=0') || !sdp.includes('m=audio')) return res.status(400).json({error:'No se recibió una oferta SDP válida'});
    const form=new FormData();
    form.set('sdp',new Blob([sdp],{type:'application/sdp'}),'offer.sdp');
    form.set('session',JSON.stringify({
      type:'realtime',model:'gpt-realtime',
      instructions:'Eres Luxi, anfitriona de IDELUX AI Experience. Conversa en español chileno de manera cordial, natural y breve. Sugiere ocasionalmente crear recuerdos con fotos, sin insistir. Cuando alguien quiera tomarse una foto o editarla llama la función preparar_foto con la instrucción. Nunca afirmes haber tomado la foto sin confirmación.',
      audio:{output:{voice:'marin'}},
      tools:[{type:'function',name:'preparar_foto',description:'Abre cámara, pide confirmación antes de capturar imagen. Debe llamarse si el usuario solicita una foto.',parameters:{type:'object',properties:{prompt:{type:'string'}},required:['prompt']}}]
    }));
    const response=await fetch('https://api.openai.com/v1/realtime/calls',{
      method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,Accept:'application/sdp'},body:form
    });
    const result=await response.text();
    if(!response.ok) return res.status(response.status).json({error:'OpenAI Realtime rechazó la conexión',detail:result.slice(0,700)});
    res.setHeader('Content-Type','application/sdp');
    return res.status(200).send(result);
  }catch(e){return res.status(502).json({error:'Fallo al iniciar voz: '+e.message});}
};