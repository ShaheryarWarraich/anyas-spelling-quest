import React, { useEffect, useState } from 'react';
import RuleCard from '../components/RuleCard.jsx';
import Garden from '../components/Garden.jsx';
import { WAY_NAMES } from '../../core/app.js';
// Saturday recap: a ~60-second slideshow of the week's Ways, videos and flowers. No scores.
export default function Recap({ app, weekEntry, onDone }) {
  const [data, setData] = useState(null); const [i, setI] = useState(0);
  useEffect(() => { app.weeklyRecap(weekEntry).then(setData); }, []);
  useEffect(() => { if (!data) return; const id = setTimeout(() => (i + 1 < slides.length ? setI(i + 1) : onDone()), 12000); return () => clearTimeout(id); }, [i, data]);
  if (!data) return null;
  const slides = [
    <div className="col"><h1>Your week!</h1><RuleCard week={data.week} /></div>,
    <div className="col"><h1>Ways you did</h1><div className="row">{data.ways.length ? data.ways.map(w => <div key={w} className="tapcard glow">{w}. {WAY_NAMES[w]}</div>) : <div className="muted">A quiet week. That's okay!</div>}</div></div>,
    <div className="col"><h1>Videos you watched</h1><div className="row">{data.videos.length ? data.videos.map(v => <div key={v} className="tapcard">🎬 {v}</div>) : <div className="muted">No videos this week.</div>}</div></div>,
    <div className="col"><h1>Rule breakers you met</h1><div className="row">{(data.week.exceptions || []).length ? data.week.exceptions.map(e => <div key={e.word} className="tapcard" style={{ color: '#e0474c' }}>{e.word}</div>) : <div className="muted">None this week.</div>}</div></div>,
    <div className="col"><h1>Flowers you grew</h1><Garden flowers={data.flowers} bloomLast /></div>,
    <div className="col"><h1>See you on Monday!</h1><div className="big">🌈</div></div>,
  ];
  return (
    <div className="screen center fade" key={i} onClick={() => (i + 1 < slides.length ? setI(i + 1) : onDone())}>
      {slides[i]}
      <div className="slides-nav">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
      <div className="muted small">Tap to go on</div>
    </div>
  );
}
