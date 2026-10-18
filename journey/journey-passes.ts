import {esc} from './components.js';

export interface JourneyPassStep {title:string;description:string;label:string;icon:'compass'|'book-open'|'file-check'|'graduation-cap';detail:string;}
export interface JourneyPassesProps {title:string;eyebrow?:string;steps:JourneyPassStep[];id?:string;}
const itinerary=[
  {label:'Discover',icon:'compass' as const,detail:'FROM: Nigeria'},
  {label:'Foundation',icon:'book-open' as const,detail:'Exams'},
  {label:'Apply',icon:'file-check' as const,detail:'Admissions'},
  {label:'Next chapter',icon:'graduation-cap' as const,detail:'TO: Your university'},
];

/** Adapt the existing CMS title|description rows without changing their copy. */
export function journeyPassSteps(content:string):JourneyPassStep[] {
  return content.split('\n').filter(Boolean).slice(0,4).map((row,index)=>{
    const [title,...description]=row.split('|');
    return {...itinerary[index],title,description:description.join('|')};
  });
}

/** Reusable, semantic boarding-pass itinerary. Styling uses the Journey design tokens. */
export function journeyPasses({title,eyebrow='THE JOURNEY',steps,id='how-it-works'}:JourneyPassesProps) {
  const icons=new Set(itinerary.map(step=>step.icon));
  return `<section class="j-section j-container j-pass-journey" id="${esc(id)}" aria-labelledby="${esc(id)}-heading">
    <header class="j-pass-heading"><p class="j-kicker">${esc(eyebrow)}</p><h2 class="j-heading" id="${esc(id)}-heading">${esc(title)}</h2></header>
    <ol class="j-pass-list">${steps.map((step,index)=>{
      const number=String(index+1).padStart(2,'0');
      const icon=icons.has(step.icon)?step.icon:'compass';
      return `<li class="j-pass-step" style="--pass-index:${index}"><article class="j-boarding-pass">
        <span class="j-pass-watermark" aria-hidden="true">${number}</span>
        <div class="j-pass-top"><span class="j-pass-label">STEP ${number} <span aria-hidden="true">·</span> ${esc(step.label)}</span><span class="j-pass-icon" aria-hidden="true" style="--pass-icon:url('/journey/dist/icons/${icon}.svg')"></span></div>
        <h3>${esc(step.title)}</h3><p class="j-pass-description">${esc(step.description)}</p>
        <div class="j-pass-footer"><span>${esc(step.detail)}</span><span class="j-pass-ticket-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></div>
      </article>${index<steps.length-1?'<svg class="j-pass-connector" viewBox="0 0 48 38" fill="none" aria-hidden="true" focusable="false"><path d="M3 29C12 6 30 6 42 22" stroke-dasharray="3 5"/><path d="m34 20 9 4 1-10"/></svg>':''}</li>`;
    }).join('')}</ol>
  </section>`;
}

/** A one-time reveal; return cleanup for service-layer page rerenders. */
export function observeJourneyPasses(section:HTMLElement|null):()=>void {
  if(!section||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return()=>{};
  section.classList.add('is-motion-ready');
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){section.classList.add('is-revealed');observer.disconnect();}},{threshold:.12});
  observer.observe(section);return()=>observer.disconnect();
}
