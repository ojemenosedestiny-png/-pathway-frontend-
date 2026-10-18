const fs=require('node:fs');
const path=require('node:path');
const target=path.join(__dirname,'dist','icons');
const source=path.join(__dirname,'..','node_modules','lucide-static');
fs.mkdirSync(target,{recursive:true});
for(const name of ['route','house','book-open','bell','user-round','menu','search','globe','credit-card','file-text','check','mail','calendar-days','compass','file-check','graduation-cap'])fs.copyFileSync(path.join(source,'icons',`${name}.svg`),path.join(target,`${name}.svg`));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'LICENSE'));
