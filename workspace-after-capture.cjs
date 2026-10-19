// Captures AFTER screenshots of the premium workspace (current working tree)
// against the same fixture backend used by workspace-audit.cjs.
const {chromium}=require('playwright');const {createFrontend}=require('./frontend-server.cjs');
const fixtures=[
 ['/auth/session',()=>({id:'fixture-owner',role:windowStudent?'STUDENT':'ADMIN',adminRole:windowStudent?undefined:'SUPER_ADMIN',permissions:{read:['*'],write:['*']}})],
 ['/profile',()=>({id:'s1',studentId:'DEMO-2026-000001',firstName:'Ada',lastName:'Okafor',user:{email:'ada@example.invalid'},journeyStage:'Registered'})],
 ['/journey',()=>({journeyStage:'Registered'})],
 ['/admin/dashboard',()=>({applicants:124,enrolments:38,bookings:11,upcomingConsultations:6,revenue:[{currency:'NGN',_sum:{amountMinor:'300000000'}}]})],
 ['/students',()=>[
  {id:'s1',studentId:'DEMO-2026-000001',firstName:'Ada',lastName:'Okafor',email:'ada@example.invalid',phone:'+234 801 000 0001',user:{status:'ACTIVE'},journeyStage:'Registered',createdAt:new Date(Date.now()-5*864e5).toISOString()},
  {id:'s2',studentId:'DEMO-2026-000002',firstName:'Bola',lastName:'Adeyemi',email:'bola@example.invalid',phone:'+234 801 000 0002',user:{status:'ACTIVE'},journeyStage:'Documents',createdAt:new Date(Date.now()-12*864e5).toISOString()},
  {id:'s3',studentId:'DEMO-2026-000003',firstName:'Chidi',lastName:'Nwosu',email:'chidi@example.invalid',phone:'+234 801 000 0003',user:{status:'INVITED'},journeyStage:'Payment',createdAt:new Date(Date.now()-25*864e5).toISOString()}]],
 ['/payments',()=>[
  {id:'p1',reference:'NWP-FEE-0001',purpose:'Tuition',payerEmail:'ada@example.invalid',amountMinor:'150000000',currency:'NGN',status:'SUCCESS',verifiedAt:new Date(Date.now()-5*864e5).toISOString()},
  {id:'p2',reference:'NWP-FEE-0002',purpose:'Tuition',payerEmail:'bola@example.invalid',amountMinor:'150000000',currency:'NGN',status:'SUCCESS',verifiedAt:new Date(Date.now()-40*864e5).toISOString()},
  {id:'p3',reference:'NWP-FEE-0003',purpose:'Accommodation',payerEmail:'chidi@example.invalid',amountMinor:'25000000',currency:'NGN',status:'PENDING',verifiedAt:null}]],
 ['/hostels',()=>[{id:'h1',name:'Emerald Hall',description:'A quiet residence for students who want a short walk to campus.',gender:'MIXED',rules:'Quiet hours from 10pm. Visitors sign in at reception.',active:true}]],
 ['/rooms',()=>[{id:'r1',hostelId:'h1',name:'Room A',capacity:4,priceMinor:'25000000',depositMinor:'500000',currency:'NGN',gender:'MIXED',amenities:['Wi-Fi','Study desk'],photos:[],active:true}]],
 ['/fees',()=>[
  {id:'f1',name:'Tuition',purpose:'Tuition',amountMinor:'150000000',currency:'NGN',instalments:1,active:true},
  {id:'f2',name:'Accommodation',purpose:'Hostel',amountMinor:'25000000',currency:'NGN',instalments:1,active:true}]],
 ['/bookings',()=>[{id:'b1',roomId:'r1',studentId:'s1',status:'CONFIRMED',term:'First term',arrival:'2026-09-01',departure:'2026-12-01'}]],
 ['/applications',()=>[{id:'a1',status:'SUBMITTED',university:{name:'Emerald University'},course:{name:'Computer Science'}},{id:'a2',status:'UNDER_REVIEW'}]],
 ['/audit',()=>[]],
 ['/notifications',()=>[{id:'n1',title:'Welcome',readAt:null,at:new Date().toISOString()}]],
 ['/public/content',()=>[{key:'workspace.catalogMeta',value:{
   feeSchedules:[
    {feeId:'f1',programme:'Undergraduate',term:'First term',session:'2026/2027',effectiveFrom:'2026-09-01',active:true,history:[{at:'2026-08-15T10:00:00.000Z',note:'Session “not set” → “2026/2027”'}]},
    {feeId:'f2',programme:'Undergraduate',term:'First term',session:'2026/2027',effectiveFrom:'2026-09-01',active:true,history:[]}],
   hostelLocations:{h1:'Block A, Emerald campus road'},
   roomFees:{r1:{term:'First term',session:'2026/2027',effectiveFrom:'2026-09-01',history:[{at:'2026-08-20T09:00:00.000Z',note:'Room price recorded',priceMinor:'25000000',depositMinor:'500000'}]}}}}]]
];
let windowStudent=false;
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'chrome',headless:true});try{const mock=async page=>{await page.route('**/backend-api/**',route=>{const p=new URL(route.request().url()).pathname;const hit=fixtures.find(([suffix])=>p.endsWith(suffix));route.fulfill({contentType:'application/json',body:JSON.stringify(hit?hit[1]():[])});});};
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});await desktop.emulateMedia({reducedMotion:'reduce'});desktop.on('pageerror',e=>console.log('PAGEERROR',String(e).slice(0,300)));desktop.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200));});await mock(desktop);
 await desktop.goto(origin+'/admin#dashboard');await desktop.waitForTimeout(700);await desktop.screenshot({path:'workspace-admin-after.png',fullPage:true});
 await desktop.goto(origin+'/admin#students');await desktop.waitForTimeout(500);await desktop.screenshot({path:'workspace-students-after.png',fullPage:true});
 await desktop.goto(origin+'/admin#fees');await desktop.waitForTimeout(700);await desktop.screenshot({path:'workspace-fees-after.png',fullPage:true});
 await desktop.goto(origin+'/admin#hostels');await desktop.waitForTimeout(600);await desktop.screenshot({path:'workspace-hostel-after.png',fullPage:true});
 await desktop.locator('[data-hostel]').first().click();await desktop.waitForTimeout(300);await desktop.locator('[data-tab="Fees"]').click();await desktop.waitForTimeout(400);await desktop.screenshot({path:'workspace-hostel-fees-after.png',fullPage:true});
 windowStudent=true;await desktop.goto(origin+'/portal');await desktop.waitForTimeout(600);await desktop.screenshot({path:'workspace-student-after.png',fullPage:true});
 await desktop.goto(origin+'/portal#payments');await desktop.waitForTimeout(700);await desktop.screenshot({path:'workspace-student-payments-after.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:360,height:780}});await mobile.emulateMedia({reducedMotion:'reduce'});await mock(mobile);windowStudent=false;
 await mobile.goto(origin+'/admin#dashboard');await mobile.waitForTimeout(600);await mobile.screenshot({path:'workspace-admin-mobile-after.png',fullPage:true});
 windowStudent=true;await mobile.goto(origin+'/portal');await mobile.waitForTimeout(600);await mobile.screenshot({path:'workspace-student-mobile-after.png',fullPage:true});
 console.log('AFTER captures written.');}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
