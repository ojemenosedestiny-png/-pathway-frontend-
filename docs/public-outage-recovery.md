# Public homepage outage recovery

Live diagnosis: backend readiness and public content timed out on initial probes; subsequent website-proxy requests to readiness, content, countries, universities, courses, exams, slides, preparation, legal details and announcements returned 200. This demonstrates an intermittent availability failure, but does not establish whether hosting startup, deployment, networking or database latency caused the delay.

Previously one rejected request erased the homepage and rendered a generic error. The public homepage now uses existing static editorial defaults when CMS content is unavailable and leaves failed live collections empty. It shows one service notice with a reload action. Missing announcements no longer discard an already rendered page. No fees, payments, availability, student identities or live catalogue records are invented, cached or approved by the fallback. Account and payment requests retain their existing error handling.

Validation: frontend build, total-outage/recovery browser regression, public trust responsive checks and approved-logo checks pass. The outage regression verifies homepage/globe/logo/application navigation survival, notice deduplication and recovery. It does not claim to eliminate upstream downtime.
