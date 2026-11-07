# Adding a language
1. Copy `locales/en/ui.json` and `locales/en/content.json` to `locales/<code>/` and translate the values (keep keys and `id`s unchanged, keep `{{placeholders}}`).
2. Plurals: add `_one`, `_other` (and `_few`, `_many`… if the language needs them).
3. In `src/i18n/index.ts`: import both files, add them to `ui` and `contents`, and add `{ code, label, rtl }` to `LANGUAGES` (`rtl: true` for Arabic, Hebrew, Urdu…).
4. Translate `safety.distressPhrases` carefully with native speakers.
5. Run `node scripts/check-i18n.mjs`. Missing keys fall back to English automatically.
