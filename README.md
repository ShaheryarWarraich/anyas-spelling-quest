# Anya's Spelling Quest

A tablet-first, offline-capable PWA that turns a 6-week spelling plan into a 10–15 minute daily game for one child (Anya, 7). One rule per week, four Ways to learn each rule, videos with a check-in quiz, paper writing checked by a grown-up, a forgiving streak garden, and a Revision ("Remember") mode. Everything is remembered on the device in IndexedDB and can be exported.

## Assumptions I made (change any of these in code or JSON)

1. **One grown-up check per day, not two.** Each Way ends with 2–4 paper words; those join the day's 5 words in a single "Show your paper to a grown-up" check (one PIN entry, one list, tagged "Way N word"). Way words never count toward the transfer score.
2. **Streak minimum minutes applies to learn days only.** A day counts for the streak when the parent check is done and active time ≥ `min_session_minutes` (10). The Saturday probe has no Learn step and naturally runs 6–8 minutes, so `min_probe_minutes` is 0 (both in `anya.json` → `settings`). The child's flower blooms on every completed day regardless; the ≥10-minute rule only affects the parent's streak count.
3. **The streak is a count that pauses.** Because it never resets, the streak = number of counted days. "Paused" just means the previous weekday was missed; the next session continues the same count. Sundays are skipped, never missed.
4. **Hard stop at 15 minutes** shows "Done for today" mid-activity. If words were already written, that screen has a small "Grown-up: check the paper" button so the day can still be checked and counted.
5. **"Try another way" cycles 1→2→3→4→1.** A Way is marked done when its end-check (rule tap / quiz / tiles / game) is completed and its paper words are written.
6. **Way 2 offline:** YouTube needs internet. If offline, the screen says so and offers "Try another way". Link-type items (Reading Universe, Literacy Learn) open in the browser and the checkbox wakes 3 s after the tap.
7. **Revision word from Week 2 on** replaces one of the 3 taught words (so the day is 2 taught + 2 transfer + 1 revision). Spacing: the rule served longest ago first, then the word served longest ago.
8. **Week 5** daily transfer = dictated sentences shown to the grown-up to read (she writes the sentence); the Saturday probe is the 10 heart words inside 5 sentences and is marked per word.
9. **Week 6** has no Learn step: Welcome → rule tap + 5 words (one per earlier rule) → check. Saturday is the 30-word probe (6 per rule, all new).
10. **Repeat a week:** inserts that week again starting the Monday after the current week and shifts later weeks by 7 days. Past day records keep their own week id, so history never changes.
11. **Date jump:** records are keyed by calendar date; a jump of more than 7 days (or backwards) is logged and shown to the parent, nothing is deleted.
12. **Old-rule badges** appear on the shelf once a week has ended (or the rule is fully known). "Fully known" (≥2 Ways done and Saturday probe ≥ 8/10) is parent-only; the child sees "You finished the FLOSS rule!" with a badge.
13. **Default PIN is 3690.** Change it in Grown-ups → Settings. The PIN is stored as a SHA-256 hash.
14. **Audio** is pre-generated with the macOS voice "Karen" (`npm run audio`); if a file is missing the app falls back to the device's speech synthesis, which works offline on iPad.
15. **Guide character** is Pip, an original round fox cub (SVG in `src/art/Pip.jsx`). Stickers at 5/10/20 streak days: star scarf, sparkle glasses, gold crown.

## Setup

```bash
cd anyas-spelling-quest
npm install
npm run dev          # http://localhost:5173 (add --host to reach it from the iPad on the same Wi-Fi)
npm run build        # production build in dist/ (includes the service worker and manifest)
npm run preview      # serve dist/ locally
npm run test:sim     # headless 7-day simulation (see below)
npm run audio        # regenerate audio for every word in the JSON (macOS only)
```

Testing tip: add `?today=2026-09-07` to the URL to open the app as if it were that date (development only).

## Install on an iPad

Live app: **https://shaheryarwarraich.github.io/anyas-spelling-quest/** (GitHub Pages, published from the `gh-pages` branch). After editing anything, run `npm run deploy` to republish.

1. Open the URL in **Safari** on the iPad (not Chrome; only Safari can add PWAs to the home screen).
2. Tap the **Share** button → **Add to Home Screen** → Add.
3. Open it once from the home screen while online; the service worker then caches the app, content and all audio (≈2 MB). After that it runs fully offline.
4. Data lives in that home-screen app's IndexedDB. Do not delete the app or clear Safari website data without exporting first (Grown-ups → Settings → Export).

