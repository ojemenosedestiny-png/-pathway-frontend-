// Student mock exams: grouped list, instructions, exam room (autosave, offline, flags, review, timer, anti-cheat, phone sheet) with synthetic APIs.
const OUT='docs/exam-room/';require('node:fs').mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);const at=m=>new Date(Date.now()+m*60000).toISOString();
const ID1='11111111-1111-4111-8111-111111111111',ID2='22222222-2222-4222-8222-222222222222';
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];
const student={id:'u1',role:'STUDENT',studentId:'s1',name:'Ada Okafor',permissions:{read:[],write:[]}};
const questions=[{prompt:'Read the passage. What did Ada feel?',options:['Sad','Happy','Angry','Tired','Bored'],passage:'Ada smiled all the way to school.',image:'',marks:2},{prompt:'7 × 8 = ?',options:['54','56','58','64'],passage:'',image:'',marks:1},{prompt:'Capital of Nigeria?',options:['Lagos','Abuja'],passage:'',image:'',marks:1}];
const mocks=[{id:ID1,title:'English paper 1',subject:'English',instructions:'Calculators are not allowed.',durationMinutes:30,questionCount:3,opensAt:at(-30),closesAt:at(120),state:'OPEN',attemptStatus:null,resultReleased:false,makeup:false},{id:ID2,title:'Quick quiz',subject:'Maths',durationMinutes:1,questionCount:3,opensAt:at(-5),closesAt:at(60),state:'OPEN',attemptStatus:'IN_PROGRESS',resultReleased:false,makeup:false},{id:'33333333-3333-4333-8333-333333333333',title:'Physics mock',subject:'Physics',durationMinutes:60,questionCount:40,opensAt:at(60*28),closesAt:at(60*30),state:'UPCOMING',attemptStatus:null,resultReleased:false,makeup:false},{id:'44444444-4444-4444-8444-444444444444',title:'Biology mock',subject:'Biology',durationMinutes:60,questionCount:40,opensAt:at(-60*50),closesAt:at(-60*48),state:'CLOSED',attemptStatus:'SUBMITTED',resultReleased:true,makeup:false}];
const open=async(vp,handler)=>{const page=await browser.newPage({viewport:vp});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=await handler(req,u);
  if(d==='ABORT')return r.abort('internetdisconnected');
  if(d===undefined){if(u==='/auth/session')d=student;else if(u==='/auth/csrf')d={csrfToken:'t'};else if(u.endsWith('/profile')||u.endsWith('/journey'))d={id:'s1',firstName:'Ada',lastName:'Okafor',studentId:'NWE-1',milestones:[],user:{}};else if(u==='/portal/learning/mocks')d=mocks;else d=[];}
  await r.fulfill({status:d&&d.__status||200,contentType:'application/json',body:JSON.stringify(d&&d.__status?d.body:d)});});return page;};
// 1-5 on desktop
let saves=[],submitted=null,offline=false;
const page=await open({width:1280,height:860},async(req,u)=>{
 if(u===`/portal/learning/mocks/${ID1}/start`)return {mockId:ID1,title:'English paper 1',subject:'English',startedAt:at(0),deadline:at(30),serverNow:new Date().toISOString(),savedAt:null,answers:[-1,-1,-1],flags:[],questions};
 if(u===`/portal/learning/mocks/${ID1}/answers`){if(offline)return 'ABORT';saves.push(req.postDataJSON());return {saved:true,savedAt:new Date().toISOString(),serverNow:new Date().toISOString()};}
 if(u===`/portal/learning/mocks/${ID1}/submit`){submitted=req.postDataJSON();return {submitted:true,expired:false};}});
