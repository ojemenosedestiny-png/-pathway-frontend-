const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();const origin='http://127.0.0.1:'+server.address().port;let metadata=[];let uploaded=[];let saved;let scans=0;let blocked=false;
await page.route('**/backend-api/**',async route=>{const req=route.request();const path=new URL(req.url()).pathname;let body={};let status=200;
if(path.endsWith('/csrf'))body={csrfToken:'test'};
else if(path.endsWith('/upload-url')){if(blocked){status=503;body={error:{message:'File storage is unavailable.'}};}else{metadata.push(req.postDataJSON());body={id:'test-upload',uploadUrl:origin+'/test-storage',headers:{'Content-Type':req.postDataJSON().mime}};}}
else if(path.endsWith('/complete'))body={status:metadata.at(-1).public?'APPROVED':'PENDING'};
else if(path.endsWith('/status'))body={status:++scans===1?'SCANNING':'APPROVED',url:scans===1?null:origin+'/test-image.png'};
else if(path.includes('/admin/rooms/')){saved=req.postDataJSON();}
await route.fulfill({status,json:body});});
await page.route('**/test-storage',async route=>{uploaded.push(route.request().postDataBuffer());await route.fulfill({status:200,body:''});});
await page.route('**/test-image.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}));
await page.goto(origin+'/student/login');await page.evaluate(async()=>{const {photoEditor}=await import('/journey/dist/workspace-photos.js');photoEditor({id:'test-room',name:'Test room',photos:[]},async()=>{});});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
await page.locator('#photo-upload input[type=file]').setInputFiles({name:'Garden room.png',mimeType:'image/png',buffer:png});
await page.getByText('Picture ready. Save your changes to publish it.').waitFor();assert.deepEqual(uploaded[0],png);assert.equal(metadata[0].public,true);await page.getByRole('button',{name:'Save photographs',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog'));
assert.equal(saved.photos[0].url,origin+'/test-image.png');assert.equal(saved.photos[0].cover,true);
await page.evaluate(async()=>{const {uploadDialog}=await import('/journey/dist/workspace-special.js');uploadDialog(true);});
await page.locator('#upload-files').setInputFiles({name:'School tour.mp4',mimeType:'video/mp4',buffer:Buffer.from('test-video-bytes')});await page.getByText(/Choose JPG, PNG, WebP or PDF up to 10 MB/).waitFor();assert.equal(metadata.length,1);assert.equal(uploaded.length,1);
await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.evaluate(async()=>{const {uploadDialog}=await import('/journey/dist/workspace-special.js');uploadDialog(false);});await page.locator('#upload-files').setInputFiles({name:'Student picture.png',mimeType:'image/png',buffer:png});await page.getByText('Uploaded. Server validation completed. Documents remain private for staff review.',{exact:true}).waitFor();assert.equal(metadata[1].public,false);assert.deepEqual(uploaded[1],png);await page.getByRole('button',{name:'Close dialog',exact:true}).click();blocked=true;await page.evaluate(async()=>{const {photoEditor}=await import('/journey/dist/workspace-photos.js');photoEditor({id:'test-room',name:'Test room',photos:[]},async()=>{});});await page.locator('#photo-upload input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await page.getByText('File storage is unavailable.',{exact:true}).waitFor();assert.equal(await page.locator('#photo-editor-list img').count(),0);
console.log('PASS: device image bytes uploaded, validation awaited, approved image saved to room, student device picture uploaded privately, unsupported video blocked, storage failure never published. Synthetic storage only.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(error=>{console.error(error);process.exitCode=1;});
