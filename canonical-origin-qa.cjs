const assert=require('node:assert/strict');
const {createFrontend}=require('./frontend-server.cjs');
const http=require('node:http');
const get=(url,host)=>new Promise((resolve,reject)=>{http.get(url,{headers:{Host:host}},response=>{response.resume();response.on('end',()=>resolve({status:response.statusCode,headers:{get:name=>response.headers[name]??null}}));}).on('error',reject);});
(async()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';const app=createFrontend();
 if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const host of ['www.newworldpathwayuniversity.com','pathway-frontend-hy8e.onrender.com']){
   for(const path of ['/apply?programme=SAT','/admin','/student/login','/signup','/portal']){
    const response=await get(base+path,host);
    assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://newworldpathwayuniversity.com'+path);
   }
   assert.equal((await get(base+'/health/live',host)).status,200);
  }
  const canonical=await get(base+'/apply','newworldpathwayuniversity.com');
  assert.equal(canonical.status,200);assert.equal(canonical.headers.get('location'),null);
  console.log('PASS: production aliases redirect to the trusted origin, application query preserved, canonical pages and health checks remain available.');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
