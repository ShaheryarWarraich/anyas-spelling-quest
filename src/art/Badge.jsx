import React from 'react';
export default function RuleBadge({ week, onClick, small = false }) {
  return (
    <div className="badge" onClick={onClick} style={small ? { width: 110, height: 110, fontSize: '.85rem' } : {}}>
      <div className="e">{week.emoji}</div>
      <div>{week.rule_name}</div>
    </div>
  );
}
