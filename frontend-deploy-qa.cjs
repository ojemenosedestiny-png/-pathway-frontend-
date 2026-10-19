const assert=require('node:assert/strict');
const {createFrontend}=require('./frontend-server.cjs');
(async()=>{const server=createFrontend().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const origin='http://127.0.0.1:'+server.address().port;
try{
 for(const route of ['/','/contact','/pathways','/student/login','/admin/login','/portal','/admin','/journey/dist/live-ui.js','/journey/theme.css','/journey/workspace.css','/journey/workspace-tokens.css','/journey/dist/workspace-premium.js','/assets/fonts/Inter.ttf','/assets/school-logo.png']){const response=await fetch(origin+route);assert.equal(response.status,200,route);}
 const health=await fetch(origin+'/health/live');assert.deepEqual(await health.json(),{status:'ok'});
 for(const route of ['/.env','/backend/.env','/env.txt','/package.json','/server.js','/data/newworldpathway.sqlite'])assert.equal((await fetch(origin+route)).status,404,route);
 for(const route of ['/portal.html','/admin.html','/enrol']){const response=await fetch(origin+route,{redirect:'manual'});assert.equal(response.status,302,route);}
 assert.equal((await fetch(origin+'/student/login')).headers.get('content-security-policy').includes("script-src 'self'"),true);
 console.log('PASS: production frontend pages/assets, health, private-file exclusion, legacy-route redirects and CSP.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
