import React, { useEffect, useRef, useState } from 'react';
import WriteWords from '../components/WriteWords.jsx';
import { seedFrom, mulberry32, shuffle } from '../../core/rng.js';
// Way 2: YouTube embed; "I watched it" enables only after ended or 80% played; then a 3-question tap quiz; then write 2 words.
const ytId = url => (url.match(/[?&]v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/) || [])[1];
let ytReady;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(resolve => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => resolve(null); document.head.appendChild(s);
  });
  return ytReady;
}
export default function Way2Video({ app, week, video, dateStr, onDone, onSwitch, stickers }) {
  const [stage, setStage] = useState('watch'); // watch | quiz | write
  const [canTick, setCanTick] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [taps, setTaps] = useState([]);
  const holder = useRef(null); const player = useRef(null);
  const isLink = video.type === 'link' || !ytId(video.url);
  const words = shuffle(week.taught, mulberry32(seedFrom('w2' + dateStr))).slice(0, 2);

  useEffect(() => {
    if (isLink || offline) return;
    let poll;
    loadYT().then(YT => {
      if (!YT || !holder.current) { setOffline(true); return; }
      player.current = new YT.Player(holder.current, { videoId: ytId(video.url), playerVars: { rel: 0, modestbranding: 1, playsinline: 1 }, events: {
        onStateChange: e => { if (e.data === YT.PlayerState.ENDED) setCanTick(true); },
        onError: () => setOffline(true),
      } });
      poll = setInterval(() => { try { const p = player.current; if (p && p.getDuration && p.getDuration() > 0 && p.getCurrentTime() / p.getDuration() >= 0.8) setCanTick(true); } catch {} }, 2000);
    });
    return () => { clearInterval(poll); try { player.current && player.current.destroy(); } catch {} };
  }, [video.url]);

  const finishWatch = async () => {
    setTicked(true);
    await app.recordVideo({ weekId: week.rule_id, title: video.title, url: video.url, watched: true, quizTaps: [] });
    setStage(video.quiz && video.quiz.length ? 'quiz' : 'write');
  };
  if (stage === 'quiz') return <Quiz quiz={video.quiz} onDone={async t => { setTaps(t); await app.recordVideo({ weekId: week.rule_id, title: video.title, url: video.url, watched: true, quizTaps: t, kind: 'quiz' }); setStage('write'); }} />;
  if (stage === 'write') return <WriteWords app={app} items={words.map(word => ({ word }))} stickers={stickers} onDone={() => onDone({ kind: 'quiz', video: video.title, taps }, words)} />;

  return (
    <div className="screen">
      <div className="topbar"><h2>{video.title}</h2><div className="muted small">Way 2 · Watch and dance</div></div>
      {isLink ? (
        <div className="col">
          <div className="card"><div className="muted">This one opens in the browser.</div><a className="btn soft" href={video.url} target="_blank" rel="noreferrer" onClick={() => setTimeout(() => setCanTick(true), 3000)}>Open it ➜</a></div>
          {offline && <div className="parent-note">Needs the internet. If you are offline, try another way.</div>}
        </div>
      ) : offline ? (
        <div className="card col"><div className="big" style={{ fontSize: '2rem' }}>This video needs the internet.</div><div className="muted">Let's try another way today!</div>{onSwitch && <button className="btn primary" onClick={onSwitch}>Try another way ➜</button>}</div>
      ) : (
        <div className="video-wrap"><div ref={holder} /></div>
      )}
      <div className="grow" />
      <button className={`checkbox ${ticked ? 'on' : ''} btn secondary`} disabled={!canTick} onClick={finishWatch}><span className="boxi">{ticked ? '✓' : ''}</span>{video.checkbox || 'I watched it'}</button>
      {!canTick && !offline && <div className="muted small">Watch it nearly to the end and the box wakes up.</div>}
    </div>
  );
}
function Quiz({ quiz, onDone }) {
  const [i, setI] = useState(0); const [chosen, setChosen] = useState(null); const [taps, setTaps] = useState([]);
  const q = quiz[i];
  const tap = opt => {
    if (chosen) return; setChosen(opt);
    const t = [...taps, { q: q.q, chosen: opt, correct: opt === q.answer }]; setTaps(t);
    setTimeout(() => { setChosen(null); if (i + 1 >= quiz.length) onDone(t); else setI(i + 1); }, opt === q.answer ? 1200 : 900);
  };
  return (
    <div className="screen center">
      <div className="muted small">{i + 1} of {quiz.length}</div>
      <h1>{q.q}</h1>
      <div className="row">{q.options.map(o => <button key={o} className={`tapcard ${chosen === o && o === q.answer ? 'glow' : ''}`} onClick={() => tap(o)}>{o}</button>)}</div>
    </div>
  );
}
