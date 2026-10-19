async function adminRequest(url, options = {}) {
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

const adminLoginPanel = document.getElementById('adminLoginPanel');
const adminApp = document.getElementById('adminApp');
const adminMessage = document.getElementById('adminMessage');
const adminLogout = document.getElementById('adminLogout');

function showAdminMessage(message, isError = false) {
  adminMessage.textContent = message;
  adminMessage.classList.toggle('form-error', isError);
  adminMessage.classList.toggle('form-confirmation', !isError && Boolean(message));
}

function cell(value) {
  const td = document.createElement('td');
  td.textContent = value ?? '';
  return td;
}

function emptyRow(tbody, columnCount, text) {
  const row = document.createElement('tr');
  const message = document.createElement('td');
  message.colSpan = columnCount;
  message.textContent = text;
  row.appendChild(message);
  tbody.appendChild(row);
}

function button(label, className, handler) {
  const control = document.createElement('button');
  control.type = 'button';
  control.className = `admin-action${className ? ` ${className}` : ''}`;
  control.textContent = label;
  control.addEventListener('click', handler);
  return control;
}

function formatDate(value) {
  const date = new Date(`${value}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function loadOverview() {
  const { students, enquiries, pathwayPlans, submissions, questions } = await adminRequest('/api/admin/overview');
  document.getElementById('metricStudents').textContent = students.total;
  document.getElementById('metricStudentsActive').textContent = `${students.active || 0} active`;
  document.getElementById('metricPathwayPlans').textContent = pathwayPlans.new || 0;
  document.getElementById('metricPathwayPlansTotal').textContent = `${pathwayPlans.total} total`;
  document.getElementById('metricEnquiries').textContent = enquiries.new || 0;
  document.getElementById('metricEnquiriesTotal').textContent = `${enquiries.total} total`;
  document.getElementById('metricSubmissions').textContent = submissions.total;
  document.getElementById('metricQuestions').textContent = questions.total;
}

async function loadStudents() {
  const { students } = await adminRequest('/api/admin/students');
  const tbody = document.getElementById('studentsTable');
  tbody.replaceChildren();
  if (!students.length) return emptyRow(tbody, 5, 'No student accounts have been created yet.');

  students.forEach((student) => {
    const row = document.createElement('tr');
    row.append(
      cell(student.studentId),
      cell(formatDate(student.createdAt)),
      cell(student.submissions),
      cell(student.isActive ? 'Active' : 'Disabled')
    );
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    actions.append(
      button('Reset password', '', () => openPasswordDialog(student.studentId)),
      button(student.isActive ? 'Disable' : 'Enable', student.isActive ? 'danger' : '', async () => {
        try {
          await adminRequest(`/api/admin/students/${encodeURIComponent(student.studentId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: !student.isActive }),
          });
          showAdminMessage(`Student ${student.studentId} ${student.isActive ? 'disabled' : 'enabled'}.`);
          await Promise.all([loadStudents(), loadOverview()]);
        } catch (error) {
          showAdminMessage(error.message, true);
        }
      })
    );
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  });
}

async function loadEnquiries() {
  const { enquiries } = await adminRequest('/api/admin/enquiries');
  const tbody = document.getElementById('enquiriesTable');
  tbody.replaceChildren();
  if (!enquiries.length) return emptyRow(tbody, 7, 'No consultation enquiries have been received.');

  enquiries.forEach((enquiry) => {
    const row = document.createElement('tr');
    const contact = document.createElement('td');
    const email = document.createElement('a');
    email.href = `mailto:${enquiry.email}`;
    email.textContent = enquiry.email;
    const phone = document.createElement('div');
    phone.textContent = enquiry.phone;
    contact.append(email, phone);

    const interest = document.createElement('td');
    interest.textContent = `${enquiry.destination}\n${enquiry.programme}`;
    const message = document.createElement('td');
    message.className = 'message-cell';
    message.textContent = enquiry.message;

    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'status-select';
    [['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = enquiry.status === value;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await adminRequest(`/api/admin/enquiries/${enquiry.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: select.value }),
        });
        showAdminMessage(`Enquiry from ${enquiry.name} marked ${select.value}.`);
        await loadOverview();
      } catch (error) {
        showAdminMessage(error.message, true);
        select.value = enquiry.status;
      } finally {
        select.disabled = false;
      }
    });
    statusCell.appendChild(select);

    const actionsCell = document.createElement('td');
    actionsCell.appendChild(button('Delete', 'danger', async () => {
      if (!window.confirm(`Delete the enquiry from ${enquiry.name}? This cannot be undone.`)) return;
      try {
        await adminRequest(`/api/admin/enquiries/${enquiry.id}`, { method: 'DELETE' });
        showAdminMessage('Enquiry deleted.');
        await Promise.all([loadEnquiries(), loadOverview()]);
      } catch (error) {
        showAdminMessage(error.message, true);
      }
    }));

    row.append(cell(enquiry.name), contact, interest, message, cell(formatDate(enquiry.createdAt)), statusCell, actionsCell);
    tbody.appendChild(row);
  });
}

