import { useState } from 'react';
import type { Snapshot } from '../types';
import type { LinkStatus } from '../lib/packets';

interface Props {
  data: Snapshot;
  link: LinkStatus;
  gmt: string;
  demo: boolean;
  onDemo: (on: boolean) => void;
  onLink: () => void;
}

// a logo from public/logos; when the file is not there the name alone is shown
function Logo({ src }: { src: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return <img className="logo" src={src} alt="" onError={() => setMissing(true)} />;
}

const linkText = (link: LinkStatus) => {
  switch (link.state) {
    case 'connected': return link.name;
    case 'scanning': return 'Searching';
    case 'connecting': return 'Unlocking';
    case 'reconnecting': return 'Signal lost, reconnecting';
    case 'disconnected': return 'No link';
    case 'unavailable': return 'Preview, no Bluetooth';
  }
};

export function ConsoleBar({ data, link, gmt, demo, onDemo, onLink }: Props) {
  const busy = link.state === 'scanning' || link.state === 'connecting' || link.state === 'reconnecting';
  // a dropout is still the real watch's session; the pretend one stays off
  const live = link.state === 'connected' || link.state === 'reconnecting';

  return (
    <header className="bar">
      <div className="brand">
        <Logo src="/logos/youpspace.svg" />
        <span className="name">AstroNav</span>
        <span className="k">YoupSpace</span>
        <span className="sep" aria-hidden="true" />
        <Logo src="/logos/space-apps.png" />
        <span className="k">NASA Space Apps 2026</span>
      </div>

      <div className="bar-end">
        {data.source === 'sample' && <span className="pill" title="Example values, not from a watch">Sample data</span>}
        {data.source === 'live' && data.demoMode && (
          <span className="pill sim" title="The watch fills in values it cannot measure; those are marked Sim">Watch in demo mode</span>
        )}
        <button
          className="toggle"
          role="switch"
          aria-checked={demo}
          disabled={live}
          onClick={() => onDemo(!demo)}
          title={live ? 'A real watch is connected' : 'Play a pretend watch on this laptop'}
        >
          <span className="track-sw" aria-hidden="true"><span /></span>
          Demo
        </button>
        <span className="clock"><span className="k">GMT</span> <span className="fig">{gmt}</span></span>
        <button className="link-chip" onClick={onLink} title="Connect or disconnect the watch">
          <span className={`dot ${link.state === 'connected' ? 'ok' : busy ? 'watch' : 'info'}`} />
          <span className="k">Watch</span>
          {linkText(link)}
        </button>
      </div>
    </header>
  );
}
