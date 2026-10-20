const assert=require('node:assert/strict');const{chromium}=require('playwright');const{createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:360,height:900}});
 await page.route('**/backend-api/**',route=>route.abort('timedout'));
 for(const path of ['/','/pathways','/exams','/about','/contact','/admin/login','/student/login']){
  const html=await(await fetch('http://127.0.0.1:'+server.address().port+path)).text();assert.ok(html.includes('<h1'),path+' server heading');assert.ok(!html.includes('Connecting to your Journey'),path);
  await page.goto('http://127.0.0.1:'+server.address().port+path,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.j-skeleton,.pw-skeleton').count(),0,path);
  assert.ok(await page.getByRole('link').count()>0,path);
 }
 console.log('PASS: public headings and account navigation exist in server HTML; no full-page loading screen or animated skeletons with unavailable APIs.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
