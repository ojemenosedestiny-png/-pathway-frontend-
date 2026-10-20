/** Public UI lifecycle only. No globe timers, observers or interaction are changed. */
export function mountPremiumHeader(header:HTMLElement){
 const toggle=header.querySelector<HTMLButtonElement>('.np-menu-toggle')!;const nav=header.querySelector<HTMLElement>('.j-public-nav')!;const scrim=header.querySelector<HTMLButtonElement>('.np-nav-scrim')!;const close=header.querySelector<HTMLButtonElement>('.np-nav-close')!;const mobile=matchMedia('(max-width:1100px)');let open=false;
 const setOpen=(value:boolean,restore=true)=>{open=value;header.classList.toggle('np-menu-open',value);toggle.setAttribute('aria-expanded',String(value));nav.inert=mobile.matches&&!value;scrim.hidden=!value;document.body.classList.toggle('np-drawer-open',value);if(value)close.focus();else if(restore)toggle.focus();};
 const resize=()=>{if(!mobile.matches)setOpen(false,false);nav.inert=mobile.matches&&!open;};
 toggle.onclick=()=>setOpen(!open);close.onclick=()=>setOpen(false);scrim.onclick=()=>setOpen(false);
 const keydown=(event:KeyboardEvent)=>{if(!open)return;if(event.key==='Escape'){event.preventDefault();setOpen(false);}if(event.key==='Tab'){const controls=Array.from(nav.querySelectorAll<HTMLElement>('a,button')).filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
 const scroll=()=>header.classList.toggle('np-is-scrolled',scrollY>24);document.addEventListener('keydown',keydown);window.addEventListener('scroll',scroll,{passive:true});mobile.addEventListener('change',resize);resize();scroll();
 return()=>{document.removeEventListener('keydown',keydown);window.removeEventListener('scroll',scroll);mobile.removeEventListener('change',resize);document.body.classList.remove('np-drawer-open');};
}
export function mountPremiumText(root:HTMLElement){
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');const word=root.querySelector<HTMLElement>('[data-cycle-word]');const words=['Ambition','Pathway','Future','Destination'];let timer:ReturnType<typeof setTimeout>|undefined;let cycle=0;let stopped=false;
 const stop=()=>{clearTimeout(timer);timer=undefined;word?.classList.remove('np-word-out');};
 const schedule=()=>{if(stopped||reduce.matches||document.hidden||!word||cycle>=8)return;timer=setTimeout(()=>{word.classList.add('np-word-out');timer=setTimeout(()=>{if(document.hidden||reduce.matches){stop();return;}word.textContent=words[++cycle%words.length];word.classList.remove('np-word-out');schedule();},180);},3000);};
 const visibility=()=>{stop();if(!document.hidden)schedule();};const motion=()=>{stop();if(!reduce.matches)schedule();};document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',motion);schedule();
 return()=>{stopped=true;stop();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',motion);};
}
