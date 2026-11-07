# Privacy and safety by design

- **On device by default:** moods, journal, sleep, screen time, goals, evidence log (AsyncStorage + app-private files, protected by Android/iOS sandbox and device encryption). There is no Firestore collection for personal data; the rules deny it.
- **Cloud only with consent:** peer posts, replies, reactions, reports and anonymous notes, stored under an anonymous Firebase ID. Consent screen before first use; withdraw in Settings → Privacy deletes them.
- **No monitoring:** no parent/staff/peer views. Staff roles (`staff/{uid}`) can only moderate anonymous posts, answer anonymous notes and post events.
- **No shaming:** no leaderboards; streaks keep total days; slips get a kind restart.
- **Path to a real human:** Help button on every screen; helpline from config, emergency number, findahelpline.com fallback, trusted person.
- **Distress language:** checked on the phone only; shows a gentle support sheet; never blocks writing, never alerts anyone, never promises secrecy, no clinical advice. Keyword checks are imperfect and documented as such.
- **Minimal permissions**, each explained in Settings → Permissions; requested only when a feature needs it.
- **Export and delete** everything at any time.
- **Security rules** tested with 20 emulator tests (`npm run test:rules`).
