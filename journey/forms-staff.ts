import {api,errorMessage} from './workspace-api.js';
import {esc,alert,empty,toast,icon,dialog} from './workspace-components.js';
import {lagos,toLagosInput,fromLagosInput} from './lagos-time.js';
import type {WorkspaceContext} from './workspace-special.js';
import {stepsOf,type Field} from './forms-student.js';

/** Staff forms: the list, a simple builder and the submissions table with review status. */
const types:[string,string][]=[['short','Short text'],['long','Long text'],['number','Number'],['date','Date'],['email','Email'],['phone','Phone'],['single','Single choice'],['multiple','Multiple choice'],['dropdown','Dropdown'],['file','File upload'],['photo','Photo upload']];
const choiceTypes=new Set(['single','multiple','dropdown']);
const statusText:Record<string,[string,string]>={NEW:['New','warning'],REVIEWED:['Reviewed',''],APPROVED:['Approved','success'],NEEDS_CHANGES:['Needs changes','danger']};
const pill=(s:string)=>{const [l,t]=statusText[s]||[s,''];return `<span class="pw-badge ${t}">${l}</span>`;};
const newId=()=>'f'+Math.random().toString(36).slice(2,8);

export async function staffFormsPage(target:HTMLElement,ctx:WorkspaceContext,writable:boolean){
 const rows=await api<any[]>('/admin/forms');if(!ctx.current())return;
 target.innerHTML=`<div class="fm-list">${rows.map(f=>`<article class="fm-card${f.system?' is-main':''}"><div class="fm-card-body"><p class="pw-overline">${f.system?'Always on · every student':f.cohort?esc(f.cohort):'Everyone'}</p><h3>${esc(f.title)}</h3>
  <p class="fm-meta">${f.system||f.published?'<span class="pw-badge success">Published</span>':'<span class="pw-badge">Draft</span>'}<span>${f.fields.length} field${f.fields.length===1?'':'s'}</span>${f.opensAt?`<span>Opens ${esc(lagos(f.opensAt))}</span>`:''}${f.closesAt?`<span>${f.state==='CLOSED'?'Closed':'Closes'} ${esc(lagos(f.closesAt))}</span>`:''}</p>
  <p class="fm-counts"><strong>${f.waiting}</strong> new · ${f.submitted} submitted</p></div>
  <div class="fm-card-action"><button type="button" class="pw-button primary" data-subs="${esc(f.id)}">Submissions</button>${writable?`<button type="button" class="pw-button" data-edit="${esc(f.id)}">${icon('pencil')}Edit</button>`:''}</div></article>`).join('')}</div>`;
 target.querySelectorAll<HTMLButtonElement>('[data-subs]').forEach(b=>b.onclick=()=>submissionsPanel(b.dataset.subs!,writable,()=>ctx.refresh()));
 target.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b=>b.onclick=()=>formEditor(rows.find(f=>f.id===b.dataset.edit),()=>ctx.refresh()));
 if(writable)ctx.primary('New form',()=>formEditor(null,()=>ctx.refresh()),'plus');
}

