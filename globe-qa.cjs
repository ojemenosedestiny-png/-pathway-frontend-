const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const errors=[];const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000/');
  const globe=page.locator('[data-animated-globe]');await globe.locator('canvas').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-animated-globe]').dataset.globeState==='running');
  assert.equal(await globe.getAttribute('aria-label'),'Animated globe showing study destinations');
  assert.equal(await globe.locator('.j-globe-label').count(),4);
  assert.equal(await page.getByText('Routes are illustrative, not a geographic map.',{exact:true}).count(),1);
  const angle=()=>globe.evaluate(el=>Number(el.dataset.globeLongitude));
  const start=await angle();await page.waitForTimeout(1200);const next=await angle();assert.ok(next-start>3&&next-start<10,`slow rotation ${next-start}`);
  const box=await globe.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const paused=await angle();await page.waitForTimeout(250);assert.equal(await angle(),paused);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height*.56,{steps:8});await page.mouse.up();
  assert.ok(Math.abs(await angle()-paused)>20,'drag rotates sphere');
  await page.mouse.move(10,10);await page.waitForTimeout(400);assert.ok(await angle()!==paused);
  await page.keyboard.press('Tab');await page.mouse.move(10,10);await page.evaluate(()=>document.activeElement?.blur());
  // Force a known front-facing orientation with real pointer interaction, then save the hero.
  await page.screenshot({path:'animated-globe-desktop.png',fullPage:false});
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForFunction(()=>document.querySelector('[data-animated-globe]').dataset.globeState==='paused');
  const offscreen=await angle();await page.waitForTimeout(150);assert.equal(await angle(),offscreen);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('[data-animated-globe]').dataset.globeState==='running');
  const geometry=await page.evaluate(async()=>{
    const {spherePoint,orthographicBasis,greatCircle}=await import('/journey/dist/globe-geometry.js');
    const project=orthographicBasis(0,0);return{front:project(spherePoint({lat:0,lon:0})),back:project(spherePoint({lat:0,lon:180})),limb:project(spherePoint({lat:0,lon:90})),mid:greatCircle(spherePoint({lat:0,lon:0}),spherePoint({lat:0,lon:90}),.5)};
  });
  assert.ok(geometry.front[2]>.999&&geometry.back[2]<-.999);assert.ok(Math.abs(geometry.limb[2])<1e-10);assert.ok(Math.abs(Math.hypot(...geometry.mid)-1)<1e-10);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(300);assert.equal(await globe.getAttribute('data-globe-state'),'reduced-motion');
  const reduced=await angle();await page.waitForTimeout(200);assert.equal(await angle(),reduced);
  for(const width of [768,390,360,320]){
   await page.setViewportSize({width,height:1000});await globe.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no overflow '+width);
   const metrics=await globe.evaluate(el=>{const rect=el.getBoundingClientRect();const canvas=el.querySelector('canvas');return{width:rect.width,pixels:canvas.width,ratio:devicePixelRatio,labels:[...el.querySelectorAll('.j-globe-label')].filter(l=>getComputedStyle(l).visibility==='visible').map(l=>{const r=l.getBoundingClientRect();return{x:r.left-rect.left,right:r.right-rect.left,top:r.top-rect.top,bottom:r.bottom-rect.top,font:parseFloat(getComputedStyle(l).fontSize)};})};});
   assert.ok(Math.abs(metrics.pixels-metrics.width*metrics.ratio)<2,'DPR '+width);
   for(const label of metrics.labels){assert.ok(label.x>=0&&label.right<=metrics.width+1,'label fits '+width);assert.ok(label.top>=0&&label.bottom<=metrics.width+1);assert.ok(label.font>=11.5);}
   if(width===390)await page.screenshot({path:'animated-globe-mobile.png',fullPage:false});
  }
  await page.setViewportSize({width:1440,height:1000});await page.reload();await globe.locator('canvas').waitFor();await page.waitForTimeout(150);
  assert.equal(await globe.locator('.j-globe-label:visible').count(),4,'all four destinations visible initially');
  await page.screenshot({path:'animated-globe-desktop.png',fullPage:false});
  await globe.getByRole('link',{name:'United Kingdom',exact:true}).click();await page.waitForURL('**/pathways?q=United%20Kingdom');await page.locator('#pathway-results article').first().waitFor();
  assert.ok((await page.locator('#pathway-results').innerText()).toLowerCase().includes('united kingdom'));
  await page.goto('http://localhost:3000/');await globe.locator('canvas').waitFor();await page.setViewportSize({width:390,height:1000});await page.waitForTimeout(100);await globe.screenshot({path:'animated-globe-mobile.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await page.waitForFunction(()=>document.querySelector('[data-animated-globe]').dataset.globeState==='running');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await globe.getAttribute('data-globe-state'),'paused');const hidden=await angle();await page.waitForTimeout(150);assert.equal(await angle(),hidden);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.querySelector('[data-animated-globe]').dataset.globeState==='running');
  assert.deepEqual(errors,[]);console.log('Globe QA passed: orthographic geometry, rotation, hover, drag, offscreen pause, reduced motion, DPR, mobile label bounds, no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
