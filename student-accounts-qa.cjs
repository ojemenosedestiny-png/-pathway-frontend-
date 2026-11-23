// Staff student accounts: filters, add one student, CSV import with per-row preview, temporary passwords (synthetic APIs).
const OUT='docs/student-accounts/';require('node:fs').mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];const posted=[];
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Owner',permissions:{read:['*'],write:['*']}};
const students=[{id:'s1',userId:'u10',studentId:'NWE-2026-000001',firstName:'Ada',lastName:'Okafor',programme:'WAEC',cohort:'SS3 2026',user:{email:'ada@example.org',status:'ACTIVE'}},{id:'s2',userId:'u11',studentId:'NWE-2026-000002',firstName:'Bayo',lastName:'Bello',programme:'A Level',cohort:'Year 12',user:{email:'nwe-2026-000002@students.invalid',status:'ACTIVE'}}];
const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=[];
 if(u==='/auth/session')d=owner;else if(u==='/auth/csrf')d={csrfToken:'t'};else if(u==='/admin/dashboard')d={revenue:[]};else if(u==='/admin/students')d=students;
 else if(u==='/admin/student-accounts/preview'){const rows=req.postDataJSON().rows;d={rows:rows.map((v,i)=>({row:i+1,value:v,errors:v.firstName?[]:['First name is missing.']})),valid:rows.filter(v=>v.firstName).length};}
 else if(u==='/admin/student-accounts'){const rows=req.postDataJSON().rows;posted.push(rows);d={created:rows.map((v,i)=>({row:i+1,id:'n'+i,studentId:'NWE-2026-00010'+i,name:v.firstName+' '+v.lastName,temporaryPassword:'Emerald-482'+i}))};}
 else if(u==='/admin/student-accounts/s1/temporary-password')d={studentId:'NWE-2026-000001',name:'Ada Okafor',temporaryPassword:'Harbour-0042'};
 await r.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
await page.goto(origin+'/admin#students',{waitUntil:'networkidle'});await page.locator('#pw-records tbody tr').first().waitFor();
assert.equal(await page.locator('#pw-records tbody tr').count(),2);assert.match(await page.locator('#pw-records').innerText(),/No email on file/);
await page.locator('#filter-programme').selectOption('A Level');assert.equal(await page.locator('#pw-records tbody tr').count(),1);assert.match(await page.locator('#pw-records tbody').innerText(),/Bayo/);
await page.locator('#filter-programme').selectOption('');step('students table shows programme and cohort and filters by them');
// Add one student
await page.getByRole('button',{name:'Add student'}).click();let d=page.locator('dialog[open]');await d.locator('[name=firstName]').fill('Chidi');await d.locator('[name=lastName]').fill('Eze');await d.locator('[name=programme]').fill('WAEC');await d.getByRole('button',{name:'Add student'}).click();
await page.locator('dialog[open] .password-sheet').waitFor();assert.match(await page.locator('dialog[open] .password-sheet').innerText(),/NWE-2026-000100[\s\S]*Chidi Eze[\s\S]*Emerald-4820/);
assert.deepEqual(posted[0],[{firstName:'Chidi',lastName:'Eze',email:'',phone:'',programme:'WAEC',cohort:''}]);await page.keyboard.press('Escape');step('staff add a student and see the temporary password once');
// CSV with a bad row, then a good one
await page.waitForTimeout(300);await page.getByRole('button',{name:'Import from CSV'}).click();d=page.locator('dialog[open]');
await d.locator('#csv-file').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('First Name,Surname,Email,Class\r\nDayo,Ade,dayo@example.org,SS3\r\n,Obi,obi@example.org,SS3\r\n"Efe, Jr",Uche,,SS2\r\n')});
await d.getByText('1 of 3 rows need fixing').waitFor();assert.equal(await d.locator('#csv-import').count(),0,'no import while rows have problems');assert.match(await d.locator('.csv-preview-table').innerText(),/Efe, Jr/);
await page.screenshot({path:OUT+'csv-preview-1280.png'});
await d.locator('#csv-file').setInputFiles({name:'good.csv',mimeType:'text/csv',buffer:Buffer.from('First name,Last name,Email,Cohort\nDayo,Ade,dayo@example.org,SS3\nEfe,Uche,,SS2\n')});
await d.getByRole('button',{name:'Import 2 students'}).click();await page.locator('dialog[open] .password-sheet').waitFor();
assert.equal(posted.at(-1).length,2);assert.equal(posted.at(-1)[1].cohort,'SS2');await page.screenshot({path:OUT+'csv-passwords-1280.png'});await page.keyboard.press('Escape');
step('CSV import previews per-row problems, blocks import until fixed, then imports');
// Temporary password from the profile
await page.waitForTimeout(300);await page.locator('#pw-records [data-open="0"]').click();await page.getByRole('button',{name:'Give a temporary password'}).click();
await page.locator('dialog[open]').last().getByRole('button',{name:'Create password'}).click();await page.locator('.password-sheet').last().waitFor();assert.match(await page.locator('.password-sheet').last().innerText(),/Harbour-0042/);
step('staff give a student a new temporary password');
assert.deepEqual(errors,[]);console.log('PASS: student accounts: filters, add one, CSV preview and import, temporary passwords.');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
