import {mediaSrc} from './media-url.js';
import {api,errorMessage} from './workspace-api.js';
import {esc,button,alert,dialog,toast,empty,icon,confirm} from './workspace-components.js';
import {lagos} from './lagos-time.js';
import type {WorkspaceContext} from './workspace-special.js';

/** Results: staff progress, statistics, extra time and release; students' released scores and the answer review. */
const LETTERS='ABCDEFGH'.split('');
const statusLabel:Record<string,[string,string]>={WRITING:['Writing','warning'],SUBMITTED:['Submitted','success'],NOT_STARTED:['Not started',''],TIME_UP:['Time up','danger']};
const pct=(n:number|null)=>n===null||n===undefined?'—':`${Number(n).toFixed(Number(n)%1?1:0)}%`;
const bandPill=(band:string|null)=>band?`<span class="pw-badge ${band==='PASS'?'success':'warning'}">${band==='PASS'?'Pass':'Below pass mark'}</span>`:'';

/** Staff overview: exams grouped by cohort, then subject, then exam. */
export async function staffResultsOverview(target:HTMLElement,ctx:WorkspaceContext,writable:boolean){
 const rows=await api<any[]>('/admin/learning/mocks');if(!ctx.current())return;
 const holder=document.createElement('section');holder.className='results-overview';target.prepend(holder);
 if(!rows.length){holder.innerHTML=empty('No mock exam results yet','Results appear here once students sit a mock exam.','','graduation-cap');return;}
 const byCohort=new Map<string,Map<string,any[]>>();
 for(const row of rows){const m=row.data;const cohort=m.studentIds?.length?'Chosen students':m.cohort||'All students';const subjects=byCohort.get(cohort)||new Map();subjects.set(m.subject,[...(subjects.get(m.subject)||[]),row]);byCohort.set(cohort,subjects);}
 holder.innerHTML=`<h2 class="results-heading">Mock exam results</h2>${[...byCohort.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([cohort,subjects])=>`<details class="mock-folder" open><summary><span class="mock-folder-name">${icon('folder-open')}${esc(cohort)}</span></summary><div class="results-subjects">${[...subjects.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([subject,items])=>`<div class="results-subject"><p class="pw-overline">${esc(subject)}</p>${items.sort((a,b)=>Date.parse(b.data.opensAt)-Date.parse(a.data.opensAt)).map(row=>`<button type="button" class="results-exam" data-results="${esc(row.key.slice(5))}"><span><strong>${esc(row.data.title)}</strong><small>${esc(lagos(row.data.opensAt))} · ${row.submitted} submitted of ${row.started} started</small></span><span class="pw-badge ${row.data.releaseResults?'success':''}">${row.data.releaseResults?'Released':'Not released'}</span></button>`).join('')}</div>`).join('')}</div></details>`).join('')}`;
 holder.querySelectorAll<HTMLButtonElement>('[data-results]').forEach(b=>b.onclick=()=>openExamResults(b.dataset.results!,writable,()=>ctx.refresh()));
}

