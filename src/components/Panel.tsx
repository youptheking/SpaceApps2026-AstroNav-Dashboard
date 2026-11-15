import type { ReactNode } from 'react';

interface Props {
  title: string;
  className: string;
  meta?: ReactNode;
  // label of the button that opens the details, if there are any
  more?: string;
  onMore?: () => void;
  children: ReactNode;
}

export function Panel({ title, className, meta, more = 'Details', onMore, children }: Props) {
  return (
    <section className={`panel ${className}`} aria-label={title}>
      <header className="panel-head">
        <h2>{title}</h2>
        {meta && <span className="panel-meta">{meta}</span>}
        {onMore && <button className="more" onClick={onMore}>{more}</button>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
