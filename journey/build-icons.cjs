const fs=require('node:fs');
const path=require('node:path');
const target=path.join(__dirname,'dist','icons');
const source=path.join(__dirname,'..','node_modules','lucide-static');
fs.mkdirSync(target,{recursive:true});
for(const name of ['route','house','book-open','bell','user-round','menu','search','globe','credit-card','file-text','check','mail','calendar-days','compass','file-check','graduation-cap','layout-dashboard','users','wallet','building-2','settings','school','map-pin','arrow-up-right','chevron-left','chevron-down','x','plus','download','circle-check','circle-alert','clock','shield-check','log-out','external-link','folder-open','message-circle','upload','image','chevrons-up-down','more-horizontal','pencil','trash-2','bed-double','info','panel-left-close','panel-left-open','send','eye','circle-help','arrow-right','check-check'])fs.copyFileSync(path.join(source,'icons',`${name}.svg`),path.join(target,`${name}.svg`));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'LICENSE'));
