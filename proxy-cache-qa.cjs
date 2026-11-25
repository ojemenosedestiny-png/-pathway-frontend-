// The website keeps a 60-second copy of public school lists; never of private, changing, failed or cookie-setting answers.
const assert=require('node:assert/strict');
const https=require('node:https');const {PassThrough}=require('node:stream');
const {liveApiProxy}=require('./live-api-proxy.cjs');
(async()=>{
 const original=https.request;const calls=[];let next={status:200,headers:{'content-type':'application/json'},body:'[{"id":"s1"}]'};
 https.request=(options,callback)=>{calls.push(options.method+' '+options.path);const request=new PassThrough();request.resume();request.setTimeout=()=>{};const reply=next;queueMicrotask(()=>{const response=new PassThrough();response.statusCode=reply.status;response.headers=reply.headers;callback(response);response.end(reply.body);});return request;};
 try{
  const proxy=liveApiProxy('https://example.invalid',()=>{},80);
  const invoke=(url,method='GET')=>new Promise(resolve=>{const req=new PassThrough();req.url=url;req.method=method;req.headers={cookie:'session=a'};req.ip='127.0.0.1';req.protocol='https';
   const res=new PassThrough();const headers={};let body='';res.headersSent=false;res.setHeader=(k,v)=>{headers[k.toLowerCase()]=v;};res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));
   res.on('data',c=>body+=c);res.on('finish',()=>setTimeout(()=>resolve({status:res.statusCode,headers,body}),5));proxy(req,res);req.end();});
  let a=await invoke('/public/slides');let b=await invoke('/public/slides');
  assert.deepEqual(calls,['GET /public/slides'],'second visitor is served from the copy');assert.equal(b.body,a.body);assert.equal(b.headers['x-pathway-cache'],'hit');assert.equal(b.headers['content-type'],'application/json');
  await invoke('/public/slides?take=100&skip=100');assert.equal(calls.length,2,'each address has its own copy');
  await invoke('/public/consultation-slots');await invoke('/public/consultation-slots');assert.equal(calls.filter(c=>c.includes('consultation-slots')).length,2,'booking times are always fresh');
  await invoke('/portal/profile');await invoke('/portal/profile');assert.equal(calls.filter(c=>c.includes('/portal/profile')).length,2,'private answers are never cached');
  await invoke('/public/admissions','POST');await invoke('/public/admissions','POST');assert.equal(calls.filter(c=>c.startsWith('POST')).length,2,'submissions are never cached');
  next={status:503,headers:{'content-type':'application/json'},body:'{}'};await invoke('/public/faqs');next={status:200,headers:{'content-type':'application/json'},body:'[]'};await invoke('/public/faqs');assert.equal(calls.filter(c=>c.includes('faqs')).length,2,'failures are not kept');
  next={status:200,headers:{'content-type':'application/json','set-cookie':['x=1']},body:'[]'};await invoke('/public/news');await invoke('/public/news');assert.equal(calls.filter(c=>c.includes('news')).length,2,'answers that set cookies are not kept');
  next={status:200,headers:{'content-type':'application/json'},body:'[{"id":"s2"}]'};await new Promise(r=>setTimeout(r,120));const c=await invoke('/public/slides');assert.equal(c.body,'[{"id":"s2"}]','the copy expires');
  console.log('PROXY CACHE CHECKS PASSED');
 }finally{https.request=original;}
})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
