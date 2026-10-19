const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const {liveApiProxy} = require('./live-api-proxy.cjs');
function createFrontend() {
 const approvedOrigin=(value)=>{if(!value)return [];const url=new URL(value);if(url.protocol!=='https:')throw Error('Media origins must use HTTPS');return [url.origin];};
 const mediaOrigins=approvedOrigin(process.env.PATHWAY_MEDIA_ORIGIN);
 const uploadOrigins=approvedOrigin(process.env.PATHWAY_UPLOAD_ORIGIN);
 const app=express();app.disable('x-powered-by');
 app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'https://newworldemeraldprivateschool.com','data:','blob:',...mediaOrigins],connectSrc:["'self'",...uploadOrigins],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.use('/backend-api',liveApiProxy());
 const send=file=>(_req,res)=>res.sendFile(path.join(__dirname,file));
 app.get(['/student/login','/admin/login','/portal','/admin','/set-password','/forgot-password','/recover-student-id','/hostel','/pay-fees','/apply','/book-consultation'],send('journey/live.html'));
 app.get(['/portal.html','/student-dashboard','/application-status','/my-bookings'],(_req,res)=>res.redirect('/portal'));
 app.get('/exam.html',(_req,res)=>res.redirect('/portal#exams'));
 app.get('/login',(_req,res)=>res.redirect('/student/login'));
 app.get('/admin.html',(_req,res)=>res.redirect('/admin/login'));
 // Checkout is not enabled until real provider credentials and fees are configured.
 app.get(['/enrol','/signup','/payment-status'],(_req,res)=>res.redirect('/contact'));
 app.get(['/','/index.html','/pathways','/university/:id','/exams','/exams/:id','/about','/faq','/contact','/news'],send('index.html'));
 for(const directory of ['assets','journey/dist'])app.use('/'+directory,express.static(path.join(__dirname,directory),{dotfiles:'deny',index:false,fallthrough:false}));
 app.get('/journey/theme.css',send('journey/theme.css'));
 app.get('/journey/workspace-tokens.css',send('journey/workspace-tokens.css'));
 app.get('/journey/workspace.css',send('journey/workspace.css'));
 app.get(['/styles.css','/redesign.css','/script.js','/ui-enhancements.js'],express.static(__dirname,{dotfiles:'deny',index:false}));
 app.use((_req,res)=>res.status(404).type('text').send('Page not found.'));
 app.use((error,_req,res,_next)=>{if(!res.headersSent)res.status(error.status===404?404:500).type('text').send(error.status===404?'Page not found.':'Unable to load this page.');});
 return app;
}
if(require.main===module){const server=createFrontend().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Pathway website is listening.'));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),15000).unref();});}
module.exports={createFrontend};
