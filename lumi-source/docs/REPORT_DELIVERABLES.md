# Report deliverables

## 1. Feature → problem → root cause

| Feature | Problem addressed | Root cause targeted | Evidence from my research |
|---|---|---|---|
| Usage analytics (daily/weekly, unlocks, top apps) | Scrolling trap, excessive use | Low awareness of real time spent | |
| Pause-and-think screen on open (Android) | Automatic, habitual opening | Removed "stopping cues"; habit loops | |
| Daily app limits + "open anyway" after a wait | Doomscrolling | Infinite feeds, variable rewards | |
| Long-session nudge → mood-after-scrolling | Doomscrolling, low mood | Unnoticed emotional cost of feeds | |
| Phone-free times (study/sleep/meals/prayer/personal) | Procrastination, sleep loss, family friction | Constant availability, no boundaries | |
| Bedtime mode (wind-down, pause apps, grayscale, sleep log) | Sleep loss | Late-night screens, blue light, arousal | |
| Focus timer + grayscale + 5-minute start | Low focus, procrastination | Task avoidance, attractive app design | |
| Replacement-activity ideas | Boredom scrolling | Lack of ready alternatives | |
| Personalised quotes + home-screen widget | Low motivation | Lack of salient goal reminders | |
| Badges, usage-drop celebrations | Low motivation | Few positive reinforcements for change | |
| Streaks with kind restart, total kept days | Relapse, guilt spiral | All-or-nothing thinking, shame | |
| Real-life goals with steps and reflection | Escapism, low self-worth | Offline progress feels slow vs online rewards | |
| Gaming session timer + last-round warning | Game addiction | No natural stopping points in games | |
| Weekly gaming budget + post-play mood check | Game addiction | Unmonitored time; mood effects unnoticed | |
| Offline challenges / detox challenges | Game addiction, escapism | Real-world activities lack structure | |
| Reality-check cards | Social comparison | Highlight reels, filters, algorithms | |
| Gratitude and "my wins" journal | Social comparison, low mood | Negativity bias, comparing to others | |
| Feed clean-up / mute & unfollow guide | Social comparison, upsetting content | Feeds tuned for engagement, not wellbeing | |
| Escapism guide | Living in a fantasy world | Avoidance of hard feelings | |
| Safe-reporting guide (block, report, save evidence) | Cyberbullying, harassment | Not knowing what to do; fear of retaliation | |
| Private evidence log with PDF | Cyberbullying | Evidence lost; hard to prove to adults | |
| Image-abuse, grooming, scams, deepfake guides | Harassment, exploitation | Low awareness of manipulation tactics | |
| Consent education + quiz | Harassment, unhealthy relationships | Unclear norms about sharing and consent | |
| Privacy check-up checklist | Harassment, inappropriate contact | Public profiles, location sharing | |
| Upsetting-content guide | Inappropriate content exposure | Algorithmic exposure; shame about seeing it | |
| Anonymous note to a trusted helper | Harassment, distress | Fear of being identified when asking for help | |
| Trusted person quick message | Loneliness, distress | Hard to start the conversation | |
| Private mood tracking + low-mood support card | Low mood, misery | Unnoticed decline; delay in seeking help | |
| Distress-language support sheet | Suicidal thoughts | Isolation in a crisis; no path to people | |
| One-tap Help button | Suicidal thoughts, crisis | Not knowing who to contact | |
| Moderated anonymous peer-support space | Loneliness | Stigma; lack of peers with shared experience | |
| Real-world connection nudges, events board | Loneliness | Online contact replacing in-person contact | |
| Breathing, grounding, muscle relaxation, worry jar | Stress, anxiety, sleep | Physiological stress response, rumination | |
| Weekly reflection (mood × sleep × usage patterns) | All | Lack of self-insight into what affects wellbeing | |
| Onboarding personalisation | All | One-size-fits-all apps feel irrelevant | |
| Demo mode, data export/delete, app lock | Trust, privacy | Fear of surveillance discourages honest use | |

## 2. Cut or deferred

