import { toISO, addDays, isSunday, weekday, diffDays } from './dates.js';
import { getDayInfo, buildSchedule, nextWeekEntry, slotInfo } from './schedule.js';
import { computeStreak } from './streak.js';
import { pickDailyWords } from './words.js';
import { finishedRules, oldRuleWords } from './revision.js';
import { Session } from './session.js';
import { earItems, sentencePicks, sentencesToWrite } from './review.js';
import { buildDashboard, fullyKnownMap } from './dashboard.js';
import { toJSONExport, toCSVExport } from './export.js';

export const WAY_NAMES = { 1: 'Learn it with a grown-up', 2: 'Watch and dance', 3: 'Sound boxes', 4: 'Play it' };
export const STICKERS = [{ at: 5, id: 'scarf', name: 'Star scarf' }, { at: 10, id: 'glasses', name: 'Sparkle glasses' }, { at: 20, id: 'crown', name: 'Gold crown' }];

export async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createApp({ db, content, now = () => new Date() }) {
  const app = {
    db, content, now,
    today() { return toISO(now()); },
    nowISO() { return now().toISOString(); },
    profile: null,
    dateJump: null,

    async init() {
      let p = await db.get('profile', 'anya');
      if (!p) {
        p = { id: 'anya', name: content.child.name, pinHash: await sha256('3690'), startDate: content.weeks[0].dates.start, repeats: [], settings: { sheetUrl: '', voice: 'file' }, createdAt: this.nowISO(), lastOpened: null };
        await db.put('profile', p);
      }
      const today = this.today();
      if (p.lastOpened && p.lastOpened !== today) {
        const gap = diffDays(p.lastOpened, today);
        if (gap < 0 || gap > 7) this.dateJump = { from: p.lastOpened, to: today, gap };
        if (gap < 0 || gap > 7) await this.logEvent('date_jump', { from: p.lastOpened, to: today, gap });
      }
      p.lastOpened = today;
      await db.put('profile', p);
      this.profile = p;
      return this;
    },
    async saveProfile(patch) { Object.assign(this.profile, patch); await db.put('profile', this.profile); },
    async logEvent(type, data = {}) { await db.add('events', { type, date: this.today(), at: this.nowISO(), ...data }); },
    async verifyPin(pin) { return (await sha256(String(pin))) === this.profile.pinHash; },
    async setPin(pin) { await this.saveProfile({ pinHash: await sha256(String(pin)) }); },

    info(dateStr = this.today()) { return getDayInfo(content, this.profile, dateStr); },
    schedule() { return buildSchedule(content, this.profile); },
    // Sessions: one record per lesson played. The first lesson of a day has id = date; more lessons that day get date#2, date#3...
    async days() { return (await db.all('sessions')).sort((a, b) => a.date.localeCompare(b.date) || (a.seq || 1) - (b.seq || 1)); },
    async getDay(id) { return db.get('sessions', id); },
    async saveDay(day) { await db.put('sessions', day); },
    async sessionsOn(dateStr) { return (await this.days()).filter(d => d.date === dateStr); },

    // The next lesson to play: the first plan slot (week + day) that is planned for fromDate or later and not yet played.
    // No lock: once a lesson is done she can go straight on to the next one. Slots planned for past days she missed are skipped.
    async nextSlot(fromDate = this.today(), sessions) {
      const all = sessions || await this.days();
      const played = new Set(all.filter(d => !d.bonus).map(d => `${d.weekId}|${d.weekIteration || 1}|${d.dayIdx}`));
      const sched = this.schedule();
      for (const e of sched) for (let i = 0; i < 6; i++) {
        if (addDays(e.start, i) < fromDate) continue;
        if (!played.has(`${e.weekId}|${e.iteration}|${i}`)) return slotInfo(sched, e, i, fromDate);
      }
      return null;
    },
    describeSlot(slot) {
      if (!slot) return null;
      const week = slot.weekEntry.week;
      if (slot.dayType === 'probe') return 'show what you know';
      if (slot.dayType === 'mixed') return 'all the rules together';
      if (slot.dayIdx === 0) return `a new rule, ${week.rule_name}`;
      if (slot.defaultWay === 4 && week.way4_game) return 'play ' + gameName(week.way4_game);
      return WAY_NAMES[slot.defaultWay];
    },
    async peekNext(dateStr = this.today()) {
      const slot = await this.nextSlot(dateStr); if (!slot) return null;
      let text = this.describeSlot(slot);
      if (slot.defaultWay === 2 && slot.dayType === 'learn' && slot.dayIdx !== 0) { const v = await this.pickVideo(slot.weekEntry, slot.dayIdx); if (v) text = `the ${v.title} video`; }
      return { ...slot, text };
    },
    infoForRecord(rec) {
      const sched = this.schedule();
      const entry = sched.find(e => e.weekId === rec.weekId && e.iteration === (rec.weekIteration || 1)) || this.info(rec.date).weekEntry;
      if (rec.bonus) return { ...slotInfo(sched, entry, 0, rec.date), dayType: rec.dayType, bonus: true, defaultWay: 1 };
      return slotInfo(sched, entry, rec.dayIdx, rec.date);
    },
    async streak() { return computeStreak(await this.days(), this.today(), content.settings.streak_milestones); },
    stickersFor(streak) { return STICKERS.filter(s => streak.count >= s.at); },

    // Open the app: resume the latest lesson of the day (opening twice never duplicates).
    // { next: true } starts the next unplayed lesson even if one is already done today.
    // { bonus: true } on a Sunday starts the rest-day bonus lesson.
    async getSession(dateStr = this.today(), { bonus = false, next = false } = {}) {
      const all = await this.days();
      const todays = all.filter(d => d.date === dateStr);
      const latest = todays[todays.length - 1];
      if (latest && !next) return new Session(this, latest, this.infoForRecord(latest));
      const cal = this.info(dateStr);
      let info;
      if (cal.dayType === 'rest' && !next) {
        if (!bonus || !cal.bonus) return null;
        info = { ...cal, ...cal.bonus, bonus: true };
      } else {
        if (!next && (cal.dayType === 'before' || cal.dayType === 'after')) return null;
        info = await this.nextSlot(dateStr, all);
        if (!info) return null;
      }
      const seq = todays.length + 1;
      const id = seq === 1 ? dateStr : `${dateStr}#${seq}`;
      info.seed = id;
      const revisions = await db.all('revisions');
      const words = pickDailyWords({ content, info, days: all, revisions });
      const day = {
        id, seq, date: dateStr, weekId: info.weekEntry.weekId, weekIteration: info.weekEntry.iteration, ruleId: info.weekEntry.weekId,
        dayType: info.dayType, dayIdx: info.dayIdx, ahead: !info.bonus && !!info.slotDate && info.slotDate > dateStr,
        status: 'started', step: 'welcome', startedAt: this.nowISO(), activeMs: 0,
        learn: { currentWay: info.defaultWay, waysDone: [], switches: [] }, wayWords: [], words, wordIndex: 0, parentCheck: null, countsForStreak: false,
        bonus: !!info.bonus,
      };
      // Verbal-to-written checks: a short ear check on learn days (from day 2); the full review on Saturday.
      const st = content.settings; const week = info.weekEntry.week;
      if (info.dayType === 'probe') {
        day.ear = earItems(content, week, st.ear_items_review ?? 6, id, { exclude: new Set(words.map(w => w.word)) });
        day.pick = sentencePicks(content, week, st.sentence_picks_review ?? 3, id);
        day.sentences = week.probe_sentences ? [] : sentencesToWrite(week, st.sentences_to_write_review ?? 2, id, day.pick.map(p => p.text));
        day.sentenceIndex = 0;
        day.flow = ['welcome', 'write', 'ear', 'pick', ...(day.sentences.length ? ['sentences'] : []), 'check', 'done'];
      } else {
        day.ear = (info.dayType === 'learn' && (info.dayIdx ?? 0) >= 1) ? earItems(content, week, st.ear_items_daily ?? 2, id) : [];
        day.pick = []; day.sentences = []; day.sentenceIndex = 0;
        day.flow = ['welcome', ...(info.dayType === 'learn' ? ['learn'] : []), ...(day.ear.length ? ['ear'] : []), 'write', 'check', 'done'];
      }
      for (const w of words) if (w.source === 'revision') await db.add('revisions', { type: 'auto', date: dateStr, ruleId: w.ruleId, word: w.word, at: this.nowISO() });
      await this.saveDay(day);
      if (seq > 1 || day.ahead) await this.logEvent('next_lesson', { date: dateStr, id, weekId: day.weekId, slot: day.dayIdx });
      return new Session(this, day, info);
    },

    // Pick which video Way 2 shows today: first not-yet-watched, else rotate.
    async pickVideo(weekEntry, dayIdx = 0) {
      const vids = weekEntry.week.way2_videos || [];
      if (!vids.length) return null;
      const watched = new Set((await db.all('videos')).filter(v => v.watched).map(v => v.url));
      return vids.find(v => !watched.has(v.url)) || vids[dayIdx % vids.length];
    },
    async recordVideo(rec) { await db.add('videos', { date: this.today(), at: this.nowISO(), ...rec }); },

    // Home screen model
    async getHome() {
      const today = this.today();
      const info = this.info(today);
      const days = await this.days();
      const streak = computeStreak(days, today, content.settings.streak_milestones);
      const todays = days.filter(d => d.date === today);
      const todayDay = todays[todays.length - 1] || null;
      const yesterday = await this.yesterdaySummary(days, today);
      const tomorrow = await this.tomorrowPreview(today);
      const next = await this.peekNext(today);
      const fullyKnown = fullyKnownMap(content, days);
      return { today, info, streak, todayDay, lessonsToday: todays.length, next, yesterday, tomorrow, stickers: this.stickersFor(streak), fullyKnown, dateJump: this.dateJump };
    },
    async yesterdaySummary(days, today) {
      const prev = [...days].filter(d => d.date < today && ['complete', 'stopped'].includes(d.status)).pop();
      if (!prev) return null;
      const week = content.weeks.find(w => w.rule_id === prev.weekId);
      let what;
      if (prev.dayType === 'probe') what = 'showed what you know';
      else if (prev.dayType === 'mixed') what = 'sorted words by rule';
      else {
        const ways = prev.learn.waysDone.map(w => w.way);
        if (ways.includes(2)) { const v = (await db.all('videos')).filter(v => v.date === prev.date && v.watched).pop(); what = v ? `did the ${v.title}` : 'watched a video'; }
        else if (ways.includes(3)) what = 'did Sound boxes';
        else if (ways.includes(4)) what = 'played ' + gameName(week.way4_game);
        else what = `learned ${week.rule_name} with a grown-up`;
      }
      return { date: prev.date, text: `${prev.date === addDays(today, -1) ? 'Yesterday' : 'Last time'} you ${what}!`, ruleName: week.rule_name };
    },
    async tomorrowPreview(today) {
      const t = addDays(today, 1);
      if (isSunday(t)) return { date: t, text: 'Tomorrow is a rest day. Have fun!' };
      if (this.info(t).dayType === 'before') return { date: t, text: 'See you soon!' };
      const n = await this.peekNext(t);
      return { date: t, text: n ? `Tomorrow: ${n.text}!` : 'See you soon!' };
    },

    // ---- Revision mode ----
    async revisionCalendar() {
      const days = (await this.days()).filter(d => ['complete', 'stopped'].includes(d.status));
      const videos = await db.all('videos');
      return days.map(d => {
        const week = content.weeks.find(w => w.rule_id === d.weekId);
        return { id: d.id || d.date, seq: d.seq || 1, date: d.date, weekId: d.weekId, ruleName: week.rule_name, emoji: week.emoji, dayType: d.dayType, ways: d.learn.waysDone.map(w => w.way), videos: videos.filter(v => v.date === d.date && v.watched).map(v => v.title), words: d.words.map(w => w.word), countsForStreak: !!d.countsForStreak };
      });
    },
    async quickLook(id) {
      const d = await this.getDay(id); if (!d) return null;
      const week = content.weeks.find(w => w.rule_id === d.weekId);
      const videos = (await db.all('videos')).filter(v => v.date === d.date && v.weekId === d.weekId && v.watched);
      await db.add('revisions', { type: 'quicklook', date: this.today(), replayDate: id, ruleId: d.weekId, at: this.nowISO() });
      return { day: d, week, videos, ways: d.learn.waysDone.map(w => w.way), words: d.words };
    },
    async oldRules() {
      const days = await this.days();
      return finishedRules(content, this.schedule(), this.today(), fullyKnownMap(content, days));
    },
    startOldRule(ruleId) {
      const week = content.weeks.find(w => w.rule_id === ruleId);
      return { ruleId, week, words: oldRuleWords(week, this.today() + Date.now()) };
    },
    async finishOldRule({ ruleId, words, marks, selfCaught = 0, activeMs = 0 }) {
      words.forEach((w, i) => { w.mark = !!marks[i]; });
      await db.add('revisions', { type: 'oldrule', date: this.today(), ruleId, words, selfCaught, activeMs, at: this.nowISO() });
      // counts toward today's session time if done the same day
      const todays = await this.sessionsOn(this.today()); const day = todays[todays.length - 1];
      if (day) { day.activeMs += activeMs; day.revisionMs = (day.revisionMs || 0) + activeMs; if (day.status === 'complete') day.countsForStreak = day.activeMs >= (day.dayType === 'probe' ? (content.settings.min_probe_minutes ?? 0) : (content.settings.min_session_minutes ?? 10)) * 60000; await this.saveDay(day); }
    },
    async weeklyRecap(weekEntry) {
      const days = (await this.days()).filter(d => d.weekId === weekEntry.weekId && (d.weekIteration || 1) === weekEntry.iteration);
      const dates = new Set(days.map(d => d.date));
      const videos = (await db.all('videos')).filter(v => v.watched && v.weekId === weekEntry.weekId && dates.has(v.date));
      const ways = [...new Set(days.flatMap(d => d.learn.waysDone.map(w => w.way)))].sort();
      return { week: weekEntry.week, days: [...dates], ways, videos: [...new Set(videos.map(v => v.title))], flowers: [...new Set(days.filter(d => d.status === 'complete').map(d => d.date))] };
    },

    // ---- Parent ----
    async dashboard() { return buildDashboard(content, this.schedule(), await db.dump(), this.today()); },
    async markRepeat(ruleId) {
      // repeat inserted at the next Monday after the current week
      const today = this.today();
      const info = this.info(today);
      const base = info.weekEntry ? info.weekEntry.end : today;
      const monday = addDays(base, weekday(base) === 6 ? 2 : 1);
      const repeats = [...(this.profile.repeats || []), { ruleId, startDate: monday, markedAt: this.nowISO() }];
      await this.saveProfile({ repeats });
      await this.logEvent('repeat_week', { ruleId, startDate: monday });
    },
    async unmarkRepeat(ruleId, startDate) { await this.saveProfile({ repeats: this.profile.repeats.filter(r => !(r.ruleId === ruleId && r.startDate === startDate)) }); },
    async exportJSON() { return toJSONExport(await db.dump(), content); },
    async exportCSV() { return toCSVExport(await db.dump()); },
    async syncToSheet(url = this.profile.settings.sheetUrl, fetchImpl = globalThis.fetch) {
      if (!url) throw new Error('No sheet URL set');
      const payload = await this.exportJSON();
      await fetchImpl(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
      await this.saveProfile({ lastSync: this.nowISO() });
      return true;
    },
  };
  return app.init();
}

export function gameName(game) {
  if (!game) return 'a game';
  return { sort: 'the Sort game', where: 'Where does it live?', hunt: 'the Word hunt', rhyme: 'the Rhyme race', hearthunt: 'the Heart hunt' }[game.type] || 'a game';
}
