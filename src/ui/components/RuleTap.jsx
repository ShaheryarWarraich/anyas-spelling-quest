import React, { useState } from 'react';
import RuleCard from './RuleCard.jsx';
// Tap a rule card. Correct one glows; others simply don't. Any tap moves on after a moment.
export default function RuleTap({ question, weeks, correctId, onTap }) {
  const [tapped, setTapped] = useState(null);
  const tap = w => { if (tapped) return; setTapped(w.rule_id); setTimeout(() => onTap(w.rule_id, w.rule_id === correctId), 1100); };
  return (
    <div className="screen center">
      <h1>{question}</h1>
      <div className="row">
        {weeks.map(w => <RuleCard key={w.rule_id} week={w} mini className={tapped === w.rule_id && w.rule_id === correctId ? 'tapcard glow' : 'tapcard'} onClick={() => tap(w)} />)}
      </div>
    </div>
  );
}
