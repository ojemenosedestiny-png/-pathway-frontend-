# Visitor consultation requests

Visitors can submit `/book-consultation` without a Student ID. Requests are saved in MongoDB as ConsultationRequest records, separate from student bookings, with explicit contact consent. No appointment, account, payment or email is created by submission. The confirmation displays a request reference and explains that staff will arrange a time.

Staff with consultations permission can use Admin > Visitor consultations to view contact details and topic, search or filter, and change NEW / CONTACTED / SCHEDULED / CLOSED with internal notes. Contact the visitor to arrange the meeting; marking SCHEDULED does not reserve a student appointment slot or send a notification.

POST /public/consultation-requests requires the existing origin/CSRF controls, a UUID Idempotency-Key, validated fields and consent. IP/email rate limits apply. Retry the same request with the same key to prevent duplicates. Staff endpoints require consultations read/write permissions; public responses expose only reference and status.

Deploy backend first, then frontend. Prisma generates the new model in the Docker build; MongoDB creates its collection on first write. No existing student booking data is changed.
