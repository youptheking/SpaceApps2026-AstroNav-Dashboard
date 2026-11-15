import type { Telemetry } from '../lib/useTelemetry';

// Connection to the watch, and whether what is on screen is real.
export function LinkControl({ telemetry, clock }: { telemetry: Telemetry; clock: string }) {
  const { link, data, error, connect, disconnect } = telemetry;
  const busy = link.state === 'scanning' || link.state === 'connecting';

  return (
    <div className="link-block">
      <div className="link">
        {data.source === 'sample' && <span className="pill" title="Example values, not from a watch">Sample data</span>}
        {data.source === 'live' && data.demoMode && (
          <span className="pill sim" title="The watch fills in values it cannot measure; those are marked Simulated">Demo mode</span>
        )}
        <span className="conn">
          <span className={`dot ${link.state === 'connected' ? 'ok' : busy ? 'watch' : 'info'}`} />
          {link.state === 'connected' && link.name}
          {link.state === 'scanning' && 'Looking for the watch'}
          {link.state === 'connecting' && `Connecting to ${link.name}`}
          {link.state === 'disconnected' && 'Not connected'}
          {link.state === 'unavailable' && 'Preview, no Bluetooth'}
          <span className="fig">{clock}</span>
        </span>
        {link.state === 'connected' && <button className="btn" onClick={disconnect}>Disconnect</button>}
        {(link.state === 'disconnected' || busy) && (
          <button className="btn primary" onClick={connect} disabled={busy}>{busy ? 'Connecting' : 'Connect watch'}</button>
        )}
      </div>
      {error && <p className="link-error" role="alert">{error}</p>}
    </div>
  );
}
