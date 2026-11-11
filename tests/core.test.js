const test = require('node:test');
const assert = require('node:assert/strict');
const jobs = require('../jobs');
const { filterJobs, readStored, escapeHTML, resumeError } = require('../core');
const state = (overrides) => ({
  category: 'All',
  remoteOnly: false,
  savedOnly: false,
  query: '',
  location: '',
  saved: new Set(),
  sort: 'recent',
  ...overrides,
});
test('title and location are independent constraints', () => {
  assert.deepEqual(
    filterJobs(jobs, state({ query: 'designer', location: 'Europe' })).map((job) => job.id),
    [1],
  );
  assert.deepEqual(
    filterJobs(jobs, state({ query: 'React', location: 'London' })).map((job) => job.id),
    [2],
  );
});
test('search is whitespace and case tolerant and matches multiple terms', () => {
  assert.deepEqual(
    filterJobs(jobs, state({ query: '  DESIGNER  product  ', location: ' remote  ' })).map(
      (job) => job.id,
    ),
    [1],
  );
  assert.equal(filterJobs(jobs, state({ query: '   ' })).length, 6);
});
test('saved view survives selection and composes with filters', () => {
  const saved = new Set([1, 2, 5]);
  assert.deepEqual(
    filterJobs(jobs, state({ saved, savedOnly: true, remoteOnly: true })).map((job) => job.id),
    [1, 5],
  );
  saved.delete(1);
  assert.deepEqual(
    filterJobs(jobs, state({ saved, savedOnly: true, category: 'Design' })).map((job) => job.id),
    [5],
  );
  assert.equal(filterJobs(jobs, state({ savedOnly: true })).length, 0);
});
test('sort is stable and does not mutate source data', () => {
  assert.equal(filterJobs(jobs, state({ sort: 'company' }))[0].company, 'Good Day');
  assert.equal(filterJobs(jobs, state({ sort: 'title' }))[0].title, 'Brand Designer');
  assert.equal(jobs[0].id, 1);
});
test('storage handles corrupt, inaccessible, and invalid data', () => {
  const validate = Array.isArray;
  assert.deepEqual(readStored({ getItem: () => '{broken' }, 'key', [], validate), []);
  assert.deepEqual(readStored({ getItem: () => 'null' }, 'key', [], validate), []);
  assert.deepEqual(readStored({ getItem: () => '{}' }, 'key', [], validate), []);
  assert.deepEqual(readStored(null, 'key', [], validate), []);
  assert.deepEqual(readStored({ getItem: () => '[1,2]' }, 'key', [], validate), [1, 2]);
});
test('profile and note values are escaped before inserting in markup', () => {
  assert.equal(
    escapeHTML('<script>"x" & \'y\'</script>'),
    '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;',
  );
});
test('resume validation rejects missing, empty, oversized, and unsupported files', () => {
  for (const file of [
    null,
    { name: 'a.pdf', size: 0 },
    { name: 'a.exe', size: 2 },
    { name: 'a.pdf', size: 10485761 },
  ])
    assert.ok(resumeError(file));
  assert.equal(resumeError({ name: 'CV.PDF', size: 10485760 }), '');
  assert.equal(resumeError({ name: 'CV.docx', size: 42 }), '');
});
