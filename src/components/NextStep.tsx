import { useEffect, useState } from 'react';
import type { Advice } from '../lib/advice';
import { Panel } from './Panel';

interface Props {
  advice: Advice;
  onSend: (code: number, severity: number, messageId: number) => Promise<boolean>;
}

export function NextStep({ advice, onSend }: Props) {
  const [sent, setSent] = useState<string | null>(null);

  // a new piece of advice can be sent again
  useEffect(() => setSent(null), [advice.title]);

  const send = async () => {
    if (!advice.wrist) return;
    const ok = await onSend(advice.wrist.code, advice.wrist.severity, advice.wrist.messageId);
    if (ok) setSent(advice.title);
  };

  return (
    <Panel title="What to do" className="action">
      <div className="what">{advice.title}</div>
      <p className="why">{advice.why}</p>
      {advice.wrist && (
        <button className="btn primary" disabled={sent === advice.title} onClick={send}>
          {sent === advice.title ? 'Sent to wrist' : advice.wrist.label}
        </button>
      )}
    </Panel>
  );
}
