const assert=require('node:assert/strict');const{chromium}=require('playwright');const{createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let failed=true;
 await page.route('**/backend-api/**',route=>route.fulfill(failed?{status:500,json:{error:{message:'Synthetic database outage'}}}:{json:[]}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.locator('[data-service-notice]').waitFor();await page.locator('[data-animated-globe] canvas').waitFor();
 assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.ok(await page.getByRole('link',{name:'Start your application',exact:true}).count()>=1);
 assert.equal(await page.locator('.j-error').count(),0);assert.equal(await page.locator('[data-service-notice]').count(),1);
 assert.equal(await page.locator('.j-exam-logo-card').count(),3);assert.ok(!(await page.locator('#home').innerText()).includes('NGN 50,000'));
 failed=false;await page.getByRole('button',{name:'Reload live information'}).click();
 await page.waitForFunction(()=>document.querySelector('#home')?.getAttribute('aria-busy')==='false'&&!document.querySelector('[data-service-notice]'));
 assert.equal(await page.locator('.j-error').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: total public API outage preserves homepage, globe, approved logos and application link; no invented fees; one notice; retry recovers without runtime errors.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
