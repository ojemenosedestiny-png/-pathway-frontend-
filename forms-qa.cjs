// Forms: student registration (steps, inline errors, autosave, photo shrunk in the browser, review, server errors, reference, copy) and staff builder + submissions (synthetic APIs).
const OUT='docs/forms/';require('node:fs').mkdirSync(OUT,{recursive:true});
const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);
const F=(id,type,label,step,required=true,options=[],help='')=>({id,type,label,help,required,options,step});
const regFields=[F('fullName','short','Full name','Personal details'),F('dateOfBirth','date','Date of birth','Personal details'),F('gender','dropdown','Gender','Personal details',true,['Female','Male']),F('stateOfOrigin','short','State of origin','Personal details',false),
 F('email','email','Email address','Contact'),F('phone','phone','Phone number','Contact'),F('address','long','Home address','Contact'),
 F('guardianName','short','Parent or guardian name','Parent or guardian'),F('guardianRelationship','dropdown','Relationship to you','Parent or guardian',true,['Mother','Father','Guardian','Other']),F('guardianPhone','phone','Parent or guardian phone','Parent or guardian'),
 F('programme','short','Intended course or programme','Course and previous school'),F('previousSchool','short','Previous school','Course and previous school'),F('grades','long','Subjects and grades','Course and previous school'),
 F('photo','photo','Passport photograph','Passport photo',true,[],'JPG or PNG, up to 3 MB.')];
const FILE_ID='99999999-9999-4999-8999-999999999999';
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];
const route=async(page,handler)=>{page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/fake-upload',r=>r.fulfill({status:200,body:''}));
 await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=await handler(req,u);
  if(d===undefined){if(u==='/auth/csrf')d={csrfToken:'t'};else if(u==='/admin/dashboard')d={revenue:[]};else if(u.endsWith('/profile')||u.endsWith('/journey'))d={id:'s1',firstName:'Ada',lastName:'Obi',studentId:'NWE-1',milestones:[],user:{}};else d=[];}
  await r.fulfill({status:d&&d.__status||200,contentType:'application/json',body:JSON.stringify(d&&d.__status?d.body:d)});});};
