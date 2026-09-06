import React from 'react';
export default function RuleCard({ week, mini = false, onClick, className = '' }) {
  return (
    <div className={`rulecard ${mini ? 'mini' : ''} ${className}`} onClick={onClick}>
      <div className="name">{week.emoji} {week.rule_name}</div>
      {!mini && <div className="text">{week.rule_text}</div>}
    </div>
  );
}
