import React, { useEffect, useState, useReducer, useRef } from 'react';
import Guide from '../components/Guide.jsx';
import RuleCard from '../components/RuleCard.jsx';
import Garden from '../components/Garden.jsx';
import WriteWords from '../components/WriteWords.jsx';
import ParentCheck from '../components/ParentCheck.jsx';
import RuleTap from '../components/RuleTap.jsx';
import { EarCheck, SentencePick } from '../components/EarCheck.jsx';
import Way1Lesson from '../ways/Way1Lesson.jsx';
import Way2Video from '../ways/Way2Video.jsx';
import Way3SoundBoxes from '../ways/Way3SoundBoxes.jsx';
import Way4Game from '../ways/Way4Game.jsx';
import Recap from './Recap.jsx';
import { WAY_NAMES } from '../../core/app.js';
import { playWord } from '../audio.js';

const pick = (arr, seed) => arr[seed % arr.length];

// The daily spine: Welcome -> Learn (a Way) -> Write 5 words -> Check with a grown-up -> Done. Hard stop at 15 min.
export default function SessionScreen({ app, session, home, onHome, onNext }) {
  const [, force] = useReducer(x => x + 1, 0);
  const [after, setAfter] = useState(null); // 'warm' | 'recap'
  const [video, setVideo] = useState(null);
  const [next, setNext] = useState(null); // what the next lesson would be, shown on the done screen
  const day = session.day; const week = session.info.weekEntry.week; const stickers = home.stickers.map(s => s.id);
  useEffect(() => session.subscribe(force), [session]);
  // 1-second ticker while visible
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') session.tick(1000); }, 1000);
    return () => clearInterval(id);
  }, [session]);
  useEffect(() => { if (day.step === 'learn' && day.learn.currentWay === 2) app.pickVideo(session.info.weekEntry, day.dayIdx).then(setVideo); }, [day.step, day.learn.currentWay]);

  useEffect(() => { if (day.step === 'done') app.peekNext().then(setNext); }, [day.step]);
  const seed = Number(day.date.replace(/-/g, '')) + (day.learn.waysDone.length || 0);

  if (day.step === 'welcome') return (
    <div className="screen center">
      <Guide text={pick(app.content.guide.hello, seed)} stickers={stickers} size={170} />
      {day.dayType === 'learn' && <RuleCard week={week} />}
      {day.dayType === 'probe' && <div className="rulecard"><div className="name">⭐ Show what you know!</div><div className="text">Write the words, listen and pick, then write two sentences.</div></div>}
      {day.dayType === 'mixed' && <RuleCard week={week} />}
      {(day.seq || 1) > 1 ? <div className="card"><div className="muted small">One more lesson! You are on a roll.</div></div> : home.yesterday && <div className="card"><div className="muted small">{home.yesterday.text}</div></div>}
      <button className="btn primary wide" onClick={() => session.finishWelcome()}>Let's go! ➜</button>
    </div>
  );

  if (day.step === 'learn') {
    const way = day.learn.currentWay;
    const onDone = (endCheck, words) => session.completeWay(way, endCheck, words);
    const common = { app, week, dayIdx: day.dayIdx, dateStr: day.id || day.date, onDone, stickers };
    let body = null;
    if (way === 1) body = <Way1Lesson {...common} />;
    else if (way === 2) body = video ? <Way2Video {...common} video={video} onSwitch={() => session.switchWay()} /> : <div className="screen center"><h1>Finding today's video…</h1></div>;
    else if (way === 3) body = <Way3SoundBoxes {...common} />;
    else body = <Way4Game {...common} />;
    if ((way === 2 && !(week.way2_videos || []).length) || (way === 3 && !(week.way3_words || []).length) || (way === 4 && !week.way4_game)) body = <div className="screen center"><h1>Nothing here this week</h1><button className="btn primary" onClick={() => session.switchWay()}>Try another way ➜</button></div>;
    return (
      <div>
        <div className="topbar" style={{ padding: '10px 20px 0', maxWidth: 980, margin: '0 auto' }}>
          <button className="btn ghost" onClick={onHome}>⌂</button>
          <button className="btn secondary" onClick={() => session.switchWay()}>🔁 Try another way</button>
        </div>
        <div key={way}>{body}</div>
      </div>
    );
  }

  if (day.step === 'ear') return <EarCheck items={day.ear} stickers={stickers} onAnswer={(i, o) => session.answerEar(i, o)} onDone={() => session.advance()} />;
  if (day.step === 'pick') return <SentencePick items={day.pick} stickers={stickers} onAnswer={(i, o) => session.answerPick(i, o)} onDone={() => session.advance()} />;
  if (day.step === 'sentences') {
    const idx = day.sentenceIndex; const it = day.sentences[idx];
    return <WriteWords app={app} key={'s' + idx} items={[it]} counter={[idx + 1, day.sentences.length]} stickers={stickers} onDone={() => session.nextSentence()} />;
  }
  if (day.step === 'write') {
    const idx = day.wordIndex; const w = day.words[idx];
    if (w.needsRuleTap && !w.ruleTap) {
      const rules = app.content.weeks.filter(x => !x.mixed);
      return <div><div className="huge" style={{ paddingTop: 20 }} onClick={() => playWord(w.word)}>{w.word}</div><RuleTap question="Which rule is this word?" weeks={rules} correctId={w.ruleId} onTap={id => session.setRuleTap(idx, id)} /></div>;
    }
    return <WriteWords app={app} key={idx} items={[w]} counter={[idx + 1, day.words.length]} stickers={stickers} onDone={() => session.nextWord()} />;
  }

  if (day.step === 'check' || (day.step === 'hardstop' && after === 'check')) {
    const note = week.watch_for ? `Watch for: ${week.watch_for}` : null;
    return <ParentCheck app={app} items={session.checkList} stickers={stickers} note={note} onSubmit={async r => { await session.parentCheck(r); setAfter('warm'); }} />;
  }

  if (day.step === 'hardstop') {
    const written = (day.wayWords || []).length + day.words.filter(x => x.shown).length + (day.sentences || []).filter(x => x.shown).length;
    return (
      <div className="screen center">
        <Guide text="Time for a break! Great work." stickers={stickers} mood="sleepy" size={180} />
        <Garden flowers={home.streak.flowers} nextMilestone={home.streak.nextMilestone} />
        <button className="btn primary wide" onClick={onHome}>Home</button>
        {written > 0 && !day.parentCheck && <button className="btn ghost" onClick={() => setAfter('check')}>Grown-up: check the paper</button>}
      </div>
    );
  }

  // done
  if (after === 'warm') return (
    <div className="screen center fade">
      <Guide text={pick(app.content.guide.warm, seed)} stickers={stickers} size={180} mood="wow" />
      <button className="btn primary wide" onClick={() => setAfter(null)}>Next ➜</button>
    </div>
  );
  if (after === 'recap') return <Recap app={app} weekEntry={session.info.weekEntry} onDone={onHome} />;
  const flowers = home.streak.flowers.includes(day.date) ? home.streak.flowers : [...home.streak.flowers, day.date];
  return (
    <div className="screen center">
      <h1>Your flower grew!</h1>
      <Garden flowers={flowers} bloomLast nextMilestone={home.streak.nextMilestone} />
      <Guide text={pick(app.content.guide.done, seed)} stickers={stickers} size={150} />
      {!(next && day.dayType !== 'probe') && <div className="card"><div>{home.tomorrow?.text}</div></div>}
      {day.dayType === 'probe' ? <button className="btn primary wide" onClick={() => setAfter('recap')}>Watch your week ➜</button> : <>
        {next && <button className="btn primary wide" onClick={onNext}>▶ Next lesson: {next.text}</button>}
        <button className={`btn ${next ? 'secondary' : 'primary'} wide`} onClick={onHome}>Home</button>
      </>}
    </div>
  );
}
