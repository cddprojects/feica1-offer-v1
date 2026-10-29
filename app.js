const scheduleContent = {
  evenings: {
    heading: 'Evening hours.<br>Your preference.',
    description: 'You prefer evening work. Confirm the actual hours when reviewing an opportunity.',
    label: 'evenings',
    days: [1, 3]
  },
  weekends: {
    heading: 'Weekend hours.<br>Your preference.',
    description: 'You prefer weekend work. Confirm the actual hours when reviewing an opportunity.',
    label: 'weekends',
    days: [5, 6]
  },
  flexible: {
    heading: 'Variable hours.<br>Your preference.',
    description: 'Your availability varies. Confirm whether an opportunity can accommodate your schedule.',
    label: 'a changing schedule',
    days: [0, 2, 5]
  }
};

const SCHEDULE_KEY = 'worknest-schedule';
const PAID_WEEKS = 4;

function readStoredSchedule() {
  try {
    const value = localStorage.getItem(SCHEDULE_KEY);
    if (scheduleContent[value]) return value;
  } catch (error) {
    /* Storage can be blocked. The links still carry the choice. */
  }
  return null;
}

function writeStoredSchedule(key) {
  try {
    localStorage.setItem(SCHEDULE_KEY, key);
  } catch (error) {
    /* Ignore quota and privacy errors. */
  }
}

function scheduleFromPage() {
  const requested = new URLSearchParams(location.search).get('hours');
  if (scheduleContent[requested]) return requested;
  return readStoredSchedule() || 'evenings';
}

function stampApplyLinks(key) {
  const href = `apply.html?hours=${encodeURIComponent(key)}`;
  document.querySelectorAll('[data-apply-link]').forEach((link) => {
    link.setAttribute('href', href);
  });
}

function selectSchedule(key, persist) {
  const content = scheduleContent[key];
  if (!content) return;

  document.querySelectorAll('[data-schedule]').forEach((button) => {
    const active = button.dataset.schedule === key;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const heading = document.getElementById('schedule-heading');
  if (heading) heading.innerHTML = content.heading;

  const description = document.getElementById('schedule-description');
  if (description) description.textContent = content.description;

  document.querySelectorAll('[data-schedule-label]').forEach((el) => {
    el.textContent = `Your preference: ${content.label}`;
  });

  const slots = document.getElementById('calendar-slots');
  if (slots) {
    [...slots.children].forEach((slot, index) => {
      slot.classList.toggle('selected', content.days.includes(index));
    });
  }

  const availability = document.getElementById('availability');
  if (availability && availability.value !== key) availability.value = key;

  if (persist) {
    writeStoredSchedule(key);
    if (document.body.dataset.page === 'apply' || document.body.dataset.page === 'availability') {
      const next = `${location.pathname}?hours=${encodeURIComponent(key)}${location.hash}`;
      history.replaceState(null, '', next);
    }
  }

  stampApplyLinks(key);
}

function formatCad(amount) {
  const cents = Math.round(amount * 100);
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const suffix = fraction === 0 ? '' : `.${String(fraction).padStart(2, '0')}`;
  return `CAD $${sign}${grouped}${suffix}`;
}

function readNonNegative(input) {
  const raw = input.value.trim();
  if (raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function formatPlain(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function renderEarnings() {
  const total = document.getElementById('earnings-total');
  const rateInput = document.getElementById('example-rate');
  const hoursInput = document.getElementById('example-hours');
  if (!total || !rateInput || !hoursInput) return;

  const rate = readNonNegative(rateInput);
  const hours = readNonNegative(hoursInput);
  const formula = document.getElementById('earnings-formula');

  if (rate === null || hours === null) {
    total.textContent = '\u2014';
    if (formula) formula.textContent = 'Enter a rate and hours of zero or more to see an example.';
    return;
  }

  total.textContent = formatCad(rate * hours * PAID_WEEKS);
  if (formula) {
    formula.textContent = `CAD $${formatPlain(rate)} \u00d7 ${formatPlain(hours)} hours \u00d7 ${PAID_WEEKS} weeks, before taxes.`;
  }
}

if (document.querySelector('[data-schedule], #availability, [data-schedule-label], [data-apply-link]')) {
  selectSchedule(scheduleFromPage(), false);
}

document.querySelectorAll('[data-schedule]').forEach((button) => {
  button.addEventListener('click', () => selectSchedule(button.dataset.schedule, true));
});

const availabilityField = document.getElementById('availability');
if (availabilityField) {
  availabilityField.addEventListener('change', (event) => selectSchedule(event.target.value, true));
}

const rateInput = document.getElementById('example-rate');
const hoursInput = document.getElementById('example-hours');
if (rateInput && hoursInput) {
  rateInput.addEventListener('input', renderEarnings);
  hoursInput.addEventListener('input', renderEarnings);
  renderEarnings();
}

const enquiryForm = document.getElementById('enquiry-form');
if (enquiryForm) {
  enquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = document.getElementById('form-result');
    if (!result) return;
    result.textContent = 'Preview complete. In the live service, this is where you would receive the next steps. This demo has not sent or saved your details.';
    result.hidden = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    result.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'nearest' });
  });
}

const attachmentDialog = document.getElementById('review-attachment');
if (attachmentDialog) {
  let attachmentTrigger;
  let previousBodyOverflow = '';

  document.querySelectorAll('[data-chat-preview]').forEach((button) => {
    button.addEventListener('click', () => {
      const template = document.getElementById(button.dataset.chatPreview);
      if (!template || attachmentDialog.open) return;
      attachmentTrigger = button;
      document.getElementById('attachment-title').textContent = button.dataset.chatTitle;
      document.getElementById('attachment-content').replaceChildren(template.content.cloneNode(true));
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      attachmentDialog.showModal();
    });
  });

  document.getElementById('close-attachment').addEventListener('click', () => attachmentDialog.close());
  attachmentDialog.addEventListener('close', () => {
    document.body.style.overflow = previousBodyOverflow;
    attachmentTrigger?.focus({ preventScroll: true });
  });
}

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
