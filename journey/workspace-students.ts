import {api,errorMessage} from './workspace-api.js';
import {esc,field,form,formSubmit,button,alert,dialog,toast,icon} from './workspace-components.js';

/** Staff tools for student accounts: add one, import a CSV with a preview, and hand out temporary passwords. */
const columns=['firstName','lastName','email','phone','programme','cohort'] as const;
const headings:Record<string,string>={firstName:'First name',lastName:'Last name',email:'Email',phone:'Phone',programme:'Programme',cohort:'Cohort'};
export const isPlaceholderEmail=(email:string)=>/@students\.invalid$/i.test(email||'');

/** Minimal RFC 4180 CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
 const source=text.replace(/^﻿/,'');
 for(let i=0;i<source.length;i++){const c=source[i];
  if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;continue;}
  if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows.filter(r=>r.some(v=>v.trim()));
}
/** Maps a header row to our columns, accepting common spellings such as "First Name" or "Surname". */
export function rowsFromCsv(text:string){
 const [head,...body]=parseCsv(text);if(!head)throw Error('The file is empty.');
 const normal=(h:string)=>h.toLowerCase().replace(/[^a-z]/g,'');
 const alias:Record<string,string>={firstname:'firstName',givenname:'firstName',lastname:'lastName',surname:'lastName',familyname:'lastName',email:'email',emailaddress:'email',phone:'phone',phonenumber:'phone',programme:'programme',program:'programme',course:'programme',cohort:'cohort',class:'cohort',group:'cohort'};
 const map=head.map(h=>alias[normal(h)]||'');
 if(!map.includes('firstName')||!map.includes('lastName'))throw Error('The first row must be the column headings, including "First name" and "Last name". Download the template to see the layout.');
 return body.map(cells=>Object.fromEntries(map.map((key,i)=>[key,(cells[i]||'').trim()]).filter(([key])=>key)));
}
const csvCell=(value:string)=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
function saveCsv(name:string,lines:string[][]){const url=URL.createObjectURL(new Blob(['﻿'+lines.map(l=>l.map(csvCell).join(',')).join('\r\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

/** Shows new temporary passwords once, with a printable list and a CSV download. */
export function showPasswords(title:string,people:{studentId:string;name:string;temporaryPassword:string}[]){
 const element=dialog(title,`<div class="pw-stack">${alert('Write these down now','Each student signs in with their Student ID and this password, then chooses their own. The passwords are not shown again.','warning')}<div class="pw-table-scroll"><table class="pw-table password-sheet"><thead><tr><th scope="col">Student ID</th><th scope="col">Name</th><th scope="col">Temporary password</th></tr></thead><tbody>${people.map(p=>`<tr><td>${esc(p.studentId)}</td><td>${esc(p.name)}</td><td><code class="temp-password">${esc(p.temporaryPassword)}</code></td></tr>`).join('')}</tbody></table></div><div class="pw-row">${button('Download as CSV','passwords-csv','primary','download')}${button('Print','passwords-print','','file-text')}</div></div>`,true);element.classList.add('wide-drawer');
 element.querySelector<HTMLButtonElement>('#passwords-csv')!.onclick=()=>saveCsv('student-passwords.csv',[['Student ID','Name','Temporary password'],...people.map(p=>[p.studentId,p.name,p.temporaryPassword])]);
 element.querySelector<HTMLButtonElement>('#passwords-print')!.onclick=()=>{document.body.classList.add('passwords-printing');window.addEventListener('afterprint',()=>document.body.classList.remove('passwords-printing'),{once:true});window.print();};
 return element;
}

export function addStudentDialog(onDone:()=>void){
 const element=dialog('Add a student',form(columns.map(key=>field(key,headings[key]+(['firstName','lastName'].includes(key)?'':' (optional)'),'',key==='email'?'email':key==='phone'?'tel':'text',undefined,['firstName','lastName'].includes(key))).join('')+'<p class="pw-helper full">The student gets a Student ID and a temporary password to change at first sign-in. Email is optional.</p>','Add student'),true);
 element.querySelector<HTMLButtonElement>('[data-cancel]')!.onclick=()=>element.close();
 formSubmit(element.querySelector('form')!,async data=>{const row=Object.fromEntries(columns.map(key=>[key,String(data[key]||'').trim()]));
  const check=await api('/admin/student-accounts/preview','POST',{rows:[row]});const problems:string[]=check.rows[0]?.errors||[];if(problems.length)throw Error(problems.join(' '));
  const result=await api('/admin/student-accounts','POST',{rows:[row]});element.close();showPasswords('Student added',result.created);onDone();});
}

export function importStudentsDialog(onDone:()=>void){
 const element=dialog('Import students from a CSV file',`<div class="pw-stack"><p class="pw-helper">Use one row per student. Columns: First name, Last name, Email, Phone, Programme, Cohort. Only the names are required.</p><div class="pw-row">${button('Download the template','csv-template','','download')}</div><label class="pw-upload">${icon('upload')}<strong>Choose a CSV file</strong><span class="pw-helper">Saved from Excel or Google Sheets as “CSV (comma separated)”</span><input type="file" id="csv-file" accept=".csv,text/csv"></label><div id="csv-preview" aria-live="polite"></div></div>`,true);element.classList.add('wide-drawer');
 element.querySelector<HTMLButtonElement>('#csv-template')!.onclick=()=>saveCsv('students-template.csv',[columns.map(k=>headings[k]),['Ada','Okafor','ada.okafor@example.com','08031234567','WAEC','SS3 2026']]);
 const preview=element.querySelector<HTMLElement>('#csv-preview')!;
 element.querySelector<HTMLInputElement>('#csv-file')!.onchange=async event=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;preview.innerHTML='<div class="pw-loading" role="status"><span class="pw-sr-only">Checking the file…</span><div class="pw-skeleton short"></div></div>';
  try{if(file.size>2*1024*1024)throw Error('The file is larger than 2 MB. Split it into smaller files.');const rows=rowsFromCsv(await file.text());if(!rows.length)throw Error('The file has headings but no students.');
   const checked=await api('/admin/student-accounts/preview','POST',{rows});const bad=checked.rows.filter((r:any)=>r.errors.length);
   preview.innerHTML=`${bad.length?alert(`${bad.length} of ${checked.rows.length} rows need fixing`,'Correct them in your spreadsheet and choose the file again. Nothing has been added yet.','danger'):alert(`${checked.rows.length} students ready to import`,'Check the list, then import.','success')}<div class="pw-table-scroll csv-preview-table"><table class="pw-table"><thead><tr><th scope="col">Row</th><th scope="col">Check</th>${columns.map(k=>`<th scope="col">${headings[k]}</th>`).join('')}</tr></thead><tbody>${checked.rows.map((r:any)=>`<tr class="${r.errors.length?'row-error':''}"><td>${r.row+1}</td><td>${r.errors.length?`<span class="pw-badge danger">${esc(r.errors.join(' '))}</span>`:'<span class="pw-badge success">Ready</span>'}</td>${columns.map(k=>`<td>${esc(r.value?.[k]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${bad.length?'':`<div class="pw-row">${button('Import '+checked.rows.length+' students','csv-import','primary','upload')}</div>`}`;
   const importButton=preview.querySelector<HTMLButtonElement>('#csv-import');
   if(importButton)importButton.onclick=async()=>{importButton.disabled=true;importButton.textContent='Importing…';try{const result=await api('/admin/student-accounts','POST',{rows});element.close();showPasswords(`${result.created.length} students imported`,result.created);onDone();}catch(cause){importButton.disabled=false;importButton.textContent='Import '+checked.rows.length+' students';preview.insertAdjacentHTML('afterbegin',alert('Import stopped',errorMessage(cause),'danger'));}};}
  catch(cause){preview.innerHTML=alert('This file could not be read',errorMessage(cause),'danger');}};
}

export async function temporaryPassword(student:{id:string;studentId:string;firstName?:string;lastName?:string}){
 const result=await api('/admin/student-accounts/'+encodeURIComponent(student.id)+'/temporary-password','POST',{});
 showPasswords('New temporary password',[result]);
 toast('Temporary password set. The student is signed out everywhere.');
}
