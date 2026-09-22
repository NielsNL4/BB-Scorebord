// Optional integration checks: npm install --no-save --package-lock=false playwright
// Then: npx playwright install chromium && node browser-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server = spawn('python3', ['-m', 'http.server', '8879', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const url = 'http://127.0.0.1:8879';
let browser;
try {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(url)).ok) break; } catch { /* Wait for the local server. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.locator('#theme-button').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.locator('#theme-button').click();
  for (const [i, name] of ['Sam', 'Noor', 'Jesse', 'Luuk'].entries()) await page.locator('#players input').nth(i).fill(name);
  await page.locator('#first-dealer').selectOption({ label: 'Sam' });
  await page.locator('#players [data-action="down"]').first().click();
  assert.deepEqual(await page.locator('#players input').evaluateAll(inputs => inputs.map(input => input.value)), ['Noor', 'Sam', 'Jesse', 'Luuk']);
  assert.equal(await page.locator('#first-dealer option:checked').textContent(), 'Sam');

  // Touch drag moves Sam from second to first while retaining the dealer identity.
  const handle = page.locator('#players .drag-handle').nth(1);
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const to = await page.locator('#players .drag-handle').first().boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await page.locator('#players input').first().inputValue(), 'Sam');
  assert.equal(await page.locator('#first-dealer option:checked').textContent(), 'Sam');
  await page.locator('#players .drag-handle').first().focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#players input').first().inputValue(), 'Sam');
  await page.locator('#add-player').click();
  assert.equal(await page.locator('#players input').count(), 5);
  await page.locator('#players [data-action="remove"]').last().click();
  assert.equal(await page.locator('#players input').count(), 4);
  await page.locator('#add-player').click();
  await page.locator('#add-player').click();
  assert.equal(await page.locator('#rounds').inputValue(), '8');
  assert.match(await page.locator('#deck-notice').textContent(), /verlaagd van 10 naar 8/);
  assert.match(await page.locator('#schedule-preview').textContent(), /16 rondes/);
  await page.locator('#rounds').fill('12');
  assert.equal(await page.locator('#rounds').inputValue(), '8');
  assert.match(await page.locator('#deck-notice').textContent(), /6 spelers/);
  await page.locator('#players [data-action="remove"]').last().click();
  await page.locator('#players [data-action="remove"]').last().click();
  assert.equal(await page.locator('#rounds').inputValue(), '8');
  await page.locator('#rounds').fill('3');
  assert.match(await page.locator('#schedule-preview').textContent(), /6 rondes · 1 → 3 → 3 → 1/);
  await page.getByRole('button', { name: 'Aan tafel' }).click();
  assert.equal(await page.locator('#scoreboard tbody tr').count(), 6);
  assert.deepEqual(await page.locator('#scoreboard tbody th button').evaluateAll(buttons => buttons.map(button => Number(button.firstChild.textContent))), [1, 2, 3, 3, 2, 1]);
  assert.deepEqual(await page.locator('.player-control').evaluateAll(rows => rows.map(row => row.id)), ['player-1', 'player-2', 'player-3', 'player-0']);
  assert.equal(await page.locator('#dealer-summary').textContent(), 'Sam schudt · Noor begint');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  for (const i of [1, 2, 3]) await page.locator(`#player-${i} input[data-field="bid"]`).fill('0');
  assert.match(await page.locator('#bid-summary').textContent(), /behalve 1/);
  await page.locator('#player-0 input[data-field="bid"]').fill('1');
  assert.match(await page.locator('#bid-error').textContent(), /totaal precies 1/);
  assert.equal(await page.locator('#finish-round').isDisabled(), true);
  await page.locator('#player-0 input[data-field="bid"]').fill('0');
  for (let i = 0; i < 4; i++) await page.locator(`#player-${i} [data-value="correct"]`).click();
  assert.deepEqual(await page.locator('tfoot td').allTextContents(), ['10', '10', '10', '10']);
  await page.locator('#finish-round').click();
  assert.equal(await page.locator('#dealer-summary').textContent(), 'Noor schudt · Jesse begint');
  for (const i of [2, 3, 0]) await page.locator(`#player-${i} input[data-field="bid"]`).fill(i === 2 ? '1' : '0');
  await page.locator('#player-1 [data-field="bid"][data-action="increment"]').click();
  assert.equal(await page.locator('#player-1 input[data-field="bid"]').inputValue(), '2');
  assert.match(await page.locator('#bid-summary').textContent(), /Voorspellingen compleet/);
  for (let i = 0; i < 4; i++) await page.locator(`#player-${i} [data-value="correct"]`).click();
  await page.locator('#player-0 [data-value="wrong"]').click();
  assert.equal(await page.locator('#player-0 input[data-field="manual"]').getAttribute('max'), '-1');
  assert.equal(await page.locator('#player-0 input[data-field="manual"]').isEditable(), false);
  await page.locator('#player-0 [data-field="manual"][data-action="decrement"]').click();
  assert.equal(await page.locator('#player-0 .score-delta').textContent(), '−5');
  assert.ok(await page.locator('#player-0 input[data-field="manual"]').evaluate(input => input.getAnimations().length > 0));
  // Rapid operations must apply immediately, regardless of an unfinished animation.
  await page.locator('#player-0 [data-field="manual"][data-action="increment"]').evaluate(button => { button.click(); document.querySelector('#player-0 [data-field="manual"][data-action="increment"]').click(); });
  assert.equal(await page.locator('#player-0 input[data-field="manual"]').inputValue(), '');
  assert.equal(await page.locator('#player-0 [data-field="manual"][data-action="increment"]').isDisabled(), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#player-0 [data-field="manual"][data-action="decrement"]').click();
  assert.equal(await page.locator('#player-0 .score-delta').count(), 0);
  assert.equal(await page.locator('#player-0 input[data-field="manual"]').evaluate(input => input.getAnimations().length), 0);
  await page.locator('#player-0 [data-field="manual"][data-action="decrement"]').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  assert.equal(await page.locator('#player-0 input[data-field="manual"]').inputValue(), '-10');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.locator('#finish-round').click();
  for (let round = 2; round < 6; round++) {
    assert.match(await page.locator('#round-phase').textContent(), new RegExp(`^${[1, 2, 3, 3, 2, 1][round]} `));
    for (let i = 0; i < 4; i++) {
      await page.locator(`#player-${i} input[data-field="bid"]`).fill('0');
      await page.locator(`#player-${i} [data-value="correct"]`).click();
    }
    await page.locator('#finish-round').click();
    if (round === 2) {
      assert.equal(await page.locator('#smoke-break-dialog').isVisible(), true);
      assert.equal(await page.locator('#smoke-break-dialog p').textContent(), 'Tijd voor een rookpauze. 🚬');
      await page.locator('#smoke-break-dialog button').click();
    }
  }
  assert.equal(await page.locator('#game-result').isVisible(), true);
  await page.locator('#previous-round').click();
  // Invalid edit of a completed game reopens the round and clears the stale winner.
  await page.locator('#player-0 input[data-field="bid"]').fill('2');
  assert.equal(await page.locator('#finish-round').isDisabled(), true);
  assert.equal(await page.locator('#game-result').isVisible(), false);
  await page.locator('#player-0 input[data-field="bid"]').fill('1');
  await page.setViewportSize({ width: 768, height: 1024 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#settings-button').click();
  await page.locator('#restart-button').click();
  await page.locator('#cancel-restart').click();
  assert.equal(await page.locator('#game').isVisible(), true);

  // Load real v1-shaped storage, keep its rounds and scores, and choose its dealer.
  await page.evaluate(() => localStorage.setItem('rondje.boerenbridge.v1', JSON.stringify({ version: 1, players: ['Oud A', 'Oud B'], step: 5, active: 0, finished: false, rounds: [[{ bid: 0, outcome: 'correct', manual: null }, { bid: null, outcome: 'wrong', manual: -5 }]] })));
  await page.reload();
  assert.equal(await page.locator('#legacy-dealer').isVisible(), true);
  assert.deepEqual(await page.locator('tfoot td').allTextContents(), ['10', '-5']);
  await page.locator('#legacy-first-dealer').selectOption('1');
  assert.equal(await page.locator('#dealer-summary').textContent(), 'Oud B schudt · Oud A begint');
  await page.reload();
  assert.equal(await page.locator('#legacy-dealer').isVisible(), false);
  assert.equal(await page.locator('#scoreboard tbody tr').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Browsercontrole geslaagd: kaartenlimiet, melding, scoreanimaties, snel herhaald klikken, reduced motion, darkmode, touch-slepen, toetsenbordvolgorde, spelers toevoegen/verwijderen, schudrotatie, verboden bod, hoger totaal, dubbele top, terugweg, scorecorrecties en opslagmigratie. Telefoon 375px en tablet 768px zonder pagina-overflow of JavaScript-fouten.');
} finally {
  await browser?.close();
  server.kill();
}
