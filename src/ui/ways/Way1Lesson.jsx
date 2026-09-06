import React, { useState } from 'react';
import { CoverReveal, FlipE, Columns, Clap, HeartWord, Letters } from '../components/Letters.jsx';
import RuleTap from '../components/RuleTap.jsx';
import WriteWords from '../components/WriteWords.jsx';
import { playWord } from '../audio.js';
// Way 1: scripted mini-lesson the grown-up reads aloud (4–6 big slides) -> "Which rule did we learn?" -> write 2 words on paper.
export default function Way1Lesson({ app, week, dayIdx = 0, onDone, stickers }) {
  const pairs = week.way1_pairs_by_day ? week.way1_pairs_by_day[Math.min(dayIdx, week.way1_pairs_by_day.length - 1)] : null;
  const slides = week.way1_script.filter(s => s.kind !== 'write');
  const writeSlide = week.way1_script.find(s => s.kind === 'write');
  const writeWords = writeSlide ? (writeSlide.words === 'pair' ? pairs.map(p => p.word) : writeSlide.words) : [];
  const [i, setI] = useState(0);
  const [stage, setStage] = useState('slides'); // slides | check | write
  const [endCheck, setEndCheck] = useState(null);
  const others = app.content.weeks.filter(w => w.rule_id !== week.rule_id && !w.mixed).slice(0, 2);
  const options = [week, ...others].sort(() => 0.5 - Math.random());

  if (stage === 'check') return <RuleTap question="Which rule did we learn?" weeks={options} correctId={week.rule_id} onTap={(id, ok) => { setEndCheck({ kind: 'ruletap', tapped: id, correct: ok }); setStage('write'); }} />;
  if (stage === 'write') return <WriteWords app={app} items={writeWords.map(word => ({ word }))} stickers={stickers} onDone={() => onDone(endCheck, writeWords)} />;

  const s = slides[i];
  const demo = s.demo || {};
  const heartItem = demo.type === 'heart' && pairs ? pairs[demo.pair_index] : null;
  return (
    <div className="screen">
      <div className="topbar"><div className="slides-nav">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div><div className="muted small">Way 1 · Learn it with a grown-up</div></div>
      <h1>{s.title}</h1>
      <div className="grow col" style={{ justifyContent: 'center' }}>
        {demo.type === 'show' && <div className="col"><Letters word={demo.word} highlight={demo.highlight} color={demo.color} /><button className="btn secondary" onClick={() => playWord(demo.word)}>🔊 {demo.word}</button></div>}
        {demo.type === 'cover' && <CoverReveal word={demo.word} hide={demo.hide} />}
        {demo.type === 'flip' && <FlipE from={demo.from} to={demo.to} />}
        {demo.type === 'columns' && <Columns cols={demo.cols} />}
        {demo.type === 'clap' && <Clap syllables={demo.syllables} />}
        {demo.type === 'list' && <div className="row">{demo.words.map(w => <button key={w} className="tapcard" onClick={() => playWord(w)}><Letters word={w} highlight={demo.highlight} color={demo.color} /></button>)}</div>}
        {demo.type === 'breakers' && <div className="col" style={{ width: '100%' }}>
          {(week.exceptions || []).map(e => <button key={e.word} className="tapcard" style={{ width: 'min(100%, 720px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }} onClick={() => playWord(e.word)}><span style={{ fontSize: '2.2rem', color: e.group === 'nearmiss' ? '#2f6fdb' : '#e0474c' }}>{e.word}</span><span className="small muted" style={{ fontWeight: 600, textAlign: 'right' }}>{e.why}</span></button>)}
        </div>}
        {heartItem && <div className="col"><div className="big">{heartItem.word}</div><HeartWord tiles={heartItem.tiles} heart={heartItem.heart} /><button className="btn secondary" onClick={() => playWord(heartItem.word)}>🔊 Hear it</button></div>}
      </div>
      <div className="parent-note"><b>Grown-up reads:</b> {s.text}</div>
      <div className="row">
        {i > 0 && <button className="btn secondary" onClick={() => setI(i - 1)}>◀ Back</button>}
        {i < slides.length - 1 ? <button className="btn primary" onClick={() => setI(i + 1)}>Next ➜</button> : <button className="btn primary" onClick={() => setStage('check')}>I know the rule! ➜</button>}
      </div>
    </div>
  );
}