| Item | Decision | Reason (D = desirability, F = feasibility, V = viability, S = safety/ethics) |
|---|---|---|
| iOS real usage tracking and app blocking | Deferred | F: Apple Screen Time API needs a special Family Controls entitlement and Swift extensions. iOS uses check-ins and in-app tools. |
| Hard app blocking with no "open anyway" | Cut | S/D: total blocks feel punitive and get uninstalled; a wait plus choice respects autonomy. |
| Accessibility-service app detection | Cut | S/V: very sensitive permission, Play Store restrictions. Usage access + overlay is enough. |
| Remote push notifications (FCM) | Deferred | S: lock-screen privacy; F: needs Cloud Functions (paid plan). All reminders are local. |
| Cloud backup of personal data | Cut | S: mental-health data must stay on device; export file covers portability. |
| Automatic deletion of orphaned anonymous accounts | Deferred | F: needs Identity Platform or Cloud Functions. Data is deleted; only an empty anonymous account may remain. |
| AI chatbot / AI moderation | Cut | S: risk of harmful or clinical-sounding advice to young people; human moderation is safer. |
| Content scanning of messages on the phone | Cut | S: brief requires education only, never monitoring. |
| Parent/school dashboards | Cut | S: no monitoring of individuals. |
| Leaderboards, public streaks | Cut | S/D: shaming and comparison are root causes we address. |
| Aggregate anonymous statistics | Deferred | S/F: needs abuse-resistant counting (App Check, functions). |
| Firebase App Check and rate limiting | Deferred | F: needs native SDK; pre-moderation limits spam impact meanwhile. |
| iOS home-screen widget | Deferred | F: needs a WidgetKit Swift extension. |
| Additional languages | Deferred | V: needs native-speaker translation and review; structure is ready. |
| Calendar export for events, sounds for breathing | Deferred | D/F: nice-to-have; extra permissions and licensing. |

## 3. Test plan for 5 users

**Before:** consent form, explain it's a prototype, not a therapist; give the APK (Android) or web link; install in demo mode first, then real mode. Never ask testers to share real distress.

| # | Scenario | Steps | Pass when |
|---|---|---|---|
| T1 | Onboarding | Get started → pick concerns → goals → rhythm → permissions → safety | Today shows tools matching concerns; under 2 min |
| T2 | Help in 1 tap | From any tab tap Help | Emergency, helpline/directory and trusted person visible |
| T3 | Mood check-in | Today → pick mood → emotions → save | Toast; Mind week strip updated |
| T4 | Distress response | Journal → type "I want to die" (test phrase) → save | Calm support sheet with real-person options, no alarm wording |
| T5 | Screen time (Android) | Allow usage access → Habits | Real minutes and top apps shown |
| T6 | Pause screen (Android) | App limits → add an app, pause on open → enable → open that app | Pause screen; "Open anyway" waits, "Close" goes home |
| T7 | Phone-free time | Add Study window covering now → open limited app | Pause screen with window name |
| T8 | Self check-in (iOS/web) | Habits → log screen time | Chart and insights use it |
| T9 | Gaming | Start 30-min session → end → rate mood | Budget bar updates |
| T10 | Streak slip | Create custom streak → "I slipped" | Kind restart message, total days kept |
| T11 | Peer space | Connect → Peer → consent → post | "Waiting for a moderator"; appears after moderator approves |
| T12 | Anonymous note | Connect → Anonymous note → send | Note listed; helper reply visible later |
| T13 | Evidence log | Add entry with screenshot → Export PDF | PDF opens with entries |
| T14 | Weekly reflection | Me → Weekly reflection | Patterns phrased as "might be linked"; reflection saves |
| T15 | Privacy | Settings → Privacy → Export, then Delete everything | File shared; app returns to onboarding |
| T16 | Accessibility | Enable large text, dark mode, screen reader | Readable, buttons labelled |

**Questions after each session (1–5 scale + why):** Was it easy to find help? Did anything feel judgemental? Which feature would you use weekly? Did you trust it with your data? What would you remove?

**Measures:** task success (pass/fail), time on task, SUS questionnaire, number of errors/confusions, qualitative quotes.

### Change log template

| Date | Tester (code, not name) | Issue / quote | Severity (1–3) | Change made | Version |
|---|---|---|---|---|---|
| | P1 | | | | 1.0.0 |
