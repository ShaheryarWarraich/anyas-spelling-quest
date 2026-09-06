import React, { useEffect, useState, useRef } from 'react';
import RuleCard from '../components/RuleCard.jsx';
import RuleBadge from '../../art/Badge.jsx';
import Guide from '../components/Guide.jsx';
import WriteWords from '../components/WriteWords.jsx';
import ParentCheck from '../components/ParentCheck.jsx';
import { Letters } from '../components/Letters.jsx';
import { Flower } from '../../art/Flower.jsx';
import { WAY_NAMES, gameName } from '../../core/app.js';
import { prettyDate } from '../../core/dates.js';
import { playWord } from '../audio.js';

// "Remember": a path of every day done (tap = 3-minute quick look) and an "Old rules" shelf (tap = 3-minute mini-session).
export default function RevisionScreen({ app, home, onHome }) {
  const [cal, setCal] = useState([]); const [old, setOld] = useState([]);
  const [view, setView] = useState(null); // {type:'quick', date} | {type:'old', ruleId}
  useEffect(() => { app.revisionCalendar().then(setCal); app.oldRules().then(setOld); }, [view]);
  const stickers = home.stickers.map(s => s.id);
  if (view?.type === 'quick') return <QuickLook app={app} date={view.date} stickers={stickers} onDone={() => setView(null)} />;
  if (view?.type === 'old') return <OldRule app={app} ruleId={view.ruleId} stickers={stickers} onDone={() => setView(null)} />;
  return (
    <div className="screen">
      <div className="topbar"><button className="btn ghost" onClick={onHome}>⌂ Home</button><h1>Remember</h1><span /></div>
      <Guide text="Tap a day to see it again!" stickers={stickers} size={120} />
      <h2>Days you did</h2>
      {cal.length === 0 && <div className="muted">Nothing yet. Come back after your first day!</div>}
      <div className="path">
        {cal.map((d, i) => (
          <div key={d.date} className="pathday" onClick={() => setView({ type: 'quick', date: d.date })}>
            <Flower i={i} size={34} />
            <div>{prettyDate(d.date)}</div>
            <div className="small muted">{d.emoji} {d.dayType === 'probe' ? 'Show what you know' : d.ways.length ? 'Way ' + d.ways.join('+') : d.ruleName}</div>
          </div>
        ))}
      </div>
      <h2>Old rules</h2>
      {old.length === 0 && <div className="muted">Your first badge comes when a rule is finished.</div>}
      <div className="shelf">{old.map(e => <RuleBadge key={e.weekId} week={e.week} onClick={() => setView({ type: 'old', ruleId: e.weekId })} />)}</div>
    </div>
  );
}

// Quick look: replay exactly what she did that day in ~3 minutes: rule card, the Way (slides / video / boxes / game), the words.
function QuickLook({ app, date, stickers, onDone }) {
  const [data, setData] = useState(null); const [i, setI] = useState(0);
  useEffect(() => { app.quickLook(date).then(setData); }, [date]);
  if (!data) return null;
  const { week, day, ways, videos, words } = data;
  const slides = [];
  slides.push({ secs: 8, body: <div className="col"><h1>{prettyDate(date)}</h1>{day.dayType === 'probe' ? <div className="rulecard"><div className="name">⭐ Show what you know</div></div> : <RuleCard week={week} />}</div> });
  for (const w of ways) {
    if (w === 1) for (const s of week.way1_script.filter(s => s.kind !== 'write').slice(0, 4)) slides.push({ secs: 8, body: <div className="col"><h2>{s.title}</h2>{s.demo?.word && <Letters word={s.demo.word} highlight={s.demo.highlight} color={s.demo.color} />}{s.demo?.from && <Letters word={s.demo.to} />}{s.demo?.cols && <div className="row">{s.demo.cols.map(c => <div key={c.label} className="tapcard">{c.label}: {c.words.join(', ')}</div>)}</div>}{s.demo?.syllables && <Letters word={s.demo.syllables.join('-')} />}<div className="parent-note">{s.text}</div></div> });
    if (w === 2) { const v = videos[0] || week.way2_videos[0]; const id = v && (v.url.match(/[?&]v=([\w-]+)/) || [])[1]; slides.push({ secs: 60, body: <div className="col"><h2>🎬 {v?.title}</h2>{id && navigator.onLine ? <div className="video-wrap"><iframe src={`https://www.youtube.com/embed/${id}?rel=0&playsinline=1`} allow="autoplay; encrypted-media" allowFullScreen title={v.title} /></div> : <div className="muted">Needs the internet to play.</div>}</div> }); }
    if (w === 3) slides.push({ secs: 12, body: <div className="col"><h2>Sound boxes</h2><div className="row">{week.way3_words.map(x => <div key={x.word} className="col" onClick={() => playWord(x.word)}><div className="boxes">{x.tiles.map((t, k) => <div key={k} className="box filled" style={{ width: 80, height: 80, fontSize: '2rem' }}>{t}</div>)}</div><div className="muted">{x.word}</div></div>)}</div></div> });
    if (w === 4) slides.push({ secs: 6, body: <div className="col"><h2>You played {gameName(week.way4_game)}</h2><div className="big">🎲</div></div> });
  }
  slides.push({ secs: 0, words: true });
  slides.push({ secs: 6, body: <div className="col"><Guide text="That was your day! Well remembered." stickers={stickers} size={160} /></div> });
  const s = slides[i];
  return <Slideshow key={i} slide={s} words={words} stickers={stickers} onNext={() => (i + 1 < slides.length ? setI(i + 1) : onDone())} onExit={onDone} idx={i} total={slides.length} />;
}
function Slideshow({ slide, words, stickers, onNext, onExit, idx, total }) {
  useEffect(() => { if (slide.secs) { const id = setTimeout(onNext, slide.secs * 1000); return () => clearTimeout(id); } }, []);
  if (slide.words) return <WriteWords items={words} stickers={stickers} onDone={onNext} title="Say it" />;
  return (
    <div className="screen center fade">
      <div className="topbar"><button className="btn ghost" onClick={onExit}>✕</button><div className="muted small">{idx + 1} / {total}</div></div>
      {slide.body}
      <button className="btn secondary" onClick={onNext}>Next ➜</button>
    </div>
  );
}

// Old rule mini-session: rule card, 3 words on paper, grown-up check. ~3 minutes; counts toward today's time.
function OldRule({ app, ruleId, stickers, onDone }) {
  const [mini] = useState(() => app.startOldRule(ruleId));
  const [stage, setStage] = useState('card'); const start = useRef(Date.now());
  if (stage === 'card') return <div className="screen center"><RuleCard week={mini.week} /><button className="btn primary wide" onClick={() => setStage('write')}>Write 3 words ➜</button><button className="btn ghost" onClick={onDone}>Back</button></div>;
  if (stage === 'write') return <WriteWords items={mini.words} stickers={stickers} onDone={() => setStage('check')} />;
  if (stage === 'check') return <ParentCheck app={app} items={mini.words} stickers={stickers} onSubmit={async r => { await app.finishOldRule({ ruleId, words: mini.words, marks: r.marks, selfCaught: r.selfCaught, activeMs: Date.now() - start.current }); setStage('warm'); }} />;
  return <div className="screen center"><Guide text="You still remember it! Brilliant." stickers={stickers} size={180} mood="wow" /><button className="btn primary wide" onClick={onDone}>Done ➜</button></div>;
}
