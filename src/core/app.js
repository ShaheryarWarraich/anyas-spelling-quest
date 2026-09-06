import { toISO, addDays, isSunday, weekday, diffDays } from './dates.js';
import { getDayInfo, buildSchedule, nextWeekEntry } from './schedule.js';
import { computeStreak } from './streak.js';
import { pickDailyWords } from './words.js';
import { finishedRules, oldRuleWords } from './revision.js';
import { Session } from './session.js';
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
    async days() { return (await db.all('days')).sort((a, b) => a.date.localeCompare(b.date)); },
    async getDay(dateStr) { return db.get('days', dateStr); },
    async saveDay(day) { await db.put('days', day); },
    async streak() { return computeStreak(await this.days(), this.today(), content.settings.streak_milestones); },
    stickersFor(streak) { return STICKERS.filter(s => streak.count >= s.at); },

    // Start or resume today's session. Opening twice in one day resumes the same record.
    async getSession(dateStr = this.today(), { bonus = false } = {}) {
      let info = this.info(dateStr);
      let day = await this.getDay(dateStr);
      const isBonus = info.dayType === 'rest' && !!info.bonus && (bonus || !!day);
      if (isBonus) info = { ...info, ...info.bonus, bonus: true };
      else if (!['learn', 'probe', 'mixed'].includes(info.dayType)) return null;
      if (!day) {
        const days = await this.days(); const revisions = await db.all('revisions');
        const words = pickDailyWords({ content, info, days, revisions });
        day = {
          date: dateStr, weekId: info.weekEntry.weekId, weekIteration: info.weekEntry.iteration, ruleId: info.weekEntry.weekId,
          dayType: info.dayType, dayIdx: info.dayIdx, status: 'started', step: 'welcome', startedAt: this.nowISO(), activeMs: 0,
          learn: { currentWay: info.defaultWay, waysDone: [], switches: [] }, wayWords: [], words, wordIndex: 0, parentCheck: null, countsForStreak: false,
          bonus: isBonus || false,
        };
        for (const w of words) if (w.source === 'revision') await db.add('revisions', { type: 'auto', date: dateStr, ruleId: w.ruleId, word: w.word, at: this.nowISO() });
        await this.saveDay(day);
      }
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
      const todayDay = days.find(d => d.date === today) || null;
      const yesterday = await this.yesterdaySummary(days, today);
      const tomorrow = await this.tomorrowPreview(today);
      const fullyKnown = fullyKnownMap(content, days);
      return { today, info, streak, todayDay, yesterday, tomorrow, stickers: this.stickersFor(streak), fullyKnown, dateJump: this.dateJump };
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
      const info = this.info(t);
      if (info.dayType === 'rest') return { date: t, text: 'Tomorrow is a rest day. Have fun!' };
      if (info.dayType === 'probe') return { date: t, text: 'Tomorrow: show what you know!' };
      if (info.dayType === 'mixed') return { date: t, text: 'Tomorrow: all the rules together!' };
      if (info.dayType !== 'learn') return { date: t, text: 'See you soon!' };
      let text = `Tomorrow: ${WAY_NAMES[info.defaultWay]}!`;
      if (info.defaultWay === 2) { const v = await this.pickVideo(info.weekEntry, info.dayIdx); if (v) text = `Tomorrow: the ${v.title} video!`; }
      if (info.defaultWay === 4 && info.weekEntry.week.way4_game) text = `Tomorrow: play ${gameName(info.weekEntry.week.way4_game)}!`;
      if (info.weekEntry.start === t) text = `Tomorrow: a new rule, ${info.weekEntry.week.rule_name}!`;
      return { date: t, text };
    },

    // ---- Revision mode ----
    async revisionCalendar() {
      const days = (await this.days()).filter(d => ['complete', 'stopped'].includes(d.status));
      const videos = await db.all('videos');
      return days.map(d => {
        const week = content.weeks.find(w => w.rule_id === d.weekId);
        return { date: d.date, weekId: d.weekId, ruleName: week.rule_name, emoji: week.emoji, dayType: d.dayType, ways: d.learn.waysDone.map(w => w.way), videos: videos.filter(v => v.date === d.date && v.watched).map(v => v.title), words: d.words.map(w => w.word), countsForStreak: !!d.countsForStreak };
      });
    },
    async quickLook(dateStr) {
      const d = await this.getDay(dateStr); if (!d) return null;
      const week = content.weeks.find(w => w.rule_id === d.weekId);
      const videos = (await db.all('videos')).filter(v => v.date === dateStr && v.watched);
      await db.add('revisions', { type: 'quicklook', date: this.today(), replayDate: dateStr, ruleId: d.weekId, at: this.nowISO() });
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
      let day = await this.getDay(this.today());
      if (day) { day.activeMs += activeMs; day.revisionMs = (day.revisionMs || 0) + activeMs; if (day.status === 'complete') day.countsForStreak = day.activeMs >= (day.dayType === 'probe' ? (content.settings.min_probe_minutes ?? 0) : (content.settings.min_session_minutes ?? 10)) * 60000; await this.saveDay(day); }
    },
    async weeklyRecap(weekEntry) {
      const days = (await this.days()).filter(d => d.weekId === weekEntry.weekId && d.date >= addDays(weekEntry.start, -1) && d.date <= addDays(weekEntry.end, 1));
      const videos = (await db.all('videos')).filter(v => v.watched && v.date >= weekEntry.start && v.date <= weekEntry.end);
      const ways = [...new Set(days.flatMap(d => d.learn.waysDone.map(w => w.way)))].sort();
      return { week: weekEntry.week, days: days.map(d => d.date), ways, videos: videos.map(v => v.title), flowers: days.filter(d => d.status === 'complete').map(d => d.date) };
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
