import React from 'react';
import Pip from '../../art/Pip.jsx';
export default function Guide({ text, stickers = [], mood = 'happy', size = 150 }) {
  return (
    <div className="guide-row">
      <Pip size={size} stickers={stickers} mood={mood} className="floaty" />
      {text && <div className="bubble">{text}</div>}
    </div>
  );
}
