import React from 'react';
const PALETTE = ['#ff8c69', '#ffd166', '#c39bff', '#7fb7ff', '#ff9ad5', '#7bd3a8'];
export function Flower({ i = 0, size = 56, bloom = false, bud = false }) {
  const c = PALETTE[i % PALETTE.length];
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 60 84" className={bloom ? 'bloom' : ''}>
      <path d="M30 84 V44" stroke="#5aa66a" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 66 q-16 -4 -18 -16 q14 0 18 16z" fill="#6fbf7d" />
      {bud ? <ellipse cx="30" cy="36" rx="10" ry="14" fill={c} /> : (
        <g>
          {[0, 60, 120, 180, 240, 300].map(a => <ellipse key={a} cx="30" cy="20" rx="8" ry="14" fill={c} transform={`rotate(${a} 30 34)`} />)}
          <circle cx="30" cy="34" r="9" fill="#fff4c2" stroke="#e8b400" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
export function Seed() { return <svg width="56" height="78" viewBox="0 0 60 84"><ellipse cx="30" cy="74" rx="10" ry="6" fill="#b8a07a" /></svg>; }
