import React, { useEffect, useState, useRef } from 'react';
import { playWord } from '../audio.js';
import Guide from './Guide.jsx';
// Paper-writing flow: show the word 3s -> hide -> play audio -> "Write it, then tap Next".
// Anya never types. `items` = [{word, sentence?, source}]. onEach(index) fires when a word is shown, onDone at the end.
export default function WriteWords({ items, startIndex = 0, seconds = 3, onEach, onDone, stickers = [], title = 'Write it!', counter }) {
  const [i, setI] = useState(startIndex);
  const [phase, setPhase] = useState('show'); // show | write
  const timer = useRef();
  const item = items[i];
  useEffect(() => {
    if (!item) return;
    setPhase('show'); onEach && onEach(i);
    if (item.sentence) { playWord(item.sentence); timer.current = setTimeout(() => setPhase('write'), Math.max(seconds, 5) * 1000); }
    else { playWord(item.word); timer.current = setTimeout(async () => { setPhase('write'); await playWord(item.word); }, seconds * 1000); }
    return () => clearTimeout(timer.current);
  }, [i]);
  if (!item) return null;
  const next = () => { if (i + 1 >= items.length) onDone(); else setI(i + 1); };
  const isSentence = !!item.sentence;
  return (
    <div className="screen center">
      <div className="muted small">{counter ? `${counter[0]} of ${counter[1]}` : `${i + 1} of ${items.length}`}</div>
      {phase === 'show' ? (
        isSentence ? (
          <div className="card"><div className="muted">Grown-up reads:</div><div className="big">{item.sentence}</div></div>
        ) : <div className="huge fade">{item.word}</div>
      ) : (
        <div className="col fade">
          <Guide text={isSentence ? 'Write the sentence on your paper.' : 'Write it on your paper.'} stickers={stickers} size={130} />
          {isSentence && <div className="parent-note"><b>Grown-up:</b> read it again if she asks: "{item.sentence}"</div>}
          <button className="btn secondary" onClick={() => playWord(item.sentence || item.word)}>🔊 Hear it again</button>
          <button className="btn primary wide" onClick={next}>Next ➜</button>
        </div>
      )}
    </div>
  );
}
