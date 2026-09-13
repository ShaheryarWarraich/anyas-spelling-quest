import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './ui/styles.css';

const updateSW = registerSW({ immediate: true });

// iPad home-screen apps can keep running an old cached version. On open and whenever the app comes back
// to the foreground (online), compare with the live version; if it differs, fetch the new version and reload.
async function checkForUpdate() {
  if (typeof __BUILD__ === 'undefined' || !navigator.onLine) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { build } = await res.json();
    if (!build || build === __BUILD__) return;
    const key = 'asq-update-tried';
    if (sessionStorage.getItem(key) === build) return; // one attempt per new version per launch
    sessionStorage.setItem(key, build);
    try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch {}
    try { await updateSW(true); } catch {}
    // If the service worker didn't swap in time, clear the app cache (not her data) and reload.
    setTimeout(async () => {
      try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
      try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.unregister(); } catch {}
      location.reload();
    }, 4000);
  } catch {}
}
checkForUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
createRoot(document.getElementById('root')).render(<App />);
