import {api} from './live-api.js';
import {seed} from './seed.js';
import type {Collections,Collection} from './types.js';

let contentRequest:Promise<any[]>|undefined;
const content=()=>contentRequest||(contentRequest=api<any[]>('/public/content').catch(error=>{contentRequest=undefined;throw error;}));
const defaults=Object.fromEntries(seed().content.map(row=>[row.name,row.value]));
const text=(value:any):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join('\n'):value&&typeof value==='object'?Object.entries(value).map(([key,v])=>key+': '+text(v)).join('\n'):String(value??'');
async function all(resource:string){const rows:any[]=[];for(let skip=0;skip<10000;skip+=100){const batch=await api<any[]>(`/public/${resource}?take=100&skip=${skip}`);if(!Array.isArray(batch))throw Error('The school catalogue returned an unexpected response. Please try again.');rows.push(...batch);if(batch.length<100)return rows;}return rows;}
export const services={
 async getSite(){const rows=await content();return {...defaults,...Object.fromEntries(rows.filter(row=>typeof row.value==='string').map(row=>[row.key,row.value]))};},
 async list<K extends Collection>(key:K):Promise<Collections[K][]> {
  if(['testimonials','stats','faqs'].includes(key)){const rows=await content();const value=rows.find(row=>row.key===key)?.value;return (Array.isArray(value)?value:[]) as any;}
  if(key==='announcements')return []; // Live rich-text notices are rendered separately.
  if(key==='exams')return (await all('exams')).map(row=>({...row,category:row.body,fee:Number(row.feeMinor)/100,opens:row.opensAt?new Date(row.opensAt).toLocaleDateString('en-GB'): '',closes:row.closesAt?new Date(row.closesAt).toLocaleDateString('en-GB'):'',requirements:text(row.requirements),timetable:text(row.timetable),centre:row.centre||'Confirm with the school',visible:row.active})) as any;
  return all(key) as any;
 },
 async getUniversities(){const [universities,countries,courses]=await Promise.all([all('universities'),all('countries'),all('courses')]);return universities.map(row=>({...row,country:countries.find(country=>country.id===row.countryId)?.name||'Destination to be confirmed',city:row.city||'',courses:courses.filter(course=>course.universityId===row.id).map(course=>course.name),requirements:text(row.entryRequirements),tuition:Number(row.tuitionMinor)/100,deadline:row.deadline?new Date(row.deadline).toLocaleDateString('en-GB'):'Confirm with the university',partner:false,visible:row.active}));},
};
