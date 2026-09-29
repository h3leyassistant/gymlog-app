(function (root) {
  function localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !isNaN(date.getTime()) && localDay(date) === value;
  }
  function complete(set) {
    return set.completed === true && Number.isFinite(set.weight) && set.weight >= 0 && Number.isInteger(set.reps) && set.reps > 0;
  }
  function previousWorkout(data, exerciseId, beforeDate) {
    for (const date of Object.keys(data.sessions).filter(d => d < beforeDate).sort().reverse()) {
      const sets = data.sessions[date].filter(e => e.exerciseId === exerciseId).flatMap(e => e.sets).filter(complete);
      if (sets.length) return { date, sets };
    }
    return null;
  }
  function summarize(data, from = '0000-01-01', to = '9999-12-31') {
    let days = 0, sets = 0, reps = 0;
    for (const [date, entries] of Object.entries(data.sessions)) {
      if (date < from || date > to) continue;
      const completed = entries.flatMap(e => e.sets).filter(complete);
      if (completed.length) days++;
      sets += completed.length;
      reps += completed.reduce((sum, s) => sum + s.reps, 0);
    }
    return { days, sets, reps };
  }
  // With a `report` object, entries for exercises this version does not know are skipped and counted
  // (report.skipped) instead of rejecting the whole file; every other rule still rejects.
  function validateImport(input, validIds, report) {
    const error = () => { throw new Error('รูปแบบข้อมูลไม่ถูกต้อง หรือมีท่าที่ mock นี้ยังไม่รองรับ'); };
    if (!input || input.version !== 1 || !input.sessions || typeof input.sessions !== 'object' || Array.isArray(input.sessions)) error();
    if (Object.keys(input.sessions).length > 5000) error();
    const sessions = {};
    for (const [date, entries] of Object.entries(input.sessions)) {
      if (!validDate(date) || !Array.isArray(entries) || entries.length > 100) error();
      const entryIds = new Set();
      const known = report ? entries.filter(e => {
        const unknown = e && typeof e.exerciseId === 'string' && !validIds.includes(e.exerciseId);
        if (unknown) report.skipped = (report.skipped || 0) + 1;
        return !unknown;
      }) : entries;
      sessions[date] = known.map(e => {
        if (!e || typeof e.id !== 'string' || !/^[\w-]{1,80}$/.test(e.id) || entryIds.has(e.id) || !validIds.includes(e.exerciseId) || !Array.isArray(e.sets) || e.sets.length > 100) error();
        entryIds.add(e.id);
        const sets = e.sets.map(s => {
          if (!s || typeof s.completed !== 'boolean') error();
          if (s.weight !== null && (!Number.isFinite(s.weight) || s.weight < 0 || s.weight > 2000)) error();
          if (s.reps !== null && (!Number.isInteger(s.reps) || s.reps <= 0 || s.reps > 9999)) error();
          if (s.completed && !complete(s)) error();
          return { weight: s.weight, reps: s.reps, completed: s.completed };
        });
        return { id: e.id, exerciseId: e.exerciseId, sets };
      });
    }
    return { version: 1, sessions };
  }
  const api = { localDay, validDate, complete, previousWorkout, summarize, validateImport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GymStore = api;
})(typeof window === 'undefined' ? globalThis : window);
