import {esc} from './components.js';

/** The school's WAEC/NECO registration form: one layout for applicants, students and staff (including print). */
export interface SsceOptions {examBodies:string[];states:string[];compulsorySubjects:string[];electiveSubjects:string[];minElectives:number;maxElectives:number}
/** The subjects printed on the school's paper form (kept in step with the server's list). */
export const schoolSubjects=['Mathematics','English Language','Civic Education','Livestock Farming'];
export const examBodyLabel:Record<string,string>={WAEC:'WAEC',NECO:'NECO',WAEC_NECO:'WAEC and NECO'};
const day=(value:string)=>value?new Date(value+(value.length===10?'T00:00:00':'')).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'';
const line=(label:string,value:string)=>`<div class="ssce-line"><span class="ssce-label">${esc(label)}</span><span class="ssce-value">${esc(value)||'&nbsp;'}</span></div>`;

/** Read-only sheet laid out like the paper form, with the form number that makes each one unique. */
export function ssceSheet(form:any,compulsory:readonly string[]){
 const subjects=[...compulsory,...(form.electives||[])];
 return `<article class="ssce-sheet" aria-label="WAEC and NECO registration form ${esc(form.formNumber)}">
 <header class="ssce-head"><img src="/assets/school-logo.png" alt="" width="54" height="62"><div><p class="ssce-school">NEWWORLD EMERALD PRIVATE SCHOOL FO1 KUBWA</p><h2>WAEC AND NECO REGISTRATION FORM</h2></div><dl class="ssce-ref"><div><dt>Form number</dt><dd>${esc(form.formNumber)}</dd></div><div><dt>Examination</dt><dd>${esc(examBodyLabel[form.examBody]||form.examBody)}</dd></div></dl></header>
 <div class="ssce-name">${line('Surname',form.surname)}${line('First name',form.firstName)}${line('Middle name',form.middleName)}</div>
 <div class="ssce-grid">${line('Date of birth',day(form.dateOfBirth))}${line('Gender',form.gender)}${line('State of origin',form.stateOfOrigin)}${line('LGA',form.lga)}${line('NIN',form.nin)}${line('Applicant number',form.applicantNumber)}</div>
 <h3 class="ssce-subhead">List of subjects</h3><ol class="ssce-subjects">${Array.from({length:9},(_,i)=>`<li>${esc(subjects[i]||'')}${i<compulsory.length?' <small>(school subject)</small>':''}</li>`).join('')}</ol>
 <div class="ssce-grid">${line('Phone number',form.phone)}${line('Email address',form.email)}</div>
 <div class="ssce-grid ssce-sign">${line('Signature',form.signature)}${line('Date',day(String(form.submittedAt||'').slice(0,10)))}</div>
 </article>`;
}

/** Editable version of the same form. Subjects 1-4 are fixed by the school; 5-9 are chosen (at least the minimum). */
export function ssceFields(options:SsceOptions,form:any={},contact:{email:string;phone?:string}){
 const select=(name:string,label:string,choices:string[],value='',required=true,labels:Record<string,string>={})=>`<label class="ssce-field">${esc(label)}<select name="${name}" ${required?'required':''}><option value="">${required?'Select…':'None'}</option>${choices.map(choice=>`<option value="${esc(choice)}" ${choice===value?'selected':''}>${esc(labels[choice]||choice)}</option>`).join('')}</select></label>`;
 const input=(name:string,label:string,value='',attrs='')=>`<label class="ssce-field">${esc(label)}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
 const electives=form.electives||[];
 return `<fieldset class="ssce-fieldset"><legend>Examination</legend><div class="ssce-choice">${options.examBodies.map(body=>`<label><input type="radio" name="examBody" value="${body}" required ${form.examBody===body?'checked':''}> ${esc(examBodyLabel[body])}</label>`).join('')}</div></fieldset>
 <fieldset class="ssce-fieldset"><legend>Name, exactly as on your birth certificate</legend><div class="ssce-row three">${input('surname','Surname',form.surname,'required maxlength="80" autocomplete="family-name"')}${input('firstName','First name',form.firstName,'required maxlength="80" autocomplete="given-name"')}${input('middleName','Middle name (if any)',form.middleName,'maxlength="80" autocomplete="additional-name"')}</div></fieldset>
 <fieldset class="ssce-fieldset"><legend>Personal details</legend><div class="ssce-row">${input('dateOfBirth','Date of birth',form.dateOfBirth,'type="date" required min="1980-01-01" max="'+new Date().toISOString().slice(0,10)+'" autocomplete="bday"')}${select('gender','Gender',['Male','Female'],form.gender)}${select('stateOfOrigin','State of origin',options.states,form.stateOfOrigin)}${input('lga','LGA (local government area)',form.lga,'required maxlength="80"')}${input('nin','NIN (11 digits)',form.nin,'required inputmode="numeric" pattern="[0-9]{11}" maxlength="11" title="Your National Identification Number has 11 digits."')}</div></fieldset>
 <fieldset class="ssce-fieldset"><legend>List of subjects (7 to 9 in total)</legend><ol class="ssce-subject-picker">${options.compulsorySubjects.map(subject=>`<li><span class="ssce-fixed">${esc(subject)}</span><small>Set by the school</small></li>`).join('')}${Array.from({length:options.maxElectives},(_,i)=>`<li>${select('elective','Subject '+(options.compulsorySubjects.length+i+1),options.electiveSubjects,electives[i]||'',i<options.minElectives)}</li>`).join('')}</ol><p class="ssce-hint">Choose at least ${options.minElectives} more subjects. Each subject can be chosen once.</p></fieldset>
 <fieldset class="ssce-fieldset"><legend>Contact</legend><div class="ssce-row">${input('phone','Phone number',form.phone||contact.phone||'','type="tel" required maxlength="25" autocomplete="tel"')}${input('email','Email address',contact.email,'type="email" readonly')}</div></fieldset>
 <fieldset class="ssce-fieldset"><legend>Declaration</legend><label class="ssce-declare"><input type="checkbox" name="declaration" required ${form.declaration?'checked':''}> I confirm that these details are correct and match my official documents.</label><div class="ssce-row">${input('signature','Signature: type your full name',form.signature,'required maxlength="160" autocomplete="name"')}${input('signedOn','Date',new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),'readonly')}</div></fieldset>`;
}

/** Collects the editable form into the shape the server expects. */
export function ssceValues(form:HTMLFormElement){
 const data=new FormData(form);const electives=data.getAll('elective').map(String).filter(Boolean);
 if(new Set(electives).size!==electives.length)throw Error('Each subject can be chosen once. Change the repeated subject.');
 return {examBody:String(data.get('examBody')||''),surname:String(data.get('surname')||'').trim(),firstName:String(data.get('firstName')||'').trim(),middleName:String(data.get('middleName')||'').trim(),dateOfBirth:String(data.get('dateOfBirth')||''),stateOfOrigin:String(data.get('stateOfOrigin')||''),lga:String(data.get('lga')||'').trim(),gender:String(data.get('gender')||''),nin:String(data.get('nin')||'').trim(),electives,phone:String(data.get('phone')||'').trim(),signature:String(data.get('signature')||'').trim(),declaration:data.get('declaration')==='on'};
}

/** Opens the browser's print dialog with only the form sheet visible. */
export function printSheet(sheet:HTMLElement){document.body.classList.add('ssce-printing');sheet.classList.add('ssce-print-target');const done=()=>{document.body.classList.remove('ssce-printing');sheet.classList.remove('ssce-print-target');window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.print();}
