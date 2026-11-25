import {api,errorMessage,workspaceService as service} from './workspace-api.js';
import {esc,field,form,formSubmit,toast,alert} from './workspace-components.js';
import {shrinkPhoto} from './forms-student.js';
import type {WorkspaceContext} from './workspace-special.js';

/** Student profile: photo, name, Student ID, programme, personal details and password. */
export function profilePage(target:HTMLElement,profile:any,ctx:WorkspaceContext){
 const name=[profile.firstName,profile.lastName].filter(Boolean).join(' ')||'Student';
 const initials=name.split(/\s+/).map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
 const email=String(profile.user?.email||'');const realEmail=email&&!email.endsWith('@students.invalid');
 target.innerHTML=`<div class="profile-layout">
  <section class="pw-card profile-id"><div class="profile-photo"><img alt="Your photo" hidden><span class="profile-initials" aria-hidden="true">${esc(initials)}</span></div>
   <div class="profile-id-body"><p class="pw-overline">Student ID ${esc(profile.studentId)}</p><h2>${esc(name)}</h2>
   <dl class="profile-facts"><div><dt>Programme</dt><dd>${esc(profile.programme||'Not set yet')}</dd></div><div><dt>Cohort</dt><dd>${esc(profile.cohort||'Not set yet')}</dd></div><div><dt>Email</dt><dd>${realEmail?esc(email):'No email on file'}</dd></div></dl>
   <label class="pw-button profile-photo-button">Change photo<input type="file" accept="image/jpeg,image/png" class="pw-sr-only" id="profile-photo-input"></label><p class="pw-helper" id="profile-photo-status" role="status" aria-live="polite">JPG or PNG, up to 3 MB.</p>
   <p class="pw-helper">To change your programme, cohort or email, message admissions.</p></div></section>
  <section class="pw-card"><div class="pw-card-head"><div><p class="pw-overline">Security</p><h2>Change your password</h2></div></div><div id="profile-password"></div></section>
  <section class="pw-card"><div class="pw-card-head"><div><p class="pw-overline">Your details</p><h2>Personal details</h2></div></div><div id="profile-details"></div></section></div>`;
 const img=target.querySelector<HTMLImageElement>('.profile-photo img')!;const initialsEl=target.querySelector<HTMLElement>('.profile-initials')!;
 const showPhoto=(src:string)=>{img.onload=()=>{img.hidden=false;initialsEl.hidden=true;};img.onerror=()=>{img.hidden=true;initialsEl.hidden=false;};img.src=src;};
 showPhoto('/backend-api/portal/profile/photo?v='+Date.now());
 const input=target.querySelector<HTMLInputElement>('#profile-photo-input')!;const status=target.querySelector<HTMLElement>('#profile-photo-status')!;
 input.onchange=async()=>{const chosen=input.files?.[0];if(!chosen)return;input.disabled=true;
  try{if(!['image/jpeg','image/png'].includes(chosen.type))throw Error('Choose a JPG or PNG photo.');if(chosen.size>3*1024*1024)throw Error('This photo is larger than 3 MB. Choose a smaller one.');
   status.textContent='Preparing your photo…';const file=await shrinkPhoto(chosen);status.textContent='Uploading your photo…';
   const uploaded=await service.upload(file,false,'PASSPORT');if(!['PENDING','APPROVED'].includes(uploaded.status))throw Error('This photo was not accepted. Choose another one.');
   await api('/portal/profile/photo','PUT',{documentId:uploaded.id});showPhoto(URL.createObjectURL(file));status.textContent='Photo updated.';toast('Photo updated.');}
  catch(error){status.textContent=errorMessage(error);}finally{input.disabled=false;input.value='';}};
 const pw=target.querySelector<HTMLElement>('#profile-password')!;
 pw.innerHTML=alert('Before you change it','Use at least 12 characters. Other devices signed in to your account will be signed out; this one stays signed in.','info')+form(field('currentPassword','Current password','','password')+field('newPassword','New password','','password')+field('confirmPassword','Type the new password again','','password'),'Change password');
 const pwForm=pw.querySelector<HTMLFormElement>('form')!;pwForm.querySelector('[data-cancel]')?.remove();
 pwForm.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(i=>{i.minLength=i.name==='currentPassword'?1:12;i.maxLength=128;i.autocomplete=i.name==='currentPassword'?'current-password':'new-password';});
 formSubmit(pwForm,async data=>{if(data.newPassword!==data.confirmPassword)throw Error('The new passwords do not match.');await api('/portal/password','POST',{currentPassword:data.currentPassword,newPassword:data.newPassword});pwForm.reset();toast('Password changed.');});
 const details=target.querySelector<HTMLElement>('#profile-details')!;
 details.innerHTML=form(`${field('firstName','First name',profile.firstName)}${field('lastName','Last name',profile.lastName)}${field('nationality','Nationality',profile.nationality||'','text',undefined,false)}${field('countryOfResidence','Country of residence',profile.countryOfResidence||'','text',undefined,false)}`,'Save details');
 const dForm=details.querySelector<HTMLFormElement>('form')!;dForm.querySelector('[data-cancel]')?.remove();
 formSubmit(dForm,async data=>{await api('/portal/profile','PATCH',data);toast('Details saved.');});
 void ctx;
}
