#!/usr/bin/env node
/**
 * End-to-end test of Lumi's cloud features against the local Firebase emulators
 * (Auth + Firestore with the real security rules). No real project is touched.
 *
 * 1. Put these lines in config/.env (or export them) and build the web app:
 *      FIREBASE_API_KEY=demo-api-key
 *      FIREBASE_PROJECT_ID=demo-lumi
 *      FIREBASE_APP_ID=1:000000000000:web:demo
 *      USE_FIREBASE_EMULATORS=true
 *    npx expo export --platform web --output-dir dist-e2e
 * 2. Run (from the repo root):
 *      cd firebase && npx firebase emulators:exec --only auth,firestore --project demo-lumi \
 *        --config ../firebase.json "node ../scripts/e2e-cloud-web.mjs ../dist-e2e"
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const dist = path.resolve(process.argv[2] ?? 'dist-e2e');
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/demo-lumi/databases/(default)/documents`;
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = path.join(dist, url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

async function list(collectionPath) {
  const res = await fetch(`${FS}/${collectionPath}?pageSize=100`, { headers: owner });
  const json = await res.json();
  return json.documents ?? [];
}

async function patch(docName, fields) {
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/${docName}?${mask}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`patch failed ${res.status} ${await res.text()}`);
}

const errors = [];
const browser = await chromium.launch();
const steps = [];
const ok = (msg) => {
  steps.push(msg);
  console.log('  ✓', msg);
};
function expect(cond, msg) {
  if (!cond) throw new Error(`Expectation failed: ${msg}`);
  ok(msg);
}

async function user() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  const vis = (id) => page.locator(`[data-testid="${id}"]:visible`).last();
  page.vis = vis;
  await page.goto(base);
  await vis('welcome-start').click({ timeout: 30000 });
  for (let step = 1; step <= 5; step++) {
    await page.locator(`[data-testid="onboarding-step-${step}"] [data-testid="onboarding-next"]`).click({ timeout: 20000 });
  }
  await vis('screen-today').waitFor({ timeout: 20000 });
  return page;
}

async function waitFor(fn, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return ok(label);
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out: ${label}`);
}

try {
  console.log('User A posts anonymously');
  const a = await user();
  await a.goto(`${base}/connect/peer`);
  await a.vis('consent-agree').click({ timeout: 20000 });
  await a.vis('peer-new').click({ timeout: 20000 });
  await a.vis('peer-text').fill('First week at a new club and I am nervous. Any tips?');
  await a.vis('peer-send').click();
  await waitFor(async () => (await list('peerPosts')).length === 1, 'post stored in Firestore');
  const [post] = await list('peerPosts');
  expect(post.fields.status.stringValue === 'pending', 'new post waits for a moderator');
  expect(!JSON.stringify(post).includes('nickname'), 'no profile data in the post');
  const authorA = post.fields.authorId.stringValue;

  console.log('Moderator publishes, user B reacts and reports');
  await patch(post.name, { status: { stringValue: 'published' } });
  const b = await user();
  await b.goto(`${base}/connect/peer`);
  await b.vis('consent-agree').click({ timeout: 20000 });
  await b.getByText('First week at a new club').first().waitFor({ timeout: 20000 });
  ok('published post visible to another user');
  await b.getByRole('button', { name: /^I hear you/ }).first().click();
  await waitFor(async () => {
    const [p] = await list('peerPosts');
    return Number(p.fields.reactions.mapValue.fields.hear.integerValue) === 1;
  }, 'reaction counted once');
  await b.getByRole('button', { name: 'Report this post' }).first().click();
  await b.getByRole('button', { name: 'Unkind or bullying' }).click();
  await waitFor(async () => {
    const [p] = await list('peerPosts');
    return Number(p.fields.reportCount.integerValue) === 1;
  }, 'report counted');

  console.log('User A sends an anonymous note');
  await a.goto(`${base}/connect/note`);
  await a.vis('note-new').click({ timeout: 20000 });
  await a.vis('note-text').fill('Someone in my class keeps making fun of me online.');
  await a.vis('note-send').click();
  await waitFor(async () => (await list('anonNotes')).length === 1, 'anonymous note stored');
  const [note] = await list('anonNotes');
  expect(note.fields.authorId.stringValue === authorA, 'note linked only to the anonymous id');

  console.log('User A withdraws consent: cloud data is deleted');
  await a.goto(`${base}/settings/privacy`);
  await a.getByRole('button', { name: 'Delete my cloud posts and notes' }).click({ timeout: 20000 });
  await waitFor(async () => (await list('peerPosts')).length === 0 && (await list('anonNotes')).length === 0, 'posts and notes deleted');
} catch (error) {
  errors.push(`test: ${error.message.split('\n')[0]}`);
  const shotDir = process.env.E2E_SHOTS;
  if (shotDir) {
    let i = 0;
    for (const ctx of browser.contexts()) for (const p of ctx.pages()) await p.screenshot({ path: path.join(shotDir, `e2e-failure-${i++}.png`) }).catch(() => undefined);
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
console.log(`\nCloud end-to-end test passed (${steps.length} checks).`);