function formEditor(existing:any|null,onSaved:()=>void){
 const id=existing?.id||crypto.randomUUID();const system=!!existing?.system;
 const fields:Field[]=(existing?.fields||[{id:newId(),type:'short',label:'',help:'',required:true,options:[],step:''}]).map((f:Field)=>({...f,options:[...f.options]}));
 const element=dialog(existing?'Edit form':'New form',`<form class="pw-form fm-editor" novalidate><div id="fm-editor-error" tabindex="-1"></div>
  <label class="pw-field full">Title<input name="title" value="${esc(existing?.title||'')}" required></label>
  <label class="pw-field full">Description <span class="pw-helper">(optional)</span><textarea name="description" rows="2">${esc(existing?.description||'')}</textarea></label>
  ${system?`<p class="pw-helper full">The registration form is always published to every student and has no closing date. You can change its fields.</p>`:`<fieldset class="full fm-audience"><legend>Who fills it in</legend><label class="fm-choice"><input type="radio" name="audience" value="all" ${existing?.cohort?'':'checked'}> Everyone</label><label class="fm-choice"><input type="radio" name="audience" value="cohort" ${existing?.cohort?'checked':''}> One cohort</label><label class="pw-field">Cohort<input name="cohort" value="${esc(existing?.cohort||'')}" placeholder="For example SS3 2026"></label></fieldset>
  <label class="pw-field">Opens <span class="pw-helper">(optional, Nigeria time)</span><input type="datetime-local" name="opensAt" value="${existing?.opensAt?toLagosInput(existing.opensAt):''}"></label>
  <label class="pw-field">Closes <span class="pw-helper">(optional, Nigeria time)</span><input type="datetime-local" name="closesAt" value="${existing?.closesAt?toLagosInput(existing.closesAt):''}"></label>
  <label class="fm-choice full"><input type="checkbox" name="published" ${existing?.published?'checked':''}> Published: students can see this form</label>`}
  <div class="full"><h3 class="fm-editor-title">Fields</h3><p class="pw-helper">Fields with the same step name appear on the same page.</p><div id="fm-fields"></div><button type="button" class="pw-button" id="fm-add">${icon('plus')}Add field</button></div>
  </form><div class="pw-form-actions fm-editor-actions"><button type="button" class="pw-button" data-cancel>Cancel</button><button type="button" class="pw-button primary" data-save>Save form</button></div>`,true);
 element.classList.add('wide-drawer');
 const list=element.querySelector<HTMLElement>('#fm-fields')!;const formEl=element.querySelector<HTMLFormElement>('form')!;
 const render=()=>{const stepNames=[...new Set(fields.map(f=>f.step).filter(Boolean))];
  list.innerHTML=`<datalist id="fm-steps">${stepNames.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>${fields.map((f,i)=>`<section class="fm-edit-field" data-i="${i}"><div class="fm-edit-head"><strong>Field ${i+1}</strong><div class="fm-edit-tools"><button type="button" class="pw-button pw-icon-button" data-act="up" aria-label="Move field ${i+1} up" ${i===0?'disabled':''}>↑</button><button type="button" class="pw-button pw-icon-button" data-act="down" aria-label="Move field ${i+1} down" ${i===fields.length-1?'disabled':''}>↓</button><button type="button" class="pw-button danger" data-act="delete" ${fields.length===1?'disabled':''}>Delete</button></div></div>
   <div class="fm-edit-grid"><label class="pw-field">Label<input data-k="label" value="${esc(f.label)}"></label><label class="pw-field">Type<select data-k="type">${types.map(([v,l])=>`<option value="${v}" ${f.type===v?'selected':''}>${l}</option>`).join('')}</select></label>
   <label class="pw-field">Help text <span class="pw-helper">(optional)</span><input data-k="help" value="${esc(f.help)}"></label><label class="pw-field">Step <span class="pw-helper">(optional)</span><input data-k="step" list="fm-steps" value="${esc(f.step)}"></label>
   ${choiceTypes.has(f.type)?`<label class="pw-field full">Choices <span class="pw-helper">(one per line)</span><textarea data-k="options" rows="3">${esc(f.options.join('\n'))}</textarea></label>`:''}
   <label class="fm-choice"><input type="checkbox" data-k="required" ${f.required?'checked':''}> Required</label></div></section>`).join('')}`;};
 list.addEventListener('input',e=>{const el=e.target as HTMLInputElement;const i=Number(el.closest<HTMLElement>('[data-i]')?.dataset.i);const k=el.dataset.k;if(!k||Number.isNaN(i))return;const f=fields[i] as any;if(k==='required')f.required=el.checked;else if(k==='options')f.options=el.value.split('\n').map(s=>s.trim()).filter(Boolean);else if(k!=='type')f[k]=el.value;});
 list.addEventListener('change',e=>{const el=e.target as HTMLSelectElement;if(el.dataset.k!=='type')return;const i=Number(el.closest<HTMLElement>('[data-i]')!.dataset.i);fields[i].type=el.value;if(!choiceTypes.has(el.value))fields[i].options=[];render();list.querySelector<HTMLElement>(`[data-i="${i}"] [data-k="type"]`)?.focus();});
 list.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');if(!b)return;const i=Number(b.closest<HTMLElement>('[data-i]')!.dataset.i);const act=b.dataset.act;
  if(act==='up'&&i>0)[fields[i-1],fields[i]]=[fields[i],fields[i-1]];else if(act==='down'&&i<fields.length-1)[fields[i+1],fields[i]]=[fields[i],fields[i+1]];else if(act==='delete')fields.splice(i,1);render();});
 element.querySelector<HTMLButtonElement>('#fm-add')!.onclick=()=>{fields.push({id:newId(),type:'short',label:'',help:'',required:false,options:[],step:fields[fields.length-1]?.step||''});render();list.querySelector<HTMLInputElement>(`[data-i="${fields.length-1}"] [data-k="label"]`)?.focus();};
 element.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>element.close();
 const errorBox=element.querySelector<HTMLElement>('#fm-editor-error')!;
 const fail=(message:string)=>{errorBox.innerHTML=alert('Check the form',message,'danger');errorBox.focus();};
 element.querySelector<HTMLButtonElement>('[data-save]')!.onclick=async event=>{
  const button=event.currentTarget as HTMLButtonElement;const data=new FormData(formEl);const title=String(data.get('title')||'').trim();
  if(!title)return fail('Give the form a title.');
  const empty=fields.findIndex(f=>!f.label.trim());if(empty>=0)return fail(`Field ${empty+1} needs a label.`);
  const few=fields.findIndex(f=>choiceTypes.has(f.type)&&f.options.length<2);if(few>=0)return fail(`Field ${few+1} needs at least two choices.`);
  const payload:any={title,description:String(data.get('description')||'').trim(),fields:fields.map(f=>({...f,label:f.label.trim(),help:f.help.trim(),step:f.step.trim()}))};
  if(!system){const cohort=data.get('audience')==='cohort'?String(data.get('cohort')||'').trim():'';if(data.get('audience')==='cohort'&&!cohort)return fail('Enter the cohort, or choose Everyone.');
   const opens=String(data.get('opensAt')||''),closes=String(data.get('closesAt')||'');Object.assign(payload,{cohort,opensAt:opens?fromLagosInput(opens):null,closesAt:closes?fromLagosInput(closes):null,published:data.get('published')==='on'});
   if(payload.opensAt&&payload.closesAt&&Date.parse(payload.closesAt)<=Date.parse(payload.opensAt))return fail('The closing time must be after the opening time.');}
  button.disabled=true;try{await api('/admin/forms/'+encodeURIComponent(id),'PUT',payload);toast('Form saved.');element.close();onSaved();}catch(error){fail(errorMessage(error));button.disabled=false;}
 };
 render();
}

