// The daily session state machine. UI-independent; every mutation is persisted through app.saveDay.
export const STEPS = ['welcome', 'learn', 'ear', 'write', 'pick', 'sentences', 'check', 'done', 'hardstop'];

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
  get checkList() { return [...(this.day.wayWords || []), ...this.day.words, ...(this.day.sentences || [])]; }
  get flow() { return this.day.flow || (this.day.dayType === 'learn' ? ['welcome', 'learn', 'write', 'check', 'done'] : ['welcome', 'write', 'check', 'done']); }
  // Move to the next step in today's flow (skipping steps with nothing to do).
  async advance() {
    const f = this.flow; let i = f.indexOf(this.day.step);
    let next = f[i + 1] || 'done';
    while ((next === 'ear' && !(this.day.ear || []).length) || (next === 'pick' && !(this.day.pick || []).length) || (next === 'sentences' && !(this.day.sentences || []).length)) next = f[f.indexOf(next) + 1] || 'done';
    this.day.step = next;
    await this.save();
  }
  async answerEar(index, chosen) { const it = this.day.ear[index]; it.chosen = chosen; it.correct = chosen === it.word; it.at = this.app.nowISO(); await this.save(); }
  async answerPick(index, chosen) { const it = this.day.pick[index]; it.chosen = chosen; it.correct = chosen === it.text; it.at = this.app.nowISO(); await this.save(); }
  async nextSentence() { this.day.sentences[this.day.sentenceIndex].shown = true; this.day.sentenceIndex += 1; if (this.day.sentenceIndex >= this.day.sentences.length) await this.advance(); else await this.save(); }

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
  async finishWelcome() { if (this.day.step === 'welcome') await this.advance(); }
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
    await this.advance();
  }
  async setRuleTap(index, ruleId) { this.day.words[index].ruleTap = ruleId; this.day.words[index].ruleTapAt = this.app.nowISO(); await this.save(); }
  async wordShown(index) { if (!this.day.words[index].shown) { this.day.words[index].shown = true; await this.save(); } }
  async nextWord() {
    this.day.words[this.day.wordIndex].shown = true;
    this.day.wordIndex += 1;
    if (this.day.wordIndex >= this.day.words.length) await this.advance(); else await this.save();
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
