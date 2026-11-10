// WAEC/NECO registration: applicant form, payment receipt, student document checklist and staff view (synthetic APIs).
const OUT='docs/ssce-registration/';
const fs=require('node:fs');fs.mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');const now=new Date().toISOString();
const options={examBodies:['WAEC','NECO','WAEC_NECO'],states:['Abia','Anambra','Federal Capital Territory','Kogi'],compulsorySubjects:['Mathematics','English Language','Civic Education','Livestock Farming'],electiveSubjects:['Agricultural Science','Biology','Chemistry','Physics','Economics','Government'],minElectives:3,maxElectives:5};
const step=t=>console.log('  ✓',t);
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
const open=async(handler,vp={width:1280,height:900})=>{const page=await browser.newPage({viewport:vp});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/fake-upload',r=>r.fulfill({status:200,body:''}));
 await page.route('**/backend-api/**',async route=>{const req=route.request();const u=new URL(req.url());const path=u.pathname.replace('/backend-api','');let data=await handler(req,path);if(data===undefined)data=path==='/auth/csrf'?{csrfToken:'t'}:[];await route.fulfill({status:data&&data.__status||200,contentType:'application/json',body:JSON.stringify(data&&data.__status?data.body:data)});});return page;};

// 1. Applicant: fill form -> invoice -> bank details -> upload receipt -> waiting for confirmation.
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
 let form=null,invoice=null,payment=false,proof=null,put=null;
 const page=await open(async(req,path)=>{
  if(path==='/applicant/profile')return {id:uuid(1),email:'ada@example.invalid',phone:'',role:'APPLICANT',emailVerified:true,applicant:{applicantNumber:'APP-2026-0007',firstName:'',lastName:''}};
  if(path==='/applicant/ssce-form'&&req.method()==='GET')return {form,locked:false,options};
  if(path==='/applicant/ssce-form'&&req.method()==='PUT'){put=req.postDataJSON();form={...put,email:'ada@example.invalid',formNumber:'NWE-SSCE-2026-0001',applicantNumber:'APP-2026-0007',submittedAt:now};return form;}
  if(path==='/applicant/invoices'&&req.method()==='GET')return invoice?[invoice]:[];
  if(path==='/applicant/invoices/application'){invoice={id:uuid(5),kind:'APPLICATION',reference:'NWP-APPLICATION-ABC123',status:'OPEN',amountMinor:'2500000',currency:'NGN',items:[{description:'WAEC/NECO registration form'}]};return invoice;}
  if(path===`/applicant/invoices/${uuid(5)}/payment`){payment=true;return {payment:{reference:invoice.reference,status:'PENDING'}};}
  if(path==='/applicant/bank')return {bankName:'Example Bank',accountName:'New World Emerald Private School',accountNumber:'0123456789',instructions:'',active:true};
  if(path==='/applicant/payment-proofs')return proof?[{...proof,updatedAt:now}]:[];
  if(path==='/files/upload-url')return {id:uuid(9),uploadUrl:origin+'/fake-upload',headers:{}};
  if(path===`/files/${uuid(9)}/complete`)return {status:'PENDING'};
  if(path==='/applicant/payment-proof'){assert.ok(payment,'payment started before proof');proof=req.postDataJSON();proof.reference=invoice.reference;return proof;}
 },vp);
 await page.goto(origin+'/applicant',{waitUntil:'networkidle'});await page.locator('.ssce-form').waitFor();
 assert.match(await page.locator('#applicant-steps li.current').innerText(),/WAEC\/NECO form/);
 assert.equal(await page.locator('.ssce-fixed').count(),4);
 await page.getByRole('button',{name:/Save form and continue/}).click();assert.match(await page.locator('.ssce-form [role=alert]').innerText(),/Complete the highlighted field/);assert.equal(put,null,'incomplete form not sent');
 await page.locator('[name=examBody][value=WAEC_NECO]').check();await page.locator('[name=surname]').fill('Okafor');await page.locator('[name=firstName]').fill('Ada');
 await page.locator('[name=dateOfBirth]').fill('2009-03-14');await page.locator('[name=gender]').selectOption('Female');await page.locator('[name=stateOfOrigin]').selectOption('Kogi');await page.locator('[name=lga]').fill('Lokoja');await page.locator('[name=nin]').fill('12345678901');
 const picks=page.locator('[name=elective]');await picks.nth(0).selectOption('Biology');await picks.nth(1).selectOption('Biology');await picks.nth(2).selectOption('Physics');
 await page.locator('[name=phone]').fill('08031234567');await page.locator('[name=signature]').fill('Ada Okafor');await page.locator('[name=declaration]').check();
 await page.getByRole('button',{name:/Save form and continue/}).click();assert.match(await page.locator('.ssce-form [role=alert]').innerText(),/chosen once/);
 await picks.nth(1).selectOption('Chemistry');
 if(vp.width>500)await page.screenshot({path:OUT+'applicant-form-1280.png',fullPage:true});
 await page.getByRole('button',{name:/Save form and continue/}).click();await page.locator('.ssce-sheet').waitFor();
 assert.deepEqual(put.electives,['Biology','Chemistry','Physics']);assert.equal(put.examBody,'WAEC_NECO');assert.equal(put.declaration,true);
 assert.match(await page.locator('.ssce-sheet').innerText(),/NWE-SSCE-2026-0001[\s\S]*WAEC and NECO/);assert.match(await page.locator('.applicant-bank').innerText(),/0123456789[\s\S]*NWP-APPLICATION-ABC123/);
 assert.match(await page.locator('#applicant-steps li.current').innerText(),/Pay and upload/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll at '+vp.width);
 await page.screenshot({path:OUT+'applicant-pay-'+vp.width+'.png',fullPage:true});
 await page.locator('[name=receipt]').setInputFiles({name:'transfer.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});await page.locator('[name=paidAt]').fill(now.slice(0,10));await page.locator('[name=note]').fill('GTB ref 0042');
 await page.getByRole('button',{name:'Send receipt'}).click();await page.locator('.applicant-proof').waitFor();
 assert.deepEqual({...proof,reference:undefined},{invoiceId:uuid(5),documentId:uuid(9),paidAt:now.slice(0,10),note:'GTB ref 0042',reference:undefined});
 assert.match(await page.locator('#applicant-steps li.current').innerText(),/School confirms/);
 await page.screenshot({path:OUT+'applicant-waiting-'+vp.width+'.png',fullPage:true});await page.close();
}
step('applicant fills the form, gets a form number and invoice, pays and uploads a receipt (1280 and 390)');

// 2. Student documents checklist and form view.
let slot=null;const student={id:uuid(4),role:'STUDENT',studentId:uuid(2),name:'Ada Okafor',permissions:{read:[],write:[]}};
const reqs=[{key:'passport-photo',label:'Passport photograph',description:'White background.',type:'PASSPORT',required:true},{key:'nin-slip',label:'NIN slip',description:'',type:'IDENTITY',required:true},{key:'other',label:'Other supporting document',description:'',type:'OTHER',required:false}];
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
 slot=null;
 const page=await open(async(req,path)=>{if(path==='/auth/session')return student;if(path.endsWith('/profile')||path.endsWith('/journey'))return {firstName:'Ada',lastName:'Okafor',studentId:'NWE-2026-000021',milestones:[],user:{email:'ada@example.invalid'}};
  if(path==='/portal/learning/document-requirements')return {requirements:reqs,slots:slot?{'nin-slip':{id:uuid(30),filename:'nin.pdf',status:'PENDING'}}:{'passport-photo':{id:uuid(31),filename:'photo.jpg',status:'REJECTED',rejectionReason:'Background must be white'}}};
  if(path==='/portal/learning/ssce-form')return {formNumber:'NWE-SSCE-2026-0001',examBody:'WAEC',surname:'Okafor',firstName:'Ada',middleName:'',dateOfBirth:'2009-03-14',stateOfOrigin:'Kogi',lga:'Lokoja',gender:'Female',nin:'12345678901',electives:['Biology','Chemistry','Physics'],phone:'0803',email:'ada@example.invalid',signature:'Ada Okafor',submittedAt:now,applicantNumber:'APP-2026-0007'};
  if(path==='/files/upload-url'){assert.equal(req.postDataJSON().type,'IDENTITY');return {id:uuid(30),uploadUrl:origin+'/fake-upload',headers:{}};}
  if(path===`/files/${uuid(30)}/complete`)return {status:'PENDING'};
  if(path==='/portal/learning/document-slots/nin-slip'){slot=req.postDataJSON();return {key:'nin-slip',...slot};}},vp);
 await page.goto(origin+'/portal#documents',{waitUntil:'networkidle'});await page.locator('.doc-checklist').waitFor();
 assert.equal(await page.locator('.doc-item').count(),3);{const first=await page.locator('.doc-item').first().innerText();assert.match(first,/Needs a new copy/i);assert.match(first,/Background must be white/);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:OUT+'documents-'+vp.width+'.png',fullPage:true});
 if(vp.width>500){await page.locator('[data-doc-upload=nin-slip]').click();const d=page.locator('dialog[open]');await d.locator('[name=file]').setInputFiles({name:'nin.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4')});await d.getByRole('button',{name:'Upload document'}).click();await page.waitForTimeout(800);assert.deepEqual(slot,{documentId:uuid(30)});
  await page.getByRole('button',{name:'View or print my form'}).click();await page.locator('dialog[open] .ssce-sheet').waitFor();assert.match(await page.locator('dialog[open] .ssce-sheet').innerText(),/Livestock Farming[\s\S]*Biology/);await page.keyboard.press('Escape');}
 await page.close();}
