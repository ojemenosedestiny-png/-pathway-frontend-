import {api,errorMessage} from './workspace-api.js';
import {esc,alert,icon,toast} from './workspace-components.js';
import type {WorkspaceContext} from './workspace-special.js';

type Turn={question:string;answer:string;at:string};
/** The conversation lasts for this browser tab, so moving between pages keeps the session. */
const session:Turn[]=[];
const severityLabel:Record<string,string>={critical:'Urgent',warning:'Needs attention',info:'For review',ok:'All clear'};
const naira=(value:string)=>'NGN '+Number(value||0).toLocaleString('en-NG');
const total=(byStatus:Record<string,number>)=>Object.values(byStatus||{}).reduce((sum,n)=>sum+n,0);

/** Renders the AI's plain-text reply safely: "- " lines become bullets, short title lines become headings. */
function answerHtml(text:string){
 let html='',list=false;const close=()=>{if(list){html+='</ul>';list=false;}};
 for(const raw of text.split('\n')){const line=raw.trim();if(!line){close();continue;}
  if(/^[-•*]\s+/.test(line)){if(!list){html+='<ul>';list=true;}html+=`<li>${esc(line.replace(/^[-•*]\s+/,''))}</li>`;continue;}
  close();html+=line.length<=40&&!/[.?!]$/.test(line)?`<h4>${esc(line.replace(/:$/,''))}</h4>`:`<p>${esc(line)}</p>`;}
 close();return html;
}

