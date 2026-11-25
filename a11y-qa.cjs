// Accessibility: axe-core (WCAG 2.1 A and AA rules) on the portal pages built for mock exams and forms, light and dark (synthetic APIs).
const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const at=m=>new Date(Date.now()+m*60000).toISOString();
const F=(id,type,label,step,options=[])=>({id,type,label,help:'',required:true,options,step});
const student={id:'u1',role:'STUDENT',studentId:'s1',name:'Ada Obi',permissions:{read:[],write:[]}};
const owner={id:'u2',role:'ADMIN',adminRole:'SUPER_ADMIN',name:'Fumi Adeyemi',permissions:{read:['*'],write:['*']}};
const profile={id:'s1',firstName:'Ada',lastName:'Obi',studentId:'NWE-2026-000001',programme:'Medicine',cohort:'SS3 2026',milestones:[],journeyStage:'Registered',user:{email:'ada@example.com',phone:'0803',status:'ACTIVE'}};
const mocks=[{id:'11111111-1111-4111-8111-111111111111',title:'English paper 1',subject:'English',instructions:'No calculators.',durationMinutes:45,questionCount:2,opensAt:at(-20),closesAt:at(100),state:'OPEN',attemptStatus:null,resultReleased:false,makeup:false},{id:'2',title:'Physics mock',subject:'Physics',durationMinutes:60,questionCount:40,opensAt:at(60*28),closesAt:at(60*30),state:'UPCOMING',attemptStatus:null,resultReleased:false,makeup:false}];
const data={
 '/portal/learning/mocks':mocks,'/portal/forms':[{id:'registration',title:'Registration form',description:'Tell us about yourself.',system:true,state:'OPEN',status:'DRAFT'},{id:'c',title:'Course choice',system:false,state:'OPEN',status:'NEEDS_CHANGES',reference:'NWP-ZZ23-YY45',submittedAt:at(-60),staffNote:'Add your second choice.'}],
 '/portal/forms/registration':{id:'registration',title:'Registration form',description:'Tell us about yourself.',fields:[F('a','short','Full name','Personal'),F('g','single','Gender','Personal',['Female','Male']),F('d','dropdown','Relationship','Personal',['Mother','Father']),F('p','photo','Passport photograph','Photo')],state:'OPEN',answers:{a:'Ada'},files:[],status:'DRAFT',savedAt:at(-1),staffNote:''},
 '/portal/learning/results':[{kind:'MOCK',mockId:'m',title:'Maths paper 1',subject:'Maths',score:17,maximum:20,percent:85,band:'PASS',submittedAt:at(-300),reviewAvailable:true}],
 '/portal/learning/mocks/11111111-1111-4111-8111-111111111111/start':{mockId:'1',title:'English paper 1',subject:'English',startedAt:at(0),deadline:at(30),serverNow:new Date().toISOString(),savedAt:null,answers:[-1,-1],flags:[],questions:[{prompt:'What did Ada feel?',options:['Sad','Happy','Angry'],passage:'Ada smiled.',image:'',marks:2},{prompt:'7 x 8?',options:['54','56'],passage:'',image:'',marks:1}]},
 '/admin/portal-summary':{students:212,mocksOpenNow:1,scriptsToday:3,formsAwaiting:2,upcoming:[{id:'a',title:'English paper 1',subject:'English',cohort:'SS3 2026',opensAt:at(-20),closesAt:at(100),open:true}]},
 '/admin/forms':[{id:'registration',system:true,title:'Registration form',description:'',fields:[F('a','short','Full name','P')],cohort:'',opensAt:null,closesAt:null,published:true,state:'OPEN',submitted:2,waiting:1}],
 '/admin/learning/mocks':[{key:'MOCK:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',data:{title:'Mathematics paper 1',subject:'Mathematics',cohort:'SS3 2026',studentIds:[],durationMinutes:60,opensAt:at(-60),closesAt:at(180),published:true,releaseResults:false,questions:[{prompt:'2+2',options:['3','4'],answer:1,marks:1}]},started:3,submitted:1,locked:true}],
};
const pages=[
 ['student','/student/login',null],['admin','/admin/login',null],
 ['student','/portal#dashboard',student],['student','/portal#mocks',student],['student','/portal#results',student],['student','/portal#forms',student],['student','/portal#profile',student],
 ['form','/portal#forms',student],['exam','/portal#mocks',student],
 ['staff','/admin#dashboard',owner],['staff','/admin#forms',owner],['staff','/admin#mock-exams',owner],['staff','/admin#student-results',owner],
];
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'});const problems=[];
for(const theme of ['light','dark'])for(const [kind,path,who] of pages){
 const page=await browser.newPage({viewport:{width:1280,height:900},bypassCSP:true});if(theme==='dark')await page.addInitScript(()=>localStorage.setItem('pw-theme','dark'));
 await page.route('**/backend-api/**',async r=>{const u=new URL(r.request().url()).pathname.replace('/backend-api','');let d=data[u];
  if(u==='/auth/session')return who?r.fulfill({contentType:'application/json',body:JSON.stringify(who)}):r.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"UNAUTHENTICATED","message":"Sign in"}}'});
  if(u==='/auth/csrf')d={csrfToken:'t'};if(u==='/admin/dashboard')d={revenue:[]};if(d===undefined&&(u.endsWith('/profile')||u.endsWith('/journey')))d=profile;
  if(u==='/portal/profile/photo')return r.fulfill({status:404,contentType:'application/json',body:'{"error":{"code":"NO_PHOTO","message":"none"}}'});
  await r.fulfill({contentType:'application/json',body:JSON.stringify(d===undefined?[]:d)});});
 await page.goto(origin+path,{waitUntil:'networkidle'});
 if(kind==='form'){await page.locator('[data-form="registration"]').click();await page.locator('.fm-form').waitFor();}
 if(kind==='exam'){await page.locator('[data-exam="11111111-1111-4111-8111-111111111111"]').click();await page.locator('.xr-start').click();await page.locator('.xr-room').waitFor();}
 await page.waitForTimeout(1500);
 await page.addScriptTag({content:axeSource});
 const result=await page.evaluate(async()=>await (window).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']}));
 for(const v of result.violations)problems.push({theme,page:path+(kind==='form'||kind==='exam'?' ('+kind+')':''),rule:v.id,impact:v.impact,count:v.nodes.length,example:v.nodes[0]?.target?.join(' ')+' :: '+(v.nodes[0]?.failureSummary||'').split('\n').slice(1,2).join(' ')});
 await page.close();}
for(const p of problems)console.log(`${p.theme.padEnd(5)} ${p.page.padEnd(28)} ${p.rule} (${p.impact}, ${p.count}) ${p.example.slice(0,220)}`);
await browser.close();server.close();
assert.deepEqual(problems,[],'no WCAG A/AA violations');console.log('ACCESSIBILITY CHECKS PASSED: '+pages.length*2+' page views');
})().catch(e=>{console.error('FAILED',e.message.split('\n')[0]);process.exit(1);});
