import React from 'react';
// Pip: an original round orange fox-cub guide with big ears and a green scarf.
// stickers: 'scarf' (star scarf, 5 days), 'glasses' (sparkle glasses, 10 days), 'crown' (gold crown, 20 days)
export default function Pip({ size = 180, mood = 'happy', stickers = [], className = '' }) {
  const s = new Set(stickers);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 200 200" aria-label="Pip the fox">
      {/* ears */}
      <path d="M45 70 L30 18 L78 52 Z" fill="#f2903f" /><path d="M155 70 L170 18 L122 52 Z" fill="#f2903f" />
      <path d="M50 64 L40 30 L70 54 Z" fill="#ffd9b8" /><path d="M150 64 L160 30 L130 54 Z" fill="#ffd9b8" />
      {/* head */}
      <circle cx="100" cy="105" r="70" fill="#f8a55a" />
      <ellipse cx="100" cy="125" rx="48" ry="36" fill="#fff1e2" />
      {/* eyes */}
      {mood === 'sleepy' ? (<><path d="M70 95 q10 8 20 0" stroke="#2b2b3a" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M110 95 q10 8 20 0" stroke="#2b2b3a" strokeWidth="5" fill="none" strokeLinecap="round" /></>)
        : (<><circle cx="80" cy="95" r="9" fill="#2b2b3a" /><circle cx="120" cy="95" r="9" fill="#2b2b3a" /><circle cx="83" cy="92" r="3" fill="#fff" /><circle cx="123" cy="92" r="3" fill="#fff" /></>)}
      {/* cheeks */}
      <circle cx="62" cy="115" r="8" fill="#ffb3a0" opacity=".8" /><circle cx="138" cy="115" r="8" fill="#ffb3a0" opacity=".8" />
      {/* nose + mouth */}
      <ellipse cx="100" cy="118" rx="9" ry="7" fill="#2b2b3a" />
      {mood === 'wow' ? <ellipse cx="100" cy="140" rx="10" ry="12" fill="#2b2b3a" /> : <path d="M84 135 q16 16 32 0" stroke="#2b2b3a" strokeWidth="5" fill="none" strokeLinecap="round" />}
      {/* scarf */}
      <path d="M45 158 q55 30 110 0 l4 16 q-59 30 -118 0 z" fill={s.has('scarf') ? '#7bd3a8' : '#3dbb7a'} />
      {s.has('scarf') && [60, 90, 120, 145].map(x => <text key={x} x={x} y="176" fontSize="14" fill="#fff">★</text>)}
      {/* glasses sticker */}
      {s.has('glasses') && (<g stroke="#7fb7ff" strokeWidth="5" fill="rgba(255,255,255,.35)"><circle cx="80" cy="95" r="18" /><circle cx="120" cy="95" r="18" /><path d="M98 95 h4" /><text x="60" y="78" fontSize="14" fill="#7fb7ff" stroke="none">✦</text><text x="132" y="78" fontSize="14" fill="#7fb7ff" stroke="none">✦</text></g>)}
      {/* crown sticker */}
      {s.has('crown') && (<g><path d="M62 42 L74 20 L88 38 L100 12 L112 38 L126 20 L138 42 Z" fill="#ffd166" stroke="#e0a800" strokeWidth="3" /><circle cx="74" cy="22" r="4" fill="#ff8c69" /><circle cx="100" cy="14" r="4" fill="#7fb7ff" /><circle cx="126" cy="22" r="4" fill="#c39bff" /></g>)}
    </svg>
  );
}