await page.goto(origin+'/portal#mocks',{waitUntil:'networkidle'});await page.locator('.exam-group').first().waitFor();
const groups=await page.locator('.exam-group > h2').allInnerTexts();assert.deepEqual(groups.map(g=>g.replace(/\s+\d+$/,'').trim()),['Open now','Coming up','Finished']);
assert.match(await page.locator('.exam-group').nth(0).innerText(),/Today, /i);assert.match(await page.locator('.exam-group').nth(1).innerText(),/Opens in 1 day, [34] hours/);
assert.match(await page.locator('.exam-group').nth(2).innerText(),/Result released/);assert.match(await page.locator('.exam-group').nth(0).innerText(),/Resume exam/);
await page.screenshot({path:OUT+'exam-list-1280.png',fullPage:true});step('exams are grouped Open now / Coming up / Finished with day headings, countdowns and status pills');
await page.locator(`[data-exam="${ID1}"]`).click();await page.locator('.xr-intro-card').waitFor();assert.match(await page.locator('.xr-intro-card').innerText(),/Calculators are not allowed[\s\S]*Start exam/);
await page.screenshot({path:OUT+'exam-intro-1280.png'});await page.locator('.xr-start').click();await page.locator('.xr-room').waitFor();
assert.match(await page.locator('.xr-passage').innerText(),/Ada smiled/);assert.equal(await page.locator('.xr-option').count(),5);
await page.locator('.xr-option').nth(1).click();await page.keyboard.press('ArrowRight');await page.keyboard.press('b');await page.getByRole('button',{name:'Flag for review'}).click();
await page.waitForTimeout(1500);const last=saves.at(-1);assert.deepEqual(last.answers,[1,1,-1]);assert.deepEqual(last.flags,[1]);assert.equal(await page.locator('.xr-save').innerText(),'Saved');
assert.match(await page.locator('.xr-chip.is-answered').first().getAttribute('aria-label'),/answered/);assert.equal(await page.locator('#xr-chips .xr-chip.is-flagged').count(),1);
await page.screenshot({path:OUT+'exam-room-1280.png'});step('answer by click and keyboard, flag, autosave about a second later');
// Offline
offline=true;await page.keyboard.press('ArrowRight');await page.keyboard.press('a');await page.locator('.xr-save').filter({hasText:'Offline: your answers are on this computer'}).waitFor({timeout:5000});
const stored=await page.evaluate(id=>JSON.parse(localStorage.getItem('pw-exam:'+id)),ID1);assert.deepEqual(stored.answers,[1,1,0]);
offline=false;await page.locator('.xr-save').filter({hasText:/^Saved$/}).waitFor({timeout:8000});assert.deepEqual(saves.at(-1).answers,[1,1,0]);step('offline: answers stay on this computer, retried every 5 seconds, then saved');
// Anti-cheat
const blocked=await page.evaluate(()=>{const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});document.querySelector('.xr-paper').dispatchEvent(e);const c=new Event('copy',{bubbles:true,cancelable:true});document.querySelector('.xr-paper').dispatchEvent(c);return [e.defaultPrevented,c.defaultPrevented];});assert.deepEqual(blocked,[true,true]);
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(1400);assert.equal(saves.at(-1).focusLosses,1);step('right-click and copy are blocked; leaving the exam screen is counted');
// Review lists unanswered and flagged; then submit
await page.locator('.xr-submit').click();await page.locator('.xr-panel').waitFor();const panel=await page.locator('.xr-panel').innerText();assert.match(panel,/answered 3 of 3/);assert.match(panel,/Flagged for review \(1\)/);
await page.locator('.xr-panel [data-go="1"]').click();assert.match(await page.locator('.xr-number').innerText(),/Question 2/i);
await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'Clear answer'}).click();await page.locator('.xr-submit').click();assert.match(await page.locator('.xr-panel').innerText(),/Not answered \(1\)[\s\S]*3/);
await page.screenshot({path:OUT+'exam-review-1280.png'});await page.getByRole('button',{name:'Submit exam'}).last().click();await page.locator('.xr-done').waitFor();
assert.deepEqual(submitted.answers,[1,1,-1]);assert.match(await page.locator('.xr-done').innerText(),/Your result will appear when the school releases it/);
step('submit check lists unanswered and flagged questions as clickable chips; submitted');
await page.close();
// Timer colours and automatic submit at time (phone width, bottom sheet)
let autoSubmitted=null;
const phone=await open({width:360,height:740},async(req,u)=>{if(u===`/portal/learning/mocks/${ID2}/start`)return {mockId:ID2,title:'Quick quiz',subject:'Maths',startedAt:at(-1),deadline:new Date(Date.now()+4000).toISOString(),serverNow:new Date().toISOString(),savedAt:null,answers:[-1,-1,-1],flags:[],questions};if(u===`/portal/learning/mocks/${ID2}/submit`){autoSubmitted=req.postDataJSON();return {submitted:true,expired:false};}});
await phone.goto(origin+'/portal#mocks',{waitUntil:'networkidle'});await phone.locator(`[data-exam="${ID2}"]`).click();await phone.locator('.xr-start').click();await phone.locator('.xr-room').waitFor();
assert.equal(await phone.locator('.xr-timer').getAttribute('data-level'),'red');assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await phone.screenshot({path:OUT+'exam-room-360.png'});await phone.locator('.xr-sheet-open').click();await phone.waitForTimeout(400);await phone.screenshot({path:OUT+'exam-sheet-360.png'});
await phone.locator('#xr-chips [data-go="2"]').click();assert.match(await phone.locator('.xr-number').innerText(),/Question 3/i);
await phone.locator('.xr-done').waitFor({timeout:8000});assert.ok(autoSubmitted,'submitted automatically when time ran out');
step('timer turns red under a minute, palette works as a bottom sheet at 360px, auto-submit at time');
assert.deepEqual(errors,[]);console.log('PASS: student exam list and exam room: autosave, offline, review, timer, anti-cheat, phone sheet.');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
