// SEO regression: unique titles/descriptions, canonical URLs, robots rules, JSON-LD identity and sitemap,
// against a stubbed catalogue so the check needs no network.
const assert=require('node:assert/strict');const http=require('node:http');
(async()=>{
 const backend=http.createServer((req,res)=>{const path=req.url.split('?')[0];res.setHeader('Content-Type','application/json');res.end(JSON.stringify(path==='/public/exams'?[{id:'exam-1',name:'Cambridge International AS & A Level 2027',description:'Two-year Cambridge A Level preparation.'}]:path==='/public/universities'?[{id:'uni-1',name:'University of Stirling',description:'A public university in Stirling, Scotland.'}]:[]));}).listen(0,'127.0.0.1');
 await new Promise(r=>backend.once('listening',r));process.env.SEO_CATALOGUE_ORIGIN='http://127.0.0.1:'+backend.address().port;
 const {createFrontend}=require('./frontend-server.cjs');const server=createFrontend().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const SITE='https://newworldpathwayuniversity.com';
 const sitemap=await (await fetch(origin+'/sitemap.xml')).text();const routes=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(SITE,''));
 assert.ok(routes.includes('/')&&routes.includes('/apply')&&routes.includes('/exams/exam-1')&&routes.includes('/university/uni-1'),'sitemap lists public, exam and university pages');
 assert.ok(!routes.some(r=>/^\/(admin|portal|student\/login|signup|applicant|backend-api)/.test(r)),'sitemap excludes private pages');
 const robots=await (await fetch(origin+'/robots.txt')).text();assert.match(robots,/Sitemap: https:\/\/newworldpathwayuniversity\.com\/sitemap\.xml/);assert.match(robots,/Disallow: \/admin/);
 const titles=new Set(),descriptions=new Set();
 for(const route of routes){const response=await fetch(origin+route);assert.equal(response.status,200,route);const html=await response.text();
  const title=html.match(/<title>([^<]*)<\/title>/)?.[1];const description=[...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
  assert.ok(title&&!titles.has(title),'unique title '+route);titles.add(title);
  assert.equal(description.length,1,'one description '+route);assert.ok(!descriptions.has(description[0][1]),'unique description '+route);descriptions.add(description[0][1]);
  assert.match(html,new RegExp('<link rel="canonical" href="'+(SITE+route).replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')+'">'),'canonical '+route);
  assert.match(html,/<meta name="robots" content="index, follow">/);assert.equal([...html.matchAll(/property="og:title"/g)].length,1,'one og:title '+route);assert.match(html,/name="twitter:card" content="summary_large_image"/);
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph'];
  const org=graph.find(n=>n['@id']===SITE+'/#organization');assert.equal(org.name,'NewworldPathway');assert.equal(org.parentOrganization.name,'New World Emerald Private School');
  assert.equal(graph.find(n=>n['@type']==='WebSite').name,'NewworldPathway');assert.ok(!graph.some(n=>n['@type']==='CollegeOrUniversity'),'no university claim');
  assert.ok(!/localhost|127\.0\.0\.1/.test(html.match(/<head>[\s\S]*<\/head>/)?.[0]||''),'no development URLs in head '+route);}
 for(const route of ['/student/login','/admin/login','/portal','/signup']){const html=await (await fetch(origin+route)).text();assert.match(html,/<meta name="robots" content="noindex, nofollow">/,route);assert.doesNotMatch(html,/rel="canonical"/,route);}
 const missing=await fetch(origin+'/exams/not-real');assert.equal(missing.status,404);assert.match(await missing.text(),/noindex/);
 const share=await fetch(origin+'/assets/social/newworldpathway-share.jpg');assert.equal(share.status,200);assert.equal(share.headers.get('content-type'),'image/jpeg');
 console.log(`PASS: ${routes.length} sitemap pages with unique titles, descriptions and canonicals; NewworldPathway JSON-LD identity; private pages noindex; unknown records 404; share image served.`);
 server.close();backend.close();
})().catch(error=>{console.error(error);process.exit(1);});
