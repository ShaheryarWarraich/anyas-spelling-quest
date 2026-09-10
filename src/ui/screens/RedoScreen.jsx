import React, { useState } from 'react';
import Guide from '../components/Guide.jsx';
import RuleCard from '../components/RuleCard.jsx';
// "Do a rule again": pick a rule she has done, then one part of it (a Way, one video, or Show what you know),
// or put the whole rule back into her lessons. Redo lessons never use up a lesson in her plan.
export default function RedoScreen({ app, home, onHome, onStart }) {
  const [rule, setRule] = useState(null);
  const [stage, setStage] = useState('rules'); // rules | parts | confirm | queued
  const [queued, setQueued] = useState(null);
  const stickers = home.stickers.map(s => s.id);
  const week = rule && app.content.weeks.find(w => w.rule_id === rule.ruleId);

  if (stage === 'rules') return (
    <div className="screen">
      <div className="topbar"><button className="btn ghost" onClick={onHome}>⌂ Home</button><h1>Do a rule again</h1><span /></div>
      <Guide text="Which rule do you want to do again?" stickers={stickers} size={130} />
      <div className="col" style={{ width: '100%' }}>
        {home.redoRules.map(r => (
          <button key={r.ruleId} className="tapcard" style={{ width: 'min(100%, 640px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setRule(r); setStage('parts'); }}>
            <span>{r.emoji} {r.name}</span><span>{r.finished ? '🏅' : '🌱'}</span>
          </button>
        ))}
      </div>
    </div>
  );
  if (stage === 'parts') return (
    <div className="screen">
      <div className="topbar"><button className="btn ghost" onClick={() => setStage('rules')}>◀ Back</button><span /></div>
      <RuleCard week={week} />
      <h2>What do you want to do?</h2>
      <div className="col" style={{ width: '100%' }}>
        {app.redoParts(rule.ruleId).map(p => (
          <button key={p.id} className="tapcard" style={{ width: 'min(100%, 640px)', textAlign: 'left' }} onClick={() => onStart(p)}>{p.icon} {p.label}</button>
        ))}
        {rule.finished && <button className="tapcard" style={{ width: 'min(100%, 640px)', textAlign: 'left', borderStyle: 'dashed' }} onClick={() => setStage('confirm')}>🔁 All the {week.rule_name} lessons again</button>}
      </div>
    </div>
  );
  if (stage === 'confirm') return (
    <div className="screen center">
      <Guide text={`Do all 6 lessons of ${week.rule_name} again?`} stickers={stickers} size={150} />
      <div className="row">
        <button className="btn primary" onClick={async () => { setQueued(await app.redoWholeRule(rule.ruleId)); setStage('queued'); }}>Yes, again!</button>
        <button className="btn secondary" onClick={() => setStage('parts')}>No</button>
      </div>
    </div>
  );
  return (
    <div className="screen center fade">
      <Guide text={queued?.startsNext ? `Okay! ${week.rule_name} lessons are next.` : `Okay! ${week.rule_name} comes after the lessons you are on now.`} stickers={stickers} size={170} mood="wow" />
      <button className="btn primary wide" onClick={onHome}>Home</button>
    </div>
  );
}
