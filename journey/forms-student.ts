import {api,errorMessage,workspaceService as service} from './workspace-api.js';
import {ApiError} from './live-api.js';
import {esc,alert,empty,toast,icon} from './workspace-components.js';
import {lagos} from './lagos-time.js';
import type {WorkspaceContext} from './workspace-special.js';

/** Student forms: the list, the step-by-step form with autosave, the review page, the confirmation and a printable copy. */
export type Field={id:string;type:string;label:string;help:string;required:boolean;options:string[];step:string};
type Answers=Record<string,string|string[]>;
const statusLabel:Record<string,[string,string]>={NOT_STARTED:['Not started',''],DRAFT:['Draft saved','warning'],NEW:['Submitted','success'],REVIEWED:['Reviewed','success'],APPROVED:['Approved','success'],NEEDS_CHANGES:['Needs changes','danger']};
const pill=(status:string)=>{const [label,tone]=statusLabel[status]||[status,''];return `<span class="pw-badge ${tone}">${label}</span>`;};
const submitted=(status:string)=>['NEW','REVIEWED','APPROVED'].includes(status);
const phoneRe=/^\+?[\d\s()-]{7,20}$/,emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Groups fields into steps: consecutive fields with the same step name share a page. */
export function stepsOf(fields:Field[],fallback='Questions'){const steps:{name:string;fields:Field[]}[]=[];for(const f of fields){const name=f.step||fallback;const last=steps[steps.length-1];if(last&&last.name===name)last.fields.push(f);else steps.push({name,fields:[f]});}return steps;}
/** The same checks the server makes, so mistakes show beside the field straight away. */
export function fieldError(f:Field,value:string|string[]|undefined){
 if(f.type==='multiple'){const list=Array.isArray(value)?value:[];return f.required&&!list.length?'Choose at least one option.':'';}
 const v=typeof value==='string'?value.trim():'';
 if(!v)return f.required?(f.type==='photo'?'Upload your photo.':f.type==='file'?'Upload the file.':['single','dropdown'].includes(f.type)?'Choose an option.':'This is required.'):'';
 if(f.type==='number'&&!/^-?\d+(\.\d+)?$/.test(v))return 'Enter a number.';
 if(f.type==='email'&&!emailRe.test(v))return 'Enter an email address, for example name@example.com.';
 if(f.type==='phone'&&!phoneRe.test(v))return 'Enter a phone number, for example 0803 123 4567.';
 if(f.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))return 'Enter a date.';
 return '';
}
/** Shrinks a passport photo in the browser before it is uploaded (longest side 900 px, JPEG). */
export async function shrinkPhoto(file:File,maxSide=900):Promise<File>{
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const g=canvas.getContext('2d')!;g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('This photo could not be prepared. Try another one.')),'image/jpeg',0.85));
 return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
}

export async function studentFormsPage(target:HTMLElement,ctx:WorkspaceContext){
 const rows=await api<any[]>('/portal/forms');if(!ctx.current())return;
 if(!rows.length){target.innerHTML=empty('No forms yet','Forms from the school appear here.','','file-check');return;}
 target.innerHTML=`<div class="fm-list">${rows.map(r=>{const done=submitted(r.status);const closed=r.state==='CLOSED'&&!done;const early=r.state==='NOT_OPEN';
  const action=done?'View your copy':r.status==='NEEDS_CHANGES'?'Make changes':r.status==='DRAFT'?'Continue form':'Start form';
  return `<article class="fm-card${r.system?' is-main':''}"><div class="fm-card-body"><p class="pw-overline">${r.system?'Always required':'From the school'}</p><h3>${esc(r.title)}</h3>${r.description?`<p class="pw-helper">${esc(r.description)}</p>`:''}
   <p class="fm-meta">${pill(r.status)}${r.reference?`<span>Reference <strong>${esc(r.reference)}</strong></span>`:''}${r.submittedAt?`<span>Submitted ${esc(lagos(r.submittedAt))}</span>`:''}${!done&&r.closesAt&&!closed?`<span>Closes ${esc(lagos(r.closesAt))}</span>`:''}</p>
   ${r.status==='NEEDS_CHANGES'&&r.staffNote?alert('The school asked for changes',r.staffNote,'warning'):''}</div>
   <div class="fm-card-action">${early?`<span class="pw-helper">Opens ${esc(lagos(r.opensAt))}</span>`:closed?'<span class="pw-helper">This form has closed.</span>':`<button type="button" class="pw-button ${done?'':'primary'}" data-form="${esc(r.id)}">${action}</button>`}</div></article>`;}).join('')}</div>`;
 target.querySelectorAll<HTMLButtonElement>('[data-form]').forEach(b=>b.onclick=()=>openForm(target,ctx,b.dataset.form!));
}

