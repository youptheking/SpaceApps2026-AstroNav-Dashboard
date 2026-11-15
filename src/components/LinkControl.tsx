import { useState } from 'react';
import { rememberedCode, type Telemetry } from '../lib/useTelemetry';

// Contents of the link window: unlock the watch with the code on its screen, or let go of it.
export function LinkControl({ telemetry }: { telemetry: Telemetry }) {
  const { link, error, connect, disconnect } = telemetry;
  const [code, setCode] = useState(rememberedCode);
  const busy = link.state === 'scanning' || link.state === 'connecting';
  const reconnecting = link.state === 'reconnecting';

  return (
    <div className="link-block">
      <div className="link">
        {data.source === 'sample' && <span className="pill" title="Example values, not from a watch">Sample data</span>}
        {data.source === 'live' && data.demoMode && (
          <span className="pill sim" title="The watch fills in values it cannot measure; those are marked Simulated">Demo mode</span>
        )}
        {reconnecting && (
          <span className="pill" title={`${link.reason} The values on screen are the last ones received.`}>Signal lost</span>
        )}
        <span className="conn">
          <span className={`dot ${link.state === 'connected' ? 'ok' : busy || reconnecting ? 'watch' : 'info'}`} />
          {link.state === 'connected' && link.name}
          {link.state === 'scanning' && 'Looking for the watch'}
          {link.state === 'connecting' && `Connecting to ${link.name}`}
          {reconnecting && `Reconnecting${link.attempt > 1 ? `, attempt ${link.attempt}` : ''}`}
          {link.state === 'disconnected' && 'Not connected'}
          {link.state === 'unavailable' && 'Preview, no Bluetooth'}
          <span className="fig">{clock}</span>
        </span>
        {link.state === 'connected' && <button className="btn" onClick={disconnect}>Disconnect</button>}
        {(busy || reconnecting) && <button className="btn" onClick={disconnect}>Cancel</button>}
        {link.state === 'disconnected' && <button className="btn primary" onClick={connect}>Connect watch</button>}
      </div>
      {error && <p className="link-error" role="alert">{error}</p>}
    </div>
  );
}
