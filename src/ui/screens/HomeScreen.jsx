import React from 'react';
import Guide from '../components/Guide.jsx';
import Garden from '../components/Garden.jsx';
import RuleBadge from '../../art/Badge.jsx';
export default function HomeScreen({ app, home, onPlay, onNext, onRedo, onSkipRule, onRemember, onParent, onBadge }) {
  const { info, streak, todayDay, next } = home;
  const stickers = home.stickers.map(s => s.id);
  const inProgress = todayDay && todayDay.status === 'started';
  const finished = todayDay && ['complete', 'stopped'].includes(todayDay.status);
  const needsCheck = todayDay && todayDay.status === 'stopped' && !todayDay.parentCheck;
  const nextWeek = next?.weekEntry.week;
  const nextButton = next && (
    <div className="col">
      <button className="btn primary wide" onClick={onNext}>▶ Play the next lesson</button>
      <div className="muted small">Next: {next.text}!</div>
    </div>
  );
  const checkButton = needsCheck && <button className="btn secondary" onClick={onPlay}>Grown-up: check the paper</button>;
  let main;
  if (inProgress) main = <>
    <div className="rulecard mini"><div className="name">{todayDay.bonus ? '🌿 Bonus lesson' : todayDay.redo ? `🔁 ${app.content.weeks.find(w => w.rule_id === todayDay.weekId).rule_name} again` : `${app.content.weeks.find(w => w.rule_id === todayDay.weekId).emoji} ${app.content.weeks.find(w => w.rule_id === todayDay.weekId).rule_name}`}</div></div>
    <button className="btn primary wide" onClick={onPlay}>Keep going ➜</button>
  </>;
  else if (finished) main = <>
    <div className="rulecard"><div className="name">{home.lessonsToday > 1 ? `✓ ${home.lessonsToday} lessons today!` : '✓ Lesson done!'}</div><div className="text">{next ? 'Want to do one more?' : 'You did every lesson!'}</div></div>
    {checkButton}
    {nextButton}
  </>;
  else if (!next) main = <div className="rulecard"><div className="name">🏆 You finished the whole quest!</div><div className="text">Tap Remember to play again.</div></div>;
  else main = <>
    {nextWeek && next.dayType !== 'probe' && <div className="rulecard mini"><div className="name">{nextWeek.emoji} {nextWeek.rule_name}</div></div>}
    <button className="btn primary wide" onClick={onPlay}>{next.dayType === 'probe' ? '⭐ Show what you know ➜' : '▶ Play today'}</button>
  </>;
  const hello = streak.state === 'paused' ? 'Welcome back, Anya!' : `Hello ${app.content.child.name}!`;
  const badges = app.content.weeks.filter(w => (home.badgeRules || []).includes(w.rule_id));
  return (
    <div className="screen">
      <div className="topbar"><h1 style={{ fontSize: '1.4rem' }}>Anya's Spelling Quest</h1><button className="btn ghost" onClick={onRemember}>💭 Remember</button></div>
      <Guide text={hello} stickers={stickers} size={170} mood="happy" />
      {main}
      {home.redoRules.length > 0 && !inProgress && <button className="btn secondary wide" onClick={onRedo}>🔁 Do a rule again</button>}
      {home.nextRule && !inProgress && <button className="btn ghost" onClick={onSkipRule}>⏭ Go to the next rule ({home.nextRule.rule_name}) · grown-up</button>}
      <Garden flowers={streak.flowers} nextMilestone={streak.nextMilestone} />
      {badges.length > 0 && <div className="shelf">{badges.map(w => <RuleBadge key={w.rule_id} week={w} small onClick={() => onBadge(w)} />)}</div>}
      <div className="grow" />
      <button className="btn ghost small" onClick={onParent}>🔒 Grown-ups</button>
    </div>
  );
}
