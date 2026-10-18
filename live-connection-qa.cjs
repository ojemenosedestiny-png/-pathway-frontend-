const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const context=await browser.newContext({baseURL:'http://localhost:3000'});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Actual Render requests: no seeded credentials, no successful login, no messages sent.
  const ready=await context.request.get('/backend-api/health/ready');assert.equal(ready.status(),200);assert.equal((await ready.json()).status,'ready');
  const csrfResponse=await context.request.get('/backend-api/auth/csrf');assert.equal(csrfResponse.status(),200);const csrf=(await csrfResponse.json()).csrfToken;assert.ok(csrf);
  const csrfCookie=(await context.cookies()).find(cookie=>cookie.name==='csrf');assert.ok(csrfCookie);assert.equal(csrfCookie.httpOnly,true);
  const rejected=await context.request.post('/backend-api/auth/student/login',{headers:{Origin:'http://localhost:3000'},data:{studentId:'QA-NOT-A-REAL-STUDENT',password:'NoAccountForThisTest'}});assert.equal(rejected.status(),403);
  await page.goto('/student/login');await page.getByRole('heading',{name:'Welcome back to your Journey.'}).waitFor();
  await page.getByLabel('Student ID',{exact:true}).fill('QA-NOT-A-REAL-STUDENT');await page.getByLabel('Password',{exact:true}).fill('NoAccountForThisTest');
  const loginResponsePromise=page.waitForResponse(response=>response.url().includes('/auth/student/login'));await page.getByRole('button',{name:'Log in to my portal'}).click();const loginResponse=await loginResponsePromise;const loginError=await loginResponse.json();assert.ok(loginResponse.status()===401||(loginResponse.status()===403&&loginError.error?.code==='ORIGIN'));await page.getByRole('alert').filter({hasText:loginError.error.message}).waitFor();if(loginError.error.code==='ORIGIN')console.log('PENDING: Render FRONTEND_ORIGIN must be http://localhost:3000 for real login.');
  assert.ok(!await page.locator('body').innerText().then(text=>text.includes('local delivery preview')));
  await page.screenshot({path:'live-student-login.png',fullPage:true});
  // Contract tests below stub responses: exercise onboarding without altering the owner's password/MFA.
  const calls=[];let loggedIn=false;let student=false;let expireProfile=false;let refreshed=false;
  await page.route('**/backend-api/**',async route=>{
   const request=route.request();const path=new URL(request.url()).pathname.replace('/backend-api','');const data=request.postDataJSON();calls.push({path,data,method:request.method()});
   let response={};let status=200;
   if(path==='/auth/csrf')response={csrfToken:'contract-test-csrf'};
   else if(path==='/auth/admin/login')response={challenge:'c'.repeat(64),requiresPasswordChange:true,requiresTwoFactorSetup:true};
   else if(path==='/auth/admin/2fa/setup')response={secret:'TESTKEYNOTAREALSECRET'};
   else if(path==='/auth/admin/2fa/verify'){loggedIn=true;response={authenticated:true,backupCodes:['test-recovery-code']};}
   else if(path==='/auth/student/login'){loggedIn=true;student=true;response={student:{id:'student-uuid',studentId:'QA-STUDENT'}};}
   else if(path==='/auth/refresh'){refreshed=true;response={refreshed:true};}
   else if(path==='/auth/session'){status=loggedIn?200:401;response=loggedIn?{id:'user-uuid',role:student?'STUDENT':'ADMIN',studentId:student?'student-uuid':undefined,adminRole:student?undefined:'SUPER_ADMIN',permissions:{read:['*'],write:['*']}}:{error:{code:'AUTH_REQUIRED',message:'Sign in'}};}
   else if(path==='/admin/students/manual')response={id:'test-student-uuid',studentId:'QA-2026-000001'};
   else if(path==='/admin/dashboard')response={applicants:0,enrolments:0,bookings:0,revenue:[]};
   else if(path==='/portal/profile'){if(expireProfile&&!refreshed){status=401;response={error:{code:'SESSION_EXPIRED',message:'Expired'}};}else response={firstName:'Test student',lastName:'Example',studentId:'QA-STUDENT',user:{email:'test@example.invalid'},journeyStage:'Registered'};}
   else if(path==='/auth/logout'||path==='/auth/logout-all'){loggedIn=false;response={loggedOut:true};}
   else if(path.startsWith('/admin/')||path.startsWith('/portal/'))response=[];
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('/admin/login');await page.getByLabel('Email',{exact:true}).fill('test@example.invalid');await page.getByLabel('Password',{exact:true}).fill('InitialTestPassword');await page.getByRole('button',{name:'Continue securely'}).click();
  await page.getByLabel('New password',{exact:true}).fill('ReplacementTestPassword');await page.getByLabel('Confirm password',{exact:true}).fill('ReplacementTestPassword');await page.getByRole('button',{name:'Save and continue'}).click();
  await page.getByRole('heading',{name:'Set up your authenticator.'}).waitFor();await page.getByLabel('Authenticator or recovery code').fill('123456');await page.getByRole('button',{name:'Verify and sign in'}).click();
  await page.getByRole('heading',{name:'Save your recovery codes.'}).waitFor();assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>/challenge|secret|backup/i.test(key))),false);
  await page.getByRole('button',{name:'I have saved my codes'}).click();await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();await page.getByText('Figures reflect records').waitFor();
  assert.ok(calls.some(call=>call.path==='/auth/admin/onboarding/password'));await page.screenshot({path:'live-admin-workspace.png',fullPage:true});
  await page.getByRole('link',{name:'Students',exact:true}).click();await page.getByText('No records yet.').waitFor();assert.ok(calls.some(call=>call.path==='/admin/students'));await page.getByText('Create student for an approved exception').click();await page.getByLabel('First name',{exact:true}).fill('Test');await page.getByLabel('Last name',{exact:true}).fill('Student');await page.getByLabel('Student email',{exact:true}).fill('student@example.invalid');await page.getByLabel('Phone',{exact:true}).fill('08000000000');await page.getByLabel('Reason for creating without online payment').fill('Owner-approved integration test');await page.getByRole('button',{name:'Create student and queue setup email'}).click();await page.getByRole('heading',{name:'Student account created'}).waitFor();assert.ok(calls.some(call=>call.path==='/admin/students/manual'&&call.data.reason==='Owner-approved integration test'));
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('heading',{name:'Your school. A considered view.'}).waitFor();
  await page.goto('/student/login');await page.getByLabel('Student ID',{exact:true}).fill('QA-STUDENT');await page.getByLabel('Password',{exact:true}).fill('StudentTestPassword');await page.getByRole('button',{name:'Log in to my portal'}).click();await page.getByText('Welcome, Test student.').waitFor();
  expireProfile=true;await page.getByRole('link',{name:'Profile',exact:true}).click();await page.getByLabel('First name').waitFor();assert.equal(refreshed,true);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('link',{name:'Payments',exact:true}).click();await page.getByText('No records yet.').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'live-student-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: live Atlas readiness, cookie proxy, CSRF rejection, invalid login; contract UI: admin password/MFA/recovery, server sessions, student profile, refresh, logout, mobile navigation.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
