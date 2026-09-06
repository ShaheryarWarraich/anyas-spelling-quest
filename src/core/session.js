// The daily session state machine. UI-independent; every mutation is persisted through app.saveDay.
export const STEPS = ['welcome', 'learn', 'write', 'check', 'done', 'hardstop'];

export class Session {
  constructor(app, day, info) {
    this.app = app; this.day = day; this.info = info;
    this.listeners = new Set();
    this._lastSave = 0;
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this.day); }
  async save() { await this.app.saveDay(this.day); this._lastSave = Date.now(); this.emit(); }
  get step() { return this.day.step; }
  get limitMs() { return (this.app.content.settings.session_minutes || 15) * 60000; }
  get minMs() { const st = this.app.content.settings; const m = this.day.dayType === 'probe' ? (st.min_probe_minutes ?? 0) : (st.min_session_minutes ?? 10); return m * 60000; }
  get remainingMs() { return Math.max(0, this.limitMs - this.day.activeMs); }
  get checkList() { return [...(this.day.wayWords || []), ...this.day.words]; }

  // Called every second while a session screen is visible. Hard-stops at the limit, even mid-activity.
  async tick(ms) {
    if (['done', 'hardstop'].includes(this.day.step)) return false;
    this.day.activeMs += ms;
    if (this.day.activeMs >= this.limitMs) {
      this.day.step = 'hardstop'; this.day.status = 'stopped'; this.day.hardStoppedAt = this.app.nowISO();
      await this.app.logEvent('hardstop', { date: this.day.date });
      await this.save(); return true;
    }
    if (Date.now() - this._lastSave > 5000) await this.save(); else this.emit();
    return false;
  }
  async finishWelcome() {
    if (this.day.step !== 'welcome') return;
    this.day.step = this.day.dayType === 'learn' ? 'learn' : 'write';
    await this.save();
  }
  // "Try another way": switch to the next Way for this rule; logged.
  async switchWay() {
    const from = this.day.learn.currentWay;
    const to = (from % 4) + 1;
    this.day.learn.switches.push({ from, to, at: this.app.nowISO() });
    this.day.learn.currentWay = to;
    await this.app.logEvent('switch_way', { date: this.day.date, from, to });
    await this.save();
  }
  // A Way is "done" when its end-check is completed; the Way's paper words join the grown-up check.
  async completeWay(way, endCheck = {}, wayWords = []) {
    if (!this.day.learn.waysDone.some(w => w.way === way)) this.day.learn.waysDone.push({ way, at: this.app.nowISO(), endCheck });
    else this.day.learn.waysDone.find(w => w.way === way).endCheck = endCheck;
    this.day.wayWords = wayWords.map(word => ({ word, source: 'way', way, ruleId: this.day.ruleId, mark: null }));
    this.day.step = 'write';
    await this.save();
  }
  async setRuleTap(index, ruleId) { this.day.words[index].ruleTap = ruleId; this.day.words[index].ruleTapAt = this.app.nowISO(); await this.save(); }
  async wordShown(index) { if (!this.day.words[index].shown) { this.day.words[index].shown = true; await this.save(); } }
  async nextWord() {
    this.day.words[this.day.wordIndex].shown = true;
    this.day.wordIndex += 1;
    if (this.day.wordIndex >= this.day.words.length) this.day.step = 'check';
    await this.save();
  }
  // Parent marks each item written on paper (true = correct). Child never sees these.
  async parentCheck({ marks, selfCaught = 0 }) {
    const list = this.checkList;
    list.forEach((item, i) => { if (marks[i] !== undefined) item.mark = !!marks[i]; });
    this.day.parentCheck = { selfCaught, at: this.app.nowISO(), total: list.length, correct: list.filter(x => x.mark).length };
    const probe = this.day.words.filter(w => w.source === 'probe');
    if (probe.length) {
      const byRule = {};
      for (const w of probe) { byRule[w.ruleId] = byRule[w.ruleId] || { correct: 0, total: 0 }; byRule[w.ruleId].total++; if (w.mark) byRule[w.ruleId].correct++; }
      this.day.probeScore = { correct: probe.filter(w => w.mark).length, total: probe.length, byRule };
    }
    this.day.status = 'complete';
    this.day.completedAt = this.app.nowISO();
    this.day.countsForStreak = this.day.activeMs >= this.minMs;
    this.day.step = 'done';
    await this.save();
  }
}
