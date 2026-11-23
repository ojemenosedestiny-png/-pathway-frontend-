import {api,errorMessage} from './workspace-api.js';
import {esc,button,alert,badge,dialog,toast,empty,icon,confirm} from './workspace-components.js';
import {imageUploadControl} from './workspace-upload.js';
import type {WorkspaceContext} from './workspace-special.js';
import {lagos,lagosTile,lagosTime,toLagosInput,fromLagosInput} from './lagos-time.js';

/** Calendar-style date tile: month band, big day number, weekday and the time window. */
export function dateTile(opensAt:string,closesAt?:string){const t=lagosTile(opensAt);return `<div class="date-tile" aria-hidden="true"><span class="date-tile-month">${esc(t.month)}</span><strong>${esc(t.day)}</strong><span class="date-tile-weekday">${esc(t.weekday)}</span>${closesAt?`<span class="date-tile-time">${esc(lagosTime(opensAt))}<br>${esc(lagosTime(closesAt))}</span>`:''}</div>`;}
/** Staff mock exams: folders by cohort and date, a full builder, Excel/CSV/PDF import, assignment and make-ups. */
const LETTERS='ABCDEFGH'.split('');
const toLocalInput=toLagosInput,fromLocalInput=fromLagosInput;
type Question={prompt:string;options:string[];answer:number|null;marks:number;passage:string;image:string;explanation:string};
const blankQuestion=():Question=>({prompt:'',options:['','','',''],answer:null,marks:1,passage:'',image:'',explanation:''});
const stateOf=(m:any)=>!m.published?'DRAFT':Date.now()<Date.parse(m.opensAt)?'SCHEDULED':Date.now()>Date.parse(m.closesAt)?'CLOSED':'OPEN NOW';
const audienceOf=(m:any)=>m.studentIds?.length?`${m.studentIds.length} chosen student${m.studentIds.length===1?'':'s'}`:m.cohort?m.cohort:'All students';

export async function staffMocksPage(target:HTMLElement,ctx:WorkspaceContext,writable:boolean,openResults?:(id:string)=>void){
 const rows=await api<any[]>('/admin/learning/mocks');if(!ctx.current())return;
 // Folders: cohort (or audience), then newest window first.
 const folders=new Map<string,any[]>();
 for(const row of rows){const key=row.data.studentIds?.length?'Chosen students':row.data.cohort||'All students';folders.set(key,[...(folders.get(key)||[]),row]);}
 const ordered=[...folders.entries()].sort(([a],[b])=>a==='All students'?-1:b==='All students'?1:a.localeCompare(b));
 target.innerHTML=rows.length?`<div class="mock-folders">${ordered.map(([name,items])=>`<details class="mock-folder" open><summary><span class="mock-folder-name">${icon('folder-open')}${esc(name)}</span><span class="pw-badge">${items.length} exam${items.length===1?'':'s'}</span></summary><div class="mock-folder-list">${items.sort((a,b)=>Date.parse(b.data.opensAt)-Date.parse(a.data.opensAt)).map(row=>{const m=row.data;const id=row.key.slice(5);const s=stateOf(m);return `<article class="mock-row">${dateTile(m.opensAt,m.closesAt)}<div class="mock-row-body"><p class="pw-overline">${esc(m.subject)}</p><h3>${esc(m.title)}</h3><p class="pw-helper">${esc(lagos(m.opensAt))} – ${esc(lagos(m.closesAt))} · ${m.durationMinutes} min · ${m.questions.length} question${m.questions.length===1?'':'s'} · ${esc(audienceOf(m))}</p><p class="mock-row-meta">${badge(s==='OPEN NOW'?'ACTIVE':s)}${m.releaseResults?badge('RESULTS RELEASED'):''}<span class="pw-helper">${row.started} started · ${row.submitted} submitted</span>${row.locked?`<span class="pw-badge">${icon('shield-check')}Questions locked</span>`:''}</p></div><div class="mock-row-actions">${openResults?`<button type="button" class="pw-button" data-mock-results="${esc(id)}">Results</button>`:''}${writable?`<button type="button" class="pw-button" data-mock-makeups="${esc(id)}">Make-ups</button><button type="button" class="pw-button primary" data-mock-edit="${esc(id)}">${icon('pencil')}Edit</button>`:''}</div></article>`;}).join('')}</div></details>`).join('')}</div>`:empty('No mock exams yet','Create your first mock exam. Students only see it once you publish it.',writable?button('Create mock exam','mock-create-empty','primary','plus'):'','graduation-cap');
 const find=(id:string)=>rows.find(r=>r.key==='MOCK:'+id);
 target.querySelectorAll<HTMLButtonElement>('[data-mock-edit]').forEach(b=>b.onclick=()=>{const row=find(b.dataset.mockEdit!);mockEditor(b.dataset.mockEdit!,row.data,row.locked,ctx);});
 target.querySelectorAll<HTMLButtonElement>('[data-mock-makeups]').forEach(b=>b.onclick=()=>makeupsDialog(b.dataset.mockMakeups!,find(b.dataset.mockMakeups!).data));
 target.querySelectorAll<HTMLButtonElement>('[data-mock-results]').forEach(b=>b.onclick=()=>openResults?.(b.dataset.mockResults!));
 target.querySelector<HTMLButtonElement>('#mock-create-empty')?.addEventListener('click',()=>mockEditor(crypto.randomUUID(),null,false,ctx));
 if(writable)ctx.primary('Create mock exam',()=>mockEditor(crypto.randomUUID(),null,false,ctx),'plus');
}

