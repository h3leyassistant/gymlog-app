const { test } = require('node:test');
const assert = require('node:assert/strict');
const store = require('../js/store.js');
const ids = ['db-press', 'lat-pull'];
const entry = (id, sets) => ({ id: 'entry-' + id, exerciseId: id, sets });
const set = (weight, reps, completed = true) => ({ weight, reps, completed });

test('previous workout excludes selected day, later days and incomplete sets', () => {
  const data = { version: 1, sessions: {
    '2026-09-20': [entry('db-press', [set(10, 8)])],
    '2026-09-22': [entry('db-press', [set(12, 10, false)])],
    '2026-09-25': [entry('db-press', [set(14, 10)])],
  } };
  assert.deepEqual(store.previousWorkout(data, 'db-press', '2026-09-25'), { date: '2026-09-20', sets: [set(10, 8)] });
  assert.equal(store.previousWorkout(data, 'db-press', '2026-09-19'), null);
});

test('summary counts confirmed sets and distinct workout days only', () => {
  const data = { version: 1, sessions: {
    '2026-09-20': [entry('db-press', [set(10, 8), set(12, 9, false)])],
    '2026-09-21': [entry('db-press', [set(12, null, false)])],
    '2026-09-25': [entry('lat-pull', [set(30, 10)])],
  } };
  assert.deepEqual(store.summarize(data, '2026-09-20', '2026-09-21'), { days: 1, sets: 1, reps: 8 });
});

test('import round trip preserves drafts with null fields without sharing references', () => {
  const data = { version: 1, sessions: { '2026-09-20': [entry('db-press', [set(0, 12), set(null, null, false)])] } };
  const restored = store.validateImport(data, ids);
  assert.deepEqual(restored, data);
  restored.sessions['2026-09-20'][0].sets[0].weight = 50;
  assert.equal(data.sessions['2026-09-20'][0].sets[0].weight, 0);
});

test('import rejects impossible dates, unknown exercises and unsupported versions', () => {
  assert.throws(() => store.validateImport({ version: 2, sessions: {} }, ids));
  assert.throws(() => store.validateImport({ version: 1, sessions: { '2026-02-30': [] } }, ids));
  assert.throws(() => store.validateImport({ version: 1, sessions: { '2026-09-20': [entry('unknown', [])] } }, ids));
});

test('import rejects invalid confirmed sets without changing the supplied data', () => {
  for (const invalid of [set(-1, 10), set(10, 1.5), set(null, 10), set(12, 0)]) {
    const data = { version: 1, sessions: { '2026-09-20': [entry('db-press', [invalid])] } };
    const original = JSON.stringify(data);
    assert.throws(() => store.validateImport(data, ids));
    assert.equal(JSON.stringify(data), original);
  }
});

test('local day uses calendar components, independent of UTC date rollover', () => {
  const fakeLocalDate = { getFullYear: () => 2026, getMonth: () => 8, getDate: () => 29 };
  assert.equal(store.localDay(fakeLocalDate), '2026-09-29');
});

test('import can skip unknown exercises and count them, keeping known ones', () => {
  const data = { version: 1, sessions: { '2026-09-20': [entry('db-press', [set(10, 8)]), entry('retired-move', [set(5, 5)])] } };
  const report = {};
  const restored = store.validateImport(data, ids, report);
  assert.equal(report.skipped, 1);
  assert.deepEqual(restored.sessions['2026-09-20'].map(e => e.exerciseId), ['db-press']);
  assert.throws(() => store.validateImport(data, ids));
});
