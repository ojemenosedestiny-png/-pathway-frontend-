// Staff mock exams: folders, builder (marks, passage, options, reorder, duplicate), Excel preview, students, lock, make-ups (synthetic APIs).
const OUT='docs/mock-exams/';require('node:fs').mkdirSync(OUT,{recursive:true});
const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const step=t=>console.log('  ✓',t);const iso=h=>new Date(Date.now()+h*3600e3).toISOString();
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const errors=[];const saved=[];const makeups=[];
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Owner',permissions:{read:['*'],write:['*']}};
const students=[{id:'11111111-1111-4111-8111-111111111111',studentId:'NWE-2026-000001',firstName:'Ada',lastName:'Okafor',cohort:'SS3 2026'},{id:'22222222-2222-4222-8222-222222222222',studentId:'NWE-2026-000002',firstName:'Bayo',lastName:'Bello',cohort:'SS2 2026'}];
const mocks=[{key:'MOCK:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',data:{title:'Mathematics paper 1',subject:'Mathematics',cohort:'SS3 2026',studentIds:[],durationMinutes:60,opensAt:iso(-1),closesAt:iso(3),published:true,releaseResults:false,questions:[{prompt:'2+2',options:['3','4'],answer:1,marks:1}]},started:3,submitted:1,locked:true},{key:'MOCK:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',data:{title:'English practice',subject:'English',cohort:'',studentIds:[],durationMinutes:45,opensAt:iso(48),closesAt:iso(50),published:false,questions:[{prompt:'Q',options:['a','b'],answer:0,marks:1}]},started:0,submitted:0,locked:false}];
const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
await page.route('**/backend-api/**',async r=>{const req=r.request();const u=new URL(req.url()).pathname.replace('/backend-api','');let d=[];
 if(u==='/auth/session')d=owner;else if(u==='/auth/csrf')d={csrfToken:'t'};else if(u==='/admin/dashboard')d={revenue:[]};
 else if(u==='/admin/learning/mocks'&&req.method()==='GET')d=mocks;else if(u==='/admin/learning/mocks/students')d=students;
 else if(u.startsWith('/admin/learning/mocks/')&&u.endsWith('/makeups')&&req.method()==='GET')d=makeups;
 else if(/\/makeups\/[\w-]+$/.test(u)&&req.method()==='PUT'){const b=req.postDataJSON();makeups.push({studentId:u.split('/').pop(),...b});d=b;}
 else if(u==='/admin/learning/mocks/import-sheet'){d={ready:2,rows:[{row:2,question:{prompt:'Capital of Nigeria?',options:['Lagos','Abuja'],answer:1,marks:2,passage:''},problems:[],warnings:[],source:{question:'Capital of Nigeria?',A:'Lagos',B:'Abuja',answer:'B',marks:'2'}},{row:3,question:null,problems:['Answer "C" does not match a filled choice.'],warnings:[],source:{question:'Broken',A:'x',B:'y',answer:'C',marks:'1'}},{row:4,question:{prompt:'5 × 5?',options:['10','25','55'],answer:1,marks:1,passage:'Times tables'},problems:[],warnings:['No marks given: 1 mark.'],source:{question:'5 × 5?',A:'10',B:'25',C:'55',answer:'B',marks:''}}]};}
 else if(u.startsWith('/admin/learning/mocks/')&&req.method()==='PUT'){saved.push(req.postDataJSON());d={};}
 await r.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
await page.goto(origin+'/admin#mock-exams',{waitUntil:'networkidle'});await page.locator('.mock-folder').first().waitFor();
const folders=await page.locator('.mock-folder-name').allInnerTexts();assert.deepEqual(folders.map(f=>f.trim()),['All students','SS3 2026']);
assert.match(await page.locator('.mock-row').filter({hasText:'Mathematics paper 1'}).innerText(),/3 started · 1 submitted[\s\S]*Questions locked/);
await page.screenshot({path:OUT+'mocks-list-1280.png',fullPage:true});step('exams are grouped in folders by cohort with dates, counts and lock state');
// Create a new exam
await page.locator('#pw-primary .pw-button').click();const d=page.locator('dialog[open]');await d.locator('[name=title]').fill('Physics mock');await d.locator('[name=subject]').fill('Physics');
await d.locator('[name=opensAt]').fill('2026-12-01T09:00');await d.locator('[name=closesAt]').fill('2026-12-01T11:00');await d.locator('[name=durationMinutes]').fill('40');await d.locator('[name=instructions]').fill('Answer all questions.');
const q0=d.locator('[data-q="0"]');await q0.locator('[data-field=prompt]').fill('Unit of force?');for(const [k,v] of ['Joule','Newton','Watt','Pascal'].entries())await q0.locator(`[data-option="${k}"]`).fill(v);
await q0.getByRole('button',{name:'Add option'}).click();await q0.locator('[data-option="4"]').fill('Volt');await q0.locator('input[type=radio][value="1"]').check();await q0.locator('[data-field=marks]').fill('2');
await q0.locator('.mock-passage summary').click();await q0.locator('[data-field=passage]').fill('Read carefully.');
await q0.getByRole('button',{name:'Duplicate'}).click();assert.equal(await d.locator('.mock-q').count(),2);await d.locator('[data-q="1"] [data-field=prompt]').fill('Unit of energy?');await d.locator('[data-q="1"] input[type=radio][value="0"]').check();
await d.locator('[data-q="1"] [aria-label="Move question 2 up"]').click();assert.match(await d.locator('[data-q="0"] [data-field=prompt]').inputValue(),/energy/);
// Excel import preview
await d.locator('.mock-import-panel summary').first().click();await d.locator('#sheet-file').setInputFiles({name:'q.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('PK fake')});
await d.getByText('2 questions ready, 1 need fixing').waitFor();assert.match(await d.locator('.sheet-preview').innerText(),/does not match a filled choice/);
await page.screenshot({path:OUT+'mock-sheet-preview-1280.png'});await d.getByRole('button',{name:'Add 2 questions'}).click();assert.equal(await d.locator('.mock-q').count(),4);
// Particular students
await d.locator('[name=audience][value=students]').check();await d.locator('#mock-student-search').fill('ada');await d.locator('.mock-student input').first().check();
await d.getByRole('button',{name:'Save mock exam'}).click();await page.waitForTimeout(500);
const p=saved.at(-1);assert.equal(p.title,'Physics mock');assert.equal(p.opensAt,'2026-12-01T08:00:00.000Z','Nigeria time is UTC+1');assert.equal(p.durationMinutes,40);assert.deepEqual(p.studentIds,[students[0].id]);assert.equal(p.cohort,'');
assert.deepEqual(p.questions.map(q=>q.prompt),['Unit of energy?','Unit of force?','Capital of Nigeria?','5 × 5?']);assert.equal(p.questions[1].options.length,5);assert.equal(p.questions[1].answer,1);assert.equal(p.questions[1].marks,2);assert.equal(p.questions[1].passage,'Read carefully.');assert.equal(p.questions[3].passage,'Times tables');
step('staff build an exam: marks, passage, 5 options, duplicate, reorder, Excel import, particular students; times saved as Nigeria time');
// Locked exam: questions disabled, times editable
await page.locator('.mock-row').filter({hasText:'Mathematics paper 1'}).getByRole('button',{name:'Edit'}).click();const L=page.locator('dialog[open]');await L.getByText('A student has started this exam').waitFor();
assert.equal(await L.locator('[data-field=prompt]').first().isDisabled(),true);assert.equal(await L.locator('[name=durationMinutes]').isDisabled(),true);assert.equal(await L.locator('#question-add').count(),0);
await L.locator('[name=closesAt]').fill('2026-12-02T12:00');await L.getByRole('button',{name:'Save mock exam'}).click();await page.waitForTimeout(500);assert.equal(saved.at(-1).closesAt,'2026-12-02T11:00:00.000Z');assert.equal(saved.at(-1).cohort,'SS3 2026');
step('a started exam locks its questions and duration but its times can still change');
// Make-ups
await page.waitForTimeout(300);await page.locator('.mock-row').filter({hasText:'Mathematics paper 1'}).getByRole('button',{name:'Make-ups'}).click();const M=page.locator('dialog[open]');
await M.locator('#makeup-search').fill('bayo');await M.locator('#makeup-student').selectOption(students[1].id);await M.locator('[name=opensAt]').fill('2026-12-05T10:00');await M.locator('[name=closesAt]').fill('2026-12-05T12:00');await M.getByRole('button',{name:'Give make-up window'}).click();
await M.locator('.makeup-list').getByText('Bayo Bello').waitFor();assert.deepEqual(makeups[0],{studentId:students[1].id,opensAt:'2026-12-05T09:00:00.000Z',closesAt:'2026-12-05T11:00:00.000Z'});
step('staff give a student their own make-up window');
assert.deepEqual(errors,[]);console.log('PASS: staff mock exams: folders, builder, Excel preview, assignment, lock and make-ups.');await browser.close();server.close();})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
