// Sign-in pages: two-panel premium layout, Student/Staff switch, show/hide password, mobile and dark theme.
const OUT='docs/sign-in-design/';require('node:fs').mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];
const open=async(path,vp,dark=false)=>{const page=await browser.newPage({viewport:vp});page.on('pageerror',e=>errors.push(e.message));if(dark)await page.addInitScript(()=>localStorage.setItem('pw-theme','dark'));
 await page.route('**/backend-api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"UNAUTHENTICATED","message":"Sign in"}}'}));await page.goto(origin+path,{waitUntil:'networkidle'});await page.waitForTimeout(1200);return page;};
let page=await open('/admin/login',{width:1440,height:900});
assert.match(await page.locator('h1').innerText(),/Sign in to your admin workspace/);assert.match(await page.locator('.ax-eyebrow').innerText(),/staff workspace/i);
assert.notEqual(await page.locator('.ax-eyebrow').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)','eyebrow is gold');
assert.equal(await page.locator('.ax-points li').count(),3);assert.equal(await page.getByRole('link',{name:'Staff',exact:true}).getAttribute('aria-current'),'page');
const pw=page.getByLabel('Password',{exact:true});await pw.fill('Secret-password-1');assert.equal(await pw.getAttribute('type'),'password');
await page.getByRole('button',{name:'Show password'}).click();assert.equal(await pw.getAttribute('type'),'text');assert.equal(await page.getByRole('button',{name:'Hide password'}).getAttribute('aria-pressed'),'true');
const [photo,card]=await Promise.all([page.locator('.ax-story').boundingBox(),page.locator('.ax-card').boundingBox()]);assert.ok(photo.x<card.x&&photo.width>500,'photo panel on the left, form on the right');
await page.screenshot({path:OUT+'admin-1440.png'});step('admin sign-in: photo panel with title and security points, form card with Student/Staff switch and show/hide password');
await page.getByRole('link',{name:'Student',exact:true}).click();await page.waitForURL(/\/student\/login$/);assert.match(await page.locator('h1').innerText(),/student portal/i);assert.equal(await page.getByRole('link',{name:'Student',exact:true}).getAttribute('aria-current'),'page');
await page.screenshot({path:OUT+'student-1440.png'});await page.close();step('the switch moves between student and staff sign-in');
for(const path of ['/admin/login','/student/login','/forgot-password']){page=await open(path,{width:360,height:780});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path);
 const story=await page.locator('.ax-story').boundingBox(),form=await page.locator('.ax-card').boundingBox();assert.ok(form.y>story.y&&form.y<760,path+' form starts on the first screen');
 await page.screenshot({path:OUT+path.split('/').filter(Boolean).join('-')+'-360.png',fullPage:true});await page.close();}
step('at 360px the panel becomes a compact header and the form starts on the first screen');
page=await open('/admin/login',{width:1440,height:900},true);assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
const ink=await page.locator('.ax-card h2').evaluate(e=>getComputedStyle(e).color);assert.notEqual(ink,'rgb(9, 29, 58)');await page.screenshot({path:OUT+'admin-dark-1440.png'});await page.close();step('dark theme keeps the card readable');
assert.deepEqual(errors,[]);console.log('SIGN-IN DESIGN CHECKS PASSED');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
