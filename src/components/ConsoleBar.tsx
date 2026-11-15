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

const linkText = (link: LinkStatus) => {
  switch (link.state) {
    case 'connected': return link.name;
    case 'scanning': return 'Searching';
    case 'connecting': return 'Unlocking';
    case 'disconnected': return 'No link';
    case 'unavailable': return 'Preview, no Bluetooth';
  }
};

export function ConsoleBar({ data, link, gmt, demo, onDemo, onLink }: Props) {
  const busy = link.state === 'scanning' || link.state === 'connecting';
  const live = link.state === 'connected';

  return (
    <header className="bar">
      <div className="brand">
        <span className="name">AstroNav</span>
        <span className="k">YoupSpace</span>
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
          <span className={`dot ${live ? 'ok' : busy ? 'watch' : 'info'}`} />
          <span className="k">Watch</span>
          {linkText(link)}
        </button>
      </div>
    </header>
  );
}