function submissionsPanel(id:string,writable:boolean,onChange:()=>void){
 const element=dialog('Submissions','<div id="fm-subs"><div class="pw-loading" role="status"><span class="pw-sr-only">Loading submissions…</span><div class="pw-skeleton"></div><div class="pw-skeleton short"></div></div></div>',true);
 element.classList.add('wide-drawer');const box=element.querySelector<HTMLElement>('#fm-subs')!;let query='',status='';let data:any;
 const load=async()=>{try{data=await api('/admin/forms/'+encodeURIComponent(id)+'/submissions');if(element.open)render();}catch(error){box.innerHTML=alert('Submissions could not be loaded',errorMessage(error),'danger');}};
 const render=()=>{const rows=data.submissions.filter((s:any)=>(!status||s.status===status)&&(!query||`${s.name} ${s.studentNumber} ${s.reference} ${s.cohort}`.toLowerCase().includes(query)));
  const counts=Object.fromEntries(Object.keys(statusText).map(k=>[k,data.submissions.filter((s:any)=>s.status===k).length]));
  box.innerHTML=`<header class="results-head"><div><p class="pw-overline">Form</p><h3>${esc(data.form.title)}</h3><p class="pw-helper">${data.submissions.length} submitted · ${counts.NEW} new</p></div><div class="results-actions"><a class="pw-button" href="/backend-api/admin/forms/${esc(id)}/submissions.csv" download>${icon('download')}Export CSV</a></div></header>
   <div class="fm-filters"><label class="pw-field">Search<input type="search" id="fm-search" value="${esc(query)}" placeholder="Name, Student ID or reference"></label><label class="pw-field">Status<select id="fm-status"><option value="">All</option>${Object.entries(statusText).map(([k,[l]])=>`<option value="${k}" ${status===k?'selected':''}>${l} (${counts[k]})</option>`).join('')}</select></label></div>
   ${rows.length?`<div class="pw-table-scroll"><table class="pw-table"><thead><tr><th scope="col">Reference</th><th scope="col">Student</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col"><span class="pw-sr-only">Open</span></th></tr></thead><tbody>${rows.map((s:any)=>`<tr><td><strong>${esc(s.reference)}</strong></td><td>${esc(s.name)}<small class="pw-helper fm-sub-id">${esc(s.studentNumber)}${s.cohort?' · '+esc(s.cohort):''}</small></td><td>${pill(s.status)}</td><td>${esc(lagos(s.submittedAt))}</td><td><button type="button" class="pw-button" data-open="${esc(s.studentId)}">Open</button></td></tr>`).join('')}</tbody></table></div>`:empty(data.submissions.length?'No submissions match':'No submissions yet',data.submissions.length?'Try another search or status.':'Submissions appear here when students send this form.','','file-check')}`;
  const search=box.querySelector<HTMLInputElement>('#fm-search')!;search.oninput=()=>{query=search.value.trim().toLowerCase();const pos=search.selectionStart;render();const next=box.querySelector<HTMLInputElement>('#fm-search')!;next.focus();next.setSelectionRange(pos,pos);};
  box.querySelector<HTMLSelectElement>('#fm-status')!.onchange=e=>{status=(e.target as HTMLSelectElement).value;render();box.querySelector<HTMLElement>('#fm-status')?.focus();};
  box.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b=>b.onclick=()=>openSubmission(id,b.dataset.open!,writable,async()=>{await load();onChange();}));
 };
 load();
}