// ---------- Student ----------
const student={id:'u1',role:'STUDENT',studentId:'s1',name:'Ada Obi',permissions:{read:[],write:[]}};
let drafts=[],submits=[],uploads=[],rejectOnce=true;
const page=await browser.newPage({viewport:{width:1280,height:900}});
await route(page,async(req,u)=>{
 if(u==='/auth/session')return student;
 if(u==='/portal/forms')return [{id:'registration',title:'Registration form',description:'Tell us about yourself.',system:true,state:'OPEN',status:submits.length&&!rejectOnce?'NEW':'NOT_STARTED',reference:null,submittedAt:null,staffNote:''},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Mock exam feedback',description:'',system:false,state:'OPEN',status:'APPROVED',reference:'NWP-AB23-CD45',submittedAt:'2026-11-20T09:00:00.000Z',staffNote:''},{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'Course choice',description:'',system:false,state:'OPEN',status:'NEEDS_CHANGES',reference:'NWP-ZZ23-YY45',submittedAt:'2026-11-21T09:00:00.000Z',staffNote:'Add your second choice.',closesAt:'2026-12-01T16:00:00.000Z'}];
 if(u==='/portal/forms/registration')return {id:'registration',title:'Registration form',description:'Tell us about yourself.',fields:regFields,state:'OPEN',answers:{fullName:'Ada Obi'},files:[],status:'NOT_STARTED',reference:null,submittedAt:null,savedAt:null,staffNote:''};
 if(u==='/portal/forms/registration/draft'){drafts.push(req.postDataJSON().answers);return {savedAt:new Date().toISOString()};}
 if(u==='/portal/forms/registration/submit'){submits.push(req.postDataJSON().answers);if(rejectOnce){rejectOnce=false;return {__status:422,body:{error:{code:'FORM_INCOMPLETE',message:'Some answers need attention.',fields:{guardianPhone:'Enter a phone number, for example 0803 123 4567.'}}}};}return {reference:'NWP-7KQ4-M2XD',submittedAt:'2026-11-24T10:05:00.000Z',status:'NEW'};}
 if(u==='/files/upload-url'){uploads.push(req.postDataJSON());return {id:FILE_ID,uploadUrl:origin+'/fake-upload',headers:{'Content-Type':'image/jpeg'}};}
 if(u===`/files/${FILE_ID}/complete`)return {id:FILE_ID,status:'PENDING'};});
await page.goto(origin+'/portal#forms',{waitUntil:'networkidle'});await page.locator('.fm-card').first().waitFor();
const list=await page.locator('.fm-list').innerText();assert.match(list,/Always required[\s\S]*Registration form[\s\S]*Not started[\s\S]*Start form/i);assert.match(list,/Mock exam feedback[\s\S]*Approved[\s\S]*NWP-AB23-CD45[\s\S]*View your copy/i);assert.match(list,/Course choice[\s\S]*Needs changes[\s\S]*Add your second choice[\s\S]*Make changes/i);
assert.match(await page.locator('nav').first().innerText(),/Forms/);
await page.screenshot({path:OUT+'student-forms-1280.png',fullPage:true});step('forms list: registration first, status, reference, note from the school');
await page.locator('[data-form="registration"]').click();await page.locator('.fm-form').waitFor();
assert.match(await page.locator('.fm-step-count').innerText(),/Step 1 of 6/);assert.equal(await page.locator('#f-fullName').inputValue(),'Ada Obi');
assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuetext'),'Step 1 of 6');
await page.getByRole('button',{name:'Next'}).click();
assert.equal(await page.locator('#err-dateOfBirth').innerText(),'This is required.');assert.equal(await page.locator('#f-dateOfBirth').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement?.id),'f-dateOfBirth');
await page.screenshot({path:OUT+'step-error-1280.png'});
await page.locator('#f-dateOfBirth').fill('2008-05-01');await page.locator('#f-gender').selectOption('Female');assert.equal(await page.locator('#err-dateOfBirth').isHidden(),true);
await page.locator('.fm-save').filter({hasText:/^Saved /}).waitFor({timeout:5000});assert.deepEqual(drafts.at(-1),{fullName:'Ada Obi',dateOfBirth:'2008-05-01',gender:'Female'});
step('step 1 of 6 with a progress bar; missing answers show beside the field and take focus; autosave about a second later');
await page.getByRole('button',{name:'Next'}).click();await page.locator('#f-email').fill('ada-at-example');await page.locator('#f-phone').click();
assert.match(await page.locator('#err-email').innerText(),/email address/);await page.locator('#f-email').fill('ada@example.com');
await page.locator('#f-phone').fill('0803 123 4567');await page.locator('#f-address').fill('1 Kubwa Road\nAbuja');await page.getByRole('button',{name:'Next'}).click();
await page.locator('#f-guardianName').fill('Mrs Obi');await page.locator('#f-guardianRelationship').selectOption('Mother');await page.locator('#f-guardianPhone').fill('0803 765 4321');await page.getByRole('button',{name:'Next'}).click();
await page.locator('#f-programme').fill('Medicine');await page.locator('#f-previousSchool').fill('Emerald College');await page.locator('#f-grades').fill('English B3\nMathematics A1');await page.getByRole('button',{name:'Next'}).click();
assert.match(await page.locator('.fm-step-count').innerText(),/Step 5 of 6/);step('a wrong email is flagged when leaving the field');
// Photo: too big is refused; a real picture is shrunk to JPEG before upload
await page.locator('#f-photo').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(3.2*1024*1024,1)});
await page.locator('.fm-upload-status').filter({hasText:/larger than 3 MB/}).waitFor();assert.equal(uploads.length,0);
const picture=fs.readFileSync('docs/mock-results/review-1280.png');
await page.locator('#f-photo').setInputFiles({name:'me.png',mimeType:'image/png',buffer:picture});
await page.locator('.fm-photo').waitFor({timeout:15000});const up=uploads.at(-1);assert.equal(up.mime,'image/jpeg');assert.equal(up.type,'PASSPORT');assert.equal(up.public,false);assert.ok(up.size<picture.length,`shrunk ${picture.length} -> ${up.size}`);
assert.equal(drafts.at(-1).photo,FILE_ID);await page.screenshot({path:OUT+'photo-1280.png'});
step(`photo: over 3 MB is refused; the picture is shrunk in the browser (${Math.round(picture.length/1024)} KB → ${Math.round(up.size/1024)} KB JPEG) and saved privately`);
await page.getByRole('button',{name:'Review your answers'}).click();await page.locator('.fm-review').waitFor();
const review=await page.locator('.fm-review').innerText();assert.match(review,/Step 6 of 6|Check everything/);assert.match(review,/Date of birth\s*1 May 2008/);assert.match(review,/Home address\s*1 Kubwa Road\s*Abuja/);assert.match(review,/State of origin\s*Not answered/);
await page.screenshot({path:OUT+'review-1280.png',fullPage:true});
await page.getByRole('button',{name:'Submit form'}).click();await page.locator('#err-guardianPhone').filter({hasText:/phone number/}).waitFor();
assert.match(await page.locator('.fm-head h2').innerText(),/Parent or guardian/);assert.equal(await page.evaluate(()=>document.activeElement?.id),'f-guardianPhone');
step('review lists every answer; a server rejection returns to the right step with the message beside the field');
await page.locator('#f-guardianPhone').fill('0803 765 4320');await page.getByRole('button',{name:'Next'}).click();await page.getByRole('button',{name:'Next'}).click();await page.getByRole('button',{name:'Review your answers'}).click();
await page.getByRole('button',{name:'Submit form'}).click();await page.locator('.fm-done').waitFor();
assert.match(await page.locator('.fm-reference').innerText(),/NWP-7KQ4-M2XD/);assert.equal(submits.at(-1).guardianPhone,'0803 765 4320');assert.equal(submits.at(-1).photo,FILE_ID);
await page.screenshot({path:OUT+'submitted-1280.png'});
await page.getByRole('button',{name:'View or print your copy'}).click();await page.locator('.fm-copy').waitFor();
const copy=await page.locator('.fm-copy').innerText();assert.match(copy,/Registration form[\s\S]*Submitted[\s\S]*NWP-7KQ4-M2XD/i);assert.match(copy,/Intended course or programme\s*Medicine/);assert.equal(await page.getByRole('button',{name:'Print'}).count(),1);
await page.screenshot({path:OUT+'copy-1280.png',fullPage:true});step('submitted: confirmation with reference number, and a read-only copy to view or print');
await page.close();
// Phone width
const phone=await browser.newPage({viewport:{width:360,height:740}});await route(phone,async(req,u)=>{if(u==='/auth/session')return student;if(u==='/portal/forms/registration')return {id:'registration',title:'Registration form',description:'',fields:regFields,state:'OPEN',answers:{},files:[],status:'NOT_STARTED',reference:null,submittedAt:null,savedAt:null,staffNote:''};if(u==='/portal/forms')return [{id:'registration',title:'Registration form',description:'',system:true,state:'OPEN',status:'DRAFT',reference:null,submittedAt:null,staffNote:''}];if(u.endsWith('/draft'))return {savedAt:new Date().toISOString()};});
await phone.goto(origin+'/portal#forms',{waitUntil:'networkidle'});await phone.locator('[data-form="registration"]').click();await phone.locator('.fm-form').waitFor();
assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:OUT+'step-360.png',fullPage:true});await phone.close();step('the form works at 360px without sideways scrolling');
// ---------- Staff ----------
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Owner',permissions:{read:['*'],write:['*']}};
let savedForms=[],statusCalls=[];
const subs=[{studentId:'11111111-1111-4111-8111-111111111111',studentNumber:'NWE-2026-000001',name:'Ada Obi',cohort:'SS3 2026',reference:'NWP-7KQ4-M2XD',status:'NEW',submittedAt:'2026-11-24T10:05:00.000Z',staffNote:''},{studentId:'22222222-2222-4222-8222-222222222222',studentNumber:'NWE-2026-000002',name:'Bayo Bello',cohort:'SS3 2026',reference:'NWP-HH23-JJ45',status:'APPROVED',submittedAt:'2026-11-23T08:00:00.000Z',staffNote:''}];
const staff=await browser.newPage({viewport:{width:1280,height:900}});
await route(staff,async(req,u)=>{if(u==='/auth/session')return owner;
 if(u==='/admin/forms')return [{id:'registration',system:true,title:'Registration form',description:'',fields:regFields,cohort:'',opensAt:null,closesAt:null,published:true,state:'OPEN',submitted:2,waiting:1}];
 if(u.startsWith('/admin/forms/')&&req.method()==='PUT'&&!u.endsWith('/status')){savedForms.push({url:u,body:req.postDataJSON()});return {};}
 if(u==='/admin/forms/registration/submissions')return {form:{id:'registration',title:'Registration form',fields:regFields,system:true},submissions:subs};
 if(u==='/admin/forms/registration/submissions/'+subs[0].studentId)return {form:{id:'registration',title:'Registration form',fields:regFields},submission:{...subs[0],answers:{fullName:'Ada Obi',dateOfBirth:'2008-05-01',gender:'Female',email:'ada@example.com',phone:'0803 123 4567',address:'1 Kubwa Road',guardianName:'Mrs Obi',guardianRelationship:'Mother',guardianPhone:'0803 765 4320',programme:'Medicine',previousSchool:'Emerald College',grades:'English B3',photo:FILE_ID}},files:[{id:FILE_ID,filename:'me.jpg',mime:'image/jpeg',status:'PENDING'}]};
 if(u.endsWith('/status')){statusCalls.push(req.postDataJSON());return {status:req.postDataJSON().status};}});