step('student portal lists required documents with status, uploads into a slot, shows the form');

// 3. Staff: forms list and document list editor.
let savedReqs=null;const owner={id:uuid(3),role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Owner',permissions:{read:['*'],write:['*']}};
const staff=await open(async(req,path)=>{if(path==='/auth/session')return owner;if(path==='/admin/dashboard')return {revenue:[]};
 if(path==='/admin/ssce/forms')return [{id:'r1',userId:uuid(1),form:{formNumber:'NWE-SSCE-2026-0001',examBody:'NECO',surname:'Okafor',firstName:'Ada',electives:['Biology','Chemistry','Physics'],submittedAt:now,applicantNumber:'APP-2026-0007'},account:{email:'ada@example.invalid',role:'APPLICANT',student:null},invoice:{reference:'NWP-APPLICATION-ABC123',status:'OPEN'}}];
 if(path==='/admin/learning/document-requirements'&&req.method()==='PUT'){savedReqs=req.postDataJSON();return savedReqs.requirements;}
 if(path==='/admin/learning/document-requirements')return reqs;});
await staff.goto(origin+'/admin#registrations',{waitUntil:'networkidle'});await staff.locator('#ssce-forms tbody tr').first().waitFor();
assert.match(await staff.locator('#ssce-forms tbody tr').first().innerText(),/NWE-SSCE-2026-0001[\s\S]*Okafor Ada[\s\S]*NECO[\s\S]*7/);
await staff.locator('#ssce-forms [data-open="0"]').click();await staff.locator('dialog[open] .ssce-sheet').waitFor();await staff.keyboard.press('Escape');
await staff.locator('#doc-req-add').click();const last=staff.locator('.doc-req-row').last();await last.locator('[name=label]').fill('Testimonial letter');await last.locator('[name=type]').selectOption('RESULT');
await staff.getByRole('button',{name:'Save document list'}).click();await staff.waitForTimeout(600);
assert.equal(savedReqs.requirements.length,4);assert.deepEqual(savedReqs.requirements[3],{key:'testimonial-letter',label:'Testimonial letter',description:'',type:'RESULT',required:true});
await staff.screenshot({path:OUT+'staff-forms-1280.png',fullPage:true});await staff.close();
step('staff see forms, open the printable sheet and edit the required document list');

assert.deepEqual(errors,[]);console.log('PASS: WAEC/NECO form, receipt upload, document checklist and staff forms at 1280 and 390.');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
