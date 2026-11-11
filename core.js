/* Shared, side-effect-free helpers; also loaded by the Node regression tests. */
const JobCore = (() => {
  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();
  function filterJobs(jobs, state) {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    const locations = normalize(state.location).split(/\s+/).filter(Boolean);
    const found = jobs.filter((job) => {
      const haystack = normalize(
        [job.title, job.company, job.category, ...job.skills, job.location].join(' '),
      );
      return (
        (state.category === 'All' || job.category === state.category) &&
        (!state.remoteOnly || /remote/i.test(job.location)) &&
        (!state.savedOnly || state.saved.has(job.id)) &&
        terms.every((term) => haystack.includes(term)) &&
        locations.every((term) => normalize(job.location).includes(term))
      );
    });
    return found.sort((a, b) =>
      state.sort === 'company'
        ? a.company.localeCompare(b.company)
        : state.sort === 'title'
          ? a.title.localeCompare(b.title)
          : a.id - b.id,
    );
  }
  function readStored(storage, key, fallback, validate) {
    try {
      const value = JSON.parse(storage.getItem(key));
      return validate(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  }
  function resumeError(file) {
    if (!file) return 'Please choose a résumé to finish your draft.';
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) return 'Choose a PDF, DOC, or DOCX file.';
    if (file.size > 10 * 1024 * 1024) return 'Your résumé must be 10 MB or smaller.';
    if (!file.size) return 'That file is empty. Please choose another résumé.';
    return '';
  }
  return { filterJobs, readStored, escapeHTML, resumeError };
})();
if (typeof module !== 'undefined') module.exports = JobCore;
