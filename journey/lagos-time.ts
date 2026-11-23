/** Dates and times for the portal, always in Nigeria time (Africa/Lagos, UTC+1 all year, no daylight saving). */
const parts=(iso:string|number|Date)=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
/** "Mon 23 Nov, 9:00 AM" */
export function lagos(iso:string|number|Date,withYear=false){const p=parts(iso);return `${p.weekday.slice(0,3)} ${p.day} ${p.month.slice(0,3)}${withYear?' '+p.year:''}, ${p.hour}:${p.minute} ${String(p.dayPeriod).toUpperCase()}`;}
/** "9:00 AM" */
export function lagosTime(iso:string|number|Date){const p=parts(iso);return `${p.hour}:${p.minute} ${String(p.dayPeriod).toUpperCase()}`;}
/** Calendar pieces for a date tile. */
export function lagosTile(iso:string|number|Date){const p=parts(iso);return {month:p.month.slice(0,3),day:p.day,weekday:p.weekday.slice(0,3)};}
const dayKey=(t:number)=>new Date(t+3600e3).toISOString().slice(0,10);
/** "Today, Thursday 19 November", "Tomorrow, …" or "Thursday 19 November". */
export function lagosDayHeading(iso:string|number|Date,now=Date.now()){const t=new Date(iso).getTime();const p=parts(t);const label=`${p.weekday} ${p.day} ${p.month}`;const diff=Math.round((Date.parse(dayKey(t))-Date.parse(dayKey(now)))/86400000);return diff===0?'Today, '+label:diff===1?'Tomorrow, '+label:diff===-1?'Yesterday, '+label:label;}
/** <input type="datetime-local"> values are read and written as Nigeria time, whatever the computer's time zone. */
export const toLagosInput=(iso:string)=>iso?new Date(Date.parse(iso)+3600e3).toISOString().slice(0,16):'';
export const fromLagosInput=(value:string)=>value?new Date(value+':00+01:00').toISOString():'';
