import http from 'node:http';
const port=Number(process.env.PORT||3000);
const endpoints=(process.env.MODEL_ENDPOINTS||'').split(',').map(s=>s.trim()).filter(Boolean);
const token=process.env.AGGREGATOR_TOKEN||'';
const models=(process.env.MODEL_NAMES||'').split(',').map(s=>s.trim()).filter(Boolean);
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));}
async function bodyOf(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('too large');}return JSON.parse(raw);}
async function handler(req,res){
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')return reply(res,200,{ok:true,providers:endpoints.length});
 if(!token||req.headers.authorization!==`Bearer ${token}`)return reply(res,401,{error:'unauthorized'});
 if(req.method==='GET'&&path==='/v1/models')return reply(res,200,{object:'list',data:models.map(id=>({id,object:'model',owned_by:'aggregator'}))});
 const openai=path==='/v1/chat/completions';
 const anthropic=path==='/v1/messages';
 if(req.method!=='POST'||(!openai&&!anthropic))return reply(res,404,{error:'not found'});
 if(!endpoints.length)return reply(res,503,{error:'no providers configured'});
 let body;try{body=await bodyOf(req);}catch{return reply(res,400,{error:'invalid JSON or oversized body'});}
 if(!body||!Array.isArray(body.messages)||typeof body.model!=='string')return reply(res,400,{error:'model and messages required'});
 const normalized=anthropic?{model:body.model,messages:[...(body.system?[{role:'system',content:body.system}]:[]),...body.messages],max_tokens:body.max_tokens||1024,stream:false}:body;
 for(const endpoint of endpoints){
  let url;try{url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))continue;}catch{continue;}
  try{
   const upstream=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...(process.env.UPSTREAM_API_KEY?{authorization:`Bearer ${process.env.UPSTREAM_API_KEY}`}:{})},body:JSON.stringify(normalized),signal:AbortSignal.timeout(12000)});
   if([429,500,502,503,504].includes(upstream.status))continue;
   const data=await upstream.json();
   if(anthropic&&upstream.ok){
    const message=data.choices?.[0]?.message;
    return reply(res,200,{id:data.id||'msg_local',type:'message',role:'assistant',model:body.model,content:[{type:'text',text:typeof message?.content==='string'?message.content:JSON.stringify(message?.content||'')}],stop_reason:'end_turn',usage:{input_tokens:data.usage?.prompt_tokens||0,output_tokens:data.usage?.completion_tokens||0}});
   }
   return reply(res,upstream.status,data);
  }catch{}
 }
 return reply(res,503,{error:'all providers unavailable'});
}
http.createServer((req,res)=>handler(req,res).catch(()=>reply(res,500,{error:'internal error'}))).listen(port);
