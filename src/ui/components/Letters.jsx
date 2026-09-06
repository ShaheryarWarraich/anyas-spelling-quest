import React, { useState, useEffect } from 'react';
// Big letters with optional cover (tap to cover/uncover), highlight of a letter group, heart marks.
export function Letters({ word, hide = [], highlight = '', color = '#ffe28a', covered = false, hearts = [] }) {
  const hi = new Set();
  if (highlight) { const i = word.indexOf(highlight); if (i >= 0) for (let k = i; k < i + highlight.length; k++) hi.add(k); }
  return (
    <div className="letters">
      {word.split('').map((ch, i) => (
        <div key={i} className={`letter ${hi.has(i) ? 'hi' : ''} ${covered && hide.includes(i) ? 'covered' : ''} ${hearts.includes(i) ? 'heart' : ''}`} style={hi.has(i) ? { background: color + '55' } : {}}>
          {ch}{covered && hide.includes(i) && <div className="cover">✋</div>}
        </div>
      ))}
    </div>
  );
}
export function CoverReveal({ word, hide }) {
  const [covered, setCovered] = useState(false);
  return (
    <div className="col">
      <Letters word={word} hide={hide} covered={covered} />
      <button className="btn soft" onClick={() => setCovered(!covered)}>{covered ? 'Uncover' : 'Cover it'}</button>
    </div>
  );
}
export function FlipE({ from, to }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="col">
      <div className="letters">
        {from.split('').map((ch, i) => <div key={i} className={`letter ${flipped && i === 1 ? 'hi' : ''}`}>{ch}</div>)}
        {flipped && <div className="letter new">{to.slice(from.length)}</div>}
      </div>
      <button className="btn soft" onClick={() => setFlipped(!flipped)}>{flipped ? 'Take the e away' : 'Add the magic e'}</button>
    </div>
  );
}
export function Columns({ cols }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      {cols.map(c => (
        <div key={c.label} className="card" style={{ minWidth: 150, borderTop: `10px solid ${c.color || '#ffd166'}` }}>
          <div className="big" style={{ fontSize: '2.4rem', color: c.color || '#b0741a' }}>{c.label}</div>
          {c.words.map(w => <div key={w} style={{ fontSize: '1.6rem', fontWeight: 800 }}>{w}</div>)}
        </div>
      ))}
    </div>
  );
}
export function Clap({ syllables }) {
  const [beat, setBeat] = useState(-1);
  const go = () => { syllables.forEach((_, i) => setTimeout(() => setBeat(i), i * 700)); setTimeout(() => setBeat(-1), syllables.length * 700 + 400); };
  return (
    <div className="col">
      <div className="letters">{syllables.map((s, i) => <div key={i} className={`letter ${beat === i ? 'hi clapping' : ''}`} style={{ minWidth: 150 }}>{s}</div>)}</div>
      <button className="btn soft" onClick={go}>👏 Clap it</button>
    </div>
  );
}
export function HeartWord({ tiles, heart = [] }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="col">
      <div className="letters">{tiles.map((t, i) => <div key={i} className={`letter ${shown && heart.includes(t) ? 'heart hearttile' : ''}`}>{t}</div>)}</div>
      <button className="btn soft" onClick={() => setShown(!shown)}>{shown ? 'Hide the heart' : '♥ Find the naughty part'}</button>
    </div>
  );
}
