import React from 'react';
import { Flower, Seed } from '../../art/Flower.jsx';
// The streak path: one flower per completed day. Never a number, never a gap "lost".
export default function Garden({ flowers = [], bloomLast = false, nextMilestone = null }) {
  const upcoming = nextMilestone ? Math.max(0, nextMilestone - flowers.length) : 0;
  return (
    <div className="garden">
      {flowers.map((d, i) => <div key={d} title={d}><Flower i={i} bloom={bloomLast && i === flowers.length - 1} /></div>)}
      {Array.from({ length: Math.min(upcoming, 6) }).map((_, i) => <Seed key={'s' + i} />)}
    </div>
  );
}