const channel:Record<string,string>={EMAIL:'Email',SMS:'SMS',WHATSAPP:'WhatsApp',ANNOUNCEMENT:'Notice fan-out',REFUND:'Refund',SCAN:'File scan'};
const state:Record<string,string>={DEAD:'Stopped after 8 attempts',SKIPPED:'Not sent: channel not set up',PENDING:'Retrying automatically'};
/** Each failing job with its recorded reason (recipients are never shown); a retry is offered only for recent permanent failures, one job at a time. */
async function deliveries(box:HTMLElement,ctx:WorkspaceContext){
 let rows:any[];try{rows=await api('/admin/assistant/deliveries');}catch(error){box.innerHTML=alert('Delivery details unavailable',errorMessage(error),'danger');return;}if(!ctx.current())return;
 if(!rows.length){box.innerHTML='<p class="pw-helper">No email, SMS or WhatsApp delivery problems are recorded.</p>';return;}
 box.innerHTML=`<p class="pw-helper">Read the reason before retrying. “Not set up” means credentials are missing on the backend service; retrying will not help until they are added. A provider rejection (for example an unverified sending domain) must be fixed with the provider first.</p><div class="pw-table-scroll"><table class="pw-table"><thead><tr><th scope="col">Channel</th><th scope="col">Status</th><th scope="col">Attempts</th><th scope="col">Reason recorded</th><th scope="col">Queued</th><th scope="col"><span class="pw-sr-only">Action</span></th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(channel[row.kind]||row.kind)}</td><td>${esc(state[row.status]||row.status)}</td><td>${Number(row.attempts)||0}</td><td>${esc(row.lastError||'No reason recorded')}</td><td>${esc(new Date(row.createdAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}</td><td>${row.retryable?`<button type="button" class="pw-button" data-retry-delivery="${esc(row.id)}">Retry this message</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
 box.querySelectorAll<HTMLButtonElement>('[data-retry-delivery]').forEach(control=>control.onclick=async()=>{control.disabled=true;try{await api('/admin/assistant/deliveries/'+control.dataset.retryDelivery+'/retry','POST',{});control.replaceWith(Object.assign(document.createElement('span'),{className:'pw-badge',textContent:'Queued for one more attempt'}));toast('Message queued for one more attempt. Check this list again in a minute.');}catch(error){control.disabled=false;toast(errorMessage(error));}});
}
export async function adminAssistant(target:HTMLElement,ctx:WorkspaceContext){
 const data=await api('/admin/assistant');if(!ctx.current())return;
 // Tolerate partial data so a missing section shows 0 instead of breaking the page.
 const s=data?.snapshot||{};const people=s.people||{},money=s.money||{},learning=s.learning||{},communication=s.communication||{};
 const checks:any[]=Array.isArray(data?.checks)?data.checks:[];const n=(value:unknown)=>String(Number(value)||0);
 const when=new Date(data?.generatedAt||s.generatedAt||Date.now()).toLocaleString('en-GB');
 const figures:[string,string,string][]=[
  ['Students',n(people.students),`${n(people.newStudentsLast7Days)} new this week`],
  ['Applications to decide',n(people.admissionsAwaitingDecision),'Submitted or under review'],
  ['Verified payments',naira(money.verifiedNgnLast30Days),'NGN · last 30 days'],
  ['Receipts to check',n(money.transferReceiptsAwaitingReview),'Bank transfer screenshots'],
  ['Mock exams open',n(learning.mocksOpenNow),`${n(learning.attemptsSubmittedLast7Days)} submitted this week`],
  ['Message failures',n(communication.failedDeliveries),`${total(communication.messageDeliveryByStatus)} deliveries recorded`],
 ];
 target.innerHTML=`<div class="assistant-layout">
 <section class="pw-card assistant-chat" aria-labelledby="assistant-chat-title">
  <div class="pw-card-head"><div><p class="pw-overline">${icon('sparkles')} AI SESSION</p><h2 id="assistant-chat-title">Ask about your school</h2></div>${data.aiConfigured?`<span class="assistant-model">${esc(data.model)}</span>`:''}</div>
  ${data.aiConfigured?`<p class="pw-helper">The assistant reads counts from your records, never names or contact details, and cannot change anything. Open the linked pages to act.</p>
  <div class="assistant-log" id="assistant-log" aria-live="polite"></div>
  <div class="assistant-prompts">${['Give me today\'s briefing','What needs my attention first?','How are students doing in mock exams?','Summarise payments this month'].map((q,i)=>`<button type="button" class="pw-button assistant-chip" data-prompt="${i}">${esc(q)}</button>`).join('')}</div>
  <form class="assistant-ask" id="assistant-ask"><label class="pw-sr-only" for="assistant-question">Your question</label><textarea id="assistant-question" name="question" rows="2" maxlength="600" placeholder="Ask about admissions, payments, mock exams, notices…"></textarea><button class="pw-button primary" type="submit">${icon('send')} Ask</button></form>`
  :alert('Connect the AI service','Health checks and figures below already work. To enable written briefings and questions, the owner adds OPENAI_API_KEY to the backend service on Render, then redeploys.','info')}
 </section>
 <section class="pw-card assistant-checks" aria-labelledby="assistant-checks-title">
  <div class="pw-card-head"><div><p class="pw-overline">WORKSPACE HEALTH</p><h2 id="assistant-checks-title">Automatic checks</h2></div><small class="pw-helper">Checked ${esc(when)}</small></div>
  <ul class="assistant-check-list">${checks.length?'':'<li class="assistant-empty">No checks are available right now. Run the checks again shortly.</li>'}${checks.map((c:any)=>`<li class="assistant-check is-${esc(c.severity)}"><span class="assistant-severity">${esc(severityLabel[c.severity]||c.severity)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.detail)}</p>${c.module&&!['assistant','dashboard'].includes(c.module)?`<a class="assistant-open" href="/admin#${esc(c.module)}">Open page ${icon('arrow-right')}</a>`:''}</div></li>`).join('')}</ul>
 </section>
 <section class="assistant-figures" aria-label="Key figures">${figures.map(([label,value,note])=>`<article class="pw-card pw-stat"><div class="pw-stat-top"><span>${esc(label)}</span></div><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('')}</section>
 <section class="pw-card assistant-deliveries" aria-labelledby="assistant-deliveries-title"><div class="pw-card-head"><div><p class="pw-overline">EMAIL, SMS AND WHATSAPP</p><h2 id="assistant-deliveries-title">Delivery problems</h2></div></div><div id="assistant-deliveries" aria-live="polite"><span class="pw-live-status" role="status">Checking message deliveries…</span></div></section>
 </div>`;
 ctx.primary('Run checks again',()=>ctx.refresh(),'check-check');
 deliveries(target.querySelector<HTMLElement>('#assistant-deliveries')!,ctx);
 if(!data.aiConfigured)return;
 const log=target.querySelector<HTMLElement>('#assistant-log')!;const form=target.querySelector<HTMLFormElement>('#assistant-ask')!;const input=form.querySelector<HTMLTextAreaElement>('textarea')!;
 const render=(pending?:string)=>{log.innerHTML=(session.length||pending?'':`<p class="assistant-empty">Start with a briefing, or ask a question about your school's activity.</p>`)+session.map(turn=>`<div class="assistant-turn"><p class="assistant-question">${esc(turn.question)}</p><div class="assistant-answer">${answerHtml(turn.answer)}<small>${esc(new Date(turn.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</small></div></div>`).join('')+(pending?`<div class="assistant-turn"><p class="assistant-question">${esc(pending)}</p><div class="assistant-answer assistant-thinking" role="status">Reading your school records…</div></div>`:'');log.scrollTop=log.scrollHeight;};
 let busy=false;
 const ask=async(question:string)=>{if(busy)return;question=question.trim()||'Give me today\'s briefing';busy=true;form.querySelectorAll('button,textarea').forEach(el=>(el as HTMLButtonElement).disabled=true);target.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(el=>el.disabled=true);render(question);
  try{const reply=await api('/admin/assistant/briefing','POST',{question,history:session.slice(-4).map(({question,answer})=>({question,answer:answer.slice(0,4000)}))});session.push({question,answer:reply.answer,at:new Date().toISOString()});input.value='';}
  catch(error){toast(errorMessage(error));}
  finally{busy=false;if(!target.isConnected)return;form.querySelectorAll('button,textarea').forEach(el=>(el as HTMLButtonElement).disabled=false);target.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(el=>el.disabled=false);render();input.focus();}};
 const prompts=['Give me today\'s briefing','What needs my attention first?','How are students doing in mock exams?','Summarise payments this month'];
 target.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(el=>el.addEventListener('click',()=>ask(prompts[Number(el.dataset.prompt)])));
 form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
 render();
}
