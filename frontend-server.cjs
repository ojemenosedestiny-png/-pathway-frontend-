const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('node:path');
const fs = require('node:fs');
const crypto=require('node:crypto');
let templateModule;const publicTemplates=()=>templateModule||(templateModule=import('./journey/dist/public-template.js'));
const {liveApiProxy} = require('./live-api-proxy.cjs');
const seo = require('./seo.cjs');
function createFrontend() {
 const approvedOrigin=(value)=>{if(!value)return [];const url=new URL(value);if(url.protocol!=='https:')throw Error('Media origins must use HTTPS');return [url.origin];};
 const mediaOrigins=approvedOrigin(process.env.PATHWAY_MEDIA_ORIGIN);
 const uploadOrigins=approvedOrigin(process.env.PATHWAY_UPLOAD_ORIGIN);
 const app=express();app.disable('x-powered-by');
 const release=crypto.createHash('sha256');for(const filename of ['index.html','styles.css','redesign.css','journey/theme.css','journey/public-premium.css','journey/workspace-tokens.css','journey/workspace.css','journey/live.html',...fs.readdirSync(path.join(__dirname,'journey/dist')).filter(n=>n.endsWith('.js')).sort().map(n=>'journey/dist/'+n)])release.update(fs.readFileSync(path.join(__dirname,filename)));const releaseId=release.digest('hex').slice(0,12);
 // Release-stamped CSS/JS URLs (/_v/<release>/...) are immutable; a new deploy changes the stamp.
 // Module imports are relative, so a stamped entry script keeps its whole import graph stamped.
 const stampPrefix='/_v/'+releaseId;
 const stamp=html=>html.replace(/(src|href)="(\/(?:styles\.css|redesign\.css|journey\/[\w./-]+\.(?:css|js)))"/g,(_match,attr,url)=>attr+'="'+stampPrefix+url+'"');
 const distDir=path.join(__dirname,'journey/dist');
 const preloads=entry=>{const seen=new Set([entry]);const visit=name=>{let source='';try{source=fs.readFileSync(path.join(distDir,name),'utf8');}catch{return;}for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]\.\/([\w.-]+\.js)['"]/g))if(!seen.has(match[1])){seen.add(match[1]);visit(match[1]);}};visit(entry);seen.delete(entry);return [...seen].map(name=>`<link rel="modulepreload" href="${stampPrefix}/journey/dist/${name}">`).join('');};
 const publicPreloads=preloads('public.js');
 const liveHtml=stamp(fs.readFileSync(path.join(__dirname,'journey/live.html'),'utf8')).replace('</head>',()=>preloads('live-ui.js')+'</head>');
 const sendLive=(req,res)=>{res.setHeader('Cache-Control','no-cache, must-revalidate');res.type('html').send(seo.applyMetadata(liveHtml,req.path));};
 app.use((req,res,next)=>{res.setHeader('X-Pathway-Release',releaseId);
  const stamped=/^\/_v\/([a-f0-9]{12})(\/(?:styles\.css|redesign\.css|journey\/[\w./-]+\.(?:css|js)))$/.exec(req.path);
  if(stamped){req.url=stamped[2];res.setHeader('Cache-Control',stamped[1]===releaseId?'public, max-age=31536000, immutable':'no-cache, must-revalidate');}
  else if(/\.(?:js|css)$/.test(req.path))res.setHeader('Cache-Control','no-cache, must-revalidate');
  else if(req.path.startsWith('/assets/'))res.setHeader('Cache-Control','public, max-age=604800, stale-while-revalidate=86400');
  next();});
 // The API proxy streams private responses unchanged; only website files are compressed.
 const compress=compression();app.use((req,res,next)=>req.path.startsWith('/backend-api/')?next():compress(req,res,next));
 // Keep browser Origin, session cookies and the backend's trusted origin aligned.
 const production=process.env.NODE_ENV==='production';
 app.use((req,res,next)=>{
  if(production&&['www.newworldpathwayuniversity.com','pathway-frontend-hy8e.onrender.com'].includes(req.hostname)&&!req.path.startsWith('/health/'))
   return res.redirect(308,'https://newworldpathwayuniversity.com'+req.originalUrl);
  next();
 });
 app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'https://newworldemeraldprivateschool.com','data:','blob:',...mediaOrigins],mediaSrc:["'self'",'blob:',...mediaOrigins],connectSrc:["'self'",...uploadOrigins],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.use((req,res,next)=>{if(/^\/(?:admin|portal|applicant|student\/login|set-password|forgot-password|recover-student-id|payment-status|backend-api)(?:\/|$)/.test(req.path))res.setHeader('X-Robots-Tag','noindex, nofollow');next();});
 app.use('/backend-api',liveApiProxy());
 const send=file=>(_req,res)=>res.sendFile(path.join(__dirname,file));
 app.get(['/student/login','/admin/login','/portal','/admin','/set-password','/forgot-password','/recover-student-id','/payment-status','/hostel','/pay-fees','/apply','/book-consultation'],sendLive);
 app.get(['/portal.html','/student-dashboard','/application-status','/my-bookings'],(_req,res)=>res.redirect('/portal'));
 app.get('/exam.html',(_req,res)=>res.redirect('/portal#exams'));
 app.get('/login',(_req,res)=>res.redirect('/student/login'));
 app.get('/admin.html',(_req,res)=>res.redirect('/admin/login'));
 // Checkout is not enabled until real provider credentials and fees are configured.
 app.get('/enrol',(_req,res)=>res.redirect('/contact'));
 app.get(['/signup','/verify-email','/applicant'],sendLive);
 // Static information pages are served with the same metadata as the rendered pages.
 const sendStatic=file=>(req,res)=>{res.setHeader('Cache-Control','no-cache, must-revalidate');res.type('html').send(seo.applyMetadata(fs.readFileSync(path.join(__dirname,file),'utf8'),req.path));};
 app.get('/other-exams',sendStatic('exam-directory.html'));
 app.get('/service-information',sendStatic('service-information.html'));
 app.get('/privacy',sendStatic('application-information.html'));
 const catalogue=seo.catalogue();
 app.get('/robots.txt',(_req,res)=>res.type('text/plain').set('Cache-Control','public, max-age=3600').send(seo.robotsTxt));
 app.get('/sitemap.xml',async(_req,res,next)=>{try{res.type('application/xml').set('Cache-Control','public, max-age=3600').send(await seo.sitemapXml(catalogue));}catch(error){next(error);}});
 app.get(['/','/index.html','/pathways','/university/:id','/exams','/exams/:id','/about','/faq','/contact','/news'],async(req,res,next)=>{try{const {publicDefaults,renderPublicPage,renderPublicHeader,renderPublicFooter}=await publicTemplates();const site=publicDefaults();const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const route=req.path==='/index.html'?'/':req.path;let record;const detail=route.match(/^\/(exams|university)\/([^/]+)$/);if(detail){const data=await catalogue();const id=decodeURIComponent(detail[2]);const row=(detail[1]==='exams'?data.exams:data.universities).find(item=>String(item.id)===id);if(row)record={name:row.name,description:row.description,parent:detail[1]==='exams'?'/exams':'/pathways',parentName:detail[1]==='exams'?'Exam preparation':'University destinations'};else if(data.ok){res.status(404);}}res.setHeader('Cache-Control','no-cache, must-revalidate');res.type('html').send(seo.applyMetadata(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<!-- PUBLIC_HEADER -->',()=>renderPublicHeader(site)).replace('<!-- PUBLIC_HOME -->',()=>renderPublicPage(route,site,String(req.query.q||''))).replace('<!-- PUBLIC_FOOTER -->',()=>renderPublicFooter(site)).replace(/(src|href)="(\/(?:styles\.css|journey\/(?:theme\.css|public-premium\.css|dist\/public\.js)))"/g,(_match,attr,url)=>attr+'="'+stampPrefix+url+'"').replace('<!-- PUBLIC_PAGE_METADATA -->',()=>publicPreloads),route,record))}catch(error){next(error);}});
 for(const directory of ['assets','journey/dist'])app.use('/'+directory,express.static(path.join(__dirname,directory),{dotfiles:'deny',index:false,fallthrough:false}));
 app.get('/journey/theme.css',send('journey/theme.css'));
 app.get('/journey/public-premium.css',send('journey/public-premium.css'));
 app.get('/journey/workspace-tokens.css',send('journey/workspace-tokens.css'));
 app.get('/journey/workspace.css',send('journey/workspace.css'));
 app.get(['/styles.css','/redesign.css','/script.js','/ui-enhancements.js','/exam-directory.js','/service-information.js'],express.static(__dirname,{dotfiles:'deny',index:false}));
 const notFoundPage='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | NewworldPathway</title><style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#fbf8f1;color:#13261f;display:grid;min-height:100vh;place-items:center;padding:16px;box-sizing:border-box}main{max-width:520px;text-align:center}h1{font:500 32px/1.2 Georgia,serif;margin:0 0 12px}a{display:inline-block;margin:6px;padding:10px 18px;border-radius:8px;border:1px solid #0f3d2e;color:#0f3d2e;text-decoration:none;font-weight:600}a.primary{background:#0f3d2e;color:#fff}a:focus-visible{outline:3px solid #c9a24a;outline-offset:2px}</style></head><body><main><p>Error 404</p><h1>We could not find that page</h1><p>The link may be out of date or the page may have moved.</p><p><a class="primary" href="/">Go to the homepage</a><a href="/contact">Contact the school</a></p></main></body></html>';
 app.use((req,res)=>{res.status(404);if(req.accepts(['html','text'])==='html')res.type('html').send(notFoundPage);else res.type('text').send('Page not found.');});
 app.use((error,_req,res,_next)=>{if(!res.headersSent)res.status(error.status===404?404:500).type('text').send(error.status===404?'Page not found.':'Unable to load this page.');});
 return app;
}
if(require.main===module){const server=createFrontend().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Pathway website is listening.'));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),15000).unref();});}
module.exports={createFrontend};
