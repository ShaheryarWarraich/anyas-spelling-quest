import React from 'react';
import Guide from '../components/Guide.jsx';
import Garden from '../components/Garden.jsx';
import RuleBadge from '../../art/Badge.jsx';
import { prettyDate } from '../../core/dates.js';
export default function HomeScreen({ app, home, onPlay, onBonus, onRemember, onParent, onBadge }) {
  const { info, streak, todayDay } = home;
  const stickers = home.stickers.map(s => s.id);
  const week = info.weekEntry?.week;
  let main;
  if (info.dayType === 'rest' && todayDay) main = <><div className="rulecard"><div className="name">{todayDay.status === 'started' ? '🌿 Bonus day!' : '✓ Bonus day done!'}</div><div className="text">{todayDay.status === 'started' ? 'Extra spelling on a rest day. Wow!' : home.tomorrow?.text}</div></div>{todayDay.status === 'started' && <button className="btn primary wide" onClick={onPlay}>Keep going ➜</button>}{todayDay.status === 'stopped' && !todayDay.parentCheck && <button className="btn secondary" onClick={onPlay}>Grown-up: check the paper</button>}</>;
  else if (info.dayType === 'rest') main = <><div className="rulecard"><div className="name">🌿 Rest day</div><div className="text">No spelling today. See you tomorrow!</div></div>{info.bonus && <button className="btn secondary wide" onClick={onBonus}>▶ Play anyway ({info.bonus.weekEntry.week.rule_name})</button>}</>;
  else if (info.dayType === 'before') main = <div className="rulecard"><div className="name">🚀 The quest starts soon!</div><div className="text">First day: {prettyDate(info.weekEntry.start)}</div></div>;
  else if (info.dayType === 'after') main = <div className="rulecard"><div className="name">🏆 You finished the whole quest!</div><div className="text">Tap Remember to play again.</div></div>;
  else if (todayDay && todayDay.status === 'complete') main = <><div className="rulecard"><div className="name">✓ All done today!</div><div className="text">{home.tomorrow?.text}</div></div></>;
  else if (todayDay && todayDay.status === 'stopped') main = <><div className="rulecard"><div className="name">✓ Done for today!</div><div className="text">{home.tomorrow?.text}</div></div>{!todayDay.parentCheck && <button className="btn secondary" onClick={onPlay}>Grown-up: check the paper</button>}</>;
  else main = <>
    {week && info.dayType !== 'probe' && <div className="rulecard mini"><div className="name">{week.emoji} {week.rule_name}</div></div>}
    <button className="btn primary wide" onClick={onPlay}>{todayDay ? 'Keep going ➜' : info.dayType === 'probe' ? '⭐ Show what you know ➜' : '▶ Play today'}</button>
  </>;
  const hello = info.dayType === 'rest' ? 'Rest day! Have fun, Anya.' : streak.state === 'paused' ? 'Welcome back, Anya!' : `Hello ${app.content.child.name}!`;
  const badges = app.content.weeks.filter(w => home.fullyKnown[w.rule_id]);
  return (
    <div className="screen">
      <div className="topbar"><h1 style={{ fontSize: '1.4rem' }}>Anya's Spelling Quest</h1><button className="btn ghost" onClick={onRemember}>💭 Remember</button></div>
      <Guide text={hello} stickers={stickers} size={170} mood={info.dayType === 'rest' ? 'sleepy' : 'happy'} />
      {main}
      <Garden flowers={streak.flowers} nextMilestone={streak.nextMilestone} />
      {badges.length > 0 && <div className="shelf">{badges.map(w => <RuleBadge key={w.rule_id} week={w} small onClick={() => onBadge(w)} />)}</div>}
      <div className="grow" />
      <button className="btn ghost small" onClick={onParent}>🔒 Grown-ups</button>
    </div>
  );
}
