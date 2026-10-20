export interface EditorField {key:string;label:string;type?:string;options?:string[];default?:any;optional?:boolean;lookup?:string;local?:boolean;hint?:string}
const f=(key:string,label:string,type='text',extra:Partial<EditorField>={}):EditorField=>({key,label,type,...extra});
const currency=f('currency','Currency','text',{options:['NGN','USD'],default:'NGN'});
const active=f('active','Available to students','checkbox',{default:true});
const genders=f('gender','Residence allocation','text',{options:['FEMALE','MALE','MIXED'],default:'MIXED'});
const price=(key:string,label:string)=>f(key,label,'money',{default:'0'});
const scheduleFields=[
 f('programme','Class or programme','text',{local:true,optional:true}),
 f('term','Term','text',{local:true,optional:true}),
 f('session','Session','text',{local:true,optional:true}),
 f('effectiveFrom','Effective from','date',{local:true,optional:true}),
];
export const editors:Record<string,EditorField[]>={
 fees:[f('name','Fee name'),f('purpose','Fee type','text',{options:['REGISTRATION','ENROLMENT','TUITION','EXAM','HOSTEL','INSTALMENT'],default:'TUITION'}),price('amountMinor','Amount'),currency,f('instalments','Number of instalments','number',{default:1}),...scheduleFields,active],
 hostels:[f('name','Residence name'),f('description','About this residence','textarea'),f('location','Location','text',{local:true,optional:true}),genders,f('rules','House rules','textarea'),active],
 rooms:[f('hostelId','Residence','text',{lookup:'hostels'}),f('name','Room name'),f('capacity','Number of beds','number',{default:1}),genders,price('priceMinor','Accommodation fee'),price('depositMinor','Caution deposit'),currency,f('term','Charged per','text',{local:true,optional:true}),f('session','Session','text',{local:true,optional:true}),f('effectiveFrom','Effective from','date',{local:true,optional:true}),f('amenities','Amenities, one per line','lines',{default:[]}),f('photos','Approved photo URLs, one per line','lines',{default:[]}),active],
 exams:[f('name','Examination name'),f('body','Exam body','text',{options:['WAEC','NECO','CAMBRIDGE','OTHER'],default:'WAEC'}),f('description','Description','textarea'),price('feeMinor','Examination fee'),currency,f('opensAt','Registration opens','datetime-local'),f('closesAt','Registration closes','datetime-local'),f('centre','Examination centre'),f('capacity','Candidate capacity','number',{default:100}),f('requirements','Requirements, one per line','lines',{default:[]}),f('timetable','Timetable details, one per line','lines',{default:[]}),active],
 countries:[f('name','Country'),f('code','Two-letter country code'),f('featured','Featured destination','checkbox')],
 universities:[f('name','University name'),f('countryId','Country','text',{lookup:'countries'}),f('description','Description','textarea'),f('entryRequirements','Entry requirements, one per line','lines',{default:[]}),price('tuitionMinor','Indicative tuition'),currency,f('deadline','Application deadline','datetime-local',{optional:true}),f('logo','Approved logo URL','url',{optional:true}),f('image','Approved cover image URL','url',{optional:true}),f('featured','Featured university','checkbox'),active],
 courses:[f('name','Course title'),f('universityId','University','text',{lookup:'universities'}),f('requirements','Entry requirements, one per line','lines',{default:[]}),price('tuitionMinor','Tuition'),currency,f('deadline','Application deadline','datetime-local',{optional:true}),active],
 slides:[f('title','Slide title'),f('caption','Caption','textarea'),f('image','Approved image URL','url'),f('order','Display order','number',{default:0}),f('visible','Show this slide','checkbox',{default:true})],
 slots:[f('advisorId','Adviser account ID'),f('advisor','Adviser name'),f('startsAt','Start time','datetime-local'),f('endsAt','End time','datetime-local'),f('mode','Appointment type','text',{options:['VIDEO','PHONE','IN_PERSON'],default:'VIDEO'}),active],
 content:[f('key','Content section, e.g. home.ctaTitle'),f('value','Text or content','textarea')],
 users:[f('name','Staff name'),f('email','Email','email'),f('phone','Phone','tel'),f('roleType','Staff role','text',{options:['ADMISSIONS','FINANCE','HOSTEL','CONTENT','SUPER_ADMIN'],default:'ADMISSIONS'})],
};
export const adminModules=[
 ['dashboard','Overview','layout-dashboard','Overview','A considered view of your school community.'],
 ['students','Students','users','People','Profiles, access and the next step for every student.'],
 ['applicants','Applicants','file-check','People','Review applications submitted before a student account is created.'],
 ['applications','Applications','file-check','People','Move every application forward with clarity.'],
 ['documents','Document review','folder-open','People','Review student documents and keep decisions traceable.'],
 ['payments','Payments','wallet','Money','A clear record of verified payments and pending transactions.'],
 ['fees','Fees manager','credit-card','Money','One source of truth for the fees your students see.'],
 ['hostels','Hostel manager','building-2','Campus','Thoughtful spaces. Carefully managed.'],
 ['rooms','Rooms & beds','bed-double','Campus','Manage room capacity, amenities and accommodation fees.'],
 ['bookings','Hostel bookings','calendar-days','Campus','Keep accommodation requests and allocations in view.'],
 ['exams','Examinations','graduation-cap','Campus','Programmes, registration windows and examination fees.'],
 ['enrolments','Exam enrolments','book-open','Campus','Candidate records, confirmations and results.'],
 ['universities','University pathways','globe','Campus','Manage destinations and the opportunities ahead.'],
 ['countries','Destinations','map-pin','Campus','Countries represented in your pathway catalogue.'],
 ['courses','Courses','compass','Campus','Course requirements, tuition and application dates.'],
 ['consultations','Consultations','calendar-days','Campus','Appointments that help students make their next decision.'],
 ['slots','Adviser availability','clock','Campus','Set clear, bookable appointment windows.'],
 ['announcements','Post information','bell','Content','The right message, for the right people, at the right time.'],
 ['content','Site content','file-text','Content','Keep your school’s voice clear and consistent.'],
 ['slides','Hostel carousel','image','Content','Select the images and captions in your published carousel feed.'],
 ['media','Media library','image','Content','Upload, scan and manage approved school assets.'],
 ['messages','Admissions inbox','message-circle','People','Keep each student conversation together.'],
 ['users','Staff accounts','shield-check','System','Give your team the access they need.'],
 ['roles','Roles & permissions','shield-check','System','Define which modules each staff role can read or edit.'],
 ['audit','Audit log','file-text','System','A traceable record of actions across your school.'],
 ['settings','Settings','settings','System','Your school’s ID policy and notification preferences.'],
];
export const studentModules=[
 ['dashboard','Home','house','','View your next steps, payments and school updates.'],['journey','My journey','route','','Follow your progress and university applications.'],['exams','Your exams','graduation-cap','','Your registrations, candidate details and results.'],['payments','Payments','wallet','','View your fees, payment history and receipts.'],['hostel','Hostel','building-2','','Find a residence or manage your existing booking.'],['documents','Documents','folder-open','','Your documents, securely in one place.'],['messages','Messages','message-circle','','A direct conversation with your admissions team.'],
];
export function modulePermission(key:string){return key==='applicants'?'applications':key==='slots'?'consultations':key;}
