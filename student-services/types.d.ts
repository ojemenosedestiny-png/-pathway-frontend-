export type Currency = 'NGN' | 'USD';
export interface StudentDetails { name: string; studentId: string; email: string; phone: string; }
export interface Payment extends StudentDetails { id: string; date: string; amount: number; currency: Currency; feeType: string; level: string; term: string; method: string; status: 'Paid' | 'Pending' | 'Failed'; }
export interface Application { id: string; date: string; status: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected' | 'Needs Documents'; details: Record<string,string>; documents: {name:string;size:number;type:string}[]; }
export interface Consultation { id:string; date:string; instant:string; timezone:string; type:string; mode:string; name:string; email:string; phone:string; status:'Confirmed'|'Cancelled'; }
export interface Room { id:string; name:string; gender:string; type:'Single'|'Shared'; price:number; deposit:number; available:number; amenities:string[]; images:string[]; }
export interface Booking extends StudentDetails { id:string; date:string; roomId:string; term:string; arrival:string; departure:string; amount:number; status:'Confirmed'|'Pending'; paymentId:string; }
