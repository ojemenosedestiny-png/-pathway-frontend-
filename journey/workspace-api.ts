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
  const video=file.type.startsWith('video/');const allowed=['image/jpeg','image/png','image/webp','application/pdf',...(publicFile?['video/mp4','video/webm']:[])];
  if(!allowed.includes(file.type)||!file.size||file.size>(video?50:10)*1024*1024)throw Error('Choose JPG, PNG, WebP or PDF up to 10 MB, or a school MP4/WebM video up to 50 MB.');
  const filename=file.name.normalize('NFKD').replace(/[^\w .()-]/g,'_').slice(-150)||'upload';
  const result=await api('/files/upload-url','POST',{filename,mime:file.type,size:file.size,type:publicFile?'MEDIA':'OTHER',public:publicFile});
  const response=await fetch(result.uploadUrl,{method:'PUT',headers:result.headers,body:file});if(!response.ok)throw Error('The file could not be uploaded. Check storage CORS settings and try again.');
  await api('/files/'+result.id+'/complete','POST',{});return {id:result.id,filename:file.name,status:'SCANNING'};
 },
 fileStatus:(id:string)=>api('/files/'+encodeURIComponent(id)+'/status'),
 async download(id:string){const result=await api('/files/'+encodeURIComponent(id)+'/download-url');const url=new URL(result.url);if(!['http:','https:'].includes(url.protocol))throw Error('Invalid download address.');window.open(url.href,'_blank','noopener');},
 async checkout(feeId:string,provider:string,target='feeId'){const result=await api('/payments/initialize','POST',{[target]:feeId,provider},true,{'Idempotency-Key':crypto.randomUUID()});if(result.statusToken)sessionStorage.setItem('pathway-payment-'+(result.payment?.reference||result.reference),result.statusToken);const url=result.checkoutUrl||result.authorizationUrl||result.url;if(!url)throw Error('Payment was initialized without a checkout link. Contact Finance with reference '+result.reference);const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Checkout requires a secure provider link.');location.assign(parsed.href);},
};
export function money(value:unknown,currency='NGN'){const raw=String(value??'0');if(!/^-?\d+$/.test(raw))return '—';const n=BigInt(raw);const absolute=n<0n?-n:n;const major=absolute/100n;const decimals=String(absolute%100n).padStart(2,'0');return `${currency} ${n<0n?'-':''}${major.toLocaleString()}.${decimals}`;}
/** Indicative open balance: active published fees minus verified payments, per currency.
 *  The school's server remains the authority on what a student owes. */
export function openBalance(fees:any[],payments:any[],currency='NGN'){
 const charged=(fees||[]).filter(fee=>fee.active!==false&&fee.currency===currency).reduce((sum,fee)=>sum+BigInt(fee.amountMinor||'0'),0n);
 const paid=(payments||[]).filter(payment=>payment.status==='SUCCESS'&&payment.currency===currency).reduce((sum,payment)=>sum+BigInt(payment.amountMinor||'0'),0n);
 return {charged,paid,due:charged>paid?charged-paid:0n};
}
export function minor(value:string){if(!/^\d+(\.\d{1,2})?$/.test(value.trim()))throw Error('Enter an amount with up to two decimal places.');const [whole,part='']=value.trim().split('.');return (BigInt(whole)*100n+BigInt(part.padEnd(2,'0'))).toString();}
export function major(value:unknown){const raw=String(value??'0');return /^\d+$/.test(raw)?`${BigInt(raw)/100n}.${String(BigInt(raw)%100n).padStart(2,'0')}`:'0.00';}
export function errorMessage(error:unknown){if(error instanceof ApiError){if(error.status===409&&['UNIQUE','CONFLICT','P2002'].includes(error.code))return 'A record with these details already exists. Search the list and open the existing profile instead.';if(error.status===403&&error.code==='MFA_REQUIRED')return 'For this sensitive action, sign out and sign in again to verify your authenticator.';}return error instanceof Error?error.message:'Something went wrong. Please try again.';}
