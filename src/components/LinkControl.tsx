import { useState } from 'react';
import { rememberedCode, type Telemetry } from '../lib/useTelemetry';

// Contents of the link window: unlock the watch with the code on its screen, or let go of it.
export function LinkControl({ telemetry }: { telemetry: Telemetry }) {
  const { link, error, connect, disconnect } = telemetry;
  const [code, setCode] = useState(rememberedCode);
  const busy = link.state === 'scanning' || link.state === 'connecting';
  const validCode = /^\d{6}$/.test(code);

  if (link.state === 'unavailable') {
    return (
      <p className="popup-text">
        This is the browser preview. Bluetooth only works in the desktop app, so the console shows sample data.
      </p>
    );
  }

  if (link.state === 'connected') {
    return (
      <div className="link-pop">
        <p className="popup-text"><span className="dot ok" /> Connected to <b>{link.name}</b>. Data on the console is live.</p>
        <button className="btn" onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  if (link.state === 'reconnecting') {
    return (
      <div className="link-pop">
        <p className="popup-text">
          <span className="dot watch" /> Signal lost. Reconnecting to <b>{link.name}</b>
          {link.attempt > 1 ? `, attempt ${link.attempt}` : ''}. The console shows the last values received.
        </p>
        <button className="btn" onClick={disconnect}>Stop reconnecting</button>
      </div>
    );
  }

  return (
    <div className="link-pop">
      <p className="popup-text">
        Switch the watch on. It shows a 6-digit code on its screen. Type it here; the laptop remembers it for next time.
      </p>
      <form
        className="unlock"
        onSubmit={(e) => {
          e.preventDefault();
          if (validCode && !busy) connect(code);
        }}
      >
        <label htmlFor="unlock-code">Code on the watch</label>
        <input
          id="unlock-code"
          className="fig"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="000000"
          value={code}
          disabled={busy}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button className="btn primary" type="submit" disabled={!validCode || busy}>
          {link.state === 'scanning' ? 'Searching' : link.state === 'connecting' ? 'Unlocking' : 'Connect watch'}
        </button>
        {busy && <button className="btn" type="button" onClick={disconnect}>Cancel</button>}
      </form>
      {error && <p className="link-error" role="alert">{error}</p>}
    </div>
  );
}
