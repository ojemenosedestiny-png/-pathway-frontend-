// Results: staff progress, statistics, extra time, release with confirm, CSV link, grouped overview; student results with band and answer review (synthetic APIs).
const OUT='docs/mock-results/';require('node:fs').mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);const iso=h=>new Date(Date.now()+h*3600e3).toISOString();
const MID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',S1='11111111-1111-4111-8111-111111111111';
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Owner',permissions:{read:['*'],write:['*']}};
const mocks=[{key:'MOCK:'+MID,data:{title:'Mathematics paper 1',subject:'Mathematics',cohort:'SS3 2026',studentIds:[],durationMinutes:60,opensAt:iso(-1),closesAt:iso(3),published:true,releaseResults:false,questions:[]},started:3,submitted:2,locked:true},
 {key:'MOCK:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',data:{title:'English paper 1',subject:'English',cohort:'SS3 2026',studentIds:[],durationMinutes:45,opensAt:iso(-30),closesAt:iso(-28),published:true,releaseResults:true,questions:[]},started:5,submitted:5,locked:true}];
let released=false,releaseCalls=[],extraCalls=[];
const results=()=>({id:MID,title:'Mathematics paper 1',subject:'Mathematics',cohort:'SS3 2026',opensAt:iso(-1),closesAt:iso(3),passMark:50,releaseResults:released,
 progress:{writing:1,submitted:2,notStarted:1,timeUp:0},stats:{average:62.5,highest:85,lowest:40,passRate:50},
 students:[{id:S1,studentId:'NWE-2026-000001',name:'Ada Okafor',cohort:'SS3 2026',status:'WRITING',score:null,maximum:20,percent:null,band:null,focusLosses:2,deadline:iso(0.5),extraMinutes:extraCalls.length?5:0,makeup:false},
  {id:'22222222-2222-4222-8222-222222222222',studentId:'NWE-2026-000002',name:'Bayo Bello',cohort:'SS3 2026',status:'SUBMITTED',score:17,maximum:20,percent:85,band:'PASS',focusLosses:0,submittedAt:iso(-0.2),makeup:false},
  {id:'33333333-3333-4333-8333-333333333333',studentId:'NWE-2026-000003',name:'Chidi Eze',cohort:'SS3 2026',status:'SUBMITTED',score:8,maximum:20,percent:40,band:'BELOW',focusLosses:1,submittedAt:iso(-0.3),makeup:true},
  {id:'44444444-4444-4444-8444-444444444444',studentId:'NWE-2026-000004',name:'Dupe Ade',cohort:'SS3 2026',status:'NOT_STARTED',score:null,maximum:20,percent:null,band:null,focusLosses:null,makeup:false}]});
const route=async(page,handler)=>{page.on('pageerror',e=>errors.push(e.message));await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=await handler(req,u);
 if(d===undefined){if(u==='/auth/csrf')d={csrfToken:'t'};else if(u==='/admin/dashboard')d={revenue:[]};else d=[];}
 await r.fulfill({status:d&&d.__status||200,contentType:'application/json',body:JSON.stringify(d&&d.__status?d.body:d)});});};
// Staff
const page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{if(u==='/auth/session')return owner;if(u==='/admin/learning/mocks')return mocks;if(u===`/admin/learning/mocks/${MID}/results`)return results();
 if(u===`/admin/learning/mocks/${MID}/release`){releaseCalls.push(req.postDataJSON());released=req.postDataJSON().released;return {released};}
 if(u===`/admin/learning/mocks/${MID}/attempts/${S1}/extra-time`){extraCalls.push(req.postDataJSON());return {deadline:iso(0.6)};}});
