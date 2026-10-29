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

const GOAL_KEY = 'worknest-goal';
const goalPresets = { retire: 10000, home: 10000, debt: 5000, safety: 8000, getaway: 3000, business: 5000, other: 2000 };

function currentGoal() {
  const requested = new URLSearchParams(location.search).get('goal');
  if (goalPresets[requested]) return requested;
  try {
    const stored = localStorage.getItem(GOAL_KEY);
    if (goalPresets[stored]) return stored;
  } catch (error) {
    /* Storage can be blocked. */
  }
  return 'home';
}

function storeGoal(goal) {
  try {
    localStorage.setItem(GOAL_KEY, goal);
  } catch (error) {
    /* Ignore quota and privacy errors. */
  }
}

let activeGoal = currentGoal();

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
  }

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

function renderYear() {
  const rateField = document.getElementById('example-rate');
  const hoursField = document.getElementById('example-hours');
  if (!rateField || !hoursField) return;
  const rate = readNonNegative(rateField);
  const hours = readNonNegative(hoursField);
  const valid = rate !== null && hours !== null;
  const text = valid ? formatCad(rate * hours * 52) : '\u2014';
  document.querySelectorAll('[data-year-total]').forEach((el) => { el.textContent = text; });
  const wait = document.getElementById('wait-cost');
  if (wait) {
    wait.innerHTML = valid && rate * hours > 0
      ? `<strong>Every year you wait costs this plan about ${text}.</strong>`
      : '<strong>Add a rate and paid hours to see what waiting costs.</strong>';
  }
}

function renderGoal() {
  const result = document.getElementById('goal-result');
  const amountInput = document.getElementById('goal-amount');
  const rateField = document.getElementById('example-rate');
  const hoursField = document.getElementById('example-hours');
  if (!result || !amountInput || !rateField || !hoursField) return;

  const amount = readNonNegative(amountInput);
  const rate = readNonNegative(rateField);
  const hours = readNonNegative(hoursField);

  if (amount === null || rate === null || hours === null) {
    result.textContent = 'Enter a goal, a rate and weekly hours of zero or more to see how long it could take.';
    return;
  }
  const weekly = rate * hours;
  if (weekly <= 0) {
    result.textContent = 'At zero paid hours there is no income to plan with. Add some hours to see a timeline.';
    return;
  }
  const weeks = Math.max(1, Math.ceil(amount / weekly));
  const months = weeks >= 8 ? ` (about ${Math.round(weeks / 4.345)} months)` : '';
  result.textContent = `At ${formatCad(weekly)} a week, ${formatCad(amount)} takes about ${weeks} week${weeks === 1 ? '' : 's'}${months}, before taxes.`;
}

const goalField = document.getElementById('goal-field');
const goalSelect = document.getElementById('goal');
if (goalSelect) {
  activeGoal = currentGoal();
  goalSelect.value = activeGoal;
  goalSelect.addEventListener('change', () => {
    activeGoal = goalSelect.value;
    storeGoal(activeGoal);
    if (goalField) goalField.value = activeGoal;
  });
}

if (goalField) {
  activeGoal = currentGoal();
  goalField.value = activeGoal;
  goalField.addEventListener('change', () => {
    activeGoal = goalField.value;
    storeGoal(activeGoal);
    if (goalSelect) goalSelect.value = activeGoal;
  });
}

if (document.querySelector('[data-schedule], #availability, [data-schedule-label]')) {
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
  rateInput.addEventListener('input', () => { renderEarnings(); renderGoal(); renderYear(); });
  hoursInput.addEventListener('input', () => { renderEarnings(); renderGoal(); renderYear(); });
  renderEarnings();
  renderGoal();
  renderYear();
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

const REVIEWS = [];
(function renderReviews() {
  const section = document.getElementById('reviews');
  const list = document.getElementById('review-list');
  if (!section || !list) return;
  const demo = new URLSearchParams(location.search).has('reviews-demo');
  const items = REVIEWS.length ? REVIEWS : (demo ? [
    { name: 'Reviewer name', place: 'Province', stars: 5, text: 'Sample layout only. A real review goes here.', sample: true },
    { name: 'Reviewer name', place: 'Province', stars: 4, text: 'Sample layout only. Longer reviews wrap onto several lines like this, so a full paragraph of feedback still reads well in the card.', sample: true },
    { name: 'Reviewer name', place: 'Province', stars: 2, text: 'Sample layout only. Mixed and critical reviews sit beside the good ones.', sample: true }
  ] : []);
  if (!items.length) return;
  items.forEach((r) => {
    const card = document.createElement('article');
    card.className = 'review' + (r.sample ? ' review-sample' : '');
    const stars = '\u2605'.repeat(r.stars) + '\u2606'.repeat(5 - r.stars);
    card.innerHTML = '<div class="review-top"><span class="review-avatar"></span><div><strong></strong><small></small></div></div><p class="review-stars" aria-label=""></p><p class="review-text"></p>';
    card.querySelector('.review-avatar').textContent = (r.name || '?').charAt(0);
    card.querySelector('strong').textContent = r.name;
    card.querySelector('small').textContent = r.place || '';
    const st = card.querySelector('.review-stars');
    st.textContent = stars;
    st.setAttribute('aria-label', r.stars + ' out of 5 stars');
    card.querySelector('.review-text').textContent = r.text;
    list.appendChild(card);
  });
  section.hidden = false;
})();

(function earningsSlider() {
  const slider = document.getElementById('example-hours');
  const options = document.querySelectorAll('.rate-option');
  const total = document.getElementById('earnings-total');
  if (!slider || !options.length || !total) return;
  const out = document.getElementById('hours-out');
  const yearEl = document.getElementById('earnings-year');
  const note = document.getElementById('earnings-note');
  let active = document.querySelector('.rate-option.active') || options[0];
  function render() {
    const rate = Number(active.dataset.rate);
    const hours = Number(slider.value);
    const weekly = rate * hours;
    out.textContent = hours + ' hours';
    slider.style.setProperty('--pct', ((hours - slider.min) / (slider.max - slider.min) * 100) + '%');
    total.textContent = formatCad(Math.round(weekly * 52 / 12));
    yearEl.textContent = 'Leave your evenings empty and that is ' + formatCad(weekly * 52) + ' a year you never see.';
    note.textContent = 'Example: ' + active.dataset.role + ' at CAD $' + rate + ' an hour, before taxes. The company sets the real rate for each opening.';
  }
  options.forEach((option) => option.addEventListener('click', () => {
    active = option;
    options.forEach((o) => { o.classList.toggle('active', o === option); o.setAttribute('aria-pressed', String(o === option)); });
    render();
  }));
  slider.addEventListener('input', render);
  render();
})();

(function navAndSticky() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const sticky = document.querySelector('.sticky-cta');
  const form = document.getElementById('enquire');
  if (sticky && form) {
    let formVisible = false;
    const update = () => { sticky.hidden = formVisible || window.scrollY < 500; };
    new IntersectionObserver((entries) => { formVisible = entries[0].isIntersecting; update(); }).observe(form);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
