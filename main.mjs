import http from 'node:http';
const port=Number(process.env.PORT||3000);
const endpoints=(process.env.MODEL_ENDPOINTS||'').split(',').map(s=>s.trim()).filter(Boolean);
const models=(process.env.MODEL_NAMES||'free-model').split(',').map(s=>s.trim()).filter(Boolean);
const token=process.env.AGGREGATOR_TOKEN||'';
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));}
async function bodyOf(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('too large');}return JSON.parse(raw);}
async function handler(req,res){
 if(req.method==='GET'&&req.url==='/health')return reply(res,200,{ok:true,providers:endpoints.length});
 if(req.method==='GET'&&req.url==='/v1/models')return reply(res,200,{object:'list',data:models.map(id=>({id,object:'model',owned_by:'aggregator'}))});
 if(req.method!=='POST'||!['/v1/chat/completions','/v1/messages'].includes(req.url))return reply(res,404,{error:'not found'});
 if(!token||req.headers.authorization!==`Bearer ${token}`)return reply(res,401,{error:'unauthorized'});
 if(!endpoints.length)return reply(res,503,{error:'no providers configured'});
 let body;try{body=await bodyOf(req);}catch{return reply(res,400,{error:'invalid JSON or oversized body'});}
 if(!body||!Array.isArray(body.messages)||typeof body.model!=='string'||body.stream===true)return reply(res,400,{error:'model and messages required'});
 for(const endpoint of endpoints){
  let url;try{url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))continue;}catch{continue;}
  try{
   const upstream=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...(process.env.UPSTREAM_API_KEY?{authorization:`Bearer ${process.env.UPSTREAM_API_KEY}`}:{})},body:JSON.stringify(req.url==='/v1/messages'?{model:body.model,messages:[...(body.system?[{role:'system',content:body.system}]:[]),...body.messages],max_tokens:body.max_tokens||1024}:body),signal:AbortSignal.timeout(12000)});
   if([402,408,429,500,502,503,504].includes(upstream.status))continue;
   const result=await upstream.json();
   if(req.url==='/v1/messages'&&upstream.ok)return reply(res,200,{id:result.id||'msg_aggregator',type:'message',role:'assistant',model:body.model,content:[{type:'text',text:result.choices?.[0]?.message?.content||''}],stop_reason:'end_turn',usage:{input_tokens:result.usage?.prompt_tokens||0,output_tokens:result.usage?.completion_tokens||0}});
   return reply(res,upstream.status,result);
  }catch{}
 }
 return reply(res,503,{error:'all providers unavailable'});
}
http.createServer((req,res)=>handler(req,res).catch(()=>reply(res,500,{error:'internal error'}))).listen(port);