await page.goto(origin+'/admin#student-results',{waitUntil:'networkidle'});await page.locator('.results-overview').waitFor();
const overview=await page.locator('.results-overview').innerText();assert.match(overview,/SS3 2026/i);assert.match(overview,/Mathematics[\s\S]*Mathematics paper 1[\s\S]*2 submitted of 3 started[\s\S]*Not released/i);assert.match(overview,/English paper 1[\s\S]*Released/i);
await page.screenshot({path:OUT+'overview-1280.png',fullPage:true});step('results overview groups exams by cohort, then subject');
await page.locator(`[data-results="${MID}"]`).click();await page.locator('.results-tiles').waitFor();
const tiles=await page.locator('.results-tiles').innerText();for(const t of [/Writing\s*1/i,/Submitted\s*2/i,/Not started\s*1/i,/Class average\s*62\.5%/i,/Highest\s*85%/i,/Lowest\s*40%/i,/Pass rate\s*50%/i])assert.match(tiles,t);
assert.equal(await page.locator('a[download]',{hasText:'Export CSV'}).getAttribute('href'),`/backend-api/admin/learning/mocks/${MID}/results.csv`);
const table=await page.locator('.results-table').innerText();assert.match(table,/Bayo Bello[\s\S]*17 \/ 20[\s\S]*85%[\s\S]*Pass/);assert.match(table,/Chidi Eze[\s\S]*make-up[\s\S]*40%[\s\S]*Below pass mark/);
await page.screenshot({path:OUT+'exam-results-1280.png'});step('one exam shows live progress, class average, highest, lowest, pass rate, scores with pass/fail band and a CSV export');
await page.locator('[data-extra="5"]').click();await page.locator('.results-table').filter({hasText:'(+5 min)'}).waitFor();assert.deepEqual(extraCalls,[{minutes:5}]);step('extra time: +5 minutes for a student still writing');
await page.locator('#results-filter').fill('chidi');assert.equal(await page.locator('.results-table tbody tr').count(),1);assert.equal(await page.locator('#results-filter').evaluate(e=>e===document.activeElement),true);await page.locator('#results-filter').fill('');step('search by name keeps focus in the box');
await page.locator('#results-release').click();await page.getByRole('button',{name:'Cancel'}).click();assert.deepEqual(releaseCalls,[]);
await page.locator('#results-release').click();await page.locator('dialog[aria-label="Release results?"] button[value="confirm"]').click();await page.locator('.results-release.is-released').waitFor();assert.deepEqual(releaseCalls,[{released:true}]);
assert.match(await page.locator('#results-release').innerText(),/Withhold results/);step('release needs confirmation; cancelling sends nothing');
await page.close();
const phoneStaff=await browser.newPage({viewport:{width:360,height:740}});await route(phoneStaff,async(req,u)=>{if(u==='/auth/session')return owner;if(u==='/admin/learning/mocks')return mocks;if(u===`/admin/learning/mocks/${MID}/results`)return results();});
await phoneStaff.goto(origin+'/admin#student-results',{waitUntil:'networkidle'});await phoneStaff.locator(`[data-results="${MID}"]`).click();await phoneStaff.locator('.results-tiles').waitFor();
assert.equal(await phoneStaff.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phoneStaff.screenshot({path:OUT+'exam-results-360.png'});await phoneStaff.close();step('results panel fits a 360px phone');
// Student
const student={id:'u1',role:'STUDENT',studentId:'s1',name:'Ada Okafor',permissions:{read:[],write:[]}};
const mine=[{kind:'MOCK',mockId:MID,title:'Mathematics paper 1',subject:'Mathematics',score:17,maximum:20,percent:85,band:'PASS',submittedAt:iso(-30),expired:false,reviewAvailable:true},
 {kind:'MOCK',mockId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'English paper 1',subject:'English',score:8,maximum:20,percent:40,band:'BELOW',submittedAt:iso(-2),expired:true,reviewAvailable:false},
 {kind:'SCHOOL',title:'First term test',subject:'Biology',score:30,maximum:40,comment:'Good improvement.'}];
let reviewCalls=0;
for(const vp of [{width:1280,height:900},{width:360,height:740}]){const p=await browser.newPage({viewport:vp});
 await route(p,async(req,u)=>{if(u==='/auth/session')return student;if(u.endsWith('/profile')||u.endsWith('/journey'))return {id:'s1',firstName:'Ada',lastName:'Okafor',studentId:'NWE-1',milestones:[],user:{}};if(u==='/portal/learning/results')return mine;
  if(u==='/portal/learning/mocks/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/review')throw new Error('review must not be requested before close');
  if(u===`/portal/learning/mocks/${MID}/review`){reviewCalls++;return {subject:'Mathematics',title:'Mathematics paper 1',score:17,maximum:20,questions:[{prompt:'7 × 8 = ?',options:['54','56','58'],correct:1,chosen:1,marks:1,passage:'',image:''},{prompt:'Capital of Nigeria?',options:['Lagos','Abuja'],correct:1,chosen:0,marks:2,passage:'',image:'',explanation:'Abuja became the capital in 1991.'}]};}});
 await p.goto(origin+'/portal#results',{waitUntil:'networkidle'});await p.locator('.result-card').first().waitFor();
 const cards=await p.locator('.result-cards').innerText();assert.match(cards,/Mathematics paper 1[\s\S]*17\s*\/ 20[\s\S]*85%[\s\S]*Pass/);assert.match(cards,/English paper 1[\s\S]*time ran out[\s\S]*40%[\s\S]*Below pass mark[\s\S]*opens after the exam closes for everyone/);assert.match(cards,/First term test[\s\S]*Good improvement[\s\S]*75%/);
 assert.equal(await p.locator('[data-review]').count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.waitForTimeout(1200);await p.screenshot({path:OUT+`student-results-${vp.width}.png`,fullPage:true});
 await p.locator(`[data-review="${MID}"]`).click();await p.locator('.review-list').waitFor();
 const review=await p.locator('.review-list').innerText();assert.match(review,/Correct[\s\S]*56[\s\S]*Correct answer[\s\S]*Your answer/i);assert.match(review,/Not correct[\s\S]*Lagos[\s\S]*Your answer[\s\S]*Abuja[\s\S]*Correct answer[\s\S]*1991/i);
 assert.equal(await p.locator('.review-options li.is-chosen-wrong').count(),1);await p.screenshot({path:OUT+`review-${vp.width}.png`});await p.close();}
assert.equal(reviewCalls,2);step('students see score, percentage and pass/fail band; the review opens only when available and marks correct and chosen answers');
assert.deepEqual(errors,[]);console.log('MOCK RESULTS CHECKS PASSED');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
