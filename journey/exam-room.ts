import {mediaSrc} from './media-url.js';
import {api,ApiError,errorMessage} from './workspace-api.js';
import {esc,empty,icon} from './workspace-components.js';
import {lagos,lagosDayHeading} from './lagos-time.js';
import {dateTile} from './workspace-mocks.js';
import type {WorkspaceContext} from './workspace-special.js';

/** Student mock exams: the grouped list, the instructions screen and the full-screen exam room. */
const LETTERS='ABCDEFGH'.split('');
const pill=(m:any)=>m.resultReleased?['Result released','success']:m.attemptStatus==='SUBMITTED'?['Submitted','ink']:m.attemptStatus==='IN_PROGRESS'&&m.state==='OPEN'?['In progress','warning']:m.state==='OPEN'?['Open now','success']:m.state==='UPCOMING'?['Upcoming','warning']:['Closed',''];
/** "Opens in 2 days, 4 hours" style countdown. */
export function opensIn(iso:string,now=Date.now()){const ms=Math.max(0,Date.parse(iso)-now);const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.ceil(ms%3600000/60000);const part=(n:number,w:string)=>`${n} ${w}${n===1?'':'s'}`;return 'Opens in '+(d?part(d,'day')+(h?', '+part(h,'hour'):''):h?part(h,'hour')+(m&&m<60?', '+part(m,'minute'):''):part(Math.max(1,m),'minute'));}
/** Open now (closing soonest), coming up (soonest first), finished (most recent first). */
export function groupMocks(rows:any[]){
 const open=rows.filter(m=>m.state==='OPEN'&&m.attemptStatus!=='SUBMITTED').sort((a,b)=>Date.parse(a.closesAt)-Date.parse(b.closesAt));
 const upcoming=rows.filter(m=>m.state==='UPCOMING'&&m.attemptStatus!=='SUBMITTED').sort((a,b)=>Date.parse(a.opensAt)-Date.parse(b.opensAt));
 const finished=rows.filter(m=>!open.includes(m)&&!upcoming.includes(m)).sort((a,b)=>Date.parse(b.closesAt)-Date.parse(a.closesAt));
 return {open,upcoming,finished};
}
export function mockCard(m:any){const [label,tone]=pill(m);const action=m.state==='OPEN'&&m.attemptStatus!=='SUBMITTED'?`<button type="button" class="pw-button gold" data-exam="${esc(m.id)}">${m.attemptStatus==='IN_PROGRESS'?'Resume exam':'Start exam'}</button>`:m.state==='UPCOMING'?`<p class="exam-countdown">${esc(opensIn(m.opensAt))}</p>`:m.resultReleased?`<a class="pw-button" href="#results">See my result</a>`:'';
 return `<article class="exam-card">${dateTile(m.opensAt,m.closesAt)}<div class="exam-card-body"><p class="pw-overline">${esc(m.subject)}</p><h3>${esc(m.title)}</h3><p class="pw-helper">${m.durationMinutes} minute${m.durationMinutes===1?'':'s'} · ${m.questionCount} question${m.questionCount===1?'':'s'}${m.makeup?' · your make-up time':''}</p><p class="pw-helper">${esc(lagos(m.opensAt))} – ${esc(lagos(m.closesAt))}</p></div><div class="exam-card-side"><span class="pw-badge ${tone}">${esc(label)}</span>${action}</div></article>`;}
const daySections=(rows:any[],by:'opensAt'|'closesAt')=>{let last='';return rows.map(m=>{const heading=lagosDayHeading(m[by]);const head=heading!==last?`<h4 class="exam-day">${esc(heading)}</h4>`:'';last=heading;return head+mockCard(m);}).join('');};

