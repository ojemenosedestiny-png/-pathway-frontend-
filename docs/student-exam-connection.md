# Student examination catalogue and portal update

The student Your exams page previously showed only the student-owned enrolment list. An active exam created or edited in Admin was visible only inside the separate enrolment dialog. The page now displays both the student-owned enrolments and an active school programme catalogue.

Admin > Exam preparation controls name, description, preparation venue, requirements, timetable, school preparation fee, enrolment window and Available to students. Save the record. Active records appear in the student catalogue on opening or refreshing Your exams. Inactive records are removed from the catalogue; existing student records remain available. Preparation availability policy is respected: programmes not offered by the school show an enquiry action rather than enrolment. Publishing a programme does not enrol every student or imply official exam registration.

Students can use Refresh programmes after the school updates a record. Enrolment and payment still use the existing authenticated server routes, including capacity, date and fee checks. Existing enrolment details use the related current exam record. Official reference fees remain separate from school preparation charges.

The student dashboard now has a green welcome panel, shortcuts, and clearer summary cards. Its exam summary reports preparation enrolments rather than labelling an enrolment-opening date as the next exam date. The student exam page has live programme cards, preparation detail disclosures, and responsive layouts.

Validation: browser tests edit a programme through the admin UI and verify name/fee/description in the student view, selected-programme enrolment, current timetable, refresh, inactive removal, existing-record retention and three viewport widths. Persistent synthetic API fixtures are used; this is not a signed-in production verification. No backend schema or authorization change is required.