await staff.goto(origin+'/admin#forms',{waitUntil:'networkidle'});await staff.locator('.fm-card').first().waitFor();
assert.match(await staff.locator('.fm-list').innerText(),/Always on[\s\S]*Registration form[\s\S]*14 fields[\s\S]*1\s*new · 2 submitted/i);
await staff.screenshot({path:OUT+'staff-forms-1280.png'});
// New form
await staff.getByRole('button',{name:'New form'}).click();const d=staff.locator('dialog.wide-drawer');await d.waitFor();
await d.locator('[name=title]').fill('Course choice');await d.locator('[name=audience][value=cohort]').check();await d.locator('[name=cohort]').fill('SS3 2026');await d.locator('[name=closesAt]').fill('2026-12-01T16:00');await d.locator('[name=published]').check();
await d.locator('[data-i="0"] [data-k=label]').fill('First choice');await d.locator('[data-i="0"] [data-k=type]').selectOption('dropdown');await d.locator('[data-i="0"] [data-k=options]').fill('Medicine\nLaw');
await d.getByRole('button',{name:'Add field'}).click();await d.locator('[data-i="1"] [data-k=label]').fill('Why?');await d.locator('[data-i="1"] [data-k=type]').selectOption('long');
await d.getByRole('button',{name:'Add field'}).click();await d.locator('[data-i="2"] [data-k=type]').selectOption('single');await d.getByRole('button',{name:'Save form'}).click();
assert.match(await d.locator('#fm-editor-error').innerText(),/Field 3 needs a label/);await d.locator('[data-i="2"] [data-act=delete]').click();
await d.locator('[data-i="1"] [aria-label="Move field 2 up"]').click();await staff.screenshot({path:OUT+'builder-1280.png'});
await d.getByRole('button',{name:'Save form'}).click();await d.waitFor({state:'detached'});
const saved=savedForms.at(-1);assert.match(saved.url,/^\/admin\/forms\/[0-9a-f-]{36}$/);
assert.deepEqual({cohort:saved.body.cohort,closesAt:saved.body.closesAt,published:saved.body.published,labels:saved.body.fields.map(f=>f.label),types:saved.body.fields.map(f=>f.type),options:saved.body.fields[1].options},{cohort:'SS3 2026',closesAt:'2026-12-01T15:00:00.000Z',published:true,labels:['Why?','First choice'],types:['long','dropdown'],options:['Medicine','Law']});
step('builder: field types, choices, required, reorder, delete; cohort and Nigeria-time closing date; checks before saving');
// Submissions
await staff.locator('[data-subs="registration"]').click();await staff.locator('#fm-subs table').waitFor();
assert.equal(await staff.locator('a[download]',{hasText:'Export CSV'}).getAttribute('href'),'/backend-api/admin/forms/registration/submissions.csv');
await staff.locator('#fm-status').selectOption('APPROVED');assert.equal(await staff.locator('#fm-subs tbody tr').count(),1);await staff.locator('#fm-status').selectOption('');
await staff.locator('#fm-search').fill('7kq4');assert.equal(await staff.locator('#fm-subs tbody tr').count(),1);await staff.screenshot({path:OUT+'submissions-1280.png'});
await staff.locator(`[data-open="${subs[0].studentId}"]`).click();await staff.locator('.fm-status-form').waitFor();
assert.match(await staff.locator('#fm-one').innerText(),/Ada Obi[\s\S]*NWP-7KQ4-M2XD[\s\S]*Date of birth\s*1 May 2008[\s\S]*me\.jpg/);
await staff.locator('[name=status][value=NEEDS_CHANGES]').check();await staff.getByRole('button',{name:'Save status'}).click();assert.match(await staff.locator('#fm-status-error').innerText(),/Tell the student what to change/);assert.equal(statusCalls.length,0);
await staff.locator('.fm-status-form textarea').fill('Your photo is blurred. Upload a clearer one.');await staff.screenshot({path:OUT+'submission-1280.png'});await staff.getByRole('button',{name:'Save status'}).click();
await staff.waitForTimeout(300);assert.deepEqual(statusCalls,[{status:'NEEDS_CHANGES',note:'Your photo is blurred. Upload a clearer one.'}]);
step('submissions: search, status filter, CSV export, view one, “Needs changes” requires a note to the student');
assert.deepEqual(errors,[]);console.log('FORMS CHECKS PASSED');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
