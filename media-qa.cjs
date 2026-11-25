// Public pictures saved with the old external media address are shown from the school's own server (synthetic APIs).
const OUT='docs/media/';require('node:fs').mkdirSync(OUT,{recursive:true});
const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);
const ID='81892d7d-e402-4541-aed9-6018b56ad2c2';
(async()=>{
 const {mediaSrc}=await import('./journey/dist/media-url.js');
 assert.equal(mediaSrc(`https://spring-poetry-e28b.ojemenosedestiny.workers.dev/public/${ID}/file.webp`),`/backend-api/media/public/${ID}/file.webp`);
 assert.equal(mediaSrc(`https://anything.example/public/${ID.toUpperCase()}/file.JPG`),`/backend-api/media/public/${ID}/file.JPG`);
 for(const keep of ['/assets/school-3.jpg','https://cdn.example.org/pics/a.webp',`https://x.example/private/${ID}/file.webp`,`https://x.example/public/${ID}/file.svg`])assert.equal(mediaSrc(keep),keep);
 step('old media addresses are rewritten to the school server; other addresses are left alone');
 {const express=require('express');const {liveApiProxy}=require('./live-api-proxy.cjs');const http=require('node:http');
  const app=express().use('/backend-api',liveApiProxy('https://127.0.0.1:9',()=>{}));const s=app.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));
  const get=path=>new Promise(resolve=>http.get({host:'127.0.0.1',port:s.address().port,path},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,body:b}));}));
  const media=await get(`/backend-api/media/public/${ID}/file.webp`);assert.notEqual(media.status,404,'the website forwards /media to the school server');assert.doesNotMatch(media.body,/API route not found/);
  const other=await get('/backend-api/nothing-here');assert.equal(other.status,404);assert.match(other.body,/API route not found/);
  const sneaky=await get('/backend-api/media/..%2fadmin');assert.equal(sneaky.status,404);
  s.close();step('the website passes picture requests through to the school server, and still refuses unknown paths');}
 const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const picture=fs.readFileSync('docs/mock-results/review-1280.png');const media=[];
 await page.route('**/backend-api/**',async r=>{const u=new URL(r.request().url()).pathname.replace('/backend-api','');
  if(u.startsWith('/media/public/')){media.push(u);return r.fulfill({status:200,contentType:'image/png',body:picture});}
  const d=u==='/public/slides'?[{id:'s1',image:`https://spring-poetry-e28b.ojemenosedestiny.workers.dev/public/${ID}/file.webp`,caption:'Quality materials and standard',title:'Nile Campus',order:1,visible:true}]:u==='/auth/session'?{__status:401}:[];
  await r.fulfill({status:d.__status||200,contentType:'application/json',body:JSON.stringify(d.__status?{error:{code:'UNAUTHENTICATED',message:'Sign in'}}:d)});});
 await page.goto(origin+'/',{waitUntil:'networkidle'});
 const img=page.locator('#carousel-content img');await img.waitFor();await img.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const i=document.querySelector('#carousel-content img');return i&&i.complete&&i.naturalWidth>0;},null,{timeout:10000});
 assert.equal(await img.getAttribute('src'),`/backend-api/media/public/${ID}/file.webp`);assert.deepEqual(media,[`/media/public/${ID}/file.webp`]);
 await page.locator('#carousel-content').screenshot({path:OUT+'carousel-1280.png'});
 step('home carousel loads the hostel picture from the school server instead of the broken external address');
 assert.deepEqual(errors,[]);console.log('MEDIA CHECKS PASSED');await browser.close();server.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
