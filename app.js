'use strict';
const $ = (selector) => document.querySelector(selector);
const html = JobCore.escapeHTML;
const isProfile = (value) =>
  value && ['first', 'last', 'email', 'link'].every((key) => typeof value[key] === 'string');
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const read = (key, fallback, validate) => JobCore.readStored(storage, key, fallback, validate);
const savedIds = read(
  'ezjobs-saved',
  [],
  (value) => Array.isArray(value) && value.every(Number.isInteger),
);
const state = {
  selected: JOBS[0].id,
  category: 'All',
  remoteOnly: false,
  query: '',
  location: '',
  savedOnly: false,
  sort: 'recent',
  saved: new Set(savedIds.filter((id) => JOBS.some((job) => job.id === id))),
};
let profile = read('ezjobs-profile', null, isProfile);
let drafts = read(
  'ezjobs-drafts',
  [],
  (value) =>
    Array.isArray(value) &&
    value.every(
      (draft) =>
        draft &&
        Number.isInteger(draft.jobId) &&
        isProfile(draft.person) &&
        typeof draft.note === 'string' &&
        typeof draft.updated === 'string' &&
        typeof draft.resumeName === 'string',
    ),
);
let toastTimer;
let returnFocus;
let application;
let mobileDetails = false;
function persist(key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast('Device storage is unavailable. Changes will last only for this visit.');
    return false;
  }
}
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
}
function logo(job) {
  return `<span class="company-logo" style="background:${job.color}" aria-hidden="true">${job.initial}</span>`;
}
function saveButton(job) {
  const saved = state.saved.has(job.id);
  return `<button class="save-btn ${saved ? 'saved' : ''}" data-save="${job.id}" aria-label="${saved ? 'Unsave' : 'Save'} ${html(job.title)}" aria-pressed="${saved}"><svg viewBox="0 0 18 22" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4Z"/></svg></button>`;
}
function resetFilters() {
  Object.assign(state, { category: 'All', remoteOnly: false, query: '', location: '' });
  $('#searchInput').value = '';
  $('#locationInput').value = '';
  mobileDetails = false;
  render();
}
function render() {
  const found = JobCore.filterJobs(JOBS, state);
  if (!found.some((job) => job.id === state.selected)) state.selected = found[0]?.id ?? null;
  if (!found.length) mobileDetails = false;
  $('#jobList').innerHTML = found.length
    ? found
        .map(
          (job) => `<article class="job-card ${job.id === state.selected ? 'selected' : ''}">
    <button class="card-main" data-id="${job.id}" aria-pressed="${job.id === state.selected}" aria-controls="jobDetail" aria-label="View ${html(job.title)} at ${html(job.company)}">
      <span class="card-head">${logo(job)}<span><span class="card-company">${job.company}</span><span class="card-location">${job.location}</span></span></span>
      <div class="job-meta"><h3>${job.title}</h3><div class="tags"><span class="tag">${job.type}</span><span class="tag">${job.category}</span>${/Remote/.test(job.location) ? '<span class="tag remote">Remote</span>' : ''}${drafts.some((draft) => draft.jobId === job.id) ? '<span class="tag">Draft saved</span>' : ''}</div></div>
      <span class="card-bottom"><strong>${job.salary}<small>${job.type === 'Contract' ? '' : ' / year'}</small></strong><span>Sample role ↗</span></span>
    </button>${saveButton(job)}</article>`,
        )
        .join('')
    : `<div class="empty"><span aria-hidden="true">⌕</span><h3>${state.savedOnly && !state.saved.size ? 'Your next chapter starts with a shortlist' : 'A different search could be the one'}</h3><p>${state.savedOnly && !state.saved.size ? 'Save a role using its bookmark button. It’ll be waiting right here.' : 'Try a broader title, another location, or fewer filters.'}</p><button class="btn btn-ghost" id="emptyReset">${state.savedOnly ? 'Browse all roles' : 'Clear filters'}</button></div>`;
  renderDetail(found.find((job) => job.id === state.selected));
  $('#savedCount').textContent = state.saved.size;
  $('#resultCount').innerHTML =
    `<strong>${found.length} ${state.savedOnly ? 'saved ' : ''}${found.length === 1 ? 'opportunity' : 'opportunities'}</strong> to explore`;
  $('#clearFilters').hidden = !(
    state.query ||
    state.location ||
    state.category !== 'All' ||
    state.remoteOnly
  );
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === state.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  $('#remoteFilter').setAttribute('aria-pressed', state.remoteOnly);
  $('#savedNav').classList.toggle('active', state.savedOnly);
  $('#savedNav').setAttribute('aria-pressed', state.savedOnly);
  $('#findNav').classList.toggle('active', !state.savedOnly);
  if (state.savedOnly) $('#findNav').removeAttribute('aria-current');
  else $('#findNav').setAttribute('aria-current', 'page');
  $('.job-layout').classList.toggle('show-detail', mobileDetails);
  $('#profileBtn').innerHTML =
    `${profile ? 'My profile' : 'Create profile'} <span aria-hidden="true">↗</span>`;
}
function renderDetail(job) {
  if (!job) {
    $('#jobDetail').innerHTML = '';
    return;
  }
  $('#jobDetail').innerHTML =
    `<button class="mobile-back" id="backToResults">← Back to results</button>
    <div class="detail-top">${logo(job)}<div><p>${job.company}</p><small>${job.category} · Sample company</small></div>${saveButton(job)}</div>
    <h2 class="detail-title">${job.title}</h2><p class="detail-summary">${job.summary}</p>
    <dl class="detail-info"><div><dt>LOCATION</dt><dd>${job.location}</dd></div><div><dt>SALARY ${job.type === 'Contract' ? '· DAILY' : '· ANNUAL'}</dt><dd>${job.salary}</dd></div><div><dt>COMMITMENT</dt><dd>${job.type}</dd></div><div><dt>WORK STYLE</dt><dd>${/Remote/.test(job.location) ? 'Remote' : 'Hybrid'}</dd></div></dl>
    <div class="detail-body"><h3>A little about the role</h3><p>${job.about}</p><h3>What you’ll make happen</h3><ul>${job.bullets.map((line) => `<li>${line}</li>`).join('')}</ul><h3>What you’ll bring</h3><div class="tags">${job.skills.map((skill) => `<span class="tag">${skill}</span>`).join('')}</div></div>
    <div class="detail-actions"><button class="btn apply-btn" data-apply="${job.id}">${drafts.some((draft) => draft.jobId === job.id) ? 'Edit application draft' : 'Prepare application'} <span aria-hidden="true">↗</span></button><small>Two simple steps. Saved on this device, never sent.</small></div>`;
}
function scrollToJobs() {
  $('#jobs').scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}
