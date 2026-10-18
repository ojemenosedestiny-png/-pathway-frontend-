export type Role = 'Super Admin' | 'Admissions Officer' | 'Finance' | 'Hostel Manager' | 'Content Editor' | 'Student';
export type Currency = 'NGN' | 'USD';
export interface Entity { id:string; createdAt?:string; updatedAt?:string; order?:number; visible?:boolean; [key:string]:unknown; }
export interface Student extends Entity { name:string; email:string; phone:string; guardian:string; guardianPhone:string; country:string; milestones:string[]; nextAction:string; deadline:string; preferences:string[]; }
export interface Application extends Entity { studentId:string; name:string; universityId:string; country:string; course:string; status:'Submitted'|'Under Review'|'Needs Documents'|'Accepted'|'Rejected'; officer:string; comments:string; documentsNeeded:string[]; history:{status:string;date:string;comment:string}[]; details?:Record<string,string>; }
export interface University extends Entity { name:string; country:string; city:string; description:string; courses:string[]; requirements:string; tuition:number; currency:Currency; deadline:string; featured:boolean; image:string; logo:string; partner:boolean; }
export interface Exam extends Entity { logo?:string; website?:string; name:string; category:string; description:string; fee:number; currency:Currency; opens:string; closes:string; timetable:string; centre:string; requirements:string; limit:number; }
export interface ExamEnrolment extends Entity { studentId:string; examId:string; status:string; candidateNumber:string; result:string; resultUrl:string; }
export interface Hostel extends Entity { name:string; description:string; gender:string; rules:string; image:string; }
export interface Room extends Entity { hostelId:string; name:string; type:string; gender:string; price:number; deposit:number; capacity:number; available:number; amenities:string[]; images:string[]; }
export interface Booking extends Entity { studentId:string; name:string; roomId:string; term:string; arrival:string; departure:string; amount:number; balance:number; status:string; paymentId:string; }
export interface Payment extends Entity { studentId:string; name:string; amount:number; currency:Currency; feeType:string; status:string; method:string; term:string; date:string; email:string; phone:string; refunded?:number; }
export interface Fee extends Entity { name:string; amount:number; currency:Currency; level:string; instalments:number; discount:number; coupon:string; }
export interface Consultation extends Entity { studentId:string; name:string; email:string; phone:string; type:string; mode:string; instant:string; timezone:string; status:string; advisor:string; link:string; notes:string; }
export interface Document extends Entity { studentId:string; name:string; type:string; size:number; url:string; status:'Pending'|'Approved'|'Rejected'; reason:string; }
export interface Announcement extends Entity { title:string; body:string; audience:string; channel:string; status:string; }
export interface CarouselSlide extends Entity { title:string; caption:string; image:string; hostelId:string; order:number; visible:boolean; }
export interface Message extends Entity { studentId:string; sender:string; subject:string; body:string; read:boolean; }
export interface Notification extends Entity { studentId:string; title:string; body:string; read:boolean; }
export interface Slot extends Entity { advisor:string; instant:string; available:boolean; }
export interface SiteContent extends Entity { name:string; value:string; }
export interface Testimonial extends Entity { name:string; quote:string; context:string; image:string; }
export interface FAQ extends Entity { question:string; answer:string; }
export interface Stat extends Entity { label:string; value:number; suffix:string; }
export interface Media extends Entity { name:string; url:string; type:string; }
export interface Audit extends Entity { actor:string; action:string; collection:string; recordId:string; date:string; }
export interface RoleRecord extends Entity { name:Role; description:string; modules:string[]; }
export interface Collections { students:Student; applications:Application; universities:University; exams:Exam; enrolments:ExamEnrolment; hostels:Hostel; rooms:Room; bookings:Booking; payments:Payment; fees:Fee; consultations:Consultation; documents:Document; announcements:Announcement; slides:CarouselSlide; messages:Message; notifications:Notification; slots:Slot; content:SiteContent; testimonials:Testimonial; faqs:FAQ; stats:Stat; media:Media; audit:Audit; roles:RoleRecord; }
export type Collection = keyof Collections;
export type Store = { [K in Collection]: Collections[K][] };
export interface Session { role:Role; studentId:string; name:string; }
