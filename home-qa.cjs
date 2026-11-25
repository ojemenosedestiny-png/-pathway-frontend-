// Home dashboards (student hero, next mock exam, forms waiting; staff tiles and upcoming exams) and the student profile (synthetic APIs).
const OUT='docs/home/';require('node:fs').mkdirSync(OUT,{recursive:true});
const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);const at=m=>new Date(Date.now()+m*60000).toISOString();
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];
const student={id:'u1',role:'STUDENT',studentId:'s1',name:'Ada Obi',permissions:{read:[],write:[]}};
const profile={id:'s1',firstName:'Ada',lastName:'Obi',studentId:'NWE-2026-000001',programme:'Medicine',cohort:'SS3 2026',milestones:[],journeyStage:'Registered',user:{email:'ada@example.com',phone:'0803',status:'ACTIVE'}};
const route=async(page,handler)=>{page.on('pageerror',e=>errors.push(e.message));await page.route('**/fake-upload',r=>r.fulfill({status:200,body:''}));
 await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=await handler(req,u);
  if(d===undefined){if(u==='/auth/csrf')d={csrfToken:'t'};else if(u==='/admin/dashboard')d={revenue:[]};else if(u.endsWith('/profile')||u.endsWith('/journey'))d=profile;else d=[];}
  if(d&&d.__image)return r.fulfill({status:200,contentType:'image/png',body:d.__image});
  await r.fulfill({status:d&&d.__status||200,contentType:'application/json',body:JSON.stringify(d&&d.__status?d.body:d)});});};
const mocksOpen=[{id:'m1',title:'English paper 1',subject:'English',durationMinutes:45,questionCount:40,opensAt:at(-20),closesAt:at(100),state:'OPEN',attemptStatus:null},{id:'m2',title:'Physics mock',subject:'Physics',durationMinutes:60,questionCount:40,opensAt:at(60*28),closesAt:at(60*30),state:'UPCOMING',attemptStatus:null},{id:'m3',title:'Maths',subject:'Maths',durationMinutes:60,opensAt:at(-60*48),closesAt:at(-60*46),state:'CLOSED',attemptStatus:'SUBMITTED'}];
const forms=[{id:'registration',title:'Registration form',system:true,state:'OPEN',status:'DRAFT'},{id:'f2',title:'Course choice',system:false,state:'OPEN',status:'NEEDS_CHANGES'},{id:'f3',title:'Feedback',system:false,state:'OPEN',status:'APPROVED'}];
const results=[{kind:'MOCK',title:'Maths'},{kind:'SCHOOL',title:'Test'}];
// Student home with an open exam
let page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{if(u==='/auth/session')return student;if(u==='/portal/learning/mocks')return mocksOpen;if(u==='/portal/forms')return forms;if(u==='/portal/learning/results')return results;});
await page.goto(origin+'/portal#dashboard',{waitUntil:'networkidle'});await page.locator('.home-hero').waitFor();
const hero=await page.locator('.home-hero').innerText();assert.match(hero,/Good (morning|afternoon|evening), Ada\./);assert.match(hero,/Mock exams open now\s*1/i);assert.match(hero,/Coming up\s*1/i);assert.match(hero,/Results released\s*1/i);
assert.match(await page.locator('.home-hero .pw-overline').innerText(),/mock exams · [a-z]+ 20\d\d/i);
const next=await page.locator('.next-mock').innerText();assert.match(next,/English paper 1/);assert.match(next,/45 minutes/);assert.equal(await page.locator('.next-mock a',{hasText:'Start exam'}).getAttribute('href'),'#mocks');
const waiting=await page.locator('.forms-waiting').innerText();assert.match(waiting,/Complete your registration form[\s\S]*Draft saved/);assert.match(waiting,/Course choice[\s\S]*asked for changes/);assert.doesNotMatch(waiting,/Feedback/);
assert.ok(await page.locator('.home-hero').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.student-welcome')?.getBoundingClientRect();return !b||a.top<b.top;}),'hero is first');
await page.screenshot({path:OUT+'student-home-1280.png'});await page.close();step('student home: greeting, three tiles, next mock exam with Start, forms waiting');
// Student home with only an upcoming exam
page=await browser.newPage({viewport:{width:360,height:780}});
await route(page,async(req,u)=>{if(u==='/auth/session')return student;if(u==='/portal/learning/mocks')return [mocksOpen[1]];if(u==='/portal/forms')return [];if(u==='/portal/learning/results')return [];});
await page.goto(origin+'/portal#dashboard',{waitUntil:'networkidle'});await page.locator('.next-mock').waitFor();
assert.match(await page.locator('.next-mock-countdown').innerText(),/^Opens in 1 day, [34] hours/);assert.equal(await page.locator('.forms-waiting').count(),0);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:OUT+'student-home-360.png',fullPage:true});await page.close();step('coming-up exam shows a countdown; works at 360px');
// Staff home
const summary={students:212,mocksOpenNow:2,scriptsToday:37,formsAwaiting:5,upcoming:[{id:'a',title:'English paper 1',subject:'English',cohort:'SS3 2026',opensAt:at(-20),closesAt:at(100),open:true},{id:'b',title:'Physics mock',subject:'Physics',cohort:'All students',opensAt:at(60*28),closesAt:at(60*30),open:false}]};
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Fumi Adeyemi',permissions:{read:['*'],write:['*']}};
page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{if(u==='/auth/session')return owner;if(u==='/admin/portal-summary')return summary;});
await page.goto(origin+'/admin#dashboard',{waitUntil:'networkidle'});await page.locator('.home-hero').waitFor();
const staffHero=await page.locator('.home-hero').innerText();for(const t of [/Fumi\./,/Students\s*212/i,/Mock exams open now\s*2/i,/Scripts submitted today\s*37/i,/Forms awaiting review\s*5/i])assert.match(staffHero,t);
assert.equal(await page.locator('.home-hero a.hero-link',{hasText:/forms awaiting/i}).getAttribute('href'),'#forms');
const up=await page.locator('.upcoming-mocks').innerText();assert.match(up,/English paper 1[\s\S]*SS3 2026[\s\S]*Open now/i);assert.match(up,/Physics mock[\s\S]*Upcoming/i);
await page.screenshot({path:OUT+'staff-home-1280.png'});await page.close();step('staff home: students, exams open now, scripts submitted today, forms awaiting review, upcoming mock exams');
page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{if(u==='/auth/session')return {...owner,adminRole:'STAFF',permissions:{read:['exams','dashboard'],write:[]}};if(u==='/admin/portal-summary')return {mocksOpenNow:2,scriptsToday:37,upcoming:[]};});
await page.goto(origin+'/admin#dashboard',{waitUntil:'networkidle'});await page.locator('.home-hero').waitFor();
assert.equal(await page.locator('.home-hero .pw-hero-tile').count(),2);assert.match(await page.locator('.upcoming-mocks').innerText(),/No mock exams are scheduled/);await page.close();step('staff only see the tiles their permissions allow');
// Profile
let photoPut=null,passwordCalls=[],photoServed=false;const picture=fs.readFileSync('docs/mock-results/review-1280.png');
page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{if(u==='/auth/session')return student;
 if(u==='/portal/profile/photo'&&req.method()==='GET'){return photoServed?{__image:picture}:{__status:404,body:{error:{code:'NO_PHOTO',message:'No photo yet.'}}};}
 if(u==='/portal/profile/photo'&&req.method()==='PUT'){photoPut=req.postDataJSON();photoServed=true;return {photo:true};}
 if(u==='/files/upload-url')return {id:'99999999-9999-4999-8999-999999999999',uploadUrl:origin+'/fake-upload',headers:{'Content-Type':'image/jpeg'}};
 if(u.endsWith('/complete'))return {status:'PENDING'};
 if(u==='/portal/password'){const b=req.postDataJSON();passwordCalls.push(b);return b.currentPassword==='wrong'?{__status:400,body:{error:{code:'CURRENT_PASSWORD',message:'Your current password is not correct.'}}}:{changed:true};}});