async function loadPathwayPlans() {
  const { plans } = await adminRequest('/api/admin/pathway-plans');
  const list = document.getElementById('pathwayPlansList');
  list.replaceChildren();
  if (!plans.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-hint';
    empty.textContent = 'No pathway plans have been submitted yet.';
    list.appendChild(empty);
    return;
  }

  plans.forEach((plan) => {
    const card = document.createElement('article');
    card.className = 'pathway-plan-card';
    const title = document.createElement('h3');
    title.textContent = `${plan.name} · Plan #${plan.id}`;

    const profile = document.createElement('div');
    profile.className = 'pathway-plan-profile';
    const email = document.createElement('a');
    email.href = `mailto:${plan.email}`;
    email.textContent = plan.email;
    const phone = document.createElement('a');
    phone.href = `tel:${plan.phone.replace(/[^\d+]/g, '')}`;
    phone.textContent = plan.phone;
    const details = document.createElement('span');
    details.textContent = `${plan.qualificationLabel} · ${plan.countries.join(', ')} · Start ${plan.startDate} · ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(plan.annualBudgetNgn)} / year`;
    const created = document.createElement('span');
    created.textContent = `Received ${formatDate(plan.createdAt)}`;
    profile.append(email, phone, details, created);

    const interests = document.createElement('p');
    interests.textContent = `Interests: ${plan.interests}`;
    const recommendations = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'View routes and requirements';
    const routeList = document.createElement('ol');
    plan.recommendations.routes.forEach((route) => {
      const item = document.createElement('li');
      const routeTitle = document.createElement('strong');
      routeTitle.textContent = `${route.title} — `;
      item.append(routeTitle, document.createTextNode(route.reason));
      routeList.appendChild(item);
    });
    const requirementList = document.createElement('ul');
    plan.recommendations.requirements.forEach((requirement) => {
      const item = document.createElement('li');
      item.textContent = requirement;
      requirementList.appendChild(item);
    });
    const nextStep = document.createElement('p');
    nextStep.textContent = `Suggested next step: ${plan.recommendations.nextStep}`;
    const disclaimer = document.createElement('p');
    disclaimer.textContent = plan.recommendations.disclaimer;
    recommendations.append(summary, routeList, requirementList, nextStep, disclaimer);

    const reviewForm = document.createElement('form');
    reviewForm.className = 'pathway-plan-review';
    const statusLabel = document.createElement('label');
    statusLabel.append(document.createTextNode('Review status'));
    const status = document.createElement('select');
    status.className = 'status-select';
    status.name = 'status';
    [['new', 'New'], ['reviewed', 'Reviewed'], ['contacted', 'Contacted'], ['closed', 'Closed']]
      .forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = plan.status === value;
        status.appendChild(option);
      });
    statusLabel.appendChild(status);

    const notesLabel = document.createElement('label');
    notesLabel.append(document.createTextNode('Counsellor notes'));
    const notes = document.createElement('textarea');
    notes.name = 'counsellorNotes';
    notes.maxLength = 2000;
    notes.placeholder = 'Record the review or agreed follow-up for the counselling team.';
    notes.value = plan.counsellorNotes;
    notesLabel.appendChild(notes);

    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'btn btn-primary';
    save.textContent = 'Save review';
    reviewForm.append(statusLabel, notesLabel, save);
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        await adminRequest(`/api/admin/pathway-plans/${plan.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: status.value, counsellorNotes: notes.value }),
        });
        showAdminMessage(`Pathway plan #${plan.id} review saved.`);
        await Promise.all([loadPathwayPlans(), loadOverview()]);
      } catch (error) {
        showAdminMessage(error.message, true);
        save.disabled = false;
      }
    });

    const remove = button('Delete plan', 'danger', async () => {
      if (!window.confirm(`Delete pathway plan #${plan.id} and its contact details? This cannot be undone.`)) return;
      try {
        await adminRequest(`/api/admin/pathway-plans/${plan.id}`, { method: 'DELETE' });
        showAdminMessage(`Pathway plan #${plan.id} deleted.`);
        await Promise.all([loadPathwayPlans(), loadOverview()]);
      } catch (error) {
        showAdminMessage(error.message, true);
      }
    });
    card.append(title, profile, interests, recommendations, reviewForm, remove);
    list.appendChild(card);
  });
}

