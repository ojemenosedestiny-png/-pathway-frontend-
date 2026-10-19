import {fees} from './fees.js';
import {application,applicationStatus} from './application.js';
import {consultation} from './consultation.js';
import {hostel,bookings} from './hostel.js';
import {dashboard} from './dashboard.js';
import {api} from './api.js';
import {escapeHtml as esc} from './shared.js';
const root=document.getElementById('service-main');
async function load(){try{await ({'/apply':application,'/application-status':applicationStatus,'/book-consultation':consultation,'/hostel':hostel,'/my-bookings':bookings,'/student-dashboard':dashboard}[location.pathname]||fees)(root);}catch(error){root.innerHTML='<h1>Unable to load services</h1><p role="alert"></p><button class="btn btn-primary">Try again</button>';root.querySelector('p').textContent=error.message;root.querySelector('button').onclick=load;}}
document.querySelectorAll('.service-header nav a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
async function identity(){const site=await api.getSite();document.title=site[`seo.${location.pathname.slice(1)}.title`]||document.title;document.querySelector('.brand strong').textContent=site['school.name']||'';document.querySelector('.brand img').src=site['school.logo']||'/assets/school-logo.png';document.querySelector('.demo-banner').textContent='Journey preview · Local records are shared with the staff workspace on this browser. No live payments or reservations.';document.querySelector('.service-footer p').textContent=`${site['school.legalName']} · ${site['school.location']}`;const dashboardLink=document.querySelector('.service-header a[href="/student-dashboard"]');if(dashboardLink)dashboardLink.href='/portal';document.querySelector('.service-footer details p:last-child').textContent='Preview records and selected document files are stored locally on this device. Saved application drafts can be cleared in the application form. Use synthetic documents when exploring the preview.';}
identity().catch(()=>{});load();
