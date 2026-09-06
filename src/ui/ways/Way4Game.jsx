import React, { useEffect, useRef, useState } from 'react';
import WriteWords from '../components/WriteWords.jsx';
import Guide from '../components/Guide.jsx';
import Pip from '../../art/Pip.jsx';
import { playWord } from '../audio.js';
import { seedFrom, mulberry32, shuffle } from '../../core/rng.js';
import { BreakerRound } from '../components/EarCheck.jsx';
// Way 4: one game per rule (sort / where-does-it-live / word hunt / rhyme race / heart hunt), then write 2 words on paper.
export default function Way4Game({ app, week, dateStr, onDone, stickers }) {
  const [stage, setStage] = useState('game');
  const [result, setResult] = useState(null);
  const game = week.way4_game;
  const rnd = mulberry32(seedFrom('w4' + dateStr));
  const words = shuffle(week.taught, rnd).slice(0, 2);
  if (stage === 'write') return <WriteWords app={app} items={words.map(word => ({ word }))} stickers={stickers} onDone={() => onDone({ kind: 'game', type: game.type, ...result }, words)} />;
  const breakers = (week.exceptions || []).filter(e => !e.homophone).map(e => e.word);
  const finish = r => { setResult(r); setStage(game.breakers_round && breakers.length ? 'breakers' : 'end'); };
  if (stage === 'breakers') return <BreakerRound breakers={shuffle(breakers, rnd).slice(0, 3)} followers={shuffle(week.taught, rnd).slice(0, 3)} ruleName={week.rule_name} stickers={stickers} onDone={r => { setResult(x => ({ ...x, breakers: r })); setStage('end'); }} />;
  if (stage === 'end') return (
    <div className="screen center"><Guide text="What a game! Now let's write." stickers={stickers} size={170} /><button className="btn primary wide" onClick={() => setStage('write')}>Write 2 words ➜</button></div>
  );
  const props = { game, rnd, onDone: finish };
  if (game.type === 'sort') return <SortGame {...props} />;
  if (game.type === 'where') return <WhereGame {...props} />;
  if (game.type === 'rhyme') return <RhymeRace {...props} />;
  if (game.type === 'hunt' || game.type === 'hearthunt') return <PhotoHunt {...props} />;
  return <div className="screen center"><h1>No game this week</h1><button className="btn primary" onClick={() => finish({})}>Next ➜</button></div>;
}

function SortGame({ game, rnd, onDone }) {
  const [cards] = useState(() => shuffle([...game.yes.map(w => ({ w, yes: true })), ...game.no.map(w => ({ w, yes: false }))], rnd));
  const [i, setI] = useState(0); const [bins, setBins] = useState([[], []]); const [glow, setGlow] = useState(null); const [taps, setTaps] = useState([]);
  const card = cards[i];
  useEffect(() => { card && playWord(card.w); }, [i]);
  const tap = binIdx => {
    if (glow !== null) return;
    const ok = (binIdx === 0) === card.yes;
    setTaps(t => [...t, { word: card.w, bin: binIdx, correct: ok }]);
    if (!ok) return; // doesn't glow, card stays; she tries the other bin
    setGlow(binIdx);
    setTimeout(() => { setBins(b => b.map((x, k) => k === binIdx ? [...x, card.w] : x)); setGlow(null); if (i + 1 >= cards.length) onDone({ taps }); else setI(i + 1); }, 700);
  };
  return (
    <div className="screen">
      <div className="topbar"><div className="muted small">{i + 1} of {cards.length}</div><div className="muted small">Way 4 · Sort game</div></div>
      <h1>Where does it go?</h1>
      <div className="huge" onClick={() => playWord(card.w)}>{card.w}</div>
      <div className="grow" />
      <div className="bins">
        {game.labels.map((l, k) => <div key={k} className={`bin ${glow === k ? 'glow' : ''}`} onClick={() => tap(k)}>{l}<div className="items">{bins[k].map(w => <span key={w}>{w}</span>)}</div></div>)}
      </div>
    </div>
  );
}

function WhereGame({ game, rnd, onDone }) {
  const [items] = useState(() => shuffle(game.items, rnd));
  const [i, setI] = useState(0); const [glow, setGlow] = useState(null); const [taps, setTaps] = useState([]);
  const it = items[i];
  useEffect(() => { it && playWord(it.word); }, [i]);
  const zones = [['head', 'Head (start)', 0], ['tummy', 'Tummy (middle)', 150], ['feet', 'Feet (end)', 330]];
  const tap = z => {
    if (glow) return; const ok = z === it.zone; setTaps(t => [...t, { word: it.word, zone: z, correct: ok }]);
    if (!ok) return; setGlow(z);
    setTimeout(() => { setGlow(null); if (i + 1 >= items.length) onDone({ taps }); else setI(i + 1); }, 700);
  };
  return (
    <div className="screen">
      <div className="topbar"><div className="muted small">{i + 1} of {items.length}</div><div className="muted small">Way 4 · Where does it live?</div></div>
      <h1>{game.prompt}</h1>
      <div className="huge" onClick={() => playWord(it.word)}>{it.word}</div>
      <div className="row" style={{ alignItems: 'center', gap: 40 }}>
        <Pip size={260} />
        <div className="zones">
          {zones.map(([z, label, top]) => <div key={z} className={`zone ${glow === z ? 'glow' : ''}`} style={{ top, height: 120 }} onClick={() => tap(z)}>{label}</div>)}
        </div>
      </div>
    </div>
  );
}

