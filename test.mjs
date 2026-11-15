import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';

let attempts=0;
const mock = http.createServer((req,res)=>{
 attempts++;
 if(attempts===1){res.writeHead(429);return res.end('rate limited');}
 let raw='';req.on('data',chunk=>raw+=chunk);
 req.on('end',()=>{
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({id:'mock',model:JSON.parse(raw).model,choices:[{message:{role:'assistant',content:'ok'}}]}));
 });
});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
const port=mock.address().port;
const fallback=http.createServer((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'fallback',choices:[{message:{role:'assistant',content:'ok'}}]}));});});
await new Promise(resolve=>fallback.listen(0,'127.0.0.1',resolve));
const fallbackPort=fallback.address().port;
const app=spawn(process.execPath,['main.mjs'],{
 env:{...process.env,PORT:'18971',AGGREGATOR_TOKEN:'test-secret',MODEL_ENDPOINTS:`http://127.0.0.1:${port}/v1/chat/completions,http://127.0.0.1:${fallbackPort}/v1/chat/completions`,MODEL_NAMES:'mock-model'},
 stdio:'pipe'
});
try {
 let ready=false;
 for(let i=0;i<40;i++){
  try{if((await fetch('http://127.0.0.1:18971/health')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(ready,'server started');
 const base='http://127.0.0.1:18971';
 assert.equal((await (await fetch(base+'/health')).json()).providers,2);
 const unauthorized=await fetch(base+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(unauthorized.status,401);
 const headers={'content-type':'application/json',authorization:'Bearer test-secret'};
 const invalid=await fetch(base+'/v1/chat/completions',{method:'POST',headers,body:'{}'});
 assert.equal(invalid.status,400);
 const result=await fetch(base+'/v1/chat/completions',{method:'POST',headers,body:JSON.stringify({model:'mock-model',messages:[{role:'user',content:'hi'}]})});
 assert.equal(result.status,200);
 assert.equal((await result.json()).choices[0].message.content,'ok');
 assert.equal(attempts,1,'fallback was triggered by 429');
 const catalog=await (await fetch(base+'/v1/models')).json();
 assert.equal(catalog.data[0].id,'mock-model');
 const anthropic=await fetch(base+'/v1/messages',{method:'POST',headers,body:JSON.stringify({model:'mock-model',max_tokens:20,messages:[{role:'user',content:'hi'}]})});
 assert.equal(anthropic.status,200);
 assert.equal((await anthropic.json()).content[0].text,'ok');
 for(let i=0;i<20;i++){
  const r=await fetch(base+'/v1/chat/completions',{method:'POST',headers,body:JSON.stringify({model:'mock-model',messages:[{role:'user',content:String(i)}]})});
  assert.equal(r.status,200,`request ${i}`);
 }

 console.log('PASS health/auth/validation/mock completion');
} finally {app.kill();mock.close();fallback.close();}