await page.goto(origin+'/portal#profile',{waitUntil:'networkidle'});await page.locator('.profile-id').waitFor();
assert.match(await page.locator('nav').first().innerText(),/Profile/);
const id=await page.locator('.profile-id').innerText();assert.match(id,/NWE-2026-000001[\s\S]*Ada Obi[\s\S]*Medicine[\s\S]*SS3 2026[\s\S]*ada@example\.com/i);
await page.waitForTimeout(300);assert.equal(await page.locator('.profile-initials').isVisible(),true,'initials until a photo is added');
await page.locator('#profile-photo-input').setInputFiles({name:'me.png',mimeType:'image/png',buffer:picture});await page.locator('#profile-photo-status',{hasText:'Photo updated.'}).waitFor();
assert.deepEqual(photoPut,{documentId:'99999999-9999-4999-8999-999999999999'});assert.equal(await page.locator('.profile-photo img').isVisible(),true);
const pw=page.locator('#profile-password form');await pw.locator('[name=currentPassword]').fill('Old-secret-2026!');await pw.locator('[name=newPassword]').fill('Brand-new-secret-2026');await pw.locator('[name=confirmPassword]').fill('Brand-new-secret-2025');await pw.locator('button[type=submit]').click();
await page.getByText('The new passwords do not match.').waitFor();assert.equal(passwordCalls.length,0);
await pw.locator('[name=confirmPassword]').fill('Brand-new-secret-2026');await pw.locator('button[type=submit]').click();await page.waitForTimeout(500);
assert.deepEqual(passwordCalls,[{currentPassword:'Old-secret-2026!',newPassword:'Brand-new-secret-2026'}]);assert.equal(await pw.locator('[name=newPassword]').inputValue(),'');
await page.screenshot({path:OUT+'profile-1280.png',fullPage:true});await page.close();step('profile: photo (shrunk and uploaded privately), name, Student ID, programme, change password with confirmation');
page=await browser.newPage({viewport:{width:360,height:780}});await route(page,async(req,u)=>{if(u==='/auth/session')return student;if(u==='/portal/profile/photo')return {__status:404,body:{error:{code:'NO_PHOTO',message:'none'}}};});
await page.goto(origin+'/portal#profile',{waitUntil:'networkidle'});await page.locator('.profile-id').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:OUT+'profile-360.png',fullPage:true});await page.close();step('profile works at 360px');
assert.deepEqual(errors.filter(e=>!/404/.test(e)),[]);console.log('HOME CHECKS PASSED');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
