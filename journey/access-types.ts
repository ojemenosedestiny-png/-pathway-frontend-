export type Provider='Paystack'|'Flutterwave'|'Stripe'|'Bank transfer';
export type PaymentState='pending'|'success'|'failed'|'abandoned';
export interface AccessPayment {reference:string;name:string;email:string;phone:string;provider:Provider;amount:number;currency:'NGN'|'USD';purpose:'Registration'|'Enrolment';status:PaymentState;webhookSeen:boolean;providerVerified:boolean;studentId?:string;createdAt:string;}
export interface Credential {salt:string;digest:string;iterations:number;}
export interface AccessStudent {id:string;studentId:string;name:string;email:string;phone:string;paymentReference:string;status:'Active'|'Suspended';mustSetPassword:boolean;credential?:Credential;failedAttempts:number;lockedUntil:number;version:number;cohort:string;examGroups:string[];}
export interface AdminUser {id:string;name:string;email:string;role:string;status:'Active'|'Suspended';credential:Credential;version:number;}
export interface Permission {role:string;read:string[];write:string[];}
export interface AccessSession {id:string;kind:'student'|'admin';userId:string;version:number;expiresAt:number;lastSeen:number;}
export interface PasswordToken {digest:string;studentId:string;expiresAt:number;used:boolean;}
export interface Delivery {id:string;to:string;channel:string;subject:string;body:string;createdAt:string;}
export interface AccessAudit {id:string;actor:string;action:string;target:string;date:string;}
export interface Post {id:string;title:string;body:string;attachments:{name:string;url:string}[];category:string;pinned:boolean;publishAt:string;expiresAt:string;audience:'Website'|'All students'|'Exam group'|'Cohort'|'Student';audienceValue:string;placements:string[];channels:string[];status:'Draft'|'Scheduled'|'Published'|'Archived';readBy:string[];createdAt:string;}
export interface AccessStore {payments:AccessPayment[];students:AccessStudent[];admins:AdminUser[];permissions:Permission[];sessions:AccessSession[];tokens:PasswordToken[];deliveries:Delivery[];posts:Post[];audit:AccessAudit[];reservedIds:string[];settings:{prefix:string;startingNumber:number;counters:Record<string,number>};challenges:{id:string;adminId:string;codeDigest:string;expiresAt:number;attempts:number}[];rates:Record<string,{count:number;until:number}>;}
