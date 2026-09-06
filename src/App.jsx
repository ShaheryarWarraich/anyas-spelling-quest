import React, { useEffect, useState } from 'react';
import { openDB } from './core/db.js';
import { createApp } from './core/app.js';
import HomeScreen from './ui/screens/HomeScreen.jsx';
import SessionScreen from './ui/screens/SessionScreen.jsx';
import RevisionScreen from './ui/screens/RevisionScreen.jsx';
import ParentScreen from './ui/screens/ParentScreen.jsx';
import RuleBadge from './art/Badge.jsx';
import Guide from './ui/components/Guide.jsx';
import { primeAudio } from './ui/audio.js';

let dbPromise;
export default function App() {
  const [app, setApp] = useState(null); const [home, setHome] = useState(null);
  const [view, setView] = useState({ name: 'home' }); const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  const boot = async () => {
    try {
      const content = await fetch(`${import.meta.env.BASE_URL}content/anya.json`).then(r => r.json());
      dbPromise = dbPromise || openDB();
      const override = new URLSearchParams(location.search).get('today'); // testing only: ?today=2026-09-07
      const now = override ? () => { const d = new Date(); const [y, m, dd] = override.split('-').map(Number); d.setFullYear(y, m - 1, dd); return d; } : undefined;
      const a = await createApp({ db: await dbPromise, content, now });
      setApp(a); setHome(await a.getHome());
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => { boot(); }, []);
  // New day while the app stays open (or a device date jump): re-boot to today's state.
  useEffect(() => {
    const check = () => { if (app && document.visibilityState === 'visible' && app.today() !== home?.today) { setView({ name: 'home' }); setSession(null); boot(); } };
    document.addEventListener('visibilitychange', check); const id = setInterval(check, 60000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(id); };
  }, [app, home]);
  useEffect(() => { const f = () => { primeAudio(); window.removeEventListener('pointerdown', f); }; window.addEventListener('pointerdown', f); }, []);

  const goHome = async () => { setSession(null); setView({ name: 'home' }); setHome(await app.getHome()); };
  const play = async () => { const s = await app.getSession(); if (!s) return; setHome(await app.getHome()); setSession(s); setView({ name: 'session' }); };

  if (error) return <div className="screen center"><h1>Oops</h1><div className="muted">{error}</div></div>;
  if (!app || !home) return <div className="screen center"><Guide text="Loading…" /></div>;
  if (view.name === 'session' && session) return <SessionScreen app={app} session={session} home={home} onHome={goHome} />;
  if (view.name === 'revision') return <RevisionScreen app={app} home={home} onHome={goHome} />;
  if (view.name === 'parent') return <ParentScreen app={app} onHome={goHome} />;
  if (view.name === 'badge') return (
    <div className="screen center fade"><h1>You finished {view.week.rule_name}!</h1><RuleBadge week={view.week} /><Guide text="A new badge for your shelf!" stickers={home.stickers.map(s => s.id)} mood="wow" /><button className="btn primary wide" onClick={goHome}>Yay! ➜</button></div>
  );
  return <HomeScreen app={app} home={home} onPlay={play} onRemember={() => setView({ name: 'revision' })} onParent={() => setView({ name: 'parent' })} onBadge={week => setView({ name: 'badge', week })} />;
}
