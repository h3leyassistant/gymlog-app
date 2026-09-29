// Core logging flows: anatomy picking, search, confirm rules, persistence, summary, export/import.
// Run with the Playwright MCP tool browser_run_code_unsafe (paste this function), server on port 8765.
async (page) => {
  const checks = [];
  const assert = (ok, label) => { if (!ok) throw new Error('FAILED: ' + label); checks.push(label); };
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:8765/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Attach a file from inside the page, so the script also runs where Node's Buffer is unavailable.
  const importText = (name, text) => page.locator('#import-file').evaluate((input, [n, t]) => { const dt = new DataTransfer(); dt.items.add(new File([t], n, { type: 'application/json' })); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); }, [name, text]);
  const heading = () => page.locator('#browser-heading').innerText();

  assert(await page.locator('#personal-banner').isVisible(), 'first visit opens the personal log');
  assert((await page.locator('.exercise-card').count()) === 0, 'personal log starts empty');
  await page.locator('#show-demo').click();
  assert((await page.locator('.exercise-card').count()) === 2, 'sample data is one tap away');
  await page.locator('[data-muscle="chest"]').dispatchEvent('click');
  assert((await heading()).includes('อก'), 'front anatomy chest selection');
  await page.locator('[data-view="back"]').click();
  await page.locator('[data-muscle="lats"]').dispatchEvent('click');
  assert((await heading()).includes('ปีก'), 'back anatomy lats selection');
  for (const [id, name] of [['biceps', 'แขนหน้า'], ['quads', 'ต้นขาหน้า'], ['calves', 'น่อง'], ['adductors', 'ต้นขาด้านใน']]) {
    await page.locator(`[data-pick-muscle="${id}"]`).click();
    assert((await heading()).includes(name), 'muscle chip ' + id);
  }

  await page.locator('#exercise-search').fill('curl');
  assert((await page.locator('.result-card').count()) === 4, 'English search across muscles (4 curls)');
  await page.locator('#exercise-search').fill('ดัมเบล');
  assert((await page.locator('.result-card').count()) >= 8, 'Thai search');
  await page.locator('#exercise-search').fill('press');
  await page.locator('[data-equipment="machine"]').click();
  assert((await page.locator('.result-card').count()) === 3, 'equipment filter applied to search');
  await page.locator('[data-detail="machine-press"]').click();
  assert(await page.locator('#exercise-dialog').isVisible(), 'exercise detail opens');
  assert((await page.locator('.detail-photos img').count()) === 2, 'detail shows start and end photos');
  await page.locator('#exercise-dialog .dialog-close').click();

  await page.locator('#start-personal').click();
  assert((await page.locator('.exercise-card').count()) === 0, 'personal log does not contain demo records');
  await page.locator('#clear-muscle').click();
  await page.locator('#exercise-search').fill('dumbbell shoulder');
  await page.locator('[data-add-exercise="db-press"]').click();
  await page.locator('[data-confirm-set="0"]').click();
  assert((await page.locator('[data-confirm-set="0"]').getAttribute('aria-pressed')) === 'false', 'incomplete set cannot be confirmed');
  await page.locator('[data-field="weight"]').fill('11.25');
  await page.keyboard.press('Enter');
  assert(await page.locator('[data-field="reps"]').first().evaluate(el => el === document.activeElement), 'Enter moves from weight to reps');
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  assert((await page.locator('[data-confirm-set="0"]').getAttribute('aria-pressed')) === 'true', 'Enter on reps confirms the quarter-kilo set');
  await page.locator('[data-add-set]').click();
  assert((await page.locator('[data-field="weight"]').nth(1).inputValue()) === '11.25', 'next set carries weight only');
  assert(await page.locator('[data-field="reps"]').nth(1).evaluate(el => el === document.activeElement), 'new set focuses its reps field');
  await page.locator('[data-add-set]').click();
  await page.locator('[data-delete-set="2"]').click();
  assert((await page.locator('[data-set]').count()) === 2, 'draft set deletes immediately');
  await page.locator('.toast-action').click();
  assert((await page.locator('[data-set]').count()) === 3, 'undo restores the deleted set');
  await page.locator('[data-delete-set="2"]').click();
  await page.locator('[data-field="reps"]').nth(1).fill('6');
  await page.reload();
  assert((await page.locator('[data-field="weight"]').first().inputValue()) === '11.25', 'weight persists after reload');
  assert((await page.locator('[data-confirm-set="0"]').getAttribute('aria-pressed')) === 'true', 'confirmed status persists');
  assert((await page.locator('[data-field="reps"]').nth(1).inputValue()) === '6', 'draft reps survive reload');

  await page.locator('.desktop-nav [data-page="summary"]').click();
  assert((await page.locator('.stat-card strong').allTextContents()).join(',') === '1,1,10', 'summary excludes unfinished draft');

  const saved = await page.evaluate(() => localStorage.getItem('gymlog-ember-v1'));
  await page.locator('.desktop-nav [data-page="data"]').click();
  await importText('broken.json', '{not json');
  await page.locator('#toast').filter({ hasText: 'นำเข้าไม่ได้' }).waitFor();
  checks.push('invalid import rejected');
  assert((await page.evaluate(() => localStorage.getItem('gymlog-ember-v1'))) === saved, 'invalid import preserves existing data');
  // Keep the download last: the Playwright MCP runner may close the page once a download is saved.
  const download = page.waitForEvent('download');
  await page.locator('#export-data').click();
  assert((await download).suggestedFilename().startsWith('gymlog-personal-'), 'export JSON downloaded');
  return checks;
}
