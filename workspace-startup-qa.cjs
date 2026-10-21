const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createFrontend}=require('./frontend-server.cjs');
(async()=>{
 const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:360,height:900}});const origin='http://127.0.0.1:'+server.address().port;
  let mode='recover',sessions=0;const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/backend-api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.replace('/backend-api','');let status=200,data=[];
   if(req.method()!=='GET')writes.push(path);
   if(path==='/auth/session'){
    sessions++;
    if(mode==='offline'||(mode==='recover'&&sessions<3)){status=503;data={error:{message:'Service starting'}};}
    else if(mode==='signed-out'){status=401;data={error:{code:'AUTH_REQUIRED',message:'Sign in to continue.'}};}
    else data={id:'synthetic-admin',role:'ADMIN',adminRole:'SUPER_ADMIN',permissions:{read:['*'],write:['*']}};
   }else if(path==='/auth/csrf')data={csrfToken:'synthetic'};
   else if(path==='/auth/refresh'){status=401;data={error:{code:'AUTH_REQUIRED',message:'Sign in to continue.'}};}
   else if(path==='/admin/dashboard')data={applicants:0,enrolments:0,bookings:0,revenue:[]};
   await route.fulfill({status,json:data});
  });
  await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Connecting to your workspace'}).waitFor();
  await page.getByRole('heading',{name:'Your school at a glance'}).waitFor();assert.equal(sessions,3);assert.deepEqual(writes,[]);
  mode='offline';sessions=0;await page.reload();await page.getByRole('button',{name:'Reconnect',exact:true}).waitFor({timeout:25000});
  assert.equal(sessions,4);assert.equal(await page.getByRole('link',{name:'Return to website',exact:true}).getAttribute('href'),'/');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  mode='healthy';await page.getByRole('button',{name:'Reconnect',exact:true}).click();await page.getByRole('heading',{name:'Your school at a glance'}).waitFor();
  mode='signed-out';sessions=0;await page.reload();await page.waitForURL('**/admin/login');assert.equal(sessions,1);assert.deepEqual(writes,['/auth/refresh']);assert.deepEqual(errors,[]);
  console.log('PASS: mobile startup recovers after 503, bounded outage retries, manual reconnect, working navigation, and 401 redirects without replaying writes. Synthetic API only.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
