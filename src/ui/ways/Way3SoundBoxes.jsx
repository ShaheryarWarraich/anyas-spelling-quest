import React, { useEffect, useState } from 'react';
import { playWord } from '../audio.js';
import { useDrag } from '../components/useDrag.js';
import Guide from '../components/Guide.jsx';
import { seedFrom, mulberry32, shuffle } from '../../core/rng.js';
// Way 3: Elkonin sound boxes. Drag one counter per sound (audio plays slowly), then drag letter tiles (one per sound), then write the word on paper. 4 words.
export default function Way3SoundBoxes({ week, onDone, stickers, dateStr }) {
  const items = week.way3_words;
  const [wi, setWi] = useState(0);
  const [phase, setPhase] = useState('counters'); // counters | tiles | write
  const item = items[wi];
  const next = () => { if (wi + 1 >= items.length) onDone({ kind: 'boxes', words: items.map(x => x.word) }, items.map(x => x.word)); else { setWi(wi + 1); setPhase('counters'); } };
  if (phase === 'write') return (
    <div className="screen center">
      <div className="huge">{item.word}</div>
      <Guide text="Now write it on your paper." stickers={stickers} size={130} />
      <button className="btn secondary" onClick={() => playWord(item.word)}>🔊 Hear it</button>
      <button className="btn primary wide" onClick={next}>Next ➜</button>
    </div>
  );
  return <Boxes key={wi + phase} item={item} phase={phase} dateStr={dateStr} onDone={() => setPhase(phase === 'counters' ? 'tiles' : 'write')} header={`${wi + 1} of ${items.length}`} />;
}
function Boxes({ item, phase, onDone, header, dateStr }) {
  const tiles = item.tiles; const n = tiles.length;
  const [filled, setFilled] = useState(Array(n).fill(null)); // counters: true; tiles: tile text
  const [tray, setTray] = useState(() => phase === 'counters' ? Array.from({ length: n }, (_, i) => ({ id: 'c' + i, kind: 'counter' })) : shuffle(tiles.map((t, i) => ({ id: 't' + i, kind: 'tile', text: t, idx: i })), mulberry32(seedFrom(item.word + dateStr))));
  const [selected, setSelected] = useState(null);
  const [wig, setWig] = useState(null);
  useEffect(() => { playWord(item.word, { slow: true }); }, []);
  const place = (it, boxIdx) => {
    if (boxIdx === null || boxIdx === undefined || filled[boxIdx]) return;
    if (it.kind === 'tile' && it.idx !== boxIdx) { setWig(it.id); setTimeout(() => setWig(null), 500); return; } // just doesn't stick
    const f = [...filled]; f[boxIdx] = it.kind === 'counter' ? '●' : it.text; setFilled(f);
    const t = tray.filter(x => x.id !== it.id); setTray(t); setSelected(null);
    if (t.length === 0) setTimeout(onDone, 900);
  };
  const { drag, start, handlers } = useDrag((it, target) => place(it, target === null ? null : Number(target)));
  const syl = item.syllables;
  const boxIndexRanges = syl ? syl.reduce((acc, s) => { const st = acc.length ? acc[acc.length - 1][1] : 0; acc.push([st, st + s.length]); return acc; }, []) : [[0, n]];
  const color = t => item.colors?.[t];
  return (
    <div className="screen" {...handlers}>
      <div className="topbar"><div className="muted small">{header}</div><div className="muted small">Way 3 · Sound boxes</div></div>
      <h1>{phase === 'counters' ? 'One counter for each sound' : 'Now the letters'}</h1>
      <button className="btn secondary" onClick={() => playWord(item.word, { slow: true })}>🔊 Say it slowly</button>
      <div className="row" style={{ gap: 30 }}>
        {boxIndexRanges.map(([a, b], si) => (
          <div key={si} className="col">
            {syl && <div className="muted">{syl[si].join('')}</div>}
            <div className="boxes">
              {Array.from({ length: b - a }, (_, k) => a + k).map(bi => (
                <div key={bi} data-drop={bi} className={`box ${filled[bi] ? 'filled' : ''}`} onClick={() => selected && place(selected, bi)} style={filled[bi] && color(filled[bi]) ? { color: color(filled[bi]) } : {}}>
                  {filled[bi] && (filled[bi] === '●' ? <div className="counter" style={{ cursor: 'default' }} /> : filled[bi])}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grow" />
      <div className="row" style={{ minHeight: 110 }}>
        {tray.map(it => it.kind === 'counter'
          ? <div key={it.id} className={`counter ${selected?.id === it.id ? 'glow' : ''}`} style={selected?.id === it.id ? { boxShadow: 'var(--glow)' } : {}} onPointerDown={start(it)} onClick={() => setSelected(it)} />
          : <div key={it.id} className={`tile ${item.heart?.includes(it.text) ? 'heart' : ''} ${wig === it.id ? 'wiggle' : ''}`} style={{ color: color(it.text) || undefined, ...(selected?.id === it.id ? { boxShadow: 'var(--glow)' } : {}) }} onPointerDown={start(it)} onClick={() => setSelected(it)}>{it.text.replace('_', '_')}</div>)}
      </div>
      <div className="muted small">Drag into a box, or tap it then tap a box.</div>
      {drag && (drag.item.kind === 'counter' ? <div className="counter dragging" style={{ left: drag.x, top: drag.y }} /> : <div className="tile dragging" style={{ left: drag.x, top: drag.y }}>{drag.item.text}</div>)}
    </div>
  );
}
