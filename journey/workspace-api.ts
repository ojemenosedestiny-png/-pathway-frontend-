import {api,ApiError,type Identity} from './live-api.js';
export {api,ApiError};
export const workspaceService={
 session:()=>api<Identity>('/auth/session'),
 async list(resource:string,admin=true,skip=0,take=100):Promise<any[]>{return api(`/${admin?'admin':'portal'}/${resource}?skip=${skip}&take=${take}`);},
 publicList:(resource:string)=>api<any[]>('/public/'+resource+'?take=100'),
 save:(resource:string,data:any,row?:any)=>api('/admin/'+resource+(row?'/'+encodeURIComponent(['content','settings'].includes(resource)?row.key:row.userId||row.id):''),row?'PATCH':'POST',data),
 remove:(resource:string,row:any)=>api('/admin/'+resource+'/'+encodeURIComponent(['content','settings'].includes(resource)?row.key:row.userId||row.id),'DELETE'),
 action:(path:string,body:unknown={},method='POST')=>api(path,method,body),
 // UI-only demonstration catalog, never mixed with live records or used in bookings/payments.
 demoHostels:()=>['Emerald House','Sage Residence','The Courtyard'].map((name,index)=>({id:'demo-hostel-'+index,name,gender:['FEMALE','MALE','MIXED'][index],description:'A layout preview. Add your own residence details and photographs.',demo:true,active:false,rules:'',rooms:[]})),
 async upload(file:File,publicFile=false){
  const video=file.type.startsWith('video/');const allowed=publicFile?['image/jpeg','image/png','image/webp']:['image/jpeg','image/png','image/webp','application/pdf'];
  if(!allowed.includes(file.type)||!file.size||file.size>(video?50:10)*1024*1024)throw Error('Choose JPG, PNG, WebP or PDF up to 10 MB, PDFs must be uploaded as private documents.');
  const filename=file.name.normalize('NFKD').replace(/[^\w .()-]/g,'_').slice(-150)||'upload';
  const result=await api('/files/upload-url','POST',{filename,mime:file.type,size:file.size,type:publicFile?'MEDIA':'OTHER',public:publicFile});
  let response:Response;try{response=await fetch(result.uploadUrl,{method:'PUT',headers:result.headers,body:file});}catch{throw Error('The browser could not send the picture to Cloudflare. Check the bucket CORS policy and the frontend upload origin setting, then try again.');}if(!response.ok){const body=await response.text();const code=body.match(/<Code>([A-Za-z0-9_]+)<\/Code>/)?.[1];throw Error('Cloudflare rejected the upload (HTTP '+response.status+(code?', '+code:'')+'). '+(code==='SignatureDoesNotMatch'||code==='InvalidAccessKeyId'?'Check the backend R2 access key, secret and endpoint.':'Check the R2 token has object read/write access to this bucket.'));}
  const completed=await api('/files/'+result.id+'/complete','POST',{});if(completed.status==='QUARANTINED')throw Error('File validation failed. Choose a valid photograph or an unencrypted PDF.');return {id:result.id,filename:file.name,status:completed.status};
 },
 fileStatus:(id:string)=>api('/files/'+encodeURIComponent(id)+'/status'),
 /** Starts the download in this tab (the signed link sends the file as an attachment) and, when given a status element, shows the outcome with a manual fallback link. Pop-ups opened after a network request are blocked silently by browsers, so window.open is not used. */
 async download(id:string,status?:HTMLElement|null,filename=''){
  if(status){status.setAttribute('role','status');status.textContent='Preparing your secure download…';}
  try{const result=await api('/files/'+encodeURIComponent(id)+'/download-url');const url=new URL(result.url);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid download address.');
   const anchor=document.createElement('a');anchor.href=url.href;anchor.rel='noopener';if(filename)anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
   if(status){status.textContent='Download started. Check your browser downloads. If it did not start, ';const again=document.createElement('a');again.href=url.href;again.rel='noopener';again.textContent='download it here';status.append(again,' (this secure link works for '+(Number(result.expiresIn)||60)+' seconds).');}
   return url.href;}
  catch(error){if(status)status.textContent='The download could not start. '+errorMessage(error);throw error;}},
 async checkout(feeId:string,provider:string,target='feeId'){const result=await api('/payments/initialize','POST',{[target]:feeId,provider},true,{'Idempotency-Key':crypto.randomUUID()});if(result.statusToken)sessionStorage.setItem('pathway-payment-'+(result.payment?.reference||result.reference),result.statusToken);const url=result.checkoutUrl||result.authorizationUrl||result.url;if(!url)throw Error('Payment was initialized without a checkout link. Contact Finance with reference '+result.reference);const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Checkout requires a secure provider link.');location.assign(parsed.href);},
};
export function money(value:unknown,currency='NGN'){const raw=String(value??'0');if(!/^-?\d+$/.test(raw))return '—';const n=BigInt(raw);const absolute=n<0n?-n:n;const major=absolute/100n;const decimals=String(absolute%100n).padStart(2,'0');return `${currency} ${n<0n?'-':''}${major.toLocaleString('en-GB')}${decimals==='00'?'':'.'+decimals}`;}
/** Indicative open balance: active published fees minus verified payments, per currency.
 *  The school's server remains the authority on what a student owes. */
export function openBalance(fees:any[],payments:any[],currency='NGN'){
 const charged=(fees||[]).filter(fee=>fee.active!==false&&fee.currency===currency).reduce((sum,fee)=>sum+BigInt(fee.amountMinor||'0'),0n);
 const paid=(payments||[]).filter(payment=>payment.status==='SUCCESS'&&payment.currency===currency).reduce((sum,payment)=>sum+BigInt(payment.amountMinor||'0'),0n);
 return {charged,paid,due:charged>paid?charged-paid:0n};
}
export function minor(value:string){if(!/^\d+(\.\d{1,2})?$/.test(value.trim()))throw Error('Enter an amount with up to two decimal places.');const [whole,part='']=value.trim().split('.');return (BigInt(whole)*100n+BigInt(part.padEnd(2,'0'))).toString();}
export function major(value:unknown){const raw=String(value??'0');return /^\d+$/.test(raw)?`${BigInt(raw)/100n}.${String(BigInt(raw)%100n).padStart(2,'0')}`:'0.00';}
export function errorMessage(error:unknown){if(error instanceof ApiError){if(error.status===409&&['UNIQUE','CONFLICT','P2002'].includes(error.code))return 'An existing record or booking uses these details. Find it and update it, or enter different details.';if(error.status===403&&error.code==='MFA_REQUIRED')return 'For this sensitive action, sign out and sign in again to verify your authenticator.';}return error instanceof Error?error.message:'This action could not be completed. Try again or contact the school.';}
