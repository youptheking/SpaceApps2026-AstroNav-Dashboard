import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function App() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // no backend when running plain vite in a browser or under vitest
    if (!('__TAURI_INTERNALS__' in window)) return;
    invoke<string>('app_version').then(setVersion).catch(() => setVersion(null));
  }, []);

  return (
    <main className="placeholder">
      <p className="eyebrow">NASA Space Apps 2026</p>
      <h1>AstroNav Dashboard</h1>
      <p className="muted">Gezondheidsmonitor voor astronauten. Nog geen polsstation verbonden.</p>
      {version && <p className="version">v{version}</p>}
    </main>
  );
}
