#!/usr/bin/env node
/**
 * Checks that every t('key') used in the code exists in the English UI strings,
 * so no screen ever shows a raw key. Run: node scripts/check-i18n.mjs
 * Dynamic keys like t(`days.short.${d}`) are listed in DYNAMIC below and checked by prefix.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ui = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/en/ui.json'), 'utf8'));

// Every dynamic key family and the suffixes the code can produce.
const DYNAMIC = {
  'days.short': ['0', '1', '2', '3', '4', '5', '6'],
  'days.long': ['0', '1', '2', '3', '4', '5', '6'],
  'today.greeting': ['morning', 'afternoon', 'evening', 'night', 'morningName', 'afternoonName', 'eveningName', 'nightName'],
  'journal.types': ['gratitude', 'win', 'reflection', 'worry'],
  'journal.short': ['gratitude', 'win', 'reflection'],
  'peer.status': ['pending', 'published', 'hidden'],
  'peer.reactions': ['hear', 'strength', 'metoo'],
  'note.status': ['open', 'answered', 'closed'],
  'community.issues': ['too-long', 'contact', 'link', 'handle', 'hurtful'],
  'safety.categories': ['safety', 'privacy', 'habits', 'wellbeing'],
  'safety.quiz': ['ok', 'ask', 'notok'],
  'sleep.qualityLevels': ['1', '2', '3', '4', '5'],
  'swaps.time': ['all', 'quick', 'short', 'long'],
  'checkin.categories': ['social', 'video', 'games', 'messaging', 'browsing', 'school'],
  'settings.notif': ['checkin', 'bedtime', 'morning', 'windows', 'nudges', 'weekly', 'quotes', 'checkinSub', 'bedtimeSub', 'morningSub', 'windowsSub', 'nudgesSub', 'weeklySub', 'quotesSub'],
  'insights.highlight': ['screenDown', 'moodUp', 'sleepGood', 'focusDone', 'winsLogged', 'steppedAway', 'gamingBudget'],
  'insights.pattern': ['sleepMood', 'sleepMoodReverse', 'screenMood', 'screenMoodReverse', 'afterScrollWorse', 'afterScrollBetter', 'gamingLong', 'calmMood'],
  'time.ago': ['now', 'minutes', 'hours', 'days'],
};

function lookup(key) {
  let node = ui;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else return undefined;
  }
  return node;
}

function exists(key) {
  if (typeof lookup(key) === 'string') return true;
  const parts = key.split('.');
  const last = parts.pop();
  const parent = parts.length ? lookup(parts.join('.')) : ui;
  return !!parent && typeof parent === 'object' && typeof parent[`${last}_other`] === 'string';
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== '__tests__') walk(full, out); }
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const used = new Map();
const keyPattern = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
const keyProp = /\bkey:\s*'([a-z]+\.[a-zA-Z0-9_.-]+)'/g;
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const re of [keyPattern, keyProp]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (!used.has(m[1])) used.set(m[1], path.relative(root, file));
    }
  }
}
for (const [prefix, suffixes] of Object.entries(DYNAMIC)) {
  for (const s of suffixes) used.set(`${prefix}.${s}`, '(dynamic)');
}

const missing = [...used.entries()].filter(([key]) => !exists(key));
if (missing.length) {
  console.error(`Missing ${missing.length} UI string(s) in src/i18n/locales/en/ui.json:`);
  for (const [key, file] of missing) console.error(`  ${key}   <- ${file}`);
  process.exit(1);
}
console.log(`i18n OK: ${used.size} keys used, all present.`);
