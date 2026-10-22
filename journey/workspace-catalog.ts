import {workspaceService as service,api,ApiError} from './workspace-api.js';

// Fee, residence and room scheduling metadata that the current API does not model yet.
// Values are stored behind the service layer in the existing CMS content endpoint
// (key `workspace.catalogMeta`) so the admin workspace, public pages and student
// portal all read one source of truth. Amounts, availability and chargeable prices
// always come from the server's own fee/room records — never from this file.
export interface HistoryEntry{at:string;note:string}
export interface FeeSchedule{feeId:string;programme:string;term:string;session:string;effectiveFrom:string;active:boolean;history:HistoryEntry[]}
export interface RoomFeeMeta{term:string;session:string;effectiveFrom:string;history:Array<HistoryEntry&{priceMinor?:string;depositMinor?:string}>}
export interface CatalogMeta{feeSchedules:FeeSchedule[];hostelLocations:Record<string,string>;roomFees:Record<string,RoomFeeMeta>}

const KEY='workspace.catalogMeta';
const empty=():CatalogMeta=>({feeSchedules:[],hostelLocations:{},roomFees:{}});
let cache:CatalogMeta|null=null;
let mode:'server'|'device'='device';

function normalize(value:any):CatalogMeta{
 const meta=empty();
 if(!value||typeof value!=='object')return meta;
 if(Array.isArray(value.feeSchedules))meta.feeSchedules=value.feeSchedules.filter((row:any)=>row&&row.feeId);
 if(value.hostelLocations&&typeof value.hostelLocations==='object'&&!Array.isArray(value.hostelLocations))meta.hostelLocations=value.hostelLocations;
 if(value.roomFees&&typeof value.roomFees==='object'&&!Array.isArray(value.roomFees))meta.roomFees=value.roomFees;
 return meta;
}
function device():CatalogMeta{
 try{const raw=localStorage.getItem(KEY);return normalize(raw?JSON.parse(raw):null);}catch{return empty();}
}
function writeDevice(meta:CatalogMeta){try{localStorage.setItem(KEY,JSON.stringify(meta));}catch{/* private mode */}}
export function metaMode(){return mode;}
export async function findContent(key:string):Promise<any|undefined>{
 for(let skip=0;skip<500;skip+=100){
  const rows=await api<any[]>('/public/content?skip='+skip+'&take=100');
  const found=rows.find(row=>row.key===key);
  if(found)return found.value;
  if(rows.length<100)return undefined;
 }
 return undefined;
}
export async function loadMeta(force=false):Promise<CatalogMeta>{
 if(cache&&!force)return cache;
 try{
  const value=await findContent(KEY);
  if(value!==undefined){cache=normalize(value);mode='server';return cache;}
  cache=device();mode='device';
 }catch{cache=device();mode='device';}
 return cache;
}
export async function saveMeta(meta:CatalogMeta):Promise<'server'|'device'>{
 const value=normalize(meta);
 try{
  try{await service.save('content',{value},{key:KEY});}
  catch(error){if(error instanceof ApiError&&error.status===404)await service.save('content',{key:KEY,value});else throw error;}
  cache=value;mode='server';
  try{localStorage.removeItem(KEY);}catch{/* ignore */}
  return 'server';
 }catch(error){
  if(error instanceof ApiError&&[401,403,409].includes(error.status)){
   cache=value;mode='device';writeDevice(value);return 'device';
  }
  throw error;
 }
}
function changed(before:any,after:any){return String(before??'')!==String(after??'')?`“${String(before||'not set')}” → “${String(after||'not set')}”`:'';}
function pushNote(entries:HistoryEntry[],label:string,before:any,after:any){const text=changed(before,after);if(text)entries.unshift({at:new Date().toISOString(),note:`${label} ${text}`});}

/** Fee class/programme, term, session, effective date and change history. */
export async function feeSchedule(feeId:string):Promise<FeeSchedule|undefined>{
 const meta=await loadMeta();
 return meta.feeSchedules.find(row=>row.feeId===feeId);
}
export async function allFeeSchedules():Promise<Record<string,FeeSchedule>>{
 const rows=await api<any[]>('/public/fee-schedules');return Object.fromEntries(rows.map(row=>[row.feeId,row]));
}
export async function saveFeeSchedule(feeId:string,patch:Partial<FeeSchedule>):Promise<'server'|'device'>{
 await api('/admin/learning/fee-schedules/'+feeId,'PUT',{programme:patch.programme||'',term:patch.term||'',session:patch.session||'',effectiveFrom:patch.effectiveFrom||'',active:patch.active!==false});return 'server';
}
/** Residence location — the hostel model has no location column yet. */
export async function hostelLocations():Promise<Record<string,string>>{
 const meta=await loadMeta();
 return meta.hostelLocations;
}
export async function saveHostelLocation(hostelId:string,location:string):Promise<'server'|'device'>{
 const meta=await loadMeta(true);
 meta.hostelLocations[hostelId]=String(location||'');
 return saveMeta(meta);
}
/** Per-room term/session/effective date and price history for the residence Fees tab. */
export async function roomFees():Promise<Record<string,RoomFeeMeta>>{
 const meta=await loadMeta();
 return meta.roomFees;
}
export async function saveRoomFee(roomId:string,patch:Partial<RoomFeeMeta>,priced?:{priceMinor?:string;depositMinor?:string}):Promise<'server'|'device'>{
 const meta=await loadMeta(true);
 const existing=meta.roomFees[roomId]||{term:'',session:'',effectiveFrom:'',history:[]};
 const history=existing.history||[];
 if(priced&&(String(priced.priceMinor||'')!==''||String(priced.depositMinor||'')!=='')){
  const changedPrice=existing.history[0]&&existing.history[0].priceMinor!==priced.priceMinor;
  if(!existing.history.length||changedPrice)history.unshift({at:new Date().toISOString(),note:'Room price recorded',priceMinor:priced.priceMinor,depositMinor:priced.depositMinor});
 }
 const record:RoomFeeMeta={term:String(patch.term||existing.term||''),session:String(patch.session||existing.session||''),effectiveFrom:String(patch.effectiveFrom||existing.effectiveFrom||''),history:history.slice(0,20)};
 meta.roomFees={...meta.roomFees,[roomId]:record};
 return saveMeta(meta);
}
export const termOptions=['First term','Second term','Third term','Full session'];
