// make.fun free-model aggregator — Node 22 standard library only.
// Routes OpenAI-compatible requests to provider endpoints supplied by the environment.
import http from 'node:http';
const env = process.env.MAKEFUN_ENV_URL;
const port = Number(process.env.PORT || 3000);
const providers = (process.env.MAKEFUN_PROVIDERS || '').split(',').map(x=>x.trim()).filter(Boolean);
const catalog = {object:'list',data:[]};
function send(res,status,obj){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(obj));}
async function readBody(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>2e6)throw Error('request too large');}return JSON.parse(s||'{}');}
async function route(req,res){
 if(req.method==='GET' && req.url==='/health')return send(res,200,{ok:true,providers:providers.length});
 if(req.method==='GET' && req.url==='/v1/models')return send(res,200,catalog);
 if(req.method!=='POST' || !['/v1/chat/completions','/v1/messages'].includes(req.url))return send(res,404,{error:'not found'});
 if(!env || !providers.length)return send(res,503,{error:'provider environment not configured'});
 let body;try{body=await readBody(req);}catch(e){return send(res,400,{error:String(e)});}
 for(const provider of providers){
  const target=new URL(provider.replace(/^\\/+|\\/+$/g,'')+req.url,env.endsWith('/')?env:env+'/');
  if(target.origin!==new URL(env).origin)continue;
  try{
   const upstream=await fetch(target,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
   if([402,429,500,502,503,504].includes(upstream.status))continue;
   res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/json'});
   for await(const chunk of upstream.body)res.write(chunk);
   return res.end();
  }catch{}
 }
 return send(res,503,{error:'all providers unavailable'});
}
if(process.argv.includes('--list'))process.stdout.write(JSON.stringify(catalog));
else http.createServer((req,res)=>{route(req,res).catch(e=>send(res,500,{error:String(e)}));}).listen(port);
