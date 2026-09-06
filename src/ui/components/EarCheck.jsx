import React, { useEffect, useState } from 'react';
import { playWord } from '../audio.js';
import Guide from './Guide.jsx';
// "Listen and pick": she HEARS a word (no text shown) and taps the spelling that matches.
// The right one glows; a wrong tap just doesn't glow. Everything is logged for the grown-up only.
export function EarCheck({ items, onAnswer, onDone, stickers, title = 'Listen. Which one is it?' }) {
  const start = items.findIndex(i => i.chosen === null || i.chosen === undefined);
  const [i, setI] = useState(start < 0 ? 0 : start);
  const [tapped, setTapped] = useState(null);
  const it = items[i];
  useEffect(() => { if (it) { setTapped(null); playWord(it.word); } }, [i]);
  if (!it) return null;
  const tap = async opt => {
    if (tapped) return; setTapped(opt);
    await onAnswer(i, opt);
    setTimeout(() => { if (i + 1 >= items.length) onDone(); else setI(i + 1); }, opt === it.word ? 1200 : 900);
  };
  return (
    <div className="screen center">
      <div className="muted small">{i + 1} of {items.length}</div>
      <Guide text={title} stickers={stickers} size={120} />
      <button className="btn secondary" onClick={() => playWord(it.word)}>🔊 Hear it again</button>
      <div className="row">{it.options.map(o => <button key={o} className={`tapcard ${tapped === o && o === it.word ? 'glow' : ''}`} style={{ fontSize: '2.4rem' }} onClick={() => tap(o)}>{o}</button>)}</div>
    </div>
  );
}
// "Which sentence?": hears a sentence, taps the correctly spelled version.
export function SentencePick({ items, onAnswer, onDone, stickers }) {
  const start = items.findIndex(i => i.chosen === null || i.chosen === undefined);
  const [i, setI] = useState(start < 0 ? 0 : start);
  const [tapped, setTapped] = useState(null);
  const it = items[i];
  useEffect(() => { if (it) { setTapped(null); playWord(it.text); } }, [i]);
  if (!it) return null;
  const tap = async opt => {
    if (tapped) return; setTapped(opt);
    await onAnswer(i, opt);
    setTimeout(() => { if (i + 1 >= items.length) onDone(); else setI(i + 1); }, opt === it.text ? 1200 : 900);
  };
  return (
    <div className="screen center">
      <div className="muted small">{i + 1} of {items.length}</div>
      <Guide text="Listen. Which sentence is spelled right?" stickers={stickers} size={120} />
      <button className="btn secondary" onClick={() => playWord(it.text)}>🔊 Hear it again</button>
      <div className="col" style={{ width: '100%' }}>{it.options.map(o => <button key={o} className={`tapcard ${tapped === o && o === it.text ? 'glow' : ''}`} style={{ width: 'min(100%, 720px)', fontSize: '1.7rem' }} onClick={() => tap(o)}>{o}</button>)}</div>
    </div>
  );
}
// Rule breakers: tap the words that break the rule among followers. Breakers glow when tapped.
export function BreakerRound({ breakers, followers, onDone, stickers, ruleName }) {
  const [cards] = useState(() => [...breakers.map(w => ({ w, b: true })), ...followers.map(w => ({ w, b: false }))].sort(() => 0.5 - Math.random()));
  const [found, setFound] = useState([]); const [taps, setTaps] = useState([]);
  const tap = c => { setTaps(t => [...t, { word: c.w, breaker: c.b }]); playWord(c.w); if (c.b && !found.includes(c.w)) { const f = [...found, c.w]; setFound(f); if (f.length === breakers.length) setTimeout(() => onDone({ found: f, taps: [...taps, { word: c.w, breaker: c.b }] }), 1000); } };
  return (
    <div className="screen center">
      <Guide text={`Tap the rule breakers! Which ones do NOT follow ${ruleName}?`} stickers={stickers} size={120} />
      <div className="row">{cards.map(c => <button key={c.w} className={`tapcard ${found.includes(c.w) ? 'glow' : ''}`} onClick={() => tap(c)}>{c.w}</button>)}</div>
      <button className="btn ghost" onClick={() => onDone({ found, taps })}>Done ➜</button>
    </div>
  );
}