Local Wi-Fi alternative for testing: `npm run dev -- --host`, then open `http://<your-mac-ip>:5173` on the iPad. Service workers won't register over plain HTTP, so use this only for trying it out.

## Editing the content (`public/content/anya.json`)

All words, scripts, videos, quizzes and games live in one JSON file; no code changes are needed.

- `settings`: `session_minutes` (hard stop, 15), `min_session_minutes` (10), `min_probe_minutes` (0), `word_show_seconds` (3), `daily_words` (5), `streak_milestones`.
- `guide`: Pip's name and the lines he says (`hello`, `done`, `warm`).
- `weeks[]` — one object per week, in order:
  - `rule_id`, `rule_name`, `rule_text` (child-facing, keep it one line), `rule_short`, `emoji`, `dates` (informational; the real schedule is start date + 7 days per week, editable in Grown-ups → Settings).
  - `taught[]`, `daily_transfer[]`, `probe[]`. Week 5 uses `daily_sentences[]` and `probe_sentences[]` (`{text, words}`), Week 6 uses `probe_by_rule{}` and `"mixed": true`.
  - `way1_script[]`: slides `{kind, title, text, demo}`. `text` is what the grown-up reads. `demo.type` is one of `show` (optional `highlight`, `color`), `cover` (`word`, `hide`: letter indexes), `flip` (`from`, `to`), `columns` (`cols[{label, words, color}]`), `clap` (`syllables`), `list` (`words`), `heart` (uses `way1_pairs_by_day`). The final slide `{kind:"write", words:[...]}` is the paper step.
  - `way2_videos[]`: `{title, url, quiz[{q, options[], answer}]}`; add `"type":"link"` for a web page instead of a YouTube video, optional `checkbox` label.
  - `way3_words[]`: `{word, tiles[]}` where each tile is one sound (`"ll"`, `"ai"`, `"igh"`, `"a_e"`); optional `syllables[[...],[...]]`, `colors{tile:hex}`, `heart[tiles]`.
  - `way4_game`: `{type: "sort"|"where"|"hunt"|"rhyme"|"hearthunt", ...}` — see Week 1–5 for each shape.
  - `watch_for`: shown to the grown-up on the check screen.

After editing, reload the app (or rebuild). The audio generator only creates files that don't exist yet, so run `npm run audio` after adding words.

## What is stored (IndexedDB `anya-spelling-quest`)

- `profile`: name, PIN hash, plan start date, repeats, settings (sheet URL), last opened date.
- `days`: one record per calendar day: week, day type, step, active ms, Way(s) done, switches, words shown (with source/mark/rule tap), parent check, probe score, counts-for-streak.
- `videos`: watch records with quiz taps. `revisions`: auto revision words served, quick looks, old-rule mini sessions. `events`: switch presses, hard stops, date jumps, repeat marks.

Export (Grown-ups → Settings) gives the full JSON or five CSVs (`sessions`, `words`, `videos`, `revisions`, `events`). Optional Google Sheet sync: see `apps-script/SETUP.md`.

## Headless simulation

`npm run test:sim` runs the real core against an in-memory IndexedDB, re-opening the app each day: Week 1 Mon (Way 1) → Tue (Way 1, presses "Try another way" → Way 2, watches the Floss Dance) → Wed missed → Thu (Way 3, streak paused then resumes) → Fri (Way 4, 15-minute hard stop mid-activity, then checked) → Sat (probe 9/10, recap) → Sun (rest) → Week 2 Mon (revision word drawn from FLOSS, quick look, old-rule mini session). It asserts memory across reopens, streak pause, hard stop, and the revision draw, then prints the parent dashboard, the Revision calendar and `sessions.csv`. Latest output: `test/last-run.txt`.

## Project layout

```
public/content/anya.json   all content
public/audio/*.m4a         one clip per word / sentence
src/core/                  UI-free logic: db, schedule (repeat/shift), streak, words, revision, session state machine, dashboard, export
src/ui/                    React screens, Way components, shared components
src/art/                   Pip, flowers, badges (SVG)
apps-script/               Google Sheet sink + setup guide
test/simulate.mjs          7-day headless simulation
scripts/gen-audio.mjs      audio generator (macOS say)
```