function questionField(form, label, name, value, isWide = false) {
  const wrapper = document.createElement('label');
  if (isWide) wrapper.className = 'wide-field';
  wrapper.append(document.createTextNode(label));
  const input = name === 'prompt' ? document.createElement('textarea') : document.createElement('input');
  input.name = name;
  input.value = value;
  input.required = true;
  input.maxLength = name === 'prompt' ? 1000 : 500;
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

function createQuestionEditor(question, index) {
  const section = document.createElement('article');
  section.className = 'question-admin-card';
  const heading = document.createElement('h3');
  heading.textContent = `Question ${index + 1}`;
  const form = document.createElement('form');
  form.className = 'admin-form question-editor';
  questionField(form, 'Question', 'prompt', question.prompt, true);
  ['A', 'B', 'C', 'D'].forEach((option) => {
    questionField(form, `Option ${option}`, `option${option}`, question.options[option]);
  });

  const answerLabel = document.createElement('label');
  answerLabel.append(document.createTextNode('Correct option'));
  const answerSelect = document.createElement('select');
  answerSelect.name = 'correctAnswer';
  ['A', 'B', 'C', 'D'].forEach((answer) => {
    const option = document.createElement('option');
    option.value = answer;
    option.textContent = answer;
    answerSelect.appendChild(option);
  });
  answerSelect.value = question.correctAnswer;
  answerLabel.appendChild(answerSelect);
  form.appendChild(answerLabel);

  const actions = document.createElement('div');
  actions.className = 'question-actions';
  const activeLabel = document.createElement('label');
  const activeInput = document.createElement('input');
  activeInput.type = 'checkbox';
  activeInput.name = 'isActive';
  activeInput.checked = question.isActive;
  activeLabel.append(activeInput, document.createTextNode(' Active'));
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn btn-primary';
  save.textContent = 'Save question';
  actions.append(activeLabel, save, button('Delete question', 'danger', async () => {
    if (!window.confirm(`Delete question ${index + 1}? This cannot be undone.`)) return;
    try {
      await adminRequest(`/api/admin/exam/questions/${encodeURIComponent(question.id)}`, { method: 'DELETE' });
      showAdminMessage('Question deleted.');
      await Promise.all([loadExam(), loadOverview()]);
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  }));
  form.appendChild(actions);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    try {
      await adminRequest(`/api/admin/exam/questions/${encodeURIComponent(question.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          prompt: values.get('prompt'),
          options: Object.fromEntries(['A', 'B', 'C', 'D'].map((key) => [key, values.get(`option${key}`)])),
          correctAnswer: values.get('correctAnswer'),
          isActive: values.get('isActive') === 'on',
        }),
      });
      showAdminMessage(`Question ${index + 1} saved.`);
      await Promise.all([loadExam(), loadOverview()]);
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  });

  section.append(heading, form);
  return section;
}

async function loadExam() {
  const { exam, questions } = await adminRequest('/api/admin/exam');
  const settings = document.getElementById('examSettingsForm');
  settings.elements.title.value = exam.title;
  settings.elements.durationMinutes.value = exam.durationMinutes;
  const list = document.getElementById('examQuestions');
  list.replaceChildren();
  questions.forEach((question, index) => list.appendChild(createQuestionEditor(question, index)));
}

async function loadResults() {
  const { results } = await adminRequest('/api/admin/results');
  const tbody = document.getElementById('resultsTable');
  tbody.replaceChildren();
  if (!results.length) return emptyRow(tbody, 5, 'No exam results have been submitted yet.');
  results.forEach((result) => {
    const row = document.createElement('tr');
    row.append(
      cell(result.studentId),
      cell(result.examTitle || 'Exam'),
      cell(`${result.score}%`),
      cell(result.totalQuestions),
      cell(formatDate(result.submittedAt))
    );
    tbody.appendChild(row);
  });
}

async function refreshAdminData() {
  await Promise.all([loadOverview(), loadStudents(), loadEnquiries(), loadPathwayPlans(), loadExam(), loadResults()]);
}

function openPasswordDialog(studentId) {
  const dialog = document.getElementById('passwordDialog');
  const form = document.getElementById('resetPasswordForm');
  form.elements.studentId.value = studentId;
  form.elements.password.value = '';
  dialog.showModal();
}

document.getElementById('adminLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  showAdminMessage('Signing in...');
  const values = new FormData(form);
  try {
    const result = await adminRequest('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: values.get('username'), password: values.get('password') }),
    });
    document.getElementById('adminIdentity').textContent = result.admin.username;
    adminLoginPanel.hidden = true;
    adminApp.hidden = false;
    adminLogout.hidden = false;
    showAdminMessage('');
    await refreshAdminData();
  } catch (error) {
    showAdminMessage(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('createStudentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  try {
    const result = await adminRequest('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify({ studentId: values.get('studentId'), password: values.get('password') }),
    });
    form.reset();
    showAdminMessage(`Student ${result.student.studentId} created. Give their password to them privately.`);
    await Promise.all([loadStudents(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
});

document.getElementById('changeAdminPasswordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const password = values.get('password');
  if (password !== values.get('confirmation')) {
    showAdminMessage('The password confirmation does not match.', true);
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await adminRequest('/api/admin/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    form.reset();
    showAdminMessage('Administrator password changed. Keep your new password private.');
  } catch (error) {
    showAdminMessage(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('examSettingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  try {
    await adminRequest('/api/admin/exam', {
      method: 'PUT',
      body: JSON.stringify({ title: values.get('title'), durationMinutes: Number(values.get('durationMinutes')) }),
    });
    showAdminMessage('Exam settings saved.');
    await loadExam();
  } catch (error) {
    showAdminMessage(error.message, true);
  }
});

document.getElementById('createQuestionForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  try {
    await adminRequest('/api/admin/exam/questions', {
      method: 'POST',
      body: JSON.stringify({
        prompt: values.get('prompt'),
        options: Object.fromEntries(['A', 'B', 'C', 'D'].map((key) => [key, values.get(`option${key}`)])),
        correctAnswer: values.get('correctAnswer'),
      }),
    });
    form.reset();
    showAdminMessage('Question added to the exam.');
    await Promise.all([loadExam(), loadOverview()]);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const studentId = values.get('studentId');
  const saveButton = document.getElementById('saveStudentPassword');
  saveButton.disabled = true;
  try {
    await adminRequest(`/api/admin/students/${encodeURIComponent(studentId)}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: values.get('password') }),
    });
    document.getElementById('passwordDialog').close();
    showAdminMessage(`Password for ${studentId} changed. Share the new password privately.`);
  } catch (error) {
    showAdminMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById('cancelPassword').addEventListener('click', () => {
  document.getElementById('passwordDialog').close();
});

adminLogout.addEventListener('click', async () => {
  adminLogout.disabled = true;
  try {
    await adminRequest('/api/admin/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch (error) {
    showAdminMessage(error.message, true);
    adminLogout.disabled = false;
  }
});

adminRequest('/api/admin/overview')
  .then(async () => {
    adminLoginPanel.hidden = true;
    adminApp.hidden = false;
    adminLogout.hidden = false;
    const { admin } = await adminRequest('/api/admin/me');
    document.getElementById('adminIdentity').textContent = admin.username;
    await refreshAdminData();
  })
  .catch((error) => {
    if (error.status !== 401) showAdminMessage(error.message, true);
  });