/** One exam: live progress (refreshes every 15 seconds), statistics, per-student scores, extra time, release and CSV. */
export function openExamResults(id:string,writable:boolean,onChange?:()=>void){
 const element=dialog('Results',`<div id="exam-results" aria-live="polite"><div class="pw-loading" role="status"><span class="pw-sr-only">Loading results…</span><div class="pw-skeleton"></div><div class="pw-skeleton short"></div></div></div>`,true);
 element.classList.add('wide-drawer');const box=element.querySelector<HTMLElement>('#exam-results')!;let timer:ReturnType<typeof setInterval>|undefined;let filter='';
 const load=async()=>{try{const r=await api('/admin/learning/mocks/'+id+'/results');if(!element.open)return;render(r);}catch(error){box.innerHTML=alert('Results could not be loaded',errorMessage(error),'danger');}};
 const render=(r:any)=>{
  const shown=r.students.filter((s:any)=>!filter||`${s.name} ${s.studentId} ${s.cohort}`.toLowerCase().includes(filter));
  box.innerHTML=`<header class="results-head"><div><p class="pw-overline">${esc(r.subject)}${r.cohort?' · '+esc(r.cohort):''}</p><h3>${esc(r.title)}</h3><p class="pw-helper">${esc(lagos(r.opensAt))} – ${esc(lagos(r.closesAt))} · pass mark ${r.passMark}%</p></div><div class="results-actions"><a class="pw-button" href="/backend-api/admin/learning/mocks/${esc(id)}/results.csv" download>${icon('download')}Export CSV</a>${writable?`<button type="button" class="pw-button ${r.releaseResults?'':'gold'}" id="results-release">${r.releaseResults?'Withhold results':'Release results'}</button>`:''}</div></header>
   <p class="results-release ${r.releaseResults?'is-released':''}">${r.releaseResults?'Results are released: students can see their scores.':'Results are not released: students only see “Submitted”.'}</p>
   <div class="results-tiles"><div><span>Writing</span><strong>${r.progress.writing}</strong></div><div><span>Submitted</span><strong>${r.progress.submitted}</strong></div><div><span>Not started</span><strong>${r.progress.notStarted}</strong></div><div><span>Class average</span><strong>${pct(r.stats?.average??null)}</strong></div><div><span>Highest</span><strong>${pct(r.stats?.highest??null)}</strong></div><div><span>Lowest</span><strong>${pct(r.stats?.lowest??null)}</strong></div><div><span>Pass rate</span><strong>${pct(r.stats?.passRate??null)}</strong></div></div>
   <label class="pw-field results-search">Find a student<input type="search" id="results-filter" value="${esc(filter)}" placeholder="Name, Student ID or cohort"></label>
   ${shown.length?`<div class="pw-table-scroll"><table class="pw-table results-table"><thead><tr><th scope="col">Student</th><th scope="col">Status</th><th scope="col">Score</th><th scope="col">Result</th><th scope="col">Left the screen</th><th scope="col">Time</th></tr></thead><tbody>${shown.map((s:any)=>{const [label,tone]=statusLabel[s.status]||[s.status,''];return `<tr><td><strong>${esc(s.name)}</strong><small class="pw-helper">${esc(s.studentId)}${s.cohort?' · '+esc(s.cohort):''}${s.makeup?' · make-up':''}</small></td><td><span class="pw-badge ${tone}">${label}</span></td><td>${s.score===null?'—':`${s.score} / ${s.maximum}`}</td><td>${s.percent===null?'—':`${pct(s.percent)} ${bandPill(s.band)}`}</td><td>${s.focusLosses===null?'—':s.focusLosses}</td><td>${s.status==='WRITING'?`<span class="pw-helper">Ends ${esc(lagos(s.deadline))}${s.extraMinutes?` (+${s.extraMinutes} min)`:''}</span>${writable?`<div class="extra-time" role="group" aria-label="Give ${esc(s.name)} extra time">${[5,10,15].map(n=>`<button type="button" class="pw-button" data-extra="${n}" data-student="${esc(s.id)}">+${n} min</button>`).join('')}</div>`:''}`:s.submittedAt?`<span class="pw-helper">${esc(lagos(s.submittedAt))}</span>`:'—'}</td></tr>`;}).join('')}</tbody></table></div>`:empty(filter?'No students match':'No students yet',filter?'Try another name or Student ID.':'Assigned students appear here.')}
   <p class="pw-helper">Updates every 15 seconds while this panel is open.</p>`;
  const input=box.querySelector<HTMLInputElement>('#results-filter')!;input.oninput=()=>{filter=input.value.trim().toLowerCase();const pos=input.selectionStart;render(r);const next=box.querySelector<HTMLInputElement>('#results-filter')!;next.focus();next.setSelectionRange(pos,pos);};
  box.querySelector<HTMLButtonElement>('#results-release')?.addEventListener('click',async()=>{const release=!r.releaseResults;if(!(await confirm(release?'Release results?':'Withhold results?',release?'Students will see their score, percentage and result for this exam.':'Students will no longer see their scores for this exam.',release?'Release results':'Withhold results')))return;try{await api('/admin/learning/mocks/'+id+'/release','PUT',{released:release});toast(release?'Results released to students.':'Results withheld.');onChange?.();await load();}catch(error){toast(errorMessage(error));}});
  box.querySelectorAll<HTMLButtonElement>('[data-extra]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/admin/learning/mocks/'+id+'/attempts/'+b.dataset.student+'/extra-time','POST',{minutes:Number(b.dataset.extra)});toast(`${b.dataset.extra} minutes added.`);await load();}catch(error){b.disabled=false;toast(errorMessage(error));}});
 };
 load();timer=setInterval(load,15000);element.addEventListener('close',()=>clearInterval(timer),{once:true});
}

