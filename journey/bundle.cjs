// Bundles each page's code into one minified file, so a first visit downloads one script instead of dozens.
// The individual files in journey/dist stay, because other pages import them directly.
const esbuild=require('esbuild');const path=require('node:path');
const entries={'live-ui':'live-ui.js','public':'public.js'};
(async()=>{for(const [name,file] of Object.entries(entries)){
 const result=await esbuild.build({entryPoints:[path.join(__dirname,'dist',file)],bundle:true,format:'esm',minify:true,target:['es2020'],outfile:path.join(__dirname,'dist',name+'.bundle.js'),legalComments:'none',logLevel:'warning',metafile:true});
 const bytes=Object.values(result.metafile.outputs)[0].bytes;console.log(`bundled ${file} -> ${name}.bundle.js (${Math.round(bytes/1024)} KB, ${Object.keys(result.metafile.inputs).length} modules)`);}})().catch(error=>{console.error(error);process.exit(1);});
