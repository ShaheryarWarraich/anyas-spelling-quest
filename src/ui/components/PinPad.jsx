import React, { useState } from 'react';
// 4-digit PIN. Wrong PIN just shakes and clears; no lockout (this is a home device).
export default function PinPad({ app, onOk, onCancel, title = 'Grown-up PIN' }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const press = async d => {
    const p = pin + d; setPin(p);
    if (p.length === 4) {
      if (await app.verifyPin(p)) onOk(); else { setShake(true); setTimeout(() => { setShake(false); setPin(''); }, 500); }
    }
  };
  return (
    <div className="col fade">
      <h2>{title}</h2>
      <div className={`pindots ${shake ? 'wiggle' : ''}`}>{[0, 1, 2, 3].map(i => <span key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="pinpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <button key={d} className="btn secondary" onClick={() => press(String(d))}>{d}</button>)}
        <button className="btn ghost" onClick={onCancel}>Back</button>
        <button className="btn secondary" onClick={() => press('0')}>0</button>
        <button className="btn ghost" onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>
    </div>
  );
}
