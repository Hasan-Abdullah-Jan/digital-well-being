#!/usr/bin/env node
/**
 * CI helper: writes config/.env from environment variables (for example GitHub
 * repository secrets), so keys are never committed. Missing values are skipped,
 * which makes the build fall back to demo/offline mode for that feature.
 */
import fs from 'node:fs';
import path from 'node:path';

const KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'HELPLINE_OR_TRUSTED_CONTACT',
  'HELPLINE_NAME',
  'HELPLINE_TEXT_NUMBER',
  'HELPLINE_WEBSITE',
  'EMERGENCY_NUMBER',
  'HELPLINE_DIRECTORY_URL',
  'ORGANISATION_NAME',
  'PRIVACY_CONTACT_EMAIL',
  'PEER_SPACE_ENABLED',
  'DEMO_MODE_ONLY',
];

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lines = ['# Written by scripts/write-env.mjs during CI. Do not commit.'];
const present = [];
for (const key of KEYS) {
  const value = (process.env[key] ?? '').trim();
  if (!value) continue;
  lines.push(`${key}=${value.replace(/\r?\n/g, ' ')}`);
  present.push(key);
}
fs.mkdirSync(path.join(root, 'config'), { recursive: true });
fs.writeFileSync(path.join(root, 'config', '.env'), `${lines.join('\n')}\n`);
console.log(present.length ? `config/.env written with: ${present.join(', ')}` : 'No secrets set: the build runs in demo/offline mode for cloud features.');
