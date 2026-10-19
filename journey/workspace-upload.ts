import {workspaceService as service,errorMessage} from './workspace-api.js';
import {esc,dialog,toast} from './workspace-components.js';

// Uploaded bytes go directly to permanent storage using a short-lived signed URL.
// Only the server's scanned, approved URL can be attached to published content.
export function imageUploadControl(parent:HTMLElement,onReady:(url:string,filename:string)=>void){
 const box=document.createElement('div');box.className='pw-stack';
 box.innerHTML='<label class="pw-upload"><strong>Upload picture from your device</strong><span class="pw-helper">JPG, PNG or WebP · up to 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" class="pw-button" data-library>Choose an uploaded picture</button><p class="pw-helper" role="status" aria-live="polite"></p>';
 parent.append(box);const input=box.querySelector<HTMLInputElement>('input')!;const status=box.querySelector<HTMLElement>('[role=status]')!;
 const active=()=>box.isConnected;
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;input.disabled=true;const submits=Array.from(parent.closest('form')?.querySelectorAll<HTMLButtonElement>('button[type=submit]')||[]);const disabled=submits.map(button=>button.disabled);submits.forEach(button=>button.disabled=true);
  try{if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP picture.');status.textContent='Uploading '+file.name+'…';const uploaded=await service.upload(file,true);status.textContent='Uploaded. Waiting for the security scan…';
   const deadline=Date.now()+90000;while(active()&&Date.now()<deadline){const result=await service.fileStatus(uploaded.id);if(!active())return;if(result.status==='APPROVED'&&result.url){onReady(result.url,file.name);status.textContent='Picture ready. Save your changes to publish it.';toast('Picture uploaded and checked.');return;}if(['QUARANTINED','REJECTED','DELETION_REQUESTED'].includes(result.status))throw Error('This file was rejected. Please choose another picture.');await new Promise(resolve=>setTimeout(resolve,2000));}
   if(active())status.textContent='Upload saved. Scanning is still pending. Use “Choose an uploaded picture” once it is approved.';
  }catch(error){if(active())status.textContent=errorMessage(error);}finally{input.disabled=false;input.value='';submits.forEach((button,index)=>button.disabled=disabled[index]);}
 };
 box.querySelector<HTMLButtonElement>('[data-library]')!.onclick=async()=>{status.textContent='Loading your uploaded pictures…';try{const media=(await service.list('media')).filter(row=>row.status==='APPROVED'&&row.mime?.startsWith('image/'));if(!active())return;status.textContent='';const picker=dialog('Choose an uploaded picture','<div class="pw-stack">'+(media.length?media.map((row,index)=>'<button type="button" class="pw-button" data-pick="'+index+'">'+esc(row.filename)+'</button>').join(''):'<p>No approved pictures yet. Upload a picture and wait for its security scan.</p>')+'</div>');picker.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const row=media[Number(button.dataset.pick)];const result=await service.fileStatus(row.id);if(!result.url)throw Error('This picture is not ready to publish.');if(active())onReady(result.url,row.filename);picker.close();}catch(error){status.textContent=errorMessage(error);picker.close();}});}catch(error){status.textContent=errorMessage(error);}};
 return box;
}