let studentCache:Promise<any[]>|null=null;
const allStudents=()=>studentCache??=api<any[]>('/admin/learning/mocks/students').catch(error=>{studentCache=null;throw error;});

function mockEditor(id:string,existing:any|null,locked:boolean,ctx:WorkspaceContext){
 const m=existing||{title:'',subject:'',durationMinutes:30,opensAt:'',closesAt:'',instructions:'',questionsPerAttempt:null,passMark:50,cohort:'',studentIds:[],shuffleQuestions:true,shuffleOptions:true,showAnswersAfterClose:false,published:false,releaseResults:false,questions:[]};
 const questions:Question[]=(m.questions?.length?m.questions:[blankQuestion()]).map((q:any)=>({prompt:q.prompt||'',options:[...(q.options||['',''])],answer:Number.isInteger(q.answer)?q.answer:null,marks:Number(q.marks??1),passage:q.passage||'',image:q.image||'',explanation:q.explanation||''}));
 let audience:'everyone'|'cohort'|'students'=m.studentIds?.length?'students':m.cohort?'cohort':'everyone';const chosen=new Set<string>(m.studentIds||[]);
 const dis=locked?'disabled':'';
 const element=dialog(existing?'Edit mock exam':'Create a mock exam',`<form class="mock-editor" novalidate>
  <div data-form-error tabindex="-1"></div>
  ${locked?alert('A student has started this exam','Its questions, duration and shuffle settings are locked so every student sits the same paper. You can still change the times, who it is for and the results settings.','warning'):''}
  <section class="mock-section"><h3>Details</h3><div class="mock-grid">
   <label class="pw-field">Title<input name="title" required maxlength="200" value="${esc(m.title)}"></label>
   <label class="pw-field">Subject<input name="subject" required maxlength="100" value="${esc(m.subject)}"></label>
   <label class="pw-field">Opens (Nigeria time)<input name="opensAt" type="datetime-local" required value="${esc(toLocalInput(m.opensAt))}"></label>
   <label class="pw-field">Closes (Nigeria time)<input name="closesAt" type="datetime-local" required value="${esc(toLocalInput(m.closesAt))}"></label>
   <label class="pw-field">Duration (minutes)<input name="durationMinutes" type="number" min="1" max="300" required value="${esc(m.durationMinutes)}" ${dis}></label>
   <label class="pw-field">Pass mark (%)<input name="passMark" type="number" min="0" max="100" required value="${esc(m.passMark??50)}"></label>
   <label class="pw-field">Questions per student <small>Leave blank for all</small><input name="questionsPerAttempt" type="number" min="1" max="200" value="${esc(m.questionsPerAttempt||'')}" ${dis}></label>
   <label class="pw-field full">Instructions for students<textarea name="instructions" maxlength="4000" rows="3" placeholder="For example: Answer all questions. Calculators are not allowed.">${esc(m.instructions||'')}</textarea></label>
  </div></section>
  <section class="mock-section"><h3>Who sits this exam</h3>
   <div class="mock-audience" role="radiogroup" aria-label="Who sits this exam">${[['everyone','All students'],['cohort','One cohort'],['students','Particular students']].map(([v,l])=>`<label><input type="radio" name="audience" value="${v}" ${audience===v?'checked':''}> ${l}</label>`).join('')}</div>
   <div data-audience="cohort" ${audience==='cohort'?'':'hidden'}><label class="pw-field">Cohort<input name="cohort" list="mock-cohorts" maxlength="80" value="${esc(m.cohort||'')}" placeholder="For example: SS3 2026"></label><datalist id="mock-cohorts"></datalist></div>
   <div data-audience="students" ${audience==='students'?'':'hidden'}><label class="pw-field">Find students by name or Student ID<input type="search" id="mock-student-search" placeholder="Start typing…" autocomplete="off"></label><p class="pw-helper" id="mock-chosen-count" aria-live="polite"></p><div class="mock-student-list" id="mock-student-list" role="group" aria-label="Students"></div></div>
  </section>
  <section class="mock-section"><h3>Settings</h3><div class="mock-checks">
   <label><input type="checkbox" name="shuffleQuestions" ${m.shuffleQuestions!==false?'checked':''} ${dis}> Shuffle the question order for each student</label>
   <label><input type="checkbox" name="shuffleOptions" ${m.shuffleOptions!==false?'checked':''} ${dis}> Shuffle the options (A, B, C …) for each student</label>
   <label><input type="checkbox" name="showAnswersAfterClose" ${m.showAnswersAfterClose?'checked':''}> Show correct answers after the exam closes (once results are released)</label>
   <label><input type="checkbox" name="published" ${m.published?'checked':''}> Publish: students can see this exam</label>
  </div></section>
  <section class="mock-section"><div class="mock-section-head"><h3>Questions <span class="pw-badge" id="mock-question-count"></span></h3><span class="pw-helper" id="mock-total-marks"></span></div>
   ${locked?'':`<div class="mock-import-bar"><details class="mock-import-panel"><summary>${icon('upload')}Import from Excel or CSV</summary><p class="pw-helper">Columns: Question, A, B, C, D (E to H optional), Answer (a letter), Marks, Passage. <a href="/backend-api/admin/learning/mocks/template.xlsx" download>Download the Excel template</a>.</p><input type="file" id="sheet-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Choose an Excel or CSV file"><div id="sheet-preview" aria-live="polite"></div></details><details class="mock-import-panel"><summary>${icon('file-text')}Read a PDF paper (AI)</summary><p class="pw-helper">Upload the question paper with its answer key. Check every question afterwards.</p><input type="file" id="mock-pdf" accept="application/pdf" aria-label="Choose a PDF question paper"><button class="pw-button" type="button" id="mock-pdf-import">Read PDF</button><div id="mock-import-status" role="status"></div></details></div>`}
   <ol class="mock-questions" id="mock-questions"></ol>
   ${locked?'':`<button type="button" class="pw-button" id="question-add">${icon('plus')}Add question</button>`}
  </section>
  <footer class="pw-form-actions mock-actions"><button type="button" class="pw-button" data-cancel>Cancel</button><button type="submit" class="pw-button primary">Save mock exam</button></footer>
 </form>`,true);
 element.classList.add('wide-drawer');
 const form=element.querySelector<HTMLFormElement>('form')!;const list=element.querySelector<HTMLOListElement>('#mock-questions')!;
 element.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>element.close();
 // Audience
 const showAudience=()=>element.querySelectorAll<HTMLElement>('[data-audience]').forEach(el=>el.hidden=el.dataset.audience!==audience);
 element.querySelectorAll<HTMLInputElement>('[name=audience]').forEach(r=>r.onchange=()=>{audience=r.value as any;showAudience();if(audience==='students')renderStudents();});
 const countLine=()=>{element.querySelector('#mock-chosen-count')!.textContent=chosen.size?`${chosen.size} student${chosen.size===1?'':'s'} chosen`:'No students chosen yet.';};
 const renderStudents=async()=>{const box=element.querySelector<HTMLElement>('#mock-student-list')!;try{const students=await allStudents();const q=element.querySelector<HTMLInputElement>('#mock-student-search')!.value.trim().toLowerCase();const shown=students.filter(s=>!q||`${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(q)).sort((a,b)=>Number(chosen.has(b.id))-Number(chosen.has(a.id))).slice(0,80);box.innerHTML=shown.map(s=>`<label class="mock-student"><input type="checkbox" value="${esc(s.id)}" ${chosen.has(s.id)?'checked':''}><span><strong>${esc(s.firstName+' '+s.lastName)}</strong><small>${esc(s.studentId)}${s.cohort?' · '+esc(s.cohort):''}</small></span></label>`).join('')||'<p class="pw-helper">No students match.</p>';box.querySelectorAll<HTMLInputElement>('input').forEach(c=>c.onchange=()=>{c.checked?chosen.add(c.value):chosen.delete(c.value);countLine();});countLine();}catch(error){box.innerHTML=alert('Students could not be loaded',errorMessage(error),'danger');}};
 element.querySelector<HTMLInputElement>('#mock-student-search')!.oninput=()=>renderStudents();
 allStudents().then(students=>{element.querySelector('#mock-cohorts')!.innerHTML=[...new Set(students.map(s=>s.cohort).filter(Boolean))].sort().map(c=>`<option value="${esc(c)}">`).join('');}).catch(()=>{});
 if(audience==='students')renderStudents();
 // Questions: state lives in `questions`; structural changes re-render, typing updates in place.
 const totals=()=>{element.querySelector('#mock-question-count')!.textContent=String(questions.length);element.querySelector('#mock-total-marks')!.textContent=`${questions.reduce((t,q)=>t+(Number(q.marks)||0),0)} marks in total`;};
 const render=(focus?:string)=>{
  list.innerHTML=questions.map((q,i)=>`<li class="mock-q${q.answer===null?' needs-answer':''}" data-q="${i}"><div class="mock-q-head"><strong>Question ${i+1}</strong><label class="mock-marks">Marks<input type="number" min="0.5" max="100" step="0.5" data-field="marks" value="${esc(q.marks)}" ${dis}></label>${locked?'':`<div class="mock-q-tools"><button type="button" class="pw-button pw-icon-button" data-act="up" aria-label="Move question ${i+1} up" ${i===0?'disabled':''}>↑</button><button type="button" class="pw-button pw-icon-button" data-act="down" aria-label="Move question ${i+1} down" ${i===questions.length-1?'disabled':''}>↓</button><button type="button" class="pw-button" data-act="copy">Duplicate</button><button type="button" class="pw-button danger" data-act="delete">Delete</button></div>`}</div>
   <details class="mock-passage" ${q.passage?'open':''}><summary>${q.passage?'Passage':'Add a passage (optional)'}</summary><textarea data-field="passage" rows="4" maxlength="8000" aria-label="Passage for question ${i+1}" ${dis}>${esc(q.passage)}</textarea></details>
   <label class="pw-field full">Question<textarea data-field="prompt" rows="2" required maxlength="3000" ${dis}>${esc(q.prompt)}</textarea></label>
   <div class="mock-diagram">${q.image?`<figure><img src="${esc(q.image)}" alt="Diagram for question ${i+1}" loading="lazy"><figcaption>${locked?'':`<button type="button" class="pw-button" data-act="remove-image">Remove diagram</button>`}</figcaption></figure>`:locked?'':`<details><summary>Add a diagram (optional)</summary><div data-upload="${i}"></div></details>`}</div>
   <fieldset class="mock-options"><legend>Options: choose the correct answer</legend>${q.options.map((o,k)=>`<div class="mock-option"><label class="mock-correct"><input type="radio" name="correct-${i}" value="${k}" ${q.answer===k?'checked':''} ${dis} aria-label="Option ${LETTERS[k]} is correct"><span class="mock-letter">${LETTERS[k]}</span></label><input data-option="${k}" value="${esc(o)}" maxlength="1000" aria-label="Option ${LETTERS[k]}" required ${dis}>${!locked&&q.options.length>2?`<button type="button" class="pw-button pw-icon-button quiet" data-act="remove-option" data-k="${k}" aria-label="Remove option ${LETTERS[k]}">${icon('x')}</button>`:''}</div>`).join('')}${!locked&&q.options.length<8?`<button type="button" class="pw-button quiet" data-act="add-option">${icon('plus')}Add option</button>`:''}</fieldset>
   ${q.answer===null?'<p class="pw-inline-error">Choose the correct answer.</p>':''}
  </li>`).join('');
  totals();
  list.querySelectorAll<HTMLElement>('[data-upload]').forEach(box=>{const i=Number(box.dataset.upload);imageUploadControl(box,url=>{questions[i].image=url;render();},'diagram');});
  if(focus)list.querySelector<HTMLElement>(focus)?.focus();
 };
 list.addEventListener('input',event=>{const t=event.target as HTMLInputElement;const li=t.closest<HTMLElement>('[data-q]');if(!li)return;const q=questions[Number(li.dataset.q)];if(t.dataset.field==='marks')q.marks=Number(t.value);else if(t.dataset.field)(q as any)[t.dataset.field]=t.value;else if(t.dataset.option!==undefined)q.options[Number(t.dataset.option)]=t.value;totals();});
 list.addEventListener('change',event=>{const t=event.target as HTMLInputElement;const li=t.closest<HTMLElement>('[data-q]');if(t.type==='radio'&&li){questions[Number(li.dataset.q)].answer=Number(t.value);li.classList.remove('needs-answer');li.querySelector('.pw-inline-error')?.remove();}});
 list.addEventListener('click',async event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');const li=b?.closest<HTMLElement>('[data-q]');if(!b||!li)return;const i=Number(li.dataset.q);const q=questions[i];
  switch(b.dataset.act){
   case 'up':[questions[i-1],questions[i]]=[questions[i],questions[i-1]];render(`[data-q="${i-1}"] [data-act=up]`);break;
   case 'down':[questions[i+1],questions[i]]=[questions[i],questions[i+1]];render(`[data-q="${i+1}"] [data-act=down]`);break;
   case 'copy':questions.splice(i+1,0,{...q,options:[...q.options]});render(`[data-q="${i+1}"] [data-field=prompt]`);toast(`Question ${i+1} duplicated as question ${i+2}.`);break;
   case 'delete':if(questions.length===1){toast('A mock exam needs at least one question.');return;}if(q.prompt.trim()&&!(await confirm('Delete question '+(i+1)+'?','This removes the question and its options.','Delete question')))return;questions.splice(i,1);render();break;
   case 'add-option':q.options.push('');render(`[data-q="${i}"] [data-option="${q.options.length-1}"]`);break;
   case 'remove-option':{const k=Number(b.dataset.k);q.options.splice(k,1);if(q.answer===k)q.answer=null;else if(q.answer!==null&&q.answer>k)q.answer--;render();break;}
   case 'remove-image':q.image='';render();break;
  }});
 element.querySelector<HTMLButtonElement>('#question-add')?.addEventListener('click',()=>{questions.push(blankQuestion());render(`[data-q="${questions.length-1}"] [data-field=prompt]`);});
 render();
 // Excel/CSV import: preview first; only rows without problems are added.
 element.querySelector<HTMLInputElement>('#sheet-file')?.addEventListener('change',async event=>{const file=(event.target as HTMLInputElement).files?.[0];const preview=element.querySelector<HTMLElement>('#sheet-preview')!;if(!file)return;preview.innerHTML='<div class="pw-loading" role="status"><span class="pw-sr-only">Reading the file…</span><div class="pw-skeleton short"></div></div>';
  try{if(file.size>5*1024*1024)throw Error('The file is larger than 5 MB.');const result=await api('/admin/learning/mocks/import-sheet','POST',new Blob([file],{type:file.type||'application/octet-stream'}));
   const bad=result.rows.filter((r:any)=>r.problems.length);
   preview.innerHTML=`${alert(`${result.ready} question${result.ready===1?'':'s'} ready${bad.length?`, ${bad.length} need fixing`:''}`,bad.length?'Rows with problems are not added. Fix them in the file and import again, or add them by hand.':'Check the preview, then add the questions.',bad.length?'warning':'success')}<div class="pw-table-scroll sheet-preview"><table class="pw-table"><thead><tr><th scope="col">Row</th><th scope="col">Check</th><th scope="col">Question</th><th scope="col">Choices</th><th scope="col">Answer</th><th scope="col">Marks</th></tr></thead><tbody>${result.rows.map((r:any)=>`<tr class="${r.problems.length?'row-error':''}"><td>${r.row}</td><td>${r.problems.length?`<span class="pw-badge danger">${esc(r.problems.join(' '))}</span>`:`<span class="pw-badge success">Ready</span>${r.warnings.map((w:string)=>`<small class="pw-helper">${esc(w)}</small>`).join('')}`}</td><td>${esc(r.source.question)}</td><td>${LETTERS.filter(l=>r.source[l]).map(l=>`${l}. ${esc(r.source[l])}`).join('<br>')}</td><td>${esc(r.source.answer)}</td><td>${esc(r.source.marks||'1')}</td></tr>`).join('')}</tbody></table></div>${result.ready?`<div class="pw-row"><button type="button" class="pw-button primary" id="sheet-add">Add ${result.ready} question${result.ready===1?'':'s'}</button><label class="pw-check-label"><input type="checkbox" id="sheet-replace"> Replace the current questions</label></div>`:''}`;
   preview.querySelector<HTMLButtonElement>('#sheet-add')?.addEventListener('click',()=>{const incoming=result.rows.filter((r:any)=>r.question).map((r:any)=>({...blankQuestion(),...r.question}));const replace=preview.querySelector<HTMLInputElement>('#sheet-replace')!.checked||questions.every(q=>!q.prompt.trim());if(replace)questions.splice(0,questions.length);questions.push(...incoming);render();preview.innerHTML=alert(`${incoming.length} questions added`,'They are at the end of the list. Save the mock exam to keep them.','success');});}
  catch(error){preview.innerHTML=alert('This file could not be imported',errorMessage(error),'danger');}});
 // PDF import (AI), as before.
 element.querySelector<HTMLButtonElement>('#mock-pdf-import')?.addEventListener('click',async()=>{const input=element.querySelector<HTMLInputElement>('#mock-pdf')!;const status=element.querySelector<HTMLElement>('#mock-import-status')!;const control=element.querySelector<HTMLButtonElement>('#mock-pdf-import')!;const file=input.files?.[0];
  if(!file){status.innerHTML=alert('Choose a PDF first','Select the question paper, then read it.','warning');return;}if(file.size>15*1024*1024){status.innerHTML=alert('The PDF is too large','Use a file of 15 MB or less.','warning');return;}
  control.disabled=true;status.innerHTML=`<p class="pw-helper">Reading “${esc(file.name)}”… this can take up to a minute.</p>`;
  try{const result=await api('/admin/learning/mocks/import','POST',new Blob([file],{type:'application/pdf'}));if(questions.every(q=>!q.prompt.trim()))questions.splice(0,questions.length);questions.push(...result.questions.map((q:any)=>({...blankQuestion(),...q,answer:Number.isInteger(q.answer)?q.answer:null})));render();const missing=result.questions.filter((q:any)=>q.answer===null).length;status.innerHTML=alert(`${result.questions.length} questions read`,`Check each one against the paper.${missing?` ${missing} need the correct answer chosen.`:''}`,missing?'warning':'success');}
  catch(error){status.innerHTML=alert('PDF not imported',errorMessage(error)+' Your questions are unchanged.','danger');}finally{control.disabled=false;}});
 // Save
 form.onsubmit=async event=>{event.preventDefault();const box=form.querySelector<HTMLElement>('[data-form-error]')!;box.innerHTML='';const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const fail=(message:string,selector?:string)=>{box.innerHTML=alert('Check the exam',message,'danger');(selector?element.querySelector<HTMLElement>(selector):box)?.focus();};
  const data=new FormData(form);const get=(k:string)=>String(data.get(k)??'').trim();
  if(!get('title')||!get('subject'))return fail('Give the exam a title and subject.','[name=title]');
  if(!get('opensAt')||!get('closesAt'))return fail('Set when the exam opens and closes.','[name=opensAt]');
  if(Date.parse(fromLocalInput(get('opensAt')))>=Date.parse(fromLocalInput(get('closesAt'))))return fail('The exam must close after it opens.','[name=closesAt]');
  for(const [i,q] of questions.entries()){if(!q.prompt.trim())return fail(`Question ${i+1} has no text.`,`[data-q="${i}"] [data-field=prompt]`);const empty=q.options.findIndex(o=>!o.trim());if(empty>=0)return fail(`Question ${i+1}: option ${LETTERS[empty]} is empty. Fill it in or remove it.`,`[data-q="${i}"] [data-option="${empty}"]`);if(q.answer===null)return fail(`Question ${i+1}: choose the correct answer.`,`[data-q="${i}"] input[type=radio]`);if(new Set(q.options.map(o=>o.trim().toLowerCase())).size!==q.options.length)return fail(`Question ${i+1}: two options are the same.`,`[data-q="${i}"] [data-option="0"]`);}
  if(audience==='students'&&!chosen.size)return fail('Choose at least one student, or pick another audience.','#mock-student-search');
  if(audience==='cohort'&&!get('cohort'))return fail('Enter the cohort that sits this exam.','[name=cohort]');
  const payload={title:get('title'),subject:get('subject'),durationMinutes:locked?m.durationMinutes:Number(get('durationMinutes')),opensAt:fromLocalInput(get('opensAt')),closesAt:fromLocalInput(get('closesAt')),instructions:get('instructions'),passMark:Number(get('passMark')||50),questionsPerAttempt:locked?m.questionsPerAttempt??null:get('questionsPerAttempt')?Number(get('questionsPerAttempt')):null,cohort:audience==='cohort'?get('cohort'):'',studentIds:audience==='students'?[...chosen]:[],shuffleQuestions:locked?m.shuffleQuestions!==false:data.get('shuffleQuestions')==='on',shuffleOptions:locked?m.shuffleOptions!==false:data.get('shuffleOptions')==='on',showAnswersAfterClose:data.get('showAnswersAfterClose')==='on',published:data.get('published')==='on',releaseResults:Boolean(m.releaseResults),questions:locked?m.questions:questions.map(q=>({prompt:q.prompt.trim(),options:q.options.map(o=>o.trim()),answer:q.answer,marks:Number(q.marks)||1,passage:q.passage.trim(),image:q.image,explanation:q.explanation||''}))};
  submit.disabled=true;form.setAttribute('aria-busy','true');
  try{await api('/admin/learning/mocks/'+id,'PUT',payload);element.close();toast(payload.published?'Mock exam saved and published.':'Mock exam saved as a draft.');await ctx.refresh();}
  catch(error){fail(errorMessage(error));}finally{submit.disabled=false;form.removeAttribute('aria-busy');}};
}

async function makeupsDialog(id:string,mock:any){
 const element=dialog('Make-up windows',`<div class="pw-stack"><p class="pw-helper">Give a student who missed “${esc(mock.title)}” their own time to sit it. The same paper, duration and rules apply.</p><div id="makeup-list" aria-live="polite"><div class="pw-loading" role="status"><span class="pw-sr-only">Loading…</span><div class="pw-skeleton short"></div></div></div><form class="pw-form" id="makeup-form"><div data-form-error tabindex="-1"></div><div class="pw-form-grid"><label class="pw-field full">Student<input type="search" id="makeup-search" placeholder="Search by name or Student ID" autocomplete="off" required><select id="makeup-student" required aria-label="Choose the student"><option value="">Choose a student…</option></select></label><label class="pw-field">Opens (Nigeria time)<input type="datetime-local" name="opensAt" required></label><label class="pw-field">Closes (Nigeria time)<input type="datetime-local" name="closesAt" required></label></div><footer class="pw-form-actions"><button type="submit" class="pw-button primary">Give make-up window</button></footer></form></div>`,true);
 const listBox=element.querySelector<HTMLElement>('#makeup-list')!;const select=element.querySelector<HTMLSelectElement>('#makeup-student')!;
 const students=await allStudents().catch(()=>[] as any[]);const name=(sid:string)=>{const s=students.find(x=>x.id===sid);return s?`${s.firstName} ${s.lastName} · ${s.studentId}`:'Student';};
 const fill=()=>{const q=element.querySelector<HTMLInputElement>('#makeup-search')!.value.trim().toLowerCase();select.innerHTML='<option value="">Choose a student…</option>'+students.filter(s=>!q||`${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(q)).slice(0,60).map(s=>`<option value="${esc(s.id)}">${esc(s.firstName+' '+s.lastName)} · ${esc(s.studentId)}</option>`).join('');};
 element.querySelector<HTMLInputElement>('#makeup-search')!.oninput=fill;fill();
 const load=async()=>{try{const rows=await api<any[]>('/admin/learning/mocks/'+id+'/makeups');listBox.innerHTML=rows.length?`<ul class="makeup-list">${rows.map(r=>`<li><div><strong>${esc(name(r.studentId))}</strong><small>${esc(lagos(r.opensAt))} – ${esc(lagos(r.closesAt))}</small></div><button type="button" class="pw-button danger" data-remove-makeup="${esc(r.studentId)}">Remove</button></li>`).join('')}</ul>`:'<p class="pw-helper">No make-up windows yet.</p>';listBox.querySelectorAll<HTMLButtonElement>('[data-remove-makeup]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/admin/learning/mocks/'+id+'/makeups/'+b.dataset.removeMakeup,'DELETE');toast('Make-up window removed.');await load();}catch(error){b.disabled=false;toast(errorMessage(error));}});}catch(error){listBox.innerHTML=alert('Make-ups could not be loaded',errorMessage(error),'danger');}};
 await load();
 const form=element.querySelector<HTMLFormElement>('#makeup-form')!;
 form.onsubmit=async event=>{event.preventDefault();const box=form.querySelector<HTMLElement>('[data-form-error]')!;box.innerHTML='';const data=new FormData(form);const studentId=select.value;const opensAt=String(data.get('opensAt')||''),closesAt=String(data.get('closesAt')||'');
  if(!studentId){box.innerHTML=alert('Choose a student','Search, then pick the student from the list.','danger');return;}
  if(!opensAt||!closesAt||Date.parse(opensAt)>=Date.parse(closesAt)){box.innerHTML=alert('Check the times','The make-up must close after it opens.','danger');return;}
  try{await api('/admin/learning/mocks/'+id+'/makeups/'+studentId,'PUT',{opensAt:fromLocalInput(opensAt),closesAt:fromLocalInput(closesAt)});toast('Make-up window saved.');form.reset();fill();await load();}catch(error){box.innerHTML=alert('Not saved',errorMessage(error),'danger');}};
}
