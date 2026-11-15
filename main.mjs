import http from 'node:http';
const port=Number(process.env.PORT||3000);
const endpoints=(process.env.MODEL_ENDPOINTS||'').split(',').map(s=>s.trim()).filter(Boolean);
const token=process.env.AGGREGATOR_TOKEN||'';
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));}
async function bodyOf(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw Error('too large');}return JSON.parse(raw);}
async function handler(req,res){
 if(req.method==='GET'&&req.url==='/health')return reply(res,200,{ok:true,providers:endpoints.length});
 if(req.method==='GET'&&req.url==='/v1/models')return reply(res,200,{object:'list',data:[]});
 if(req.method!=='POST'||req.url!=='/v1/chat/completions')return reply(res,404,{error:'not found'});
 if(!token||req.headers.authorization!==`Bearer ${token}`)return reply(res,401,{error:'unauthorized'});
 if(!endpoints.length)return reply(res,503,{error:'no providers configured'});
 let body;try{body=await bodyOf(req);}catch{return reply(res,400,{error:'invalid JSON or oversized body'});}
 if(!body||!Array.isArray(body.messages)||typeof body.model!=='string')return reply(res,400,{error:'model and messages required'});
 for(const endpoint of endpoints){
  let url;try{url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))continue;}catch{continue;}
  try{
   const upstream=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...(process.env.UPSTREAM_API_KEY?{authorization:`Bearer ${process.env.UPSTREAM_API_KEY}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
   if([429,500,502,503,504].includes(upstream.status))continue;
   res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/json'});
   for await(const chunk of upstream.body)res.write(chunk);
   return res.end();
  }catch{}
 }
 return reply(res,503,{error:'all providers unavailable'});
}
http.createServer((req,res)=>handler(req,res).catch(()=>reply(res,500,{error:'internal error'}))).listen(port);
