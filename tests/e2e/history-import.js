// Back-dated logging, previous-workout hint, and confirm-before-replace import.
// Run with browser_run_code_unsafe after flows.js (or on its own), server on port 8765.
async (page) => {
  const checks = [];
  const assert = (ok, label) => { if (!ok) throw new Error('FAILED: ' + label); checks.push(label); };
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:8765/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('gymlog-ember-mode', 'personal'); });
  await page.reload();

  // Attach a file from inside the page, so the script also runs where Node's Buffer is unavailable.
  const importText = (name, text) => page.locator('#import-file').evaluate((input, [n, t]) => { const dt = new DataTransfer(); dt.items.add(new File([t], n, { type: 'application/json' })); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); }, [name, text]);
  const today = await page.locator('#session-date').inputValue();
  await page.locator('#previous-day').click();
  assert((await page.locator('.exercise-card').count()) === 0, 'previous date starts independently');
  assert(await page.locator('#backdate-banner').isVisible(), 'back-dating shows a banner');
  assert((await page.locator('#log-title').innerText()).includes('จดย้อนหลัง'), 'heading says back-dating');
  await page.locator('#exercise-search').fill('dumbbell shoulder');
  await page.locator('[data-add-exercise="db-press"]').click();
  await page.locator('[data-field="weight"]').fill('10');
  await page.locator('[data-field="reps"]').fill('8');
  await page.locator('[data-confirm-set="0"]').click();
  await page.locator('#next-day').click();
  assert((await page.locator('#session-date').inputValue()) === today, 'returns to today');
  await page.locator('#exercise-search').fill('dumbbell shoulder');
  await page.locator('[data-add-exercise="db-press"]').click();
  assert((await page.locator('.previous-line').innerText()).includes('10 × 8'), 'previous workout uses earlier confirmed sets');
  assert(await page.locator('#backdate-banner').isHidden(), 'banner hides on today');
  await page.locator('[data-use-previous]').click();
  assert((await page.locator('[data-field="reps"]').first().inputValue()) === '8', 'use-previous fills reps');
  assert((await page.locator('[data-confirm-set="0"]').getAttribute('aria-pressed')) === 'false', 'filled sets still need confirming');
  await page.locator('[data-confirm-set="0"]').click();

  const backup = JSON.parse(await page.evaluate(() => localStorage.getItem('gymlog-ember-v1')));
  const file = JSON.stringify({ version: 1, sessions: { [today]: backup.sessions[today] } });
  await page.locator('.desktop-nav [data-page="data"]').click();
  await importText('backup.json', file);
  await page.locator('#confirm-dialog').waitFor();
  await page.locator('#confirm-cancel').click();
  assert(Object.keys(JSON.parse(await page.evaluate(() => localStorage.getItem('gymlog-ember-v1'))).sessions).length === 2, 'cancelled import keeps both days');
  await importText('backup.json', file);
  await page.locator('#confirm-dialog').waitFor();
  await page.locator('#confirm-accept').click();
  assert(Object.keys(JSON.parse(await page.evaluate(() => localStorage.getItem('gymlog-ember-v1'))).sessions).length === 1, 'confirmed import replaces records');
  const withUnknown = JSON.parse(file);
  withUnknown.sessions[today].push({ id: 'old-entry', exerciseId: 'retired-move', sets: [{ weight: 5, reps: 5, completed: true }] });
  await importText('mixed.json', JSON.stringify(withUnknown));
  await page.locator('#confirm-dialog').waitFor();
  assert((await page.locator('#confirm-copy').innerText()).includes('ข้าม 1 ท่า'), 'import skips and reports unknown exercises');
  await page.locator('#confirm-cancel').click();

  // A stored log this version cannot read is exported raw, never as an empty file.
  await page.evaluate(() => localStorage.setItem('gymlog-ember-v1', '{"version":1,"sessions":{"2026-01-01":"broken"}}'));
  await page.reload();
  await page.locator('.desktop-nav [data-page="data"]').click();
  const download = page.waitForEvent('download');
  await page.locator('#export-data').click();
  assert((await download).suggestedFilename().includes('-raw-'), 'unreadable log exports raw data');
  return checks;
}
