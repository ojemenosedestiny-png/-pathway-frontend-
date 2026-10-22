const assert=require('node:assert/strict');
const https=require('node:https');const {PassThrough}=require('node:stream');
const {liveApiProxy}=require('./live-api-proxy.cjs');
(async()=>{
 const original=https.request;const reports=[];let status=503,errorMode=false;
 https.request=(_options,callback)=>{const request=new PassThrough();request.resume();request.setTimeout=()=>{};queueMicrotask(()=>{if(errorMode){request.emit('error',Object.assign(Error('connection failed'),{code:'ECONNREFUSED'}));return;}const response=new PassThrough();response.statusCode=status;response.headers={'content-type':'application/json'};callback(response);response.end('{}');});return request;};
 try{
  const proxy=liveApiProxy('https://example.invalid',entry=>reports.push(entry));
  const invoke=()=>new Promise(resolve=>{const req=new PassThrough();req.url='/public/admission-programmes?token=private-query';req.method='GET';req.headers={cookie:'private-cookie'};req.ip='127.0.0.1';req.protocol='https';const res=new PassThrough();res.headersSent=false;res.setHeader=()=>{};res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.end(JSON.stringify(data));};res.on('finish',resolve);res.resume();proxy(req,res);req.end();});
  await invoke();assert.equal(reports[0].status,503);assert.equal(reports[0].code,'UPSTREAM_HTTP');assert.equal(reports[0].path,'/public/admission-programmes');
  errorMode=true;await invoke();assert.equal(reports[1].code,'ECONNREFUSED');assert.equal(reports[1].status,502);
  errorMode=false;status=200;await invoke();assert.equal(reports.length,2);assert.ok(!JSON.stringify(reports).includes('private-'));
  console.log('PASS: upstream HTTP failures and connection failures are distinguishable; successful requests stay quiet; query secrets and cookies are excluded. Synthetic transport only.');
 }finally{https.request=original;}
})().catch(e=>{console.error(e);process.exitCode=1});
