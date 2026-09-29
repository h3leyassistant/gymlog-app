// Catalog dialog, summary heatmap / calendar / chart, midnight rollover, and no horizontal overflow.
// Run with browser_run_code_unsafe, server on port 8765.
async (page) => {
  const checks = [];
  const assert = (ok, label) => { if (!ok) throw new Error('FAILED: ' + label); checks.push(label); };
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:8765/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('gymlog-ember-mode', 'demo'); });
  await page.reload();

  await page.locator('#quick-search').click();
  assert(await page.locator('#catalog-dialog').isVisible(), 'quick search opens catalog');
  assert((await page.locator('.recent-chip').count()) >= 2, 'catalog lists recently trained exercises');
  await page.locator('#exercise-search').fill('OHP');
  assert((await page.locator('.result-card').count()) === 2, 'abbreviation OHP finds shoulder presses');
  await page.locator('#exercise-search').fill('hammer');
  await page.locator('[data-detail="hammer"]').click();
  assert(await page.locator('#exercise-dialog').isVisible(), 'details open above catalog');
  await page.locator('#detail-add').click();
  await page.locator('#catalog-dialog').waitFor({ state: 'hidden' });
  assert((await page.locator('.exercise-card').count()) === 3, 'adding from detail closes catalog and adds exercise');
  await page.locator('#browser-home #exercise-browser').waitFor({ state: 'attached', timeout: 2000 });
  checks.push('catalog restored after close');
  await page.locator('#add-exercise').click();
  await page.keyboard.press('Escape');
  await page.locator('#catalog-dialog').waitFor({ state: 'hidden' });
  await page.locator('#browser-home #exercise-browser').waitFor({ state: 'attached', timeout: 2000 });  // the close event lands just after the dialog hides
  checks.push('escape restores catalog');
  await page.locator('[data-pick-muscle="lats"]').click();
  assert((await page.locator('[data-detail="db-row"]').count()) === 1, 'lats list includes rows via secondary muscles');

  await page.locator('.desktop-nav [data-page="summary"]').click();
  assert((await page.locator('.heat-region').count()) > 0, 'heatmap colours trained muscles');
  assert((await page.locator('.cal-cell.trained').count()) >= 3, 'calendar marks trained days');
  assert((await page.locator('#progress-chart .chart-dot').count()) >= 2, 'progress chart plots each day');
  await page.locator('#progress-chart svg').scrollIntoViewIfNeeded();
  const box = await page.locator('#progress-chart svg').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 80);
  assert(await page.locator('.chart-tip').isVisible(), 'chart tooltip follows pointer');
  await page.locator('[data-cal-shift="-1"]').click();
  assert((await page.locator('.cal-head strong').innerText()).length > 0, 'calendar moves to previous month');
  await page.locator('[data-cal-shift="1"]').click();
  await page.locator('.cal-cell.trained').first().click();
  assert(!(await page.locator('#page-log').isHidden()), 'calendar day opens the log');

  await page.evaluate(() => { const orig = GymStore.localDay; GymStore.localDay = d => d ? orig(d) : '2099-01-01'; document.dispatchEvent(new Event('visibilitychange')); GymStore.localDay = orig; });
  assert((await page.locator('#session-date').getAttribute('max')) === '2099-01-01', 'date limit follows the clock after midnight');
  await page.reload();

  for (const pageName of ['log', 'summary']) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator(`.desktop-nav [data-page="${pageName}"]`).click();
    for (const width of [360, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);  // the chart redraws 150ms after a resize
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${pageName} fits ${width}px`);
    }
  }
  return checks;
}
