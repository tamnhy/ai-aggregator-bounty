import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';

const mock = http.createServer((req,res)=>{
 let raw='';req.on('data',chunk=>raw+=chunk);
 req.on('end',()=>{
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({id:'mock',model:JSON.parse(raw).model,choices:[{message:{role:'assistant',content:'ok'}}]}));
 });
});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
const port=mock.address().port;
const app=spawn(process.execPath,['main.mjs'],{
 env:{...process.env,PORT:'18971',AGGREGATOR_TOKEN:'test-secret',MODEL_ENDPOINTS:`http://127.0.0.1:${port}/v1/chat/completions`},
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
 assert.equal((await (await fetch(base+'/health')).json()).providers,1);
 const unauthorized=await fetch(base+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(unauthorized.status,401);
 const headers={'content-type':'application/json',authorization:'Bearer test-secret'};
 const invalid=await fetch(base+'/v1/chat/completions',{method:'POST',headers,body:'{}'});
 assert.equal(invalid.status,400);
 const result=await fetch(base+'/v1/chat/completions',{method:'POST',headers,body:JSON.stringify({model:'mock-model',messages:[{role:'user',content:'hi'}]})});
 assert.equal(result.status,200);
 assert.equal((await result.json()).choices[0].message.content,'ok');
 console.log('PASS health/auth/validation/mock completion');
} finally {app.kill();mock.close();}
