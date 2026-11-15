import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

// A window over the console. Esc or a click outside closes it.
export function Popup({ title, onClose, wide, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className={`popup${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="popup-title" tabIndex={-1}>
        <header className="popup-head">
          <h2 id="popup-title">{title}</h2>
          <button className="btn small" onClick={onClose}>Close</button>
        </header>
        <div className="popup-body">{children}</div>
      </div>
    </div>
  );
}
