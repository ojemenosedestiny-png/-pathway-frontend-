const assert=require('node:assert/strict');const{chromium}=require('playwright');const{createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage();const origin='http://127.0.0.1:'+server.address().port;let paymentStatus='PENDING',verified=false,hero='Live homepage title';let checks=0,receipts=0,cold=0;const mutations=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/backend-api/**',async route=>{const request=route.request();const url=new URL(request.url());const path=url.pathname.replace('/backend-api','');let data=[],status=200;if(request.method()!=='GET')mutations.push({path,data:request.postDataJSON()});
if(path==='/public/content')data=[{key:'hero.title',value:hero},{key:'faqs',value:[{question:'Live question',answer:'Live answer'}]}];
else if(path==='/public/countries')data=[{id:'country-live',name:'Canada'}];
else if(path==='/public/universities')data=[{id:'uni-live',countryId:'country-live',name:'Live university',description:'Published description',entryRequirements:['School certificate'],tuitionMinor:'15000000',currency:'NGN',featured:true,active:true}];
else if(path==='/public/courses')data=[{id:'course-live',universityId:'uni-live',name:'Published course'}];
else if(path==='/public/exams')data=[{id:'exam-live',body:'School exam',name:'Published examination',description:'Published preparation',feeMinor:'125050',currency:'NGN',requirements:['ID'],timetable:[],active:true}];
else if(path==='/public/slides')data=[{id:'slide-live',title:'Published residence',caption:'Live caption',image:'/assets/school-3.jpg',visible:true}];
else if(path==='/public/announcements')data=[{id:'notice-live',title:'Live notice',body:'<p>Published news</p><script>throw Error("unsafe")</script>',channels:['NEWS','BANNER'],category:'School'}];
else if(path==='/auth/csrf')data={csrfToken:'fixture-csrf'};
else if(path.startsWith('/payments/verify/')){checks++;assert.equal(request.headers()['x-payment-token'],'fixture-status-token');data={reference:'TEST-REFERENCE',status:paymentStatus,verified,studentId:verified?'TEST-2026-000001':null};}
else if(path.endsWith('/receipt')){receipts++;assert.equal(request.headers()['x-payment-token'],'fixture-status-token');await route.fulfill({contentType:'application/pdf',body:'%PDF-1.4 synthetic'});return;}
else if(path==='/cold-test'){if(++cold===1){await route.fulfill({status:502,body:'Bad gateway'});return;}data={recovered:true};}
else if(path==='/auth/student/login'){status=502;data={error:{message:'Unavailable'}};}
await route.fulfill({status,json:data});});
await page.goto(origin+'/');await page.getByRole('heading',{name:hero,exact:true}).waitFor();await page.getByRole('heading',{name:'Live university',exact:true}).waitFor();await page.getByRole('heading',{name:'Published residence',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('pathway-journey-v2')),null);
hero='Updated live title';await page.reload();await page.getByRole('heading',{name:hero,exact:true}).waitFor();
await page.goto(origin+'/pathways');await page.getByRole('searchbox').fill('Published course');await page.getByRole('heading',{name:'Live university',exact:true}).waitFor();
await page.goto(origin+'/news');await page.getByRole('heading',{name:'Live notice',exact:true}).waitFor();
await page.goto(origin+'/faq');await page.getByText('Live question',{exact:true}).waitFor();
await page.goto(origin+'/student/login');await page.evaluate(()=>sessionStorage.setItem('pathway-payment-TEST-REFERENCE','fixture-status-token'));
for(const width of [360,768,1440]){await page.setViewportSize({width,height:900});await page.goto(origin+'/payment-status?ref=TEST-REFERENCE&status=success');await page.getByText('Payment confirmation pending',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Download receipt',exact:true}).count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
paymentStatus='SUCCESS';verified=true;await page.getByRole('button',{name:'Check again',exact:true}).click();await page.getByText('Payment verified',{exact:true}).waitFor();assert.equal(await page.locator('#payment-student-id').innerText(),'TEST-2026-000001');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download receipt',exact:true}).click();await download;assert.equal(receipts,1);
paymentStatus='FAILED';verified=false;await page.reload();await page.getByRole('button',{name:'Retry payment',exact:true}).waitFor();await page.goto(origin+'/payment-status');await page.getByText('Payment reference missing',{exact:true}).waitFor();assert.equal(mutations.length,0);
const recovered=await page.evaluate(async()=>{const{api}=await import('/journey/dist/live-api.js');return api('/cold-test');});assert.equal(recovered.recovered,true);assert.equal(cold,2);
await page.evaluate(async()=>{const{api}=await import('/journey/dist/live-api.js');try{await api('/auth/student/login','POST',{studentId:'TEST',password:'synthetic'});}catch{}});assert.equal(mutations.filter(row=>row.path==='/auth/student/login').length,1);assert.deepEqual(errors,[]);
console.log('PASS: live CMS edits, catalogue mappings, notices/FAQs, no preview storage, server-only payment status, receipt token, failed/missing states, three widths, one GET recovery and no POST replay. All APIs synthetic.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(error=>{console.error(error);process.exitCode=1});
