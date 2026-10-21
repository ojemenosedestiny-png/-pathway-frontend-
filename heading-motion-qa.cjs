const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createFrontend}=require('./frontend-server.cjs');
(async()=>{
 const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:360,height:900}}),origin='http://127.0.0.1:'+server.address().port;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/backend-api/**',r=>r.fulfill({json:[]}));
  const routes=['/','/about','/pathways','/exams','/faq','/contact','/news','/student/login','/admin/login','/forgot-password','/recover-student-id','/signup','/apply','/book-consultation','/hostel','/pay-fees'];
  for(const route of routes){
   await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+route);const h=page.locator('h1').first();await h.waitFor();
   const animated=await h.evaluate(el=>{const style=getComputedStyle(el);return style.animationName!=='none'||[...el.querySelectorAll('span')].some(s=>getComputedStyle(s).animationName!=='none');});assert.ok(animated,route+' heading animation');
   await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflow');assert.equal(await h.evaluate(el=>getComputedStyle(el).opacity),'1',route+' visible after entrance');
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await h.evaluate(el=>getComputedStyle(el).animationName),'none',route+' reduced motion');assert.equal(await h.evaluate(el=>getComputedStyle(el).opacity),'1',route+' reduced visibility');
  }
  assert.deepEqual(errors,[]);console.log('PASS: 16 public/access/service page headings animate on mobile, finish fully visible, fit the viewport and respect reduced motion. Portal headings are checked per module separately.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