function closeMenu() {
  $('.topbar').classList.remove('open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
}
$('#menuBtn').onclick = () => {
  const open = $('.topbar').classList.toggle('open');
  $('#menuBtn').setAttribute('aria-expanded', open);
};
$('#mainNav').addEventListener('click', closeMenu);
$('#findNav').onclick = () => {
  state.savedOnly = false;
  mobileDetails = false;
  render();
};
$('#savedNav').onclick = () => {
  state.savedOnly = !state.savedOnly;
  resetFilters();
  scrollToJobs();
};
$('#clearFilters').onclick = resetFilters;
$('#filters').onclick = (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  state.category = button.dataset.filter;
  mobileDetails = false;
  render();
};
$('#remoteFilter').onclick = () => {
  state.remoteOnly = !state.remoteOnly;
  mobileDetails = false;
  render();
};
$('#sortJobs').onchange = (event) => {
  state.sort = event.target.value;
  render();
};
$('#searchForm').onsubmit = (event) => {
  event.preventDefault();
  state.query = $('#searchInput').value.trim();
  state.location = $('#locationInput').value.trim();
  state.savedOnly = false;
  mobileDetails = false;
  render();
  scrollToJobs();
};
document.querySelectorAll('[data-search]').forEach(
  (button) =>
    (button.onclick = () => {
      state.savedOnly = false;
      resetFilters();
      if (button.dataset.search === 'Remote') state.remoteOnly = true;
      else {
        state.query = button.dataset.search;
        $('#searchInput').value = state.query;
      }
      render();
      scrollToJobs();
    }),
);
document.addEventListener('click', (event) => {
  const save = event.target.closest('[data-save]');
  if (save) {
    const inDetail = !!save.closest('#jobDetail');
    const id = Number(save.dataset.save);
    state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
    const stored = persist('ezjobs-saved', [...state.saved]);
    render();
    const focus =
      $(`${inDetail ? '#jobDetail' : '#jobList'} [data-save="${id}"]`) ||
      $('#jobList .card-main') ||
      $('#emptyReset');
    focus?.focus({ preventScroll: true });
    if (stored)
      toast(
        state.saved.has(id)
          ? 'Saved. A good possibility to come back to.'
          : 'Removed from your saved jobs.',
      );
    return;
  }
  const card = event.target.closest('[data-id]');
  if (card) {
    state.selected = Number(card.dataset.id);
    mobileDetails = true;
    render();
    if (matchMedia('(max-width: 800px)').matches) {
      $('#jobDetail').focus({ preventScroll: true });
      $('#jobDetail').scrollIntoView({ block: 'start' });
    } else $(`[data-id="${state.selected}"]`).focus({ preventScroll: true });
  }
  const apply = event.target.closest('[data-apply]');
  if (apply) openApply(Number(apply.dataset.apply));
  if (event.target.closest('#backToResults')) {
    mobileDetails = false;
    render();
    $(`[data-id="${state.selected}"]`)?.focus();
  }
  if (event.target.closest('#emptyReset')) {
    state.savedOnly = false;
    resetFilters();
    $('#jobs').focus({ preventScroll: true });
  }
  if (event.target.closest('[data-close]')) $('#appDialog').close();
});
function openDialog() {
  returnFocus = document.activeElement;
  if (!$('#appDialog').open) $('#appDialog').showModal();
  document.body.style.overflow = 'hidden';
}
function focusModal() {
  ($('#modalContent input') || $('#modalContent button') || $('#closeDialog')).focus();
}
$('#closeDialog').onclick = () => $('#appDialog').close();
$('#appDialog').addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const controls = [
    ...event.currentTarget.querySelectorAll('button, input, textarea, select, a[href]'),
  ].filter((control) => !control.disabled && control.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
$('#appDialog').addEventListener('click', (event) => {
  if (event.target === $('#appDialog')) {
    const rect = event.target.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      event.target.close();
  }
});
$('#appDialog').addEventListener('close', () => {
  document.body.style.overflow = '';
  application = null;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else ($('#jobDetail [data-apply]') || $('#profileBtn')).focus({ preventScroll: true });
});
function personFields(person = {}) {
  return `<div class="form-grid"><div class="field"><label for="first">First name</label><input id="first" name="first" autocomplete="given-name" required maxlength="80" value="${html(person.first)}"></div><div class="field"><label for="last">Last name</label><input id="last" name="last" autocomplete="family-name" required maxlength="80" value="${html(person.last)}"></div><div class="field full"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254" value="${html(person.email)}"></div><div class="field full"><label for="link">Portfolio or LinkedIn <small>(optional)</small></label><input id="link" name="link" type="url" placeholder="https://" autocomplete="url" maxlength="500" value="${html(person.link)}"></div></div>`;
}
function personFromForm(form) {
  return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
}
function validPerson(form) {
  for (const name of ['first', 'last']) {
    const input = form.elements[name];
    input.setCustomValidity(input.value.trim() ? '' : 'Please enter your name.');
    input.oninput = () => input.setCustomValidity('');
  }
  return form.reportValidity();
}
function openApply(id) {
  const draft = drafts.find((item) => item.jobId === id);
  application = {
    job: JOBS.find((job) => job.id === id),
    person: { ...(draft?.person || profile || {}) },
    note: draft?.note || '',
    file: null,
    previousResume: draft?.resumeName || '',
  };
  openDialog();
  showApplyStep(1);
}
function showApplyStep(step) {
  const app = application;
  const job = app.job;
  $('#modalContent').innerHTML =
    `<span class="kicker">APPLICATION DRAFT · STEP ${step} OF 2</span><h2 id="modalTitle">${step === 1 ? `Your next step with ${job.company}` : 'Make it yours.'}</h2><p class="sub">${job.title}</p><div class="progress" aria-hidden="true"><span class="done"></span><span class="${step === 2 ? 'done' : ''}"></span></div>` +
    (step === 1
      ? `<form id="applyForm">${personFields(app.person)}<p class="notice">This is a sample role. Your draft stays on this device and is not sent to an employer.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-dark" type="submit">Continue →</button></div></form>`
      : `<form id="draftForm"><div class="field"><label for="resume">Your résumé</label><div class="upload"><input type="file" id="resume" accept=".pdf,.doc,.docx" aria-describedby="resumeHelp fileError"><p class="file-name" id="fileName">${html(app.file?.name || (app.previousResume ? `Previous file: ${app.previousResume}. Please choose it again.` : 'Choose a file to complete your draft.'))}</p><small id="resumeHelp">PDF, DOC, or DOCX · up to 10 MB. Only the filename is saved; file contents never leave this page.</small></div></div><div class="field"><label for="note">Why this role? <small>(optional)</small></label><textarea id="note" rows="4" maxlength="3000" placeholder="A few thoughtful sentences about you and the role.">${html(app.note)}</textarea></div><p class="form-error" id="fileError" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="backStep">← Back</button><button type="submit" class="btn btn-dark">Save draft ↗</button></div></form>`);
  if (step === 1)
    $('#applyForm').onsubmit = (event) => {
      event.preventDefault();
      if (!validPerson(event.target)) return;
      app.person = personFromForm(event.target);
      showApplyStep(2);
    };
  else {
    $('#resume').onchange = (event) => {
      app.file = event.target.files[0] || null;
      $('#fileName').textContent = app.file?.name || 'No file selected';
      $('#fileError').textContent = JobCore.resumeError(app.file);
    };
    $('#backStep').onclick = () => {
      app.note = $('#note').value;
      showApplyStep(1);
    };
    $('#draftForm').onsubmit = (event) => {
      event.preventDefault();
      const error = JobCore.resumeError(app.file);
      if (error) {
        $('#fileError').textContent = error;
        $('#resume').focus();
        return;
      }
      app.note = $('#note').value.trim();
      const draft = {
        jobId: job.id,
        person: app.person,
        note: app.note,
        resumeName: app.file.name,
        updated: new Date().toISOString(),
      };
      drafts = [...drafts.filter((item) => item.jobId !== job.id), draft];
      const stored = persist('ezjobs-drafts', drafts);
      render();
      $('#modalContent').innerHTML =
        `<div class="success"><div class="success-mark" aria-hidden="true">✓</div><span class="kicker">${stored ? 'DRAFT SAVED ON THIS DEVICE' : 'DRAFT READY FOR THIS VISIT'}</span><h2 id="modalTitle">A good step forward.</h2><p class="sub">Your draft for <strong>${job.title}</strong> at ${job.company} is ready. ${stored ? 'You can revisit it from your profile.' : 'Device storage is unavailable; download a copy before leaving.'}</p><p class="notice">No application has been sent. This demo saves your details, note, and résumé filename only.</p><button class="btn btn-dark" id="downloadDraft">Download draft ↓</button><button class="btn btn-ghost" data-close>Back to jobs</button></div>`;
      $('#downloadDraft').onclick = () => downloadDraft(draft);
      focusModal();
    };
  }
  focusModal();
}
function downloadDraft(draft) {
  const job = JOBS.find((item) => item.id === draft.jobId);
  const content = `EZJobs — Application draft (not submitted)\n\n${job?.title || 'Role'} at ${job?.company || 'Company'}\n\n${draft.person.first} ${draft.person.last}\n${draft.person.email}\n${draft.person.link}\n\nRésumé filename: ${draft.resumeName}\nThe résumé itself is not included.\n\n${draft.note}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ezjobs-draft-${draft.jobId}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showProfile() {
  $('#modalContent').innerHTML =
    `<span class="kicker">YOUR NEXT CHAPTER STARTS WITH YOU</span><h2 id="modalTitle">${profile ? 'Your profile' : 'A little about you.'}</h2><p class="sub">Save your details to make your next draft easier.</p><form id="profileForm">${personFields(profile || {})}<p class="notice">Stored only in this browser. There’s no account or cross-device sync. Avoid saving personal details on a shared device.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Close</button><button class="btn btn-dark" type="submit">Save profile</button></div></form><h3 style="font-size:15px;margin-top:28px">Your application drafts (${drafts.length})</h3>${drafts.length ? drafts.map((draft) => `<div class="draft-item"><div><h3>${html(JOBS.find((job) => job.id === draft.jobId)?.title || 'Saved role')}</h3><p>${html(draft.person.first)} · Saved on this device</p></div><button class="text-btn" data-edit-draft="${draft.jobId}">Edit</button><button class="text-btn" data-download="${draft.jobId}">Download</button><button class="text-btn" data-delete-draft="${draft.jobId}" aria-label="Delete draft for ${html(JOBS.find((job) => job.id === draft.jobId)?.title || 'saved role')}">Delete</button></div>`).join('') : '<p class="sub">Nothing here yet. Find a role you like and prepare your first draft.</p>'}`;
  $('#profileForm').onsubmit = (event) => {
    event.preventDefault();
    if (!validPerson(event.target)) return;
    profile = personFromForm(event.target);
    const stored = persist('ezjobs-profile', profile);
    render();
    if (stored) toast('Your profile is saved on this device.');
  };
  document.querySelectorAll('[data-edit-draft]').forEach(
    (button) =>
      (button.onclick = () => {
        const id = Number(button.dataset.editDraft);
        if (JOBS.some((job) => job.id === id)) openApply(id);
        else toast('This sample role is no longer available. You can still download its draft.');
      }),
  );
  document
    .querySelectorAll('[data-download]')
    .forEach(
      (button) =>
        (button.onclick = () =>
          downloadDraft(drafts.find((draft) => draft.jobId === Number(button.dataset.download)))),
    );
  document.querySelectorAll('[data-delete-draft]').forEach(
    (button) =>
      (button.onclick = () => {
        drafts = drafts.filter((draft) => draft.jobId !== Number(button.dataset.deleteDraft));
        persist('ezjobs-drafts', drafts);
        render();
        showProfile();
        focusModal();
      }),
  );
}
$('#profileBtn').onclick = () => {
  showProfile();
  openDialog();
  focusModal();
};
$('#privacyBtn').onclick = () => {
  $('#modalContent').innerHTML =
    `<span class="kicker">YOUR DATA, YOUR CALL</span><h2 id="modalTitle">Just on this device.</h2><p class="sub">Saved jobs, profile details, and application drafts are kept in this browser’s local storage. They aren’t sent to employers or to an EZJobs server.</p><p class="sub">Résumé contents are never uploaded or stored. Only the filename is saved with a draft. Google Fonts is used to display the site’s typefaces.</p><p class="notice">Clearing browser storage removes your saved data. Download any drafts you want to keep before clearing it.</p><div class="modal-actions"><button class="btn btn-ghost" id="clearData">Clear my saved data</button><button class="btn btn-dark" data-close>Got it</button></div><p id="privacyStatus" role="status" class="sub"></p>`;
  openDialog();
  $('#clearData').onclick = () => {
    $('#clearData').textContent = 'Confirm: delete all local data';
    $('#privacyStatus').textContent =
      'This removes your saved jobs, profile, and drafts. Click again to confirm.';
    $('#clearData').onclick = () => {
      try {
        ['ezjobs-saved', 'ezjobs-profile', 'ezjobs-drafts'].forEach((key) =>
          storage.removeItem(key),
        );
      } catch {
        $('#privacyStatus').textContent =
          'Browser storage could not be cleared. Please clear site data in your browser settings.';
        return;
      }
      state.saved.clear();
      profile = null;
      drafts = [];
      render();
      $('#appDialog').close();
      toast('Your saved data has been cleared.');
    };
  };
};
window.addEventListener('storage', (event) => {
  if (event.key === 'ezjobs-saved' || event.key === null) {
    state.saved = new Set(
      read(
        'ezjobs-saved',
        [],
        (value) => Array.isArray(value) && value.every(Number.isInteger),
      ).filter((id) => JOBS.some((job) => job.id === id)),
    );
    render();
  }
});
render();