async function openForm(target:HTMLElement,ctx:WorkspaceContext,id:string){
 target.innerHTML='<div class="pw-loading" role="status"><span class="pw-sr-only">Opening the form…</span><div class="pw-skeleton"></div><div class="pw-skeleton short"></div></div>';
 let form:any;try{form=await api('/portal/forms/'+encodeURIComponent(id));}catch(error){target.innerHTML=alert('This form could not be opened',errorMessage(error),'danger');return;}
 if(!ctx.current())return;
 const back=()=>{studentFormsPage(target,ctx).catch(error=>target.innerHTML=alert('Forms could not be loaded',errorMessage(error),'danger'));};
 if(submitted(form.status)||form.state!=='OPEN'){copy(target,form,back);return;}
 fillIn(target,ctx,form,back);
}

function fillIn(target:HTMLElement,ctx:WorkspaceContext,form:any,back:()=>void){
 const fields:Field[]=form.fields;const steps=stepsOf(fields,form.title);const answers:Answers={...form.answers};
 const files=new Map<string,{filename:string;preview?:string}>(form.files.map((f:any)=>[f.id,{filename:f.filename}]));
 const errors:Record<string,string>={};let step=0;let timer:ReturnType<typeof setTimeout>|undefined;let saving=false,dirty=false;let savedAt=form.savedAt;
 const total=steps.length+1;
 const shell=document.createElement('section');shell.className='fm-shell';target.replaceChildren(shell);
 const saveText=()=>savedAt?`Saved ${lagos(savedAt)}`:'Your answers save as you go.';
 const setSave=(text:string)=>{const s=shell.querySelector<HTMLElement>('.fm-save');if(s)s.textContent=text;};
 const save=async()=>{if(saving){dirty=true;return;}saving=true;dirty=false;setSave('Saving…');
  try{const r=await api('/portal/forms/'+encodeURIComponent(form.id)+'/draft','PUT',{answers});savedAt=r.savedAt;if(shell.isConnected)setSave(saveText());}
  catch(error){if(shell.isConnected)setSave(error instanceof ApiError&&error.status===0?'Not saved: check your connection. Trying again…':'Not saved: '+errorMessage(error));if(!(error instanceof ApiError)||error.status===0)dirty=true;}
  finally{saving=false;if(dirty&&shell.isConnected){clearTimeout(timer);timer=setTimeout(save,5000);}}};
 const changed=()=>{clearTimeout(timer);setSave('Unsaved changes…');timer=setTimeout(save,1000);};
 const control=(f:Field)=>{const v=answers[f.id];const err=errors[f.id];const describe=[f.help?`help-${f.id}`:'',`err-${f.id}`].filter(Boolean).join(' ');
  const common=`id="f-${esc(f.id)}" name="${esc(f.id)}" aria-describedby="${describe}" ${f.required?'aria-required="true"':''} ${err?'aria-invalid="true"':''}`;
  const head=`<span class="fm-label">${esc(f.label)}${f.required?'':' <span class="fm-optional">(optional)</span>'}</span>${f.help?`<span class="pw-helper" id="help-${esc(f.id)}">${esc(f.help)}</span>`:''}`;
  const error=`<p class="fm-error" id="err-${esc(f.id)}" ${err?'':'hidden'}>${esc(err||'')}</p>`;
  const text=typeof v==='string'?v:'';
  if(f.type==='single'||f.type==='multiple'){const list=Array.isArray(v)?v:[];return `<fieldset class="fm-field fm-choices" data-field="${esc(f.id)}" aria-describedby="${describe}" ${err?'aria-invalid="true"':''}><legend>${head}</legend>${f.options.map((o,k)=>`<label class="fm-choice"><input type="${f.type==='single'?'radio':'checkbox'}" name="${esc(f.id)}" value="${esc(o)}" id="f-${esc(f.id)}-${k}" ${(f.type==='single'?text===o:list.includes(o))?'checked':''}> <span>${esc(o)}</span></label>`).join('')}${error}</fieldset>`;}
  if(f.type==='photo'||f.type==='file'){const file=text?files.get(text):undefined;return `<div class="fm-field fm-upload" data-field="${esc(f.id)}"><label for="f-${esc(f.id)}">${head}</label>${file?`<div class="fm-file">${file.preview?`<img src="${esc(file.preview)}" alt="Your photo" class="fm-photo">`:''}<span>${icon(f.type==='photo'?'image':'file-text')}${esc(file.filename)}</span></div>`:''}<input type="file" ${common} accept="${f.type==='photo'?'image/jpeg,image/png':'application/pdf,image/jpeg,image/png'}"><p class="pw-helper fm-upload-status" role="status" aria-live="polite">${f.type==='photo'?'JPG or PNG, up to 3 MB.':'PDF, JPG or PNG, up to 10 MB.'}</p>${error}</div>`;}
  const input=f.type==='long'?`<textarea ${common} rows="4">${esc(text)}</textarea>`:f.type==='dropdown'?`<select ${common}><option value="">Choose…</option>${f.options.map(o=>`<option ${text===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input ${common} type="${f.type==='email'?'email':f.type==='phone'?'tel':f.type==='date'?'date':'text'}" ${f.type==='number'?'inputmode="decimal"':''} ${f.type==='email'?'autocomplete="email"':f.type==='phone'?'autocomplete="tel"':''} value="${esc(text)}">`;
  return `<div class="fm-field" data-field="${esc(f.id)}"><label for="f-${esc(f.id)}">${head}</label>${input}${error}</div>`;};
 const showError=(f:Field)=>{const box=shell.querySelector<HTMLElement>(`[data-field="${CSS.escape(f.id)}"]`);if(!box)return;const p=box.querySelector<HTMLElement>('.fm-error')!;const msg=errors[f.id]||'';p.textContent=msg;p.hidden=!msg;box.querySelectorAll('input,select,textarea').forEach(el=>msg?el.setAttribute('aria-invalid','true'):el.removeAttribute('aria-invalid'));if(box.tagName==='FIELDSET')msg?box.setAttribute('aria-invalid','true'):box.removeAttribute('aria-invalid');};
 const check=(f:Field)=>{const e=fieldError(f,answers[f.id]);if(e)errors[f.id]=e;else delete errors[f.id];showError(f);return !e;};
 const header=(title:string)=>`<header class="fm-head"><button type="button" class="pw-button fm-back" data-back>${icon('arrow-left')}All forms</button><p class="pw-overline">${esc(form.title)}</p><h2>${esc(title)}</h2>
  <div class="fm-progress-row"><span class="fm-step-count">Step ${step+1} of ${total}</span><span class="fm-save" aria-live="polite">${esc(saveText())}</span></div>
  <div class="fm-progress" role="progressbar" aria-label="Form progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${step+1}" aria-valuetext="Step ${step+1} of ${total}"><span style="width:${Math.round((step+1)/total*100)}%"></span></div>
  ${form.status==='NEEDS_CHANGES'&&form.staffNote?alert('The school asked for changes',form.staffNote,'warning'):''}</header>`;
 const render=()=>{
  if(step===steps.length){review();return;}
  const s=steps[step];
  shell.innerHTML=`${header(s.name)}<form class="fm-form" novalidate>${step===0&&form.description?`<p class="fm-intro">${esc(form.description)}</p>`:''}${s.fields.map(control).join('')}
   <div class="fm-actions">${step>0?'<button type="button" class="pw-button" data-prev>Back</button>':'<span></span>'}<button type="submit" class="pw-button primary">${step===steps.length-1?'Review your answers':'Next'}</button></div></form>`;
  bindStep(s.fields);
 };
 const bindStep=(list:Field[])=>{
  shell.querySelector<HTMLButtonElement>('[data-back]')!.onclick=async()=>{clearTimeout(timer);if(dirty||shell.querySelector('.fm-save')?.textContent==='Unsaved changes…')await save();back();};
  shell.querySelector<HTMLButtonElement>('[data-prev]')?.addEventListener('click',()=>{step--;render();shell.querySelector<HTMLElement>('h2')?.focus();});
  for(const f of list){const box=shell.querySelector<HTMLElement>(`[data-field="${CSS.escape(f.id)}"]`)!;
   if(f.type==='photo'||f.type==='file'){const input=box.querySelector<HTMLInputElement>('input[type=file]')!;const status=box.querySelector<HTMLElement>('.fm-upload-status')!;input.onchange=()=>upload(f,input,status);continue;}
   if(f.type==='single'||f.type==='multiple'){box.addEventListener('change',()=>{const ticked=[...box.querySelectorAll<HTMLInputElement>('input:checked')].map(i=>i.value);if(f.type==='single'){if(ticked[0])answers[f.id]=ticked[0];else delete answers[f.id];}else answers[f.id]=ticked;if(errors[f.id])check(f);changed();});continue;}
   const el=box.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select')!;
   el.addEventListener('input',()=>{answers[f.id]=el.value;if(errors[f.id])check(f);changed();});el.addEventListener('change',()=>{answers[f.id]=el.value;changed();});el.addEventListener('blur',()=>{if(el.value.trim()||errors[f.id])check(f);});}
  shell.querySelector<HTMLFormElement>('form')!.onsubmit=event=>{event.preventDefault();const bad=list.filter(f=>!check(f));if(bad.length){focusField(bad[0]);return;}step++;render();shell.querySelector<HTMLElement>('h2')?.focus();};
 };
 const focusField=(f:Field)=>{const box=shell.querySelector<HTMLElement>(`[data-field="${CSS.escape(f.id)}"]`);(box?.querySelector<HTMLElement>('input,select,textarea')||box)?.focus();box?.scrollIntoView({block:'center'});};
 const upload=async(f:Field,input:HTMLInputElement,status:HTMLElement)=>{
  const chosen=input.files?.[0];if(!chosen)return;input.disabled=true;
  try{
   const photo=f.type==='photo';
   if(photo&&!['image/jpeg','image/png'].includes(chosen.type))throw Error('Choose a JPG or PNG photo.');
   if(!photo&&!['application/pdf','image/jpeg','image/png'].includes(chosen.type))throw Error('Choose a PDF, JPG or PNG file.');
   if(chosen.size>(photo?3:10)*1024*1024)throw Error(`This file is larger than ${photo?3:10} MB. Choose a smaller one.`);
   status.textContent=photo?'Preparing your photo…':'Uploading '+chosen.name+'…';
   const file=photo?await shrinkPhoto(chosen):chosen;if(photo)status.textContent='Uploading your photo…';
   let result=await service.upload(file,false,photo?'PASSPORT':'OTHER');
   const deadline=Date.now()+60000;while(result.status==='SCANNING'&&Date.now()<deadline&&shell.isConnected){await new Promise(r=>setTimeout(r,2000));result=await service.fileStatus(result.id);}
   if(!['PENDING','APPROVED'].includes(result.status))throw Error(result.status==='SCANNING'?'Your file is still being checked. Try again in a minute.':'This file was not accepted. Choose another one.');
   files.set(result.id,{filename:file.name,preview:photo?URL.createObjectURL(file):undefined});answers[f.id]=result.id;delete errors[f.id];
   if(!shell.isConnected)return;render();const again=shell.querySelector<HTMLElement>(`[data-field="${CSS.escape(f.id)}"] .fm-upload-status`);if(again)again.textContent=photo?'Photo uploaded.':'File uploaded.';await save();toast(photo?'Photo uploaded.':'File uploaded.');
  }catch(error){status.textContent=errorMessage(error);}finally{if(input.isConnected){input.disabled=false;input.value='';}}
 };
 const shown=(f:Field)=>{const v=answers[f.id];if(Array.isArray(v))return v.length?v.map(esc).join(', '):'';if(!v)return '';if(f.type==='photo'||f.type==='file'){const file=files.get(v);return file?`${file.preview?`<img src="${esc(file.preview)}" alt="Your photo" class="fm-photo small"> `:''}${esc(file.filename)}`:'Uploaded';}if(f.type==='date'){const d=new Date(v+'T12:00:00Z');return Number.isNaN(d.getTime())?esc(v):esc(d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}));}return esc(v).replace(/\n/g,'<br>');};
 const review=()=>{
  fields.forEach(f=>{const e=fieldError(f,answers[f.id]);if(e)errors[f.id]=e;else delete errors[f.id];});
  const missing=fields.filter(f=>errors[f.id]);
  shell.innerHTML=`${header('Check your answers')}<div class="fm-review">${missing.length?alert(`${missing.length} answer${missing.length===1?' needs':'s need'} attention`,'Use “Change” to fix them before you submit.','warning'):'<p class="fm-intro">Check everything is correct. You cannot change your answers after you submit, unless the school asks you to.</p>'}
   ${steps.map((s,i)=>`<section class="fm-review-step"><div class="fm-review-head"><h3>${esc(s.name)}</h3><button type="button" class="pw-button" data-go="${i}" aria-label="Change ${esc(s.name)}">Change</button></div><dl>${s.fields.map(f=>`<div class="${errors[f.id]?'is-missing':''}"><dt>${esc(f.label)}</dt><dd>${errors[f.id]?`<span class="fm-error">${esc(errors[f.id])}</span>`:shown(f)||'<span class="pw-helper">Not answered</span>'}</dd></div>`).join('')}</dl></section>`).join('')}
   <div class="fm-actions"><button type="button" class="pw-button" data-prev>Back</button><button type="button" class="pw-button gold" data-submit ${missing.length?'disabled':''}>Submit form</button></div><p class="fm-submit-status" role="status" aria-live="polite"></p></div>`;
  shell.querySelector<HTMLButtonElement>('[data-back]')!.onclick=back;
  shell.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>{step--;render();};
  shell.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b=>b.onclick=()=>{step=Number(b.dataset.go);render();const first=steps[step].fields.find(f=>errors[f.id]);if(first){showError(first);focusField(first);}else shell.querySelector<HTMLElement>('h2')?.focus();});
  shell.querySelector<HTMLButtonElement>('[data-submit]')!.onclick=async event=>{const button=event.currentTarget as HTMLButtonElement;const status=shell.querySelector<HTMLElement>('.fm-submit-status')!;button.disabled=true;clearTimeout(timer);status.textContent='Submitting…';
   try{const r=await api('/portal/forms/'+encodeURIComponent(form.id)+'/submit','POST',{answers});done(r);}
   catch(error){
    if(error instanceof ApiError&&Object.keys(error.fields).length){Object.assign(errors,error.fields);const at=steps.findIndex(s=>s.fields.some(f=>error.fields[f.id]));step=at<0?0:at;render();steps[step].fields.forEach(f=>{if(errors[f.id])showError(f);});const first=steps[step].fields.find(f=>errors[f.id]);if(first)focusField(first);toast('Some answers need attention.');return;}
    status.textContent=errorMessage(error);button.disabled=false;}
  };
 };
 const done=(r:any)=>{
  shell.innerHTML=`<div class="fm-done" tabindex="-1"><span class="fm-done-mark">${icon('check')}</span><p class="pw-overline">${esc(form.title)}</p><h2>Form submitted</h2><p>Thank you. The school will review your answers.</p>
   <div class="fm-reference"><span>Your reference number</span><strong>${esc(r.reference)}</strong><small>Keep it safe. Quote it if you contact the school.</small></div>
   <div class="fm-actions centered"><button type="button" class="pw-button primary" data-copy>View or print your copy</button><button type="button" class="pw-button" data-list>All forms</button></div></div>`;
  shell.querySelector<HTMLElement>('.fm-done')!.focus();
  shell.querySelector<HTMLButtonElement>('[data-list]')!.onclick=back;
  shell.querySelector<HTMLButtonElement>('[data-copy]')!.onclick=()=>copy(target,{...form,answers,status:r.status,reference:r.reference,submittedAt:r.submittedAt,files:[...files].map(([id,f])=>({id,filename:f.filename,preview:f.preview}))},back);
 };
 render();
}

/** A read-only copy the student can view or print. */
function copy(target:HTMLElement,form:any,back:()=>void){
 const fields:Field[]=form.fields;const files=new Map<string,any>(form.files.map((f:any)=>[f.id,f]));
 const value=(f:Field)=>{const v=form.answers[f.id];if(Array.isArray(v))return v.map(esc).join(', ');if(!v)return '<span class="pw-helper">Not answered</span>';if(f.type==='photo'||f.type==='file'){const file=files.get(v);return `${file?.preview?`<img src="${esc(file.preview)}" alt="Your photo" class="fm-photo small"> `:''}<button type="button" class="pw-button fm-noprint" data-download="${esc(v)}">${icon('download')}${esc(file?.filename||'Download')}</button><span class="fm-printonly">${esc(file?.filename||'Uploaded file')}</span>`;}if(f.type==='date'){const d=new Date(v+'T12:00:00Z');return Number.isNaN(d.getTime())?esc(v):esc(d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}));}return esc(v).replace(/\n/g,'<br>');};
 const open=form.state==='OPEN';const notSent=!submitted(form.status);
 target.innerHTML=`<section class="fm-shell"><div class="fm-noprint fm-copy-bar"><button type="button" class="pw-button fm-back" data-back>${icon('arrow-left')}All forms</button>${notSent?'':'<button type="button" class="pw-button primary" data-print>Print</button>'}</div>
  <article class="fm-copy"><p class="pw-overline">NewworldPathway · New World Emerald Private School</p><h2>${esc(form.title)}</h2>
  ${notSent?alert(open?'This form is not open':'This form has closed',open?'':'You did not submit it before it closed.','warning'):`<p class="fm-meta">${pill(form.status)}<span>Reference <strong>${esc(form.reference)}</strong></span>${form.submittedAt?`<span>Submitted ${esc(lagos(form.submittedAt,true))}</span>`:''}</p>`}
  ${stepsOf(fields,form.title).map(s=>`<section class="fm-review-step"><h3>${esc(s.name)}</h3><dl>${s.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${value(f)}</dd></div>`).join('')}</dl></section>`).join('')}</article></section>`;
 target.querySelector<HTMLButtonElement>('[data-back]')!.onclick=back;
 target.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click',()=>{document.documentElement.classList.add('printing-copy');addEventListener('afterprint',()=>document.documentElement.classList.remove('printing-copy'),{once:true});print();});
 target.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(b=>b.onclick=()=>service.download(b.dataset.download!,null).catch(error=>toast(errorMessage(error))));
}
