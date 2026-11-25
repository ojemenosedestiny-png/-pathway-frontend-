import {api} from './workspace-api.js';
import {esc,icon} from './workspace-components.js';
import {lagos,lagosTime,lagosTile} from './lagos-time.js';
import {opensIn} from './exam-room.js';

/** Dashboard hero bands: the student's exams and forms at a glance, and the staff summary. */
const monthYear=(now=Date.now())=>new Date(now+3600e3).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).toUpperCase();
export function greeting(now=Date.now()){const h=new Date(now+3600e3).getUTCHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening';}
const tile=(label:string,value:unknown,href:string)=>`<a class="pw-hero-tile hero-link" href="${href}"><span>${esc(label)}</span><strong>${esc(value)}</strong></a>`;

/** Picks the exam to show: one open now (closing soonest) that the student has not submitted, else the next one coming up. */
export function nextMock(mocks:any[]){
 const open=mocks.filter(m=>m.state==='OPEN'&&m.attemptStatus!=='SUBMITTED').sort((a,b)=>Date.parse(a.closesAt)-Date.parse(b.closesAt));
 if(open.length)return open[0];
 return mocks.filter(m=>m.state==='UPCOMING').sort((a,b)=>Date.parse(a.opensAt)-Date.parse(b.opensAt))[0]||null;
}

export async function studentHero(firstName:string){
 const [mocks,forms,results]=await Promise.all([api<any[]>('/portal/learning/mocks').catch(()=>[] as any[]),api<any[]>('/portal/forms').catch(()=>[] as any[]),api<any[]>('/portal/learning/results').catch(()=>[] as any[])]);
 const openNow=mocks.filter(m=>m.state==='OPEN'&&m.attemptStatus!=='SUBMITTED').length,comingUp=mocks.filter(m=>m.state==='UPCOMING').length,released=results.filter(r=>r.kind==='MOCK').length;
 const next=nextMock(mocks);const waiting=forms.filter(f=>f.state==='OPEN'&&['NOT_STARTED','DRAFT','NEEDS_CHANGES'].includes(f.status));
 const section=document.createElement('div');section.className='home-hero-wrap';
 const nextCard=()=>{if(!next)return `<section class="pw-card next-mock is-empty"><p class="pw-overline">Your next mock exam</p><h3>Nothing scheduled yet</h3><p class="pw-helper">When the school sets a mock exam for you, it will appear here.</p></section>`;
  const t=lagosTile(next.opensAt);const open=next.state==='OPEN';
  return `<section class="pw-card next-mock"><div class="date-tile" aria-hidden="true"><span class="date-tile-month">${esc(t.month)}</span><strong>${esc(t.day)}</strong><span class="date-tile-weekday">${esc(t.weekday)}</span></div>
   <div class="next-mock-body"><p class="pw-overline">Your next mock exam · ${esc(next.subject)}</p><h3>${esc(next.title)}</h3><p class="pw-helper">${esc(lagos(next.opensAt))} – ${esc(lagosTime(next.closesAt))} · ${next.durationMinutes} minutes</p></div>
   <div class="next-mock-action">${open?`<a class="pw-button gold" href="#mocks">${next.attemptStatus==='IN_PROGRESS'?'Resume exam':'Start exam'}</a>`:`<p class="next-mock-countdown" data-opens="${esc(next.opensAt)}" aria-live="polite">${esc(opensIn(next.opensAt))}</p>`}</div></section>`;};
 const formsCard=waiting.length?`<section class="pw-card forms-waiting"><p class="pw-overline">Forms waiting for you</p><ul>${waiting.map(f=>`<li><span>${icon('file-check')}<span><strong>${f.system?'Complete your registration form':esc(f.title)}</strong>${f.status==='NEEDS_CHANGES'?'<small>The school asked for changes</small>':f.status==='DRAFT'?'<small>Draft saved</small>':''}</span></span><a class="pw-button" href="#forms">${f.status==='NOT_STARTED'?'Start':'Continue'}</a></li>`).join('')}</ul></section>`:'';
 section.innerHTML=`<section class="pw-hero home-hero"><div><p class="pw-overline">Mock exams · ${esc(monthYear())}</p><h2>${esc(greeting())}, ${esc(firstName||'there')}.</h2><p>Here is what is happening with your mock exams and forms.</p></div>
  <div class="pw-hero-tiles">${tile('Mock exams open now',openNow,'#mocks')}${tile('Coming up',comingUp,'#mocks')}${tile('Results released',released,'#results')}</div></section>
  <div class="home-hero-row${formsCard?'':' single'}">${nextCard()}${formsCard}</div>`;
 const countdown=section.querySelector<HTMLElement>('[data-opens]');
 if(countdown){const timer=setInterval(()=>{if(!countdown.isConnected){clearInterval(timer);return;}const left=Date.parse(countdown.dataset.opens!)-Date.now();countdown.textContent=left>0?opensIn(countdown.dataset.opens!):'Open now: refresh to start';},30000);}
 return section;
}

export async function staffHero(name:string){
 const s=await api<any>('/admin/portal-summary').catch(()=>({}));
 const tiles=[s.students!==undefined&&tile('Students',s.students,'#students'),s.mocksOpenNow!==undefined&&tile('Mock exams open now',s.mocksOpenNow,'#mock-exams'),s.scriptsToday!==undefined&&tile('Scripts submitted today',s.scriptsToday,'#student-results'),s.formsAwaiting!==undefined&&tile('Forms awaiting review',s.formsAwaiting,'#forms')].filter(Boolean).join('');
 const section=document.createElement('div');section.className='home-hero-wrap';
 const upcoming=Array.isArray(s.upcoming)?`<section class="pw-card upcoming-mocks"><div class="pw-card-head"><h2>Upcoming mock exams</h2><a class="pw-button" href="#mock-exams">All mock exams</a></div>${s.upcoming.length?`<ul>${s.upcoming.map((m:any)=>{const t=lagosTile(m.opensAt);return `<li><div class="date-tile small" aria-hidden="true"><span class="date-tile-month">${esc(t.month)}</span><strong>${esc(t.day)}</strong></div><div><strong>${esc(m.title)}</strong><small class="pw-helper">${esc(m.subject)} · ${esc(m.cohort)} · ${esc(lagos(m.opensAt))} – ${esc(lagosTime(m.closesAt))}</small></div>${m.open?'<span class="pw-badge success">Open now</span>':'<span class="pw-badge">Upcoming</span>'}</li>`;}).join('')}</ul>`:'<p class="pw-helper">No mock exams are scheduled. Create one under Mock examinations.</p>'}</section>`:'';
 section.innerHTML=`${tiles?`<section class="pw-hero home-hero"><div><p class="pw-overline">Mock exams · ${esc(monthYear())}</p><h2>${esc(greeting())}, ${esc((name||'').split(' ')[0]||'there')}.</h2><p>Today at New World Emerald Private School.</p></div><div class="pw-hero-tiles">${tiles}</div></section>`:''}${upcoming}`;
 return section;
}