export async function studentMocksPage(target:HTMLElement,ctx:WorkspaceContext){
 const rows=await api<any[]>('/portal/learning/mocks');if(!ctx.current())return;
 const {open,upcoming,finished}=groupMocks(rows);
 const section=(title:string,list:any[],by:'opensAt'|'closesAt',none:string)=>`<section class="exam-group" aria-labelledby="g-${title.replace(/\W/g,'')}"><h2 id="g-${title.replace(/\W/g,'')}">${esc(title)} <span class="pw-badge">${list.length}</span></h2>${list.length?daySections(list,by):`<p class="pw-helper exam-none">${esc(none)}</p>`}</section>`;
 target.innerHTML=rows.length?`<div class="exam-groups">${section('Open now',open,'closesAt','No mock exam is open right now.')}${section('Coming up',upcoming,'opensAt','Nothing scheduled yet.')}${section('Finished',finished,'closesAt','Exams you have finished will appear here.')}</div>`:empty('No mock exams yet','When your school publishes a mock exam for you, it appears here with its date and time.','','graduation-cap');
 target.querySelectorAll<HTMLButtonElement>('[data-exam]').forEach(b=>b.onclick=()=>openExam(rows.find(m=>m.id===b.dataset.exam),ctx));
}

/** The exam room. The server owns time; answers are saved about a second after each change and kept on this computer too. */
export function openExam(mock:any,ctx:WorkspaceContext){
 const d=document.createElement('dialog');d.className='pw xr';d.setAttribute('aria-label',mock.title);document.body.append(d);d.showModal();
 const resume=mock.attemptStatus==='IN_PROGRESS';
 d.innerHTML=`<div class="xr-intro"><div class="xr-intro-card"><p class="pw-overline">${esc(mock.subject)} · MOCK EXAM</p><h2>${esc(mock.title)}</h2><dl class="xr-facts"><div><dt>Time allowed</dt><dd>${mock.durationMinutes} minute${mock.durationMinutes===1?'':'s'}</dd></div><div><dt>Questions</dt><dd>${mock.questionCount}</dd></div><div><dt>Closes</dt><dd>${esc(lagos(mock.closesAt))}</dd></div></dl>${mock.instructions?`<h3>From your teacher</h3><p class="xr-teacher">${esc(mock.instructions)}</p>`:''}<h3>Before you start</h3><ul class="xr-rules"><li>The timer starts when you press <strong>Start exam</strong> and does not stop if you leave.</li><li>Your answers save by themselves. If the internet drops, they are kept on this computer and sent when it returns.</li><li>When time runs out, your paper is submitted for you.</li><li>Use <strong>A</strong> to <strong>${LETTERS[Math.min(7,3)]}</strong> on the keyboard to choose an answer and the arrow keys to move between questions.</li><li>Copying, pasting and right-click are switched off. Each time you leave the exam screen is recorded for your school.</li></ul>${resume?'<p class="xr-resume">You have already started. Your saved answers and remaining time are waiting.</p>':''}<p class="xr-error" role="alert"></p><div class="xr-intro-actions"><button type="button" class="pw-button" data-xr="close">Not now</button><button type="button" class="pw-button gold xr-start">${resume?'Resume exam':'Start exam'}</button></div></div></div>`;
 d.querySelector<HTMLButtonElement>('[data-xr=close]')!.onclick=()=>d.close();
 d.addEventListener('close',()=>d.remove(),{once:true});
 const start=d.querySelector<HTMLButtonElement>('.xr-start')!;start.focus();
 start.onclick=async()=>{start.disabled=true;start.textContent='Opening your paper…';
  try{const attempt=await api('/portal/learning/mocks/'+mock.id+'/start','POST',{});document.documentElement.requestFullscreen?.().catch(()=>{});room(d,mock,attempt,ctx);}
  catch(error){start.disabled=false;start.textContent=resume?'Resume exam':'Start exam';d.querySelector('.xr-error')!.textContent=errorMessage(error);}};
}