/** Student results: released mock scores with percentage and band, school results, and the answer review when it is open. */
export async function studentResultsPage(target:HTMLElement,ctx:WorkspaceContext){
 const rows=await api<any[]>('/portal/learning/results');if(!ctx.current())return;
 if(!rows.length){target.innerHTML=empty('No results yet','After you submit a mock exam, your result appears here when the school releases it.','','graduation-cap');return;}
 target.innerHTML=`<div class="result-cards">${rows.map(r=>{const mock=r.kind==='MOCK';const percent=mock?r.percent:(r.maximum?Math.round(r.score/r.maximum*1000)/10:null);return `<article class="result-card"><div><p class="pw-overline">${esc(r.subject)}</p><h3>${esc(r.title)}</h3><p class="pw-helper">${mock?`Mock exam · submitted ${esc(lagos(r.submittedAt))}${r.expired?' · time ran out':''}`:'School result'}</p>${r.comment?`<p class="result-comment">${esc(r.comment)}</p>`:''}</div><div class="result-score"><strong>${r.score} <span>/ ${r.maximum}</span></strong>${percent!==null?`<span class="result-percent">${pct(percent)}</span>`:''}${mock?bandPill(r.band):''}${mock&&r.reviewAvailable?`<button type="button" class="pw-button" data-review="${esc(r.mockId)}">Review answers</button>`:mock?'<small class="pw-helper">The answer review opens after the exam closes for everyone, if your school allows it.</small>':''}</div></article>`;}).join('')}</div>`;
 target.querySelectorAll<HTMLButtonElement>('[data-review]').forEach(b=>b.onclick=()=>openReview(b.dataset.review!));
}

async function openReview(mockId:string){
 const element=dialog('Answer review',`<div id="review-body"><div class="pw-loading" role="status"><span class="pw-sr-only">Loading…</span><div class="pw-skeleton"></div></div></div>`,true);element.classList.add('wide-drawer');
 const body=element.querySelector<HTMLElement>('#review-body')!;
 try{const r=await api('/portal/learning/mocks/'+mockId+'/review');
  body.innerHTML=`<p class="pw-overline">${esc(r.subject)}</p><h3 class="review-title">${esc(r.title)} · ${r.score} / ${r.maximum}</h3><ol class="review-list">${r.questions.map((q:any,i:number)=>{const right=q.chosen===q.correct;return `<li class="review-q ${right?'is-right':'is-wrong'}"><p class="review-mark">${right?'Correct':q.chosen<0?'Not answered':'Not correct'} · ${q.marks} mark${q.marks===1?'':'s'}</p>${q.passage?`<p class="review-passage">${esc(q.passage)}</p>`:''}${q.image?`<img src="${esc(mediaSrc(q.image))}" alt="Diagram for question ${i+1}" class="review-image">`:''}<p class="review-prompt">${esc(q.prompt)}</p><ul class="review-options">${q.options.map((o:string,k:number)=>`<li class="${k===q.correct?'is-correct':''} ${k===q.chosen&&k!==q.correct?'is-chosen-wrong':''}"><span class="mock-letter">${LETTERS[k]}</span>${esc(o)}${k===q.correct?' <strong>Correct answer</strong>':''}${k===q.chosen?' <em>Your answer</em>':''}</li>`).join('')}</ul>${q.explanation?`<p class="pw-helper">${esc(q.explanation)}</p>`:''}</li>`;}).join('')}</ol>`;}
 catch(error){body.innerHTML=alert('The review is not available',errorMessage(error),'warning');}
}
