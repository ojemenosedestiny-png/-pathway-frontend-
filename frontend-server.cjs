const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const fs = require('node:fs');
const {liveApiProxy} = require('./live-api-proxy.cjs');
function createFrontend() {
 const approvedOrigin=(value)=>{if(!value)return [];const url=new URL(value);if(url.protocol!=='https:')throw Error('Media origins must use HTTPS');return [url.origin];};
 const mediaOrigins=approvedOrigin(process.env.PATHWAY_MEDIA_ORIGIN);
 const uploadOrigins=approvedOrigin(process.env.PATHWAY_UPLOAD_ORIGIN);
 const app=express();app.disable('x-powered-by');
 app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'https://newworldemeraldprivateschool.com','data:','blob:',...mediaOrigins],mediaSrc:["'self'",'blob:',...mediaOrigins],connectSrc:["'self'",...uploadOrigins],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.use('/backend-api',liveApiProxy());
 const send=file=>(_req,res)=>res.sendFile(path.join(__dirname,file));
 app.get(['/student/login','/admin/login','/portal','/admin','/set-password','/forgot-password','/recover-student-id','/payment-status','/hostel','/pay-fees','/apply','/book-consultation'],send('journey/live.html'));
 app.get(['/portal.html','/student-dashboard','/application-status','/my-bookings'],(_req,res)=>res.redirect('/portal'));
 app.get('/exam.html',(_req,res)=>res.redirect('/portal#exams'));
 app.get('/login',(_req,res)=>res.redirect('/student/login'));
 app.get('/admin.html',(_req,res)=>res.redirect('/admin/login'));
 // Checkout is not enabled until real provider credentials and fees are configured.
 app.get('/enrol',(_req,res)=>res.redirect('/contact'));
 app.get(['/signup','/verify-email','/applicant'],send('journey/live.html'));
 app.get('/other-exams',send('exam-directory.html'));
 app.get('/service-information',send('service-information.html'));
 app.get('/privacy',send('application-information.html'));
 app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /portal\nDisallow: /applicant\nDisallow: /backend-api/\nSitemap: https://newworldpathwayuniversity.com/sitemap.xml\n'));
 app.get('/sitemap.xml',(_req,res)=>res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/about','/pathways','/exams','/hostel','/contact','/faq','/news','/other-exams','/service-information'].map(route=>'<url><loc>https://newworldpathwayuniversity.com'+route+'</loc></url>').join('')+'</urlset>'));
 app.get(['/','/index.html','/pathways','/university/:id','/exams','/exams/:id','/about','/faq','/contact','/news'],(req,res)=>{const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const route=req.path==='/index.html'?'/':req.path;const canonical='https://newworldpathwayuniversity.com'+route;const title=route==='/'?'Exam preparation and study guidance | NewworldPathway':(route.split('/')[1]||'NewworldPathway')+' | NewworldPathway';res.type('html').send(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<!-- PUBLIC_PAGE_METADATA -->',`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="Exam preparation and study-abroad guidance by New World Emerald Private School, Kubwa, Abuja."><script type="application/ld+json">{"@context":"https://schema.org","@type":"EducationalOrganization","name":"New World Emerald Private School","url":"https://newworldpathwayuniversity.com","description":"Exam preparation and study-abroad guidance through NewworldPathway","address":{"@type":"PostalAddress","addressLocality":"Kubwa, Abuja","addressCountry":"NG"}}</script>`));});
 for(const directory of ['assets','journey/dist'])app.use('/'+directory,express.static(path.join(__dirname,directory),{dotfiles:'deny',index:false,fallthrough:false}));
 app.get('/journey/theme.css',send('journey/theme.css'));
 app.get('/journey/workspace-tokens.css',send('journey/workspace-tokens.css'));
 app.get('/journey/workspace.css',send('journey/workspace.css'));
 app.get(['/styles.css','/redesign.css','/script.js','/ui-enhancements.js','/exam-directory.js','/service-information.js'],express.static(__dirname,{dotfiles:'deny',index:false}));
 app.use((_req,res)=>res.status(404).type('text').send('Page not found.'));
 app.use((error,_req,res,_next)=>{if(!res.headersSent)res.status(error.status===404?404:500).type('text').send(error.status===404?'Page not found.':'Unable to load this page.');});
 return app;
}
if(require.main===module){const server=createFrontend().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Pathway website is listening.'));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),15000).unref();});}
module.exports={createFrontend};