function room(d:HTMLDialogElement,mock:any,attempt:any,ctx:WorkspaceContext){
 type Q={prompt:string;options:string[];passage:string;image:string;marks:number};
 const questions:Q[]=attempt.questions;const total=questions.length;
 const key='pw-exam:'+mock.id;
 // Server time: remember the gap between our clock and the server's, then trust the deadline.
 let offset=Date.parse(attempt.serverNow||new Date().toISOString())-Date.now();
 const deadline=Date.parse(attempt.deadline);const remaining=()=>deadline-(Date.now()+offset);
 const answers:number[]=questions.map((_,i)=>Number.isInteger(attempt.answers?.[i])?attempt.answers[i]:-1);
 const flags=new Set<number>((attempt.flags||[]).filter((n:number)=>n<total));let focusLosses=0;
 // A copy kept on this computer wins if it is newer than the server's copy (e.g. after an outage).
 try{const local=JSON.parse(localStorage.getItem(key)||'null');if(local&&local.attemptStartedAt===attempt.startedAt&&Array.isArray(local.answers)&&local.answers.length===total&&(!attempt.savedAt||local.changedAt>Date.parse(attempt.savedAt))){local.answers.forEach((a:number,i:number)=>answers[i]=Number.isInteger(a)?a:-1);(local.flags||[]).forEach((n:number)=>flags.add(n));focusLosses=Number(local.focusLosses)||0;}}catch{/* storage unavailable: the server copy is used */}
 let current=Math.max(0,answers.findIndex(a=>a<0));let dirty=false,saving=false,finished=false,submitWanted=false;let saveTimer:ReturnType<typeof setTimeout>|undefined;let warned5=false,warned1=false;
 const remember=()=>{try{localStorage.setItem(key,JSON.stringify({attemptStartedAt:attempt.startedAt,answers,flags:[...flags],focusLosses,changedAt:Date.now()}));}catch{/* the server copy still exists */}};
 d.innerHTML=`<div class="xr-room">
  <header class="xr-bar"><div class="xr-head"><p class="pw-overline">${esc(mock.subject)}</p><h2>${esc(mock.title)}</h2></div><div class="xr-bar-side"><p class="xr-save" role="status" aria-live="polite" data-tone="ok">Saved</p><div class="xr-timer" role="timer" aria-label="Time left"><span>Time left</span><strong id="xr-time">--:--</strong></div><p class="pw-sr-only" aria-live="assertive" id="xr-time-alert"></p><button type="button" class="pw-button xr-leave">Leave</button></div></header>
  <div class="xr-body"><main class="xr-paper" tabindex="-1" aria-live="polite"></main>
   <aside class="xr-palette" aria-label="Questions"><div class="xr-palette-head"><h3>Questions</h3><span id="xr-count"></span><button type="button" class="pw-button pw-icon-button xr-sheet-close" aria-label="Close question list">${icon('x')}</button></div><div class="xr-chips" id="xr-chips"></div><ul class="xr-legend"><li><i class="is-answered"></i>Answered</li><li><i class="is-flagged"></i>Flagged</li><li><i class="is-current"></i>Current</li></ul><button type="button" class="pw-button primary xr-submit">Submit exam</button></aside></div>
  <button type="button" class="pw-button xr-sheet-open" aria-haspopup="true">${icon('menu')}<span id="xr-sheet-label"></span></button>
  <div class="xr-overlay" hidden></div></div>`;
 const $=<T extends HTMLElement>(s:string)=>d.querySelector<T>(s)!;
 const answered=()=>answers.filter(a=>a>=0).length;
 const status=(text:string,tone:'ok'|'busy'|'offline'|'error')=>{const el=$('.xr-save');if(el.textContent!==text)el.textContent=text;el.dataset.tone=tone;};
 // Saving: about a second after each change; every 5 seconds while offline.
 const save=async():Promise<boolean>=>{if(finished||saving)return false;if(!dirty)return true;saving=true;dirty=false;status('Saving…','busy');
  try{const reply=await api('/portal/learning/mocks/'+mock.id+'/answers','PUT',{answers,flags:[...flags],focusLosses});offset=Date.parse(reply.serverNow)-Date.now();status('Saved','ok');return true;}
  catch(error){const code=(error as ApiError)?.code;if(code==='ALREADY_SUBMITTED'){finish(false);return false;}if(code==='TIME_EXPIRED'){submit(true);return false;}dirty=true;const offline=!navigator.onLine||(error as ApiError)?.status===0;status(offline?'Offline: your answers are on this computer':'Not saved yet. Trying again…',offline?'offline':'error');clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=undefined;submitWanted?submit(true):save();},5000);return false;}
  finally{saving=false;}};
 const changed=()=>{dirty=true;remember();clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=undefined;save();},1000);};
 const chips=()=>{$('#xr-chips').innerHTML=questions.map((_,i)=>`<button type="button" class="xr-chip${answers[i]>=0?' is-answered':''}${flags.has(i)?' is-flagged':''}${i===current?' is-current':''}" data-go="${i}" aria-label="Question ${i+1}${answers[i]>=0?', answered':', not answered'}${flags.has(i)?', flagged':''}" ${i===current?'aria-current="step"':''}>${i+1}</button>`).join('');const label=`${answered()} of ${total} answered`;$('#xr-count').textContent=label;$('#xr-sheet-label').textContent=`Question ${current+1} of ${total} · ${label}`;};
 const render=()=>{const q=questions[current];
  $('.xr-paper').innerHTML=`<p class="xr-number">Question ${current+1} <span>of ${total} · ${q.marks} mark${q.marks===1?'':'s'}</span>${flags.has(current)?' <em class="xr-flagged">Flagged for review</em>':''}</p>${q.passage?`<section class="xr-passage" aria-label="Passage"><p>${esc(q.passage).replace(/\n/g,'<br>')}</p></section>`:''}${q.image?`<figure class="xr-figure"><img src="${esc(mediaSrc(q.image))}" alt="Diagram for question ${current+1}"></figure>`:''}<h3 class="xr-prompt" id="xr-prompt">${esc(q.prompt).replace(/\n/g,'<br>')}</h3>
   <div class="xr-options" role="radiogroup" aria-labelledby="xr-prompt">${q.options.map((o,j)=>`<label class="xr-option${answers[current]===j?' is-selected':''}"><input type="radio" name="xr-answer" value="${j}" ${answers[current]===j?'checked':''}><span class="xr-letter" aria-hidden="true">${LETTERS[j]}</span><span class="xr-text"><span class="pw-sr-only">Option ${LETTERS[j]}: </span>${esc(o)}</span></label>`).join('')}</div>
   <div class="xr-actions"><button type="button" class="pw-button" data-act="prev" ${current===0?'disabled':''}>← Previous</button><button type="button" class="pw-button xr-flag" data-act="flag" aria-pressed="${flags.has(current)}">${icon('flag')}${flags.has(current)?'Remove flag':'Flag for review'}</button>${answers[current]>=0?'<button type="button" class="pw-button quiet" data-act="clear">Clear answer</button>':''}<button type="button" class="pw-button primary" data-act="${current===total-1?'review':'next'}">${current===total-1?'Review and submit':'Next →'}</button></div>`;
  $('.xr-paper').querySelectorAll<HTMLInputElement>('input[name=xr-answer]').forEach(input=>input.onchange=()=>choose(Number(input.value)));chips();};
 const go=(i:number)=>{if(i<0||i>=total)return;current=i;render();$('.xr-paper').focus();d.classList.remove('sheet-open');};
 const choose=(j:number)=>{if(finished||submitWanted)return;answers[current]=j;changed();render();($('.xr-paper').querySelector<HTMLElement>('input:checked')||$('.xr-paper')).focus();};
 const overlay=(html:string)=>{const el=$('.xr-overlay');el.innerHTML=`<div class="xr-panel" role="alertdialog" aria-modal="true" aria-labelledby="xr-panel-title">${html}</div>`;el.hidden=false;el.querySelector<HTMLElement>('button,[tabindex]')?.focus();};
 const closeOverlay=()=>{$('.xr-overlay').hidden=true;$('.xr-paper').focus();};
 const review=()=>{const unanswered=answers.map((a,i)=>a<0?i:-1).filter(i=>i>=0);const flagged=[...flags].sort((a,b)=>a-b);
  const list=(items:number[],cls:string)=>`<div class="xr-chip-list">${items.map(i=>`<button type="button" class="xr-chip ${cls}" data-go="${i}" aria-label="Go to question ${i+1}">${i+1}</button>`).join('')}</div>`;
  overlay(`<h3 id="xr-panel-title">Submit your exam?</h3><p>You have answered <strong>${answered()} of ${total}</strong> questions.</p>${unanswered.length?`<p class="xr-warn">Not answered (${unanswered.length}): these score zero.</p>${list(unanswered,'')}`:''}${flagged.length?`<p class="xr-warn">Flagged for review (${flagged.length}):</p>${list(flagged,'is-flagged')}`:''}<p>You cannot change your answers after you submit.</p><div class="xr-panel-actions"><button type="button" class="pw-button" data-act="back">Keep working</button><button type="button" class="pw-button gold" data-act="submit">Submit exam</button></div>`);};
 // Submitting: when time is up it happens by itself; while offline it waits for the connection.
 const submit=async(automatic:boolean)=>{if(finished)return;submitWanted=true;clearTimeout(saveTimer);
  overlay(`<h3 id="xr-panel-title">${automatic&&remaining()<=0?'Time is up':'Submitting your exam'}</h3><p role="status">Sending your answers…</p>`);
  try{const reply=await api('/portal/learning/mocks/'+mock.id+'/submit','POST',{answers,flags:[...flags],focusLosses});finish(Boolean(reply.expired));}
  catch(error){const code=(error as ApiError)?.code;if(code==='ALREADY_SUBMITTED'){finish(false);return;}const offline=!navigator.onLine||(error as ApiError)?.status===0;
   overlay(`<h3 id="xr-panel-title">${offline?'You are offline':'Not submitted yet'}</h3><p>${offline?'Your answers are safe on this computer. They will be submitted as soon as the connection returns.':esc(errorMessage(error))}</p><p role="status">Trying again every 5 seconds…</p>${remaining()>0?'<div class="xr-panel-actions"><button type="button" class="pw-button" data-act="back">Back to the paper</button></div>':''}`);
   status('Offline: your answers are on this computer','offline');saveTimer=setTimeout(()=>{saveTimer=undefined;if(submitWanted)submit(automatic);},5000);}};
 const finish=(expired:boolean)=>{finished=true;submitWanted=false;clearInterval(clock);clearTimeout(saveTimer);try{localStorage.removeItem(key);}catch{/* nothing to clear */}teardown();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  overlay(`<div class="xr-done">${icon('circle-check')}<h3 id="xr-panel-title">Submitted</h3><p>${expired?'Time had run out, so the answers saved before the end were marked.':`You answered ${answered()} of ${total} questions.`}</p><p>Your result will appear when the school releases it.</p><div class="xr-panel-actions"><button type="button" class="pw-button primary" data-act="done">Back to my mock exams</button></div></div>`);};
 const leave=()=>overlay(`<h3 id="xr-panel-title">Leave the exam?</h3><p>Your answers are saved, but <strong>the timer keeps running</strong>. Come back from Mock exams before time runs out.</p><div class="xr-panel-actions"><button type="button" class="pw-button primary" data-act="back">Stay in the exam</button><button type="button" class="pw-button" data-act="leave">Leave for now</button></div>`);
 // Timer: gold under 5 minutes, red under 1 minute; announced once for screen readers.
 const tick=()=>{const left=remaining();const s=Math.max(0,Math.ceil(left/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;$('#xr-time').textContent=(h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(sec).padStart(2,'0');
  const timer=$('.xr-timer');timer.dataset.level=s<=60?'red':s<=300?'gold':'';
  if(s<=300&&!warned5){warned5=true;$('#xr-time-alert').textContent='5 minutes left.';}if(s<=60&&!warned1){warned1=true;$('#xr-time-alert').textContent='1 minute left.';}
  if(left<=0&&!finished&&!submitWanted)submit(true);};
 const clock=setInterval(tick,500);
 // Light anti-cheat (deterrence only): no right-click, copy or paste, and common developer shortcuts are blocked.
 const blockEvent=(e:Event)=>{if(!finished)e.preventDefault();};
 const keys=(e:KeyboardEvent)=>{if(finished)return;const k=e.key.toLowerCase();const ctrl=e.ctrlKey||e.metaKey;
  if(e.key==='F12'||(ctrl&&e.shiftKey&&['i','j','c'].includes(k))||(ctrl&&['u','s','p','c','v','x','a'].includes(k))){e.preventDefault();return;}
  if(!$('.xr-overlay').hidden||ctrl||e.altKey||(e.target as HTMLElement).closest('textarea,input[type=text]'))return;
  const letter=LETTERS.indexOf(e.key.toUpperCase());if(letter>=0&&letter<questions[current].options.length&&e.key.length===1){e.preventDefault();choose(letter);return;}
  if(e.key==='ArrowRight'){e.preventDefault();go(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(current-1);}};
 let lastLoss=0;const lost=()=>{if(finished||Date.now()-lastLoss<1500)return;lastLoss=Date.now();focusLosses++;changed();};
 const visibility=()=>{if(document.visibilityState==='hidden')lost();};
 const online=()=>{if(submitWanted)submit(true);else if(dirty)save();};
 for(const t of ['contextmenu','copy','cut','paste','dragstart'])d.addEventListener(t,blockEvent);
 document.addEventListener('keydown',keys);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',lost);window.addEventListener('online',online);
 const beforeUnload=(e:BeforeUnloadEvent)=>{if(!finished){remember();e.preventDefault();}};window.addEventListener('beforeunload',beforeUnload);
 const teardown=()=>{document.removeEventListener('keydown',keys);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',lost);window.removeEventListener('online',online);window.removeEventListener('beforeunload',beforeUnload);};
 d.addEventListener('click',event=>{const el=(event.target as HTMLElement).closest<HTMLElement>('[data-go],[data-act]');if(!el)return;
  if(el.dataset.go!==undefined){closeOverlay();go(Number(el.dataset.go));return;}
  switch(el.dataset.act){case 'prev':go(current-1);break;case 'next':go(current+1);break;case 'flag':flags.has(current)?flags.delete(current):flags.add(current);changed();render();break;case 'clear':choose(-1);break;case 'review':review();break;case 'back':closeOverlay();break;case 'submit':submit(false);break;
   case 'leave':save();clearInterval(clock);teardown();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});d.close();ctx.refresh();break;case 'done':d.close();ctx.refresh();break;}});
 $('.xr-submit').onclick=review;$('.xr-leave').onclick=leave;
 $('.xr-sheet-open').onclick=()=>{d.classList.add('sheet-open');$('.xr-chip.is-current')?.focus();};$('.xr-sheet-close').onclick=()=>d.classList.remove('sheet-open');
 d.addEventListener('cancel',event=>{event.preventDefault();if(finished)return;if(d.classList.contains('sheet-open')){d.classList.remove('sheet-open');return;}if(!$('.xr-overlay').hidden&&!submitWanted){closeOverlay();return;}if(!submitWanted)leave();});
 render();tick();$('.xr-paper').focus();
 // Answers recovered from this computer are sent straight away.
 if(answers.some((a,i)=>a!==(Number.isInteger(attempt.answers?.[i])?attempt.answers[i]:-1)))changed();
}
