const qualificationLabels = {
  secondary_in_progress: 'Secondary school in progress',
  secondary_complete: 'Secondary school completed',
  a_level: 'A-levels or equivalent',
  diploma: 'College diploma or equivalent',
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  other: 'Other qualification',
};

const countryChecks = {
  'United Kingdom': [
    'Check the university’s accepted qualification, subject-grade, and course-specific entry requirements.',
    'Check English-language evidence, application deadlines, deposits, and current student-visa rules.',
  ],
  Canada: [
    'Check the institution’s credential equivalency, programme prerequisites, and current international-student policy.',
    'Check English-language evidence, application deadlines, tuition deposits, and current study-permit requirements.',
  ],
  'United States': [
    'Check each institution’s credential evaluation, course prerequisites, and published testing policy.',
    'Check English-language evidence, financial documentation, application deadlines, and current student-visa rules.',
  ],
  'Dubai, UAE': [
    'Check campus and programme recognition, certificate-attestation requirements, and course-specific entry criteria.',
    'Check English-language evidence, tuition payment schedules, and the institution’s current student-visa process.',
  ],
};

function recommendPathways(profile) {
  const routes = [];

  if (profile.qualification === 'secondary_in_progress') {
    routes.push({
      title: 'Complete secondary qualifications, then progress to a foundation programme',
      reason: 'This route lets you finish your current studies before checking university-level entry options.',
    });
    routes.push({
      title: 'Compare A-level or equivalent subject preparation',
      reason: 'Subject-focused preparation may suit courses with specific academic prerequisites.',
    });
  } else if (profile.qualification === 'secondary_complete') {
    routes.push({
      title: 'Compare foundation and international first-year entry routes',
      reason: 'Institutions assess secondary credentials differently, so a counsellor should compare direct and preparatory entry.',
    });
  } else if (profile.qualification === 'a_level') {
    routes.push({
      title: 'Check direct undergraduate entry against your subject grades',
      reason: 'Your subject combination and grades can affect course eligibility; foundation study may be an alternative.',
    });
  } else if (profile.qualification === 'diploma') {
    routes.push({
      title: 'Explore undergraduate entry or advanced standing',
      reason: 'A university must assess whether your diploma matches the chosen course and any credit-transfer policy.',
    });
  } else if (profile.qualification === 'bachelors') {
    routes.push({
      title: 'Compare taught postgraduate programmes',
      reason: 'Course fit usually depends on your degree subject, grades, experience, and the programme’s specific criteria.',
    });
  } else if (profile.qualification === 'masters') {
    routes.push({
      title: 'Explore specialist postgraduate or research routes',
      reason: 'A counsellor can compare your prior research or professional background with programme expectations.',
    });
  } else {
    routes.push({
      title: 'Request a qualification review before choosing an entry route',
      reason: 'A counsellor can map your certificate and transcript to options published by each institution.',
    });
  }

  const interestText = profile.interests.toLowerCase();
  if (/\b(medicine|medical|nursing|health|pharmacy|dentistry)\b/.test(interestText)) {
    routes.push({
      title: 'Check professional-course prerequisites early',
      reason: 'Health and regulated courses can require specific subjects, placements, tests, or professional approvals.',
    });
  } else if (/\b(engineering|computer|technology|science|stem|data)\b/.test(interestText)) {
    routes.push({
      title: 'Compare subject prerequisites for science and technology courses',
      reason: 'Mathematics and science preparation can vary by course and institution.',
    });
  } else if (/\b(law|business|finance|management|economics)\b/.test(interestText)) {
    routes.push({
      title: 'Compare course focus and progression options',
      reason: 'Programmes with similar names can have different specialisms, professional recognition, and progression routes.',
    });
  } else {
    routes.push({
      title: 'Narrow your subject interests to two or three course areas',
      reason: 'A shortlist makes it easier to compare entry requirements and suitable universities.',
    });
  }

  const requirements = [
    'Gather certificates, transcripts, grading scales, and any pending-result dates.',
    'Ask each institution which English-language evidence it accepts and when it is required.',
    'Compare official tuition, accommodation, living costs, deposits, and proof-of-funds rules with your annual budget.',
    'Check the chosen course’s recognition, work-placement expectations, and application deadlines.',
  ];

  for (const country of profile.countries) {
    requirements.push(...countryChecks[country]);
  }

  return {
    disclaimer: 'These are starting points for discussion, not admissions decisions or guarantees. Entry rules, costs, and visa policies vary by course and institution and must be checked with official sources.',
    routes,
    requirements: [...new Set(requirements)],
    nextStep: `Book a counsellor review with your certificates and transcript. Ask the counsellor to compare course entry criteria in ${profile.countries.join(', ')} against your ${qualificationLabels[profile.qualification].toLowerCase()}, annual budget, interests, and intended ${profile.startDate} start.`,
  };
}

module.exports = { qualificationLabels, recommendPathways };
