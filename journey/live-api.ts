export class ApiError extends Error {constructor(message:string,public status:number,public code=''){super(message);}}
let csrf='';let csrfFlight:Promise<string>|undefined;let refreshFlight:Promise<unknown>|undefined;
async function csrfToken(){
 if(csrf)return csrf;
 if(!csrfFlight)csrfFlight=fetch('/backend-api/auth/csrf',{credentials:'same-origin',cache:'no-store'}).then(async response=>{if(!response.ok)throw new ApiError('Unable to start a secure session. Please try again.',response.status);csrf=(await response.json()).csrfToken;return csrf;}).finally(()=>csrfFlight=undefined);
 return csrfFlight;
}
export async function api<T=any>(path:string,method='GET',body?:unknown,retry=true,extraHeaders:Record<string,string>={},recoverGateway=true):Promise<T>{
 const headers:Record<string,string>={Accept:'application/json',...extraHeaders};
 // A Blob body (for example an uploaded PDF) is sent as-is with its own type; everything else is JSON.
 const raw=body instanceof Blob;
 if(method!=='GET'){headers['X-CSRF-Token']=await csrfToken();headers['Content-Type']=raw?(body.type||'application/octet-stream'):'application/json';}
 let response:Response;
 try{response=await fetch('/backend-api'+path,{method,credentials:'same-origin',cache:'no-store',headers,body:body===undefined?undefined:raw?body:JSON.stringify(body)});}catch{throw new ApiError('Unable to reach the school service. Check your connection and try again.',0);}
 if(method==='GET'&&recoverGateway&&[502,503,504].includes(response.status)){
  await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,1500));return api(path,method,body,retry,extraHeaders,false);
 }
 const data=response.status===204?null:await response.json().catch(()=>null);
 if(!response.ok){
  if(response.status===401&&retry&&!path.startsWith('/auth/')&&['AUTH_REQUIRED','SESSION_EXPIRED'].includes(data?.error?.code)){
   if(!refreshFlight)refreshFlight=api('/auth/refresh','POST',{},false).finally(()=>refreshFlight=undefined);
   await refreshFlight;return api(path,method,body,false,extraHeaders);
  }
  if(response.status===401&&retry&&path==='/auth/session'){
   if(!refreshFlight)refreshFlight=api('/auth/refresh','POST',{},false).finally(()=>refreshFlight=undefined);
   await refreshFlight;return api(path,method,body,false,extraHeaders);
  }
  if(data?.error?.code==='CSRF')csrf='';
  throw new ApiError(data?.error?.message||'The school service could not complete your request. Try again shortly. If it continues, contact the school.',response.status,data?.error?.code);
 }
 return data;
}
export interface Identity {id:string;role:'ADMIN'|'STUDENT'|'APPLICANT';studentId?:string;adminRole?:string;permissions:{read:string[];write:string[]};}
export function can(identity:Identity,module:string,write=false){return identity.adminRole==='SUPER_ADMIN'||identity.permissions[write?'write':'read'].includes('*')||identity.permissions[write?'write':'read'].includes(module);}
