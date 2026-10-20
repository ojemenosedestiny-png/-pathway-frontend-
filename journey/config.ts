import type {Collection} from './types.js';
export interface Module {key:Collection|'dashboard'|'communications'|'settings';label:string;icon:string;description:string;}
export const modules:Module[]=[
 {key:'dashboard',label:'Overview',icon:'home',description:'The latest across your school community.'},
 {key:'content',label:'Site content',icon:'file',description:'Edit public copy, hero content, contact details, and SEO. Search by page or section.'},
 {key:'hostels',label:'Hostel manager',icon:'home',description:'Manage residence details, rules, gender, and visibility.'},
 {key:'rooms',label:'Rooms and inventory',icon:'home',description:'Control room pricing, capacity, available spaces, amenities, and photographs.'},
 {key:'slides',label:'Hostel carousel',icon:'route',description:'Upload images, edit captions, toggle visibility, and reorder with drag-and-drop or the arrow buttons.'},
 {key:'exams',label:'Exam catalogue',icon:'book',description:'Configure examination windows, fees, requirements, centres, timetable, and capacity.'},
 {key:'enrolments',label:'Exam enrolments',icon:'book',description:'Manage candidate numbers, registration status, result descriptions, and result-slip files.'},
 {key:'universities',label:'Universities and pathways',icon:'globe',description:'Manage destination countries, courses, tuition, deadlines, requirements, and featured listings.'},
 {key:'applications',label:'Applications',icon:'file',description:'Review the pipeline, assign an officer, request documents, and record comments. Status changes notify the student locally.'},
 {key:'students',label:'Students and progress',icon:'user',description:'Update student profiles, milestones, deadlines, and next actions.'},
 {key:'documents',label:'Document review',icon:'file',description:'Review uploaded documents and record approval or a rejection reason.'},
 {key:'payments',label:'Transactions',icon:'card',description:'Manage demonstration payment statuses and refund records. This does not move money.'},
 {key:'fees',label:'Fees and instalments',icon:'card',description:'Set fee amounts, instalment counts, discounts, and coupon codes.'},
 {key:'bookings',label:'Hostel bookings',icon:'home',description:'Approve bookings, allocate rooms, and track balances and check-in dates.'},
 {key:'consultations',label:'Consultations',icon:'calendar',description:'Approve and reschedule sessions, set video links, and add adviser notes.'},
 {key:'slots',label:'Adviser availability',icon:'calendar',description:'Define bookable times as UTC instants. Students see their selected local timezone.'},
 {key:'communications',label:'Communications',icon:'mail',description:'Draft announcements and external-channel templates. Only local in-app delivery is enabled.'},
 {key:'messages',label:'Admissions inbox',icon:'mail',description:'Review and reply to local student messages.'},
 {key:'notifications',label:'Notifications',icon:'bell',description:'Manage local student notifications.'},
 {key:'testimonials',label:'Student stories',icon:'user',description:'Publish verified student stories with appropriate consent. Seed copy is illustrative.'},
 {key:'faqs',label:'FAQs',icon:'file',description:'Edit the questions and answers shown on the public site.'},
 {key:'stats',label:'Homepage statistics',icon:'route',description:'Use verified numbers. Preview counters describe the demonstration catalogue.'},
 {key:'announcements',label:'Announcements',icon:'bell',description:'Edit public and student announcements, audience, channel, and publication status.'},
 {key:'media',label:'Media library',icon:'file',description:'Upload and reuse local preview images and documents (2 MB per file).'},
 {key:'roles',label:'Roles and permissions',icon:'user',description:'Configure client-side preview permissions. Production authorization must be enforced on the backend.'},
 {key:'audit',label:'Audit log',icon:'file',description:'A local record of who changed what. Production logs must be immutable and server-owned.'},
 {key:'settings',label:'School settings',icon:'route',description:'School details, currencies, templates, and integration readiness.'}
];
export const statuses:Record<string,string[]>={applications:['Submitted','Under Review','Needs Documents','Accepted','Rejected'],documents:['Pending','Approved','Rejected'],payments:['Pending','Paid','Failed','Refunded'],bookings:['Pending','Confirmed','Rejected','Cancelled'],consultations:['Pending','Confirmed','Cancelled','Completed'],enrolments:['Pending confirmation','Confirmed','Written','Results available','Cancelled'],announcements:['Draft','Published']};
export const fieldNames:Record<string,string[]>= {
 content:['name','value'],hostels:['name','description','gender','rules','image','visible'],rooms:['hostelId','name','type','gender','price','deposit','capacity','available','amenities','images','visible'],slides:['title','caption','image','hostelId','order','visible'],exams:['name','logo','website','category','description','fee','currency','opens','closes','timetable','centre','requirements','limit','visible'],universities:['name','country','city','description','courses','requirements','tuition','currency','deadline','featured','partner','image','logo','visible'],applications:['studentId','name','universityId','country','course','status','officer','comments','documentsNeeded'],students:['name','email','phone','guardian','guardianPhone','country','milestones','nextAction','deadline','preferences'],documents:['studentId','name','type','size','url','status','reason'],payments:['studentId','name','email','phone','feeType','amount','currency','status','method','term','refunded'],fees:['name','amount','currency','level','instalments','discount','coupon','visible'],enrolments:['studentId','examId','status','candidateNumber','result','resultUrl'],bookings:['studentId','name','roomId','term','arrival','departure','amount','balance','status','paymentId'],consultations:['studentId','name','email','phone','type','mode','instant','timezone','status','advisor','link','notes'],slots:['advisor','instant','available'],announcements:['title','body','audience','channel','status','visible'],messages:['studentId','sender','subject','body','read'],notifications:['studentId','title','body','read'],testimonials:['name','quote','context','image','visible'],faqs:['question','answer','visible'],stats:['label','value','suffix','visible'],media:['name','url','type'],roles:['name','description','modules']
};
export const arrays=['amenities','images','courses','documentsNeeded','milestones','preferences','modules'];
export const numbers=['price','deposit','capacity','available','fee','limit','tuition','size','amount','balance','refunded','instalments','discount','order'];
export const booleans=['visible','featured','partner','read'];
