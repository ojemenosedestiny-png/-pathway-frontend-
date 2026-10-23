import {api} from './workspace-api.js';
import {esc,field,form,formSubmit,alert,badge,toast} from './workspace-components.js';
import type {WorkspaceContext} from './workspace-special.js';

const card=(title:string,body:string,overline='')=>`<section class="pw-card account-card"><div class="pw-card-head"><div>${overline?`<p class="pw-overline">${esc(overline)}</p>`:''}<h2>${esc(title)}</h2></div></div>${body}</section>`;

/** Any signed-in staff member can see and update their own name, phone and password. */
export async function adminAccount(target:HTMLElement,ctx:WorkspaceContext){
 const me=await api('/admin/account');if(!ctx.current())return;
 const role=String(me.role||'STAFF').replaceAll('_',' ');
 target.innerHTML=`<div class="account-layout">
 ${card(me.name,`<dl class="account-facts"><div><dt>Email (sign-in)</dt><dd>${esc(me.email)}</dd></div><div><dt>Phone</dt><dd>${esc(me.phone||'Not set')}</dd></div><div><dt>Role</dt><dd>${badge(role)}</dd></div><div><dt>Member since</dt><dd>${esc(new Date(me.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))}</dd></div><div><dt>Two-factor sign-in</dt><dd>${me.twoFactorEnabled?badge('ACTIVE'):badge('NOT SET UP')}</dd></div><div><dt>Recovery codes left</dt><dd>${Number(me.recoveryCodesRemaining)||0}</dd></div><div><dt>Signed-in devices</dt><dd>${Number(me.activeSessions)||0}</dd></div></dl><p class="pw-helper">Your sign-in email and role are managed by the school owner under Staff accounts.</p>`,'YOUR ACCOUNT')}
 ${card('Update your details',`<div id="account-details"></div>`,'PROFILE')}
 ${card('Change your password',`<div id="account-password"></div>`,'SECURITY')}
 </div>`;
 const details=target.querySelector<HTMLElement>('#account-details')!;
 details.innerHTML=form(field('name','Full name',me.name)+field('phone','Phone number',me.phone||'','tel'),'Save details');
 const detailsForm=details.querySelector<HTMLFormElement>('form')!;detailsForm.querySelector('[data-cancel]')?.remove();
 formSubmit(detailsForm,async data=>{await api('/admin/account','PATCH',{name:data.name,phone:data.phone});toast('Your details were updated.');location.reload();});
 const password=target.querySelector<HTMLElement>('#account-password')!;
 password.innerHTML=alert('Before you change it','Use at least 12 characters. Every other device signed in to your account will be signed out; this one stays signed in.','info')+form(field('currentPassword','Current password','','password')+field('newPassword','New password','','password')+field('confirmPassword','Confirm new password','','password'),'Change password');
 const passwordForm=password.querySelector<HTMLFormElement>('form')!;passwordForm.querySelector('[data-cancel]')?.remove();
 passwordForm.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input=>{input.autocomplete=input.name==='currentPassword'?'current-password':'new-password';if(input.name!=='currentPassword')input.minLength=12;});
 formSubmit(passwordForm,async data=>{
  if(data.newPassword!==data.confirmPassword)throw Error('The new passwords do not match.');
  const result=await api('/admin/account/password','POST',{currentPassword:data.currentPassword,newPassword:data.newPassword});
  passwordForm.reset();toast(result.otherSessionsEnded?`Password changed. ${result.otherSessionsEnded} other device${result.otherSessionsEnded===1?' was':'s were'} signed out.`:'Password changed.');await ctx.refresh();
 });
}