function openSubmission(formId:string,studentId:string,writable:boolean,onSaved:()=>Promise<void>){
 const element=dialog('Submission','<div id="fm-one"><div class="pw-loading" role="status"><span class="pw-sr-only">Loading…</span><div class="pw-skeleton"></div></div></div>',true);element.classList.add('wide-drawer');
 const box=element.querySelector<HTMLElement>('#fm-one')!;
 (async()=>{try{
  const r=await api('/admin/forms/'+encodeURIComponent(formId)+'/submissions/'+encodeURIComponent(studentId));const s=r.submission;const files=new Map<string,any>(r.files.map((f:any)=>[f.id,f]));
  const value=(f:Field)=>{const v=s.answers[f.id];if(Array.isArray(v))return v.map(esc).join(', ');if(!v)return '<span class="pw-helper">Not answered</span>';if(f.type==='file'||f.type==='photo'){const file=files.get(v);return `<button type="button" class="pw-button" data-file="${esc(v)}">${icon('download')}${esc(file?.filename||'Download file')}</button>${f.type==='photo'?` <button type="button" class="pw-button" data-view="${esc(v)}">View photo</button>`:''}`;}if(f.type==='date'){const d=new Date(v+'T12:00:00Z');return Number.isNaN(d.getTime())?esc(v):esc(d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}));}return esc(v).replace(/\n/g,'<br>');};
  box.innerHTML=`<header class="results-head"><div><p class="pw-overline">${esc(r.form.title)}</p><h3>${esc(s.name)}</h3><p class="pw-helper">${esc(s.studentNumber)}${s.cohort?' · '+esc(s.cohort):''} · reference <strong>${esc(s.reference)}</strong> · submitted ${esc(lagos(s.submittedAt))}</p></div><div>${pill(s.status)}</div></header>
   <div class="fm-photo-view" hidden></div>
   ${stepsOf(r.form.fields,r.form.title).map(st=>`<section class="fm-review-step"><h3>${esc(st.name)}</h3><dl>${st.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${value(f)}</dd></div>`).join('')}</dl></section>`).join('')}
   ${writable?`<form class="fm-status-form" novalidate><fieldset><legend>Status</legend>${Object.entries(statusText).map(([k,[l]])=>`<label class="fm-choice"><input type="radio" name="status" value="${k}" ${s.status===k?'checked':''}> ${l}</label>`).join('')}</fieldset>
    <label class="pw-field">Note to the student <span class="pw-helper">(needed for “Needs changes”; the student sees it)</span><textarea name="note" rows="3">${esc(s.staffNote||'')}</textarea></label><div id="fm-status-error"></div><button type="submit" class="pw-button primary">Save status</button></form>`:s.staffNote?`<p><strong>Note to the student:</strong> ${esc(s.staffNote)}</p>`:''}`;
  const fileUrl=async(fileId:string,view:boolean)=>api('/admin/forms/'+encodeURIComponent(formId)+'/submissions/'+encodeURIComponent(studentId)+'/files/'+encodeURIComponent(fileId)+(view?'?view=1':''));
  box.querySelectorAll<HTMLButtonElement>('[data-file]').forEach(b=>b.onclick=async()=>{try{const {url}=await fileUrl(b.dataset.file!,false);const a=document.createElement('a');a.href=url;a.rel='noopener';document.body.append(a);a.click();a.remove();}catch(error){toast(errorMessage(error));}});
  box.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=async()=>{const view=box.querySelector<HTMLElement>('.fm-photo-view')!;try{const {url}=await fileUrl(b.dataset.view!,true);view.innerHTML=`<img src="${esc(url)}" alt="Photo sent by ${esc(s.name)}" class="fm-photo">`;view.hidden=false;view.scrollIntoView({block:'nearest'});}catch(error){toast(errorMessage(error));}});
  const form=box.querySelector<HTMLFormElement>('.fm-status-form');
  form?.addEventListener('submit',async event=>{event.preventDefault();const d=new FormData(form);const status=String(d.get('status')||'');const note=String(d.get('note')||'').trim();const err=form.querySelector<HTMLElement>('#fm-status-error')!;
   if(status==='NEEDS_CHANGES'&&!note){err.innerHTML=alert('Add a note','Tell the student what to change.','danger');form.querySelector<HTMLTextAreaElement>('textarea')!.focus();return;}
   const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;
   try{await api('/admin/forms/'+encodeURIComponent(formId)+'/submissions/'+encodeURIComponent(studentId)+'/status','PUT',{status,note});toast('Status saved.');element.close();await onSaved();}catch(error){err.innerHTML=alert('Status not saved',errorMessage(error),'danger');button.disabled=false;}});
 }catch(error){box.innerHTML=alert('This submission could not be opened',errorMessage(error),'danger');}})();
}
