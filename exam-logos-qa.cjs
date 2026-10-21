const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createFrontend}=require('./frontend-server.cjs');
const fs=require('node:fs');
(async()=>{
 const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/backend-api/**',route=>route.fulfill({json:[]}));
  fs.mkdirSync('docs/exam-logos',{recursive:true});
  for(const width of [360,768,1440])for(const path of ['/','/exams']){
   await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:'+server.address().port+path);
   await page.waitForFunction(()=>document.getElementById('home')?.getAttribute('aria-busy')==='false');
   const wall=page.getByLabel('Examination bodies',{exact:true});await wall.scrollIntoViewIfNeeded();
   assert.equal(await wall.locator('a').count(),3);
   for(const img of await wall.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(image=>image.decode());assert.ok(await img.evaluate(image=>image.naturalWidth>0&&image.getBoundingClientRect().width<=innerWidth));}
   assert.deepEqual(await wall.locator('a').evaluateAll(links=>links.map(a=>a.href)),['https://www.cambridgeinternational.org/','https://www.waecnigeria.org/','https://neco.gov.ng/']);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(path==='/')await wall.screenshot({path:`docs/exam-logos/logos-${width}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: three approved logos load on home/exams with empty catalogue, official links, no overflow at 360/768/1440 and no runtime errors.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
