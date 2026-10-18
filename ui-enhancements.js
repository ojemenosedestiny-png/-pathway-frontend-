const menuToggle = document.querySelector('.menu-toggle');
document.querySelectorAll('input[type="password"]').forEach((input, index) => {
  if (!input.id) input.id = `password-field-${index}`;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.textContent = 'Show password';
  toggle.setAttribute('aria-controls', input.id);
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Hide password' : 'Show password';
    toggle.setAttribute('aria-pressed', String(visible));
  });
  input.insertAdjacentElement('afterend', toggle);
});

document.querySelectorAll('[data-table-search]').forEach((input) => {
  const table = document.getElementById(input.dataset.tableSearch);
  const status = document.querySelector(`[data-table-status="${input.dataset.tableSearch}"]`);
  const count = document.getElementById(`${input.dataset.tableSearch}Count`);
  const applyFilter = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    let total = 0;
    for (const row of table.rows) {
      if (row.cells.length === 1 && row.cells[0].colSpan > 1) continue;
      total += 1;
      const matchesQuery = row.textContent.toLowerCase().includes(query);
      const matchesStatus = !status?.value || row.querySelector('.status-select')?.value === status.value;
      row.hidden = !(matchesQuery && matchesStatus);
      if (!row.hidden) shown += 1;
    }
    count.textContent = `${shown} of ${total} records shown${total && !shown ? ' — no matching records' : ''}`;
  };
  input.addEventListener('input', applyFilter);
  status?.addEventListener('change', applyFilter);
  table.addEventListener('change', applyFilter);
  new MutationObserver(applyFilter).observe(table, {childList:true,subtree:true});
  applyFilter();
});
document.querySelectorAll('[data-exam]').forEach(link => {
  link.addEventListener('click', () => {
    const form = document.getElementById('apply');
    form.elements.programme.value = link.dataset.exam;
    if (link.dataset.destination) form.elements.destination.value = link.dataset.destination;
  });
});
const mainNavigation = document.querySelector('.main-nav');
if (menuToggle && mainNavigation) {
  const closeMenu = () => {
    mainNavigation.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = 'Menu';
  };
  menuToggle.addEventListener('click', () => {
    const open = mainNavigation.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? 'Close' : 'Menu';
  });
  mainNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mainNavigation.classList.contains('is-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
}

document.querySelectorAll('.faq-question').forEach((button, index) => {
  const answer = button.nextElementSibling;
  answer.id = `faq-answer-${index}`;
  button.setAttribute('aria-controls', answer.id);
  button.setAttribute('aria-expanded', String(button.parentElement.classList.contains('open')));
  button.addEventListener('click', () => {
    document.querySelectorAll('.faq-question').forEach((question) => {
      question.setAttribute('aria-expanded', String(question.parentElement.classList.contains('open')));
    });
  });
});

// Keep the original text and spacing intact while introducing each headline word.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if (document.body.classList.contains('pathway-home') && !motionPreference.matches) {
  const headline = document.querySelector('.hero-copy h1');
  if (headline) {
    const walker = document.createTreeWalker(headline, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    let wordIndex = 0;
    textNodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part || /^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
        } else {
          const word = document.createElement('span');
          word.className = 'headline-word';
          word.textContent = part;
          word.style.setProperty('--word-delay', `${wordIndex++ * 75}ms`);
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    headline.classList.add('headline-animated');
  }
}

// Animate each section heading once, without hiding content before JavaScript loads.
if (document.body.classList.contains('pathway-home') &&
    !motionPreference.matches &&
    'IntersectionObserver' in window) {
  const headingObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.section-head, .contact-panel > h2, .planner-guide > h3').forEach(heading => headingObserver.observe(heading));
}

const plannerGuide = document.querySelector('.planner-guide');
const resultsPanel = document.getElementById('pathwayResults');
if (plannerGuide && resultsPanel) {
  const syncGuide = () => { plannerGuide.hidden = !resultsPanel.hidden; };
  new MutationObserver(syncGuide).observe(resultsPanel, { attributes: true, attributeFilter: ['hidden'] });
  syncGuide();
}

document.querySelectorAll('.filter-pills .pill').forEach((button) => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-pills .pill').forEach((pill) => {
      pill.setAttribute('aria-pressed', String(pill.classList.contains('active')));
    });
  });
});
