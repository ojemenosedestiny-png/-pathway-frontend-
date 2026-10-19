// Shared adapter: existing service screens and Journey workspaces use one local store.
// Replace the typed service implementation with server calls for production.
import {services} from '/journey/dist/services.js';
export const api={
 async listPayments(){return services.ownRecords('payments');},
 async createPayment(details){if(!Number.isFinite(details.amount)||details.amount<=0)throw Error('Enter an amount greater than zero.');return services.createStudentRecord('payments',{...details,status:'Pending'});},
 async simulatePayment(id,status){if(!['Paid','Pending','Failed'].includes(status))throw Error('Invalid payment outcome.');return services.updateOwnRecord('payments',id,{status});},
 async listApplications(){return services.ownRecords('applications');},
 async submitApplication(details,documents){const universities=await services.getUniversities();const university=universities.find(u=>u.id===details.universityId);return services.submitApplication({details,name:details.name,universityId:university?.id||'',country:university?.country||details.residence,course:details.programme,status:'Submitted',comments:'',officer:'',documentsNeeded:[],documents:documents.map(({name,size,type})=>({name,size,type}))},documents);},
 async saveDraft(details){try{localStorage.setItem('pathway-application-draft',JSON.stringify(details));}catch{throw Error('Draft could not be saved on this device.');}},
 async loadDraft(){try{return JSON.parse(localStorage.getItem('pathway-application-draft')||'{}');}catch{throw Error('Saved draft could not be read.');}},
 async clearDraft(){localStorage.removeItem('pathway-application-draft');},
 async listConsultations(){return services.ownRecords('consultations');},
 async availableSlots(date){return services.availableConsultationSlots(date);},
 async bookConsultation(details){return services.bookConsultation(details);},
 async rescheduleConsultation(id,details){return services.bookConsultation(details,id);},
 async cancelConsultation(id){return services.updateOwnRecord('consultations',id,{status:'Cancelled'});},
 async listRooms(){const [rooms,hostels,site]=await Promise.all([services.getRooms(),services.getHostels(),services.getSite()]);return rooms.filter(r=>hostels.some(h=>h.id===r.hostelId)).map(r=>({...r,images:r.images?.length?r.images:[site['hero.image']||'/assets/school-2.jpg'],name:hostels.find(h=>h.id===r.hostelId)?.name||r.name,rules:hostels.find(h=>h.id===r.hostelId)?.rules||''}));},
 async reserveRoom(details){return services.reserveRoom(details);},
 async listBookings(){return services.ownRecords('bookings');},
 async getSite(){return services.getSite();},
 async listFees(){return services.list('fees');}
};