function RhymeRace({ game, rnd, onDone }) {
  const [grid] = useState(() => shuffle([...game.targets, ...game.distractors], rnd));
  const [found, setFound] = useState([]); const [taps, setTaps] = useState([]);
  const [t, setT] = useState(0); const secs = game.seconds || 60; const doneRef = useRef(false);
  useEffect(() => { const id = setInterval(() => setT(x => x + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!doneRef.current && (t >= secs || found.length === game.targets.length)) { doneRef.current = true; setTimeout(() => onDone({ found, taps }), 900); } }, [t, found]);
  const tap = w => { setTaps(x => [...x, w]); if (game.targets.includes(w) && !found.includes(w)) { setFound(f => [...f, w]); playWord(w); } };
  const pct = Math.min(100, (t / secs) * 100);
  return (
    <div className="screen">
      <div className="topbar"><h2>Tap the words that rhyme with <u>{game.base}</u></h2><div className="muted small">Way 4 · Rhyme race</div></div>
      <div className="progressbar"><i style={{ width: pct + '%' }} /><span className="runner" style={{ left: `calc(${pct}% - 16px)` }}>🐇</span></div>
      <div className="grid">{grid.map(w => <button key={w} className={`tapcard ${found.includes(w) ? 'glow' : ''}`} onClick={() => tap(w)}>{w}</button>)}</div>
    </div>
  );
}

// Word hunt / heart hunt: photo of a page (camera), she circles or taps words with her finger, grown-up confirms how many.
function PhotoHunt({ game, onDone }) {
  const [img, setImg] = useState(null); const [strokes, setStrokes] = useState(0); const [count, setCount] = useState(0); const [stage, setStage] = useState('photo');
  const canvas = useRef(null); const drawing = useRef(false); const imgRef = useRef(null);
  const isHeart = game.type === 'hearthunt';
  const onFile = e => { const f = e.target.files[0]; if (f) setImg(URL.createObjectURL(f)); };
  const pos = e => { const r = canvas.current.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.current.width / r.width, (e.clientY - r.top) * canvas.current.height / r.height]; };
  const down = e => { const c = canvas.current.getContext('2d'); c.strokeStyle = isHeart ? '#e0476f' : '#ff8c69'; c.lineWidth = 8; c.lineCap = 'round'; const [x, y] = pos(e); if (isHeart) { c.beginPath(); c.arc(x, y, 26, 0, Math.PI * 2); c.stroke(); setStrokes(s => s + 1); return; } drawing.current = true; c.beginPath(); c.moveTo(x, y); };
  const move = e => { if (!drawing.current) return; const c = canvas.current.getContext('2d'); const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); };
  const up = () => { if (drawing.current) { drawing.current = false; setStrokes(s => s + 1); } };
  const onLoad = () => { const im = imgRef.current; canvas.current.width = im.naturalWidth; canvas.current.height = im.naturalHeight; };
  if (stage === 'confirm') return (
    <div className="screen center">
      <h2>Grown-up: how many {isHeart ? 'heart words' : 'bossy r words'} did she find?</h2>
      <div className="stepper"><button className="btn secondary" onClick={() => setCount(Math.max(0, count - 1))}>−</button><span>{count}</span><button className="btn secondary" onClick={() => setCount(count + 1)}>+</button></div>
      <div className="muted small">She made {strokes} marks.</div>
      <button className="btn primary wide" onClick={() => onDone({ marks: strokes, confirmed: count })}>Save ➜</button>
    </div>
  );
  return (
    <div className="screen">
      <div className="topbar"><h2>{isHeart ? 'Heart hunt' : 'Word hunt'}</h2><div className="muted small">Way 4</div></div>
      <div className="parent-note">{game.prompt}{!isHeart && <> Looking for: <b>{game.targets.join(' · ')}</b></>}{isHeart && <> Heart words: <b>{game.words.join(' · ')}</b></>}</div>
      {!img ? (
        <label className="btn primary wide">📷 Take a photo<input type="file" accept="image/*" capture="environment" hidden onChange={onFile} /></label>
      ) : (
        <div className="photo-wrap">
          <img ref={imgRef} src={img} onLoad={onLoad} alt="page" />
          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
      )}
      {img && <div className="row"><label className="btn secondary">📷 New photo<input type="file" accept="image/*" capture="environment" hidden onChange={onFile} /></label><button className="btn primary" onClick={() => setStage('confirm')}>Show a grown-up ➜</button></div>}
    </div>
  );
}
