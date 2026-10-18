const yearTarget = document.getElementById('year');
if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;

  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('form-error', isError);
  element.classList.toggle('form-confirmation', !isError && Boolean(message));
}

const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach((item) => {
  const button = item.querySelector('.faq-question');
  if (!button) return;

  button.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    faqItems.forEach((faq) => {
      faq.classList.remove('open');
    });

    if (!isOpen) {
      item.classList.add('open');
    }
  });
});

const filterButtons = document.querySelectorAll('.pill');
const universityCards = document.querySelectorAll('.university-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.textContent.trim().toLowerCase();

    filterButtons.forEach((pill) => pill.classList.remove('active'));
    button.classList.add('active');

    universityCards.forEach((card) => {
      const matches = filter === 'all' || card.dataset.filter === filter;
      card.style.display = matches ? 'block' : 'none';
    });
  });
});

const form = document.querySelector('.apply-form');
if (form) {
  const message = document.getElementById('enquiryMessage');
  const submitButton = form.querySelector('.submit-btn');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton) submitButton.disabled = true;
    setMessage(message, 'Sending your enquiry...');

    try {
      const enquiry = Object.fromEntries(new FormData(form).entries());
      const result = await apiRequest('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(enquiry),
      });
      form.reset();
      setMessage(message, result.message);
    } catch (error) {
      setMessage(message, error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const plannerForm = document.getElementById('pathwayPlannerForm');
if (plannerForm) {
  const plannerMessage = document.getElementById('plannerMessage');
  const plannerResults = document.getElementById('pathwayResults');
  const startDateInput = document.getElementById('plannerStartDate');
  const now = new Date();
  startDateInput.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  plannerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(plannerForm);
    const countries = values.getAll('countries');
    if (!countries.length) {
      setMessage(plannerMessage, 'Choose at least one preferred country.', true);
      return;
    }

    const submitButton = plannerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setMessage(plannerMessage, 'Building your starting plan and sending it for counsellor review...');

    try {
      const result = await apiRequest('/api/pathway-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: values.get('name'),
          email: values.get('email'),
          phone: values.get('phone'),
          qualification: values.get('qualification'),
          interests: values.get('interests'),
          countries,
          annualBudgetNgn: Number(values.get('annualBudgetNgn')),
          startDate: values.get('startDate'),
          consent: values.get('consent') === 'on',
        }),
      });

      const routeList = document.getElementById('pathwayRoutes');
      routeList.replaceChildren();
      result.recommendations.routes.forEach((route) => {
        const item = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = route.title;
        const reason = document.createElement('p');
        reason.textContent = route.reason;
        item.append(title, reason);
        routeList.appendChild(item);
      });

      const requirements = document.getElementById('pathwayRequirements');
      requirements.replaceChildren();
      result.recommendations.requirements.forEach((requirement) => {
        const item = document.createElement('li');
        item.textContent = requirement;
        requirements.appendChild(item);
      });

      const budget = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(Number(values.get('annualBudgetNgn')));
      document.getElementById('pathwaySummary').textContent =
        `Based on ${values.get('qualification').replaceAll('_', ' ')}, interests in ${values.get('interests').trim()}, preferred destinations ${countries.join(', ')}, an approximate annual budget of ${budget}, and your ${values.get('startDate')} start date.`;
      document.getElementById('pathwayNextStep').textContent = result.recommendations.nextStep;
      document.getElementById('pathwayDisclaimer').textContent = result.recommendations.disclaimer;
      setMessage(plannerMessage, `Plan #${result.id} has been sent to the counselling team for review.`);
      plannerResults.hidden = false;
      plannerResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setMessage(plannerMessage, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById('editPathway').addEventListener('click', () => {
    plannerResults.hidden = true;
    document.getElementById('plannerStartDate').focus();
    plannerForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('studentPassword').value;
    if (submitButton) submitButton.disabled = true;
    setMessage(loginMessage, 'Signing in...');

    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ studentId, password }),
      });
      if (window.location.pathname.endsWith('/portal.html')) {
        window.location.reload();
      } else {
        window.location.href = 'portal.html#dashboard';
      }
    } catch (error) {
      setMessage(loginMessage, error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const dashboard = document.getElementById('dashboard');
if (dashboard) {
  dashboard.hidden = true;

  const renderDashboard = (data) => {
    const studentId = data.student.studentId;
    const welcomeTitle = dashboard.querySelector('.top-row h2');
    if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${studentId}`;
    const identity = document.getElementById('studentIdentity');
    if (identity) identity.textContent = studentId;
    const avatar = dashboard.querySelector('.user-avatar');
    if (avatar) avatar.textContent = studentId.charAt(0).toUpperCase();

    dashboard.querySelector('[data-metric="active"]').textContent = String(data.dashboard.exams.length).padStart(2, '0');
    dashboard.querySelector('[data-metric="average"]').textContent =
      data.dashboard.averageScore === null ? '—' : `${data.dashboard.averageScore}%`;
    const completedMetric = dashboard.querySelector('[data-metric="completed"]');
    if (completedMetric) completedMetric.textContent = String(data.dashboard.submissions.length).padStart(2, '0');

    const examList = document.getElementById('exams');
    examList.replaceChildren();
    data.dashboard.exams.forEach((exam) => {
      const card = document.createElement('article');
      card.className = 'exam-card';

      const heading = document.createElement('div');
      heading.className = 'exam-head';
      const title = document.createElement('h3');
      title.className = 'exam-title';
      title.textContent = exam.title;
      const badge = document.createElement('span');
      badge.className = exam.questions ? 'badge success' : 'badge warning';
      badge.textContent = exam.status;
      heading.append(title, badge);

      const details = document.createElement('div');
      details.className = 'exam-meta';
      ['questions', 'durationMinutes'].forEach((key) => {
        const detail = document.createElement('span');
        detail.textContent = key === 'questions'
          ? `${exam[key]} ${exam[key] === 1 ? 'question' : 'questions'}`
          : `${exam[key]} mins`;
        details.appendChild(detail);
      });
      const level = document.createElement('span');
      level.textContent = 'Level: Senior';
      details.appendChild(level);

      const footer = document.createElement('div');
      footer.className = 'exam-footer';
      const submission = data.dashboard.submissions.find((item) => item.examId === exam.id);
      const status = document.createElement('span');
      status.textContent = submission ? `Latest score: ${submission.score}%` : 'Ready to begin';
      const link = document.createElement('a');
      link.className = 'start-link';
      if (exam.questions) {
        link.href = 'exam.html';
        link.textContent = 'Begin Exam';
      } else {
        link.setAttribute('aria-disabled', 'true');
        link.textContent = 'Not available yet';
      }
      footer.append(status, link);

      card.append(heading, details, footer);
      examList.appendChild(card);
    });

    const activityList = document.getElementById('recentActivity');
    activityList.replaceChildren();
    const recentResults = data.dashboard.submissions.slice(0, 5);
    if (recentResults.length === 0) {
      const emptyState = document.createElement('li');
      emptyState.textContent = 'No exam submissions yet';
      activityList.appendChild(emptyState);
    } else {
      recentResults.forEach((result) => {
        const activity = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = data.dashboard.exams.find((item) => item.id === result.examId)?.title || result.examId;
        const score = document.createElement('span');
        score.textContent = `${result.score}%`;
        activity.append(title, score);
        activityList.appendChild(activity);
      });
    }

    dashboard.hidden = false;
    document.getElementById('loginPanel').hidden = true;
    document.getElementById('portalGrid').classList.add('is-authenticated');
  };

  apiRequest('/api/me')
    .then(renderDashboard)
    .catch((error) => {
      if (error.status !== 401) {
        setMessage(loginMessage, error.message, true);
      }
    });

  const logoutButton = document.getElementById('logoutButton');
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      window.location.href = 'portal.html';
    } catch (error) {
      logoutButton.disabled = false;
      setMessage(loginMessage, error.message, true);
    }
  });
}

const examPanel = document.querySelector('.exam-panel');
if (examPanel) {
  const timerNode = document.querySelector('.timer');
  const examMessage = document.getElementById('examMessage');
  const saveNotice = document.getElementById('saveNotice');
  const submitButtons = [
    document.getElementById('submitExam'),
    document.getElementById('submitExamTop'),
  ].filter(Boolean);
  const examId = 'english-assessment';
  const cardsNode = document.getElementById('questionCards');
  const questionList = document.querySelector('.question-list');
  let questions = [];
  let answers = {};
  let submitted = false;
  let timerInterval;
  let autosaveInterval;

  const updateExamProgress = () => {
    const answeredCount = questions.filter((question) => answers[question.id]).length;
    const percentage = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
    const progress = document.getElementById('examProgress');
    const progressBar = document.getElementById('examProgressBar');
    if (progress) progress.textContent = `${percentage}%`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
  };

  const renderExam = (data) => {
    questions = data.questions;
    answers = data.answers || {};
    document.getElementById('examTitle').textContent = data.exam.title;
    cardsNode.replaceChildren();
    questionList.replaceChildren();

    questions.forEach((question, index) => {
      const card = document.createElement('article');
      card.className = 'question-card';
      card.id = `card-${question.id}`;
      const number = document.createElement('div');
      number.className = 'question-number';
      number.textContent = `Question ${index + 1} of ${questions.length}`;
      const prompt = document.createElement('h2');
      prompt.textContent = question.prompt;
      const options = document.createElement('div');
      options.className = 'option-list';

      ['A', 'B', 'C', 'D'].forEach((key) => {
        const label = document.createElement('label');
        label.className = 'option-item';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `answer-${question.id}`;
        input.value = key;
        input.checked = answers[question.id] === key;
        input.addEventListener('change', () => {
          answers[question.id] = key;
          updateExamProgress();
          setMessage(examMessage, '');
          saveAnswer(question.id, key);
        });
        label.append(input, document.createTextNode(` ${key}. ${question.options[key]}`));
        options.appendChild(label);
      });

      card.append(number, prompt, options);
      cardsNode.appendChild(card);

      const jump = document.createElement('button');
      jump.type = 'button';
      jump.className = 'q-number';
      jump.textContent = String(index + 1);
      jump.setAttribute('aria-label', `Go to question ${index + 1}`);
      jump.addEventListener('click', () => card.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      questionList.appendChild(jump);
    });
    updateExamProgress();

    let totalSeconds = data.exam.durationMinutes * 60;
    const updateTimer = () => {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      timerNode.textContent = `⏱ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    updateTimer();
    timerInterval = setInterval(() => {
      totalSeconds -= 1;
      updateTimer();
      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        submitExam(true);
      }
    }, 1000);
    autosaveInterval = setInterval(saveAllAnswers, 15000);
  };

  apiRequest('/api/me')
    .then(() => apiRequest(`/api/exams/${examId}`))
    .then((data) => {
      renderExam(data);
      if (Object.keys(answers).length && saveNotice) {
        saveNotice.textContent = 'Restored your saved responses.';
      }
    })
    .catch((error) => {
      if (error.status === 401) {
        window.location.href = 'portal.html';
      } else {
        setMessage(examMessage, error.message, true);
      }
    });

  const saveAnswer = async (questionId, answer) => {
    if (submitted) return;
    try {
      await apiRequest(`/api/exams/${examId}/answers/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify({ answer }),
      });
      if (saveNotice) saveNotice.textContent = 'Your response was saved.';
    } catch (error) {
      if (saveNotice) saveNotice.textContent = `Could not save response: ${error.message}`;
    }
  };

  const saveAllAnswers = async () => {
    const selected = Object.entries(answers);
    if (!selected.length || submitted) return;
    await Promise.all(selected.map(([questionId, answer]) => saveAnswer(questionId, answer)));
  };

  const submitExam = async (timedOut = false) => {
    if (submitted) return;
    if (!questions.length || (!timedOut && questions.some((question) => !answers[question.id]))) {
      setMessage(examMessage, 'Answer every question before submitting.', true);
      return;
    }

    submitButtons.forEach((button) => { button.disabled = true; });
    try {
      const result = await apiRequest(`/api/exams/${examId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ answers, timedOut }),
      });
      submitted = true;
      clearInterval(autosaveInterval);
      clearInterval(timerInterval);
      setMessage(examMessage, `Exam submitted. Your score is ${result.submission.score}%.`);
      if (saveNotice) saveNotice.textContent = 'Your exam has been submitted.';
      document.querySelectorAll('input[name="answer"]').forEach((input) => { input.disabled = true; });
      submitButtons.forEach((button) => { button.textContent = 'Submitted'; });
      document.querySelectorAll('.q-number').forEach((button) => { button.disabled = true; });
      if (timedOut) {
        setMessage(examMessage, `Time is up. Your exam was submitted with a score of ${result.submission.score}%.`);
      }
    } catch (error) {
      setMessage(examMessage, error.message, true);
      submitButtons.forEach((button) => { button.disabled = false; });
    }
  };

  submitButtons.forEach((button) => button.addEventListener('click', submitExam));

}
