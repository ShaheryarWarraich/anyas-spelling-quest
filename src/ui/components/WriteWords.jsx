import React, { useEffect, useState, useRef } from 'react';
import { playWord } from '../audio.js';
import Guide from './Guide.jsx';
import PinPad from './PinPad.jsx';
// Paper-writing flow: show the word 3s -> hide -> play audio -> "Write it, then tap Next".
// Anya never types. `items` = [{word, sentence?, source}]. onEach(index) fires when a word is shown, onDone at the end.
export default function WriteWords({ app, items, startIndex = 0, seconds = 3, onEach, onDone, stickers = [], title = 'Write it!', counter }) {
  const [i, setI] = useState(startIndex);
  const [phase, setPhase] = useState('show'); // show | write
  const [peek, setPeek] = useState(false); // false | 'pin' | true
  const timer = useRef();
  const item = items[i];
  useEffect(() => {
    if (!item) return;
    setPhase('show'); setPeek(false); onEach && onEach(i);
    if (item.sentence) { playWord(item.sentence); timer.current = setTimeout(() => setPhase('write'), Math.max(seconds, 5) * 1000); }
    else { playWord(item.word); timer.current = setTimeout(async () => { setPhase('write'); await playWord(item.word); }, seconds * 1000); }
    return () => clearTimeout(timer.current);
  }, [i]);
  if (!item) return null;
  if (peek === 'pin') return <div className="screen center"><PinPad app={app} title="Grown-up PIN to peek" onOk={() => setPeek(true)} onCancel={() => setPeek(false)} /></div>;
  const next = () => { if (i + 1 >= items.length) onDone(); else setI(i + 1); };
  const isSentence = !!item.sentence;
  return (
    <div className="screen center">
      <div className="muted small">{counter ? `${counter[0]} of ${counter[1]}` : `${i + 1} of ${items.length}`}</div>
      {phase === 'show' ? (
        isSentence ? (
          <div className="card fade"><div className="big">🔊</div><div className="muted">Listen to the sentence.</div></div>
        ) : <div className="huge fade">{item.word}</div>
      ) : (
        <div className="col fade">
          <Guide text={isSentence ? 'Write the sentence on your paper.' : 'Write it on your paper.'} stickers={stickers} size={130} />
          {isSentence && (peek === true ? <div className="parent-note"><b>Grown-up reads:</b> "{item.sentence}" <button className="btn ghost" onClick={() => setPeek(false)}>hide</button></div> : <button className="btn ghost" onClick={() => setPeek(app ? 'pin' : true)}>🔒 Grown-up: peek at the sentence</button>)}
          <button className="btn secondary" onClick={() => playWord(item.sentence || item.word)}>🔊 Hear it again</button>
          <button className="btn primary wide" onClick={next}>Next ➜</button>
        </div>
      )}
    </div>
  );
}
