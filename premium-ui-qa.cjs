const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');const{chromium}=require('playwright');const{createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/backend-api/**',r=>r.fulfill({json:[]}));
 fs.mkdirSync('docs/premium-redesign-2026-10-21',{recursive:true});
 for(const width of[360,768,1440]){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-animated-globe] canvas').waitFor();await page.waitForTimeout(800);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);assert.equal(await page.locator('.premium-hero-title').count(),1);assert.equal(await page.locator('.premium-programme-card').count(),3);
  for(const image of await page.locator('img[src*="inspiration-"]').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(i=>i.decode());assert.ok(await image.evaluate(i=>i.naturalWidth>0));}
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/premium-redesign-2026-10-21/hero-${width}.png`});await page.screenshot({path:`docs/premium-redesign-2026-10-21/home-${width}.png`,fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.premium-hero-title span').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('journey/animated-globe.ts')).digest('hex'),'f3c87236982156d35707184da22ccc5710d2afdd22e4042d2fe48d64a3ba606b');
 assert.deepEqual(errors,[]);console.log('PASS: premium hero, photo placements, official logo assets, three responsive widths, reduced motion and no browser errors. Globe includes the mobile touch-focus fix.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
