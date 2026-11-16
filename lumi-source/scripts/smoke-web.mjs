#!/usr/bin/env node
/**
 * Web smoke test: serves the exported web build (dist/) and clicks through the app
 * in headless Chromium, saving screenshots and failing on any JavaScript error.
 *
 *   npx expo export --platform web
 *   node scripts/smoke-web.mjs [outputDir]
 *
 * Needs Playwright (npx playwright install chromium) — not an app dependency.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const out = path.resolve(process.argv[2] ?? path.join(root, 'test-results', 'smoke'));
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = path.join(dist, url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const errors = [];
const browser = await chromium.launch();

async function newPage(colorScheme = 'light') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return page;
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log('  ✓', name);
}

async function tap(page, testId) {
  // Stacks and tabs keep earlier screens mounted underneath; the top screen comes last in the DOM.
  await page.locator(`[data-testid="${testId}"]:visible`).last().click();
}

async function visible(page, testId, timeout = 20000) {
  await page.locator(`[data-testid="${testId}"]:visible`).last().waitFor({ timeout });
}

try {
  console.log('Demo mode tour');
  const page = await newPage();
  await page.goto(base);
  await visible(page, 'welcome-demo', 30000);
  await shot(page, '01-welcome');
  await tap(page, 'welcome-demo');
  await visible(page, 'screen-today', 30000);
  await shot(page, '02-today');
  for (const [tab, screen] of [['tab-habits', 'screen-habits'], ['tab-mind', 'screen-mind'], ['tab-connect', 'screen-connect'], ['tab-me', 'screen-me']]) {
    await tap(page, tab);
    await visible(page, screen, 15000);
    await shot(page, `03-${screen}`);
  }
  // Click the Help button that belongs to the screen on top (inactive tabs stay mounted underneath).
  await page.locator('[data-testid="screen-me"] [data-testid="help-button"]').click();
  await visible(page, 'screen-help', 15000);
  await shot(page, '04-help');

  const routes = [
    ['/habits/usage', 'screen-usage'],
    ['/habits/limits', 'screen-limits'],
    ['/habits/schedules', 'screen-windows'],
    ['/habits/bedtime', 'screen-bedtime'],
    ['/habits/focus', 'screen-focus'],
    ['/habits/gaming', 'screen-gaming'],
    ['/habits/checkin', 'screen-checkin'],
    ['/habits/swaps', 'screen-swaps'],
    ['/mind/mood', 'screen-mood'],
    ['/mind/mood-history', 'screen-mood-history'],
    ['/mind/journal', 'screen-journal'],
    ['/mind/journal-entry', 'screen-journal-entry'],
    ['/mind/breathe', 'screen-breathe'],
    ['/mind/grounding', 'screen-grounding'],
    ['/mind/sleep', 'screen-sleep'],
    ['/mind/stress', 'screen-stress'],
    ['/mind/reality', 'screen-reality'],
    ['/mind/after-scroll', 'screen-after-scroll'],
    ['/connect/peer', 'screen-peer'],
    ['/connect/peer-post', 'screen-peer-post'],
    ['/connect/events', 'screen-events'],
    ['/connect/trusted', 'screen-trusted'],
    ['/connect/note', 'screen-note'],
    ['/connect/nudges', 'screen-nudges'],
    ['/connect/safety', 'screen-safety'],
    ['/connect/guide/consent', 'screen-guide-consent'],
    ['/connect/guide/privacy-checkup', 'screen-guide-privacy-checkup'],
    ['/connect/evidence', 'screen-evidence'],
    ['/connect/moderation', 'screen-moderation'],
    ['/me/goals', 'screen-goals'],
    ['/me/streaks', 'screen-streaks'],
    ['/me/challenges', 'screen-challenges'],
    ['/me/badges', 'screen-badges'],
    ['/me/insights', 'screen-insights'],
    ['/settings', 'screen-settings'],
    ['/settings/privacy', 'screen-privacy'],
    ['/settings/permissions', 'screen-permissions'],
    ['/settings/about', 'screen-about'],
    ['/habits/strict', 'screen-strict'],
    ['/body', 'screen-body'],
    ['/body/eye-break', 'screen-eye-break'],
    ['/body/stretch', 'screen-stretch'],
    ['/crew', 'screen-crew'],
    ['/crew/demo-crew', 'screen-crew-board'],
    ['/crew/new', 'screen-crew-new'],
    ['/crew/join', 'screen-crew-join'],
  ];
  let i = 10;
  for (const [route, id] of routes) {
    await page.goto(base + route);
    await visible(page, id, 20000);
    await shot(page, `${i++}-${id}`);
  }

  console.log('Interactions');
  await page.goto(base + '/mind/mood');
  await visible(page, 'screen-mood');
  await tap(page, 'mood-4');
  await page.locator('[data-testid="mood-note"]:visible').fill('Feeling okay today, had a nice walk');
  await tap(page, 'mood-save');
  await page.waitForTimeout(500);
  await page.goto(base + '/mind/journal-entry?type=gratitude');
  await page.locator('[data-testid="journal-text"]:visible').fill('I want to die');
  await tap(page, 'journal-save');
  await visible(page, 'support-sheet', 10000);
  await shot(page, '80-support-sheet');

  console.log('New features');
  await page.goto(base + '/body');
  await visible(page, 'screen-body');
  await tap(page, 'add-water-1');
  await page.goto(base + '/body/eye-break');
  await visible(page, 'screen-eye-break');
  await tap(page, 'eye-quick');
  await page.waitForTimeout(1500);
  await shot(page, '81-eye-break-running');
  await page.goto(base + '/habits/focus');
  await visible(page, 'screen-focus');
  await page.getByRole('radio', { name: 'Deep focus' }).last().click();
  await tap(page, 'toggle-focus-lock');
  await shot(page, '82-focus-deep-setup');
  await tap(page, 'focus-start');
  await visible(page, 'focus-emergency');
  await shot(page, '83-focus-locked-running');
  await page.goto(base + '/crew/demo-crew');
  await visible(page, 'screen-crew-board');
  await tap(page, 'crew-habit-walk');
  await shot(page, '84-crew-checkin');
  await page.goto(base + '/crew/new');
  await visible(page, 'screen-crew-new');
  await page.locator('[data-testid="crew-member-name"]:visible').fill('Leo');
  await tap(page, 'crew-add-member');
  await tap(page, 'crew-create');
  await visible(page, 'screen-crew-board');
  await shot(page, '85-crew-created');
  await page.goto(base + '/habits/strict');
  await visible(page, 'screen-strict');
  await tap(page, 'toggle-strict');
  await shot(page, '86-strict-on');

  console.log('Dark mode');
  const dark = await newPage('dark');
  await dark.goto(base);
  await visible(dark, 'welcome-demo', 30000);
  await tap(dark, 'welcome-demo');
  await visible(dark, 'screen-today', 30000);
  await shot(dark, '90-today-dark');
  await dark.goto(base + '/me/insights');
  await visible(dark, 'screen-insights');
  await shot(dark, '91-insights-dark');
  await dark.goto(base + '/body');
  await visible(dark, 'screen-body');
  await shot(dark, '92-body-dark');
  await dark.goto(base + '/crew/demo-crew');
  await visible(dark, 'screen-crew-board');
  await shot(dark, '93-crew-dark');
  await dark.goto(base + '/habits/strict');
  await visible(dark, 'screen-strict');
  await shot(dark, '94-strict-dark');

  console.log('Fresh onboarding (no demo)');
  const fresh = await newPage();
  const next = async (step) => {
    await visible(fresh, `onboarding-step-${step}`);
    await fresh.locator(`[data-testid="onboarding-step-${step}"] [data-testid="onboarding-next"]`).click();
  };
  await fresh.goto(base);
  await visible(fresh, 'welcome-start', 30000);
  await tap(fresh, 'welcome-start');
  await visible(fresh, 'onboarding-step-1');
  await tap(fresh, 'concern-scrolling');
  await tap(fresh, 'concern-sleep');
  await shot(fresh, '95-onboarding-concerns');
  await next(1);
  await visible(fresh, 'goal-scroll-less');
  await shot(fresh, '96-onboarding-goals');
  await next(2);
  await visible(fresh, 'onboarding-step-3');
  await fresh.locator('[data-testid="onboarding-step-3"] [data-testid="nickname"]').fill('Alex');
  await next(3);
  await next(4);
  await visible(fresh, 'onboarding-step-5');
  await shot(fresh, '97-onboarding-safety');
  await next(5);
  await visible(fresh, 'screen-today', 15000);
  await shot(fresh, '98-today-fresh');
} catch (error) {
  errors.push(`test: ${error.message.split('\n')[0]}`);
  for (const ctx of browser.contexts()) {
    for (const [k, p] of ctx.pages().entries()) await p.screenshot({ path: path.join(out, `failure-${k}.png`) }).catch(() => undefined);
  }
} finally {
  await browser.close();
  server.close();
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`\nSmoke test passed. Screenshots in ${out}`);
