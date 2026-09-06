import React, { useState } from 'react';
import PinPad from './PinPad.jsx';
import Guide from './Guide.jsx';
// "Show your paper to a grown-up" -> PIN -> ✓/✗ per word + self-caught -> warm screen (same for the child every time).
export default function ParentCheck({ app, items, onSubmit, onCancel, stickers = [], note }) {
  const [stage, setStage] = useState('show'); // show | pin | marks
  const [marks, setMarks] = useState(() => items.map(() => null));
  const [selfCaught, setSelfCaught] = useState(0);
  if (stage === 'show') return (
    <div className="screen center">
      <Guide text="Show your paper to a grown-up." stickers={stickers} size={170} />
      <button className="btn primary wide" onClick={() => setStage('pin')}>Grown-up is here</button>
      {onCancel && <button className="btn ghost" onClick={onCancel}>Back</button>}
    </div>
  );
  if (stage === 'pin') return <div className="screen center"><PinPad app={app} onOk={() => setStage('marks')} onCancel={() => setStage('show')} /></div>;
  const allMarked = marks.every(m => m !== null);
  return (
    <div className="screen parent" style={{ alignItems: 'center' }}>
      <h2>Check the paper</h2>
      {note && <div className="parent-note">{note}</div>}
      <div className="col" style={{ width: '100%' }}>
        {items.map((it, i) => (
          <div className="checkrow" key={i}>
            <div>
              <div className="w">{it.sentence || it.word}</div>
              <div className="small muted">{it.source === 'way' ? `Way ${it.way} word` : it.source === 'revision' ? `revision (${it.ruleId})` : it.source === 'sentence-write' ? 'dictated sentence (whole sentence right?)' : it.source === 'exception' ? 'rule breaker' : it.source}{it.sentence && it.word !== it.sentence ? ` · word: ${it.word}` : ''}</div>
            </div>
            <div className="row">
              <button className={`mark ${marks[i] === true ? 'on-yes' : ''}`} onClick={() => setMarks(m => m.map((x, j) => j === i ? true : x))}>✓</button>
              <button className={`mark ${marks[i] === false ? 'on-no' : ''}`} onClick={() => setMarks(m => m.map((x, j) => j === i ? false : x))}>✗</button>
            </div>
          </div>
        ))}
      </div>
      <div className="stepper"><span>Self-caught:</span>
        <button className="btn secondary" onClick={() => setSelfCaught(Math.max(0, selfCaught - 1))}>−</button><span>{selfCaught}</span>
        <button className="btn secondary" onClick={() => setSelfCaught(selfCaught + 1)}>+</button>
      </div>
      <div className="small muted">How many mistakes she circled herself before you looked.</div>
      <button className="btn primary wide" disabled={!allMarked} onClick={() => onSubmit({ marks, selfCaught })}>Save ✓</button>
    </div>
  );
}
