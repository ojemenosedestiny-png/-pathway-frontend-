const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/');const section=page.locator('#how-it-works');await section.locator('ol > li').first().waitFor();
 assert.equal(await section.locator('ol > li').count(),4);assert.equal(await section.locator('.j-route').count(),0);
 assert.equal(await section.getByRole('heading',{level:2}).innerText(),'A clear route, at every step.');
 await section.scrollIntoViewIfNeeded();await page.waitForTimeout(1100);
 assert.equal(await section.locator('.j-pass-label').first().innerText(),'STEP 01 · DISCOVER');
 assert.ok((await section.innerText()).includes('FROM: NIGERIA'));assert.ok((await section.innerText()).includes('TO: YOUR UNIVERSITY'));
 const delays=await section.locator('.j-pass-step').evaluateAll(els=>els.map(el=>getComputedStyle(el).animationDelay));assert.deepEqual(delays,['0s','0.1s','0.2s','0.3s']);
 const removed=await page.locator('.j-route-section').evaluateAll(els=>els.every(el=>['none','normal'].includes(getComputedStyle(el,'::before').content)));assert.equal(removed,true,'overlapping vertical route decoration removed everywhere');
 assert.equal(await section.evaluate(el=>getComputedStyle(el,'::before').content),'none');
 await section.screenshot({path:'journey-passes-desktop.png'});
 const card=section.locator('.j-boarding-pass').first();await card.hover();await page.waitForTimeout(350);assert.notEqual(await card.evaluate(el=>getComputedStyle(el).transform),'none');await page.mouse.move(0,0);
 for(const width of [1024,900,768,390,360,320]){await page.setViewportSize({width,height:1000});await section.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const columns=await section.locator('ol').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,width>760?2:1,'columns '+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);if(width<=760)assert.equal(await section.locator('.j-pass-connector:visible').count(),0);if(width===900)await section.screenshot({path:'journey-passes-tablet.png'});if(width===390)await section.screenshot({path:'journey-passes-mobile.png'});}
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await card.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');assert.equal(await section.locator('.j-pass-step').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.equal(await section.locator('.j-pass-step').first().evaluate(el=>getComputedStyle(el).opacity),'1');
 for(const name of ['compass','book-open','file-check','graduation-cap']){const response=await page.request.get('http://localhost:3000/journey/dist/icons/'+name+'.svg');assert.equal(response.status(),200,'Lucide icon '+name);}
 assert.deepEqual(errors,[]);console.log('Journey passes QA passed: 4/2/1 layout, CMS copy, stagger, hover, reduced motion, line removal, Lucide assets, no overflow or page errors.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
