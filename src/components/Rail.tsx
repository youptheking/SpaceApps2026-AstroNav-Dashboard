const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const screens = [
  { label: 'Overview', path: <path d="M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 16.4 12 21 12 21z" /> },
  { label: 'Live signals', path: <path d="M3 12h4l2-5 4 10 2-5h6" /> },
  { label: 'Trends, 7 days', path: <path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-6" /> },
  { label: 'Daily check-in', path: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4v2h6V4M9 12l2 2 4-4" /></> },
];

export function Rail({ openAlerts }: { openAlerts: number }) {
  return (
    <aside className="rail">
      <svg className="mark" viewBox="0 0 28 28" role="img" aria-label="AstroNav">
        <rect width="28" height="28" rx="6" fill="#4d8dff" />
        <path d="M5 15h4.5l2.2-5.5 3.6 10 2.2-4.5H23" fill="none" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <nav aria-label="Screens">
        {screens.map((s, i) => (
          <a key={s.label} href="#" title={s.label} aria-label={s.label} aria-current={i === 0 ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" {...icon}>{s.path}</svg>
          </a>
        ))}
        <a href="#" title={`Alerts, ${openAlerts} open`} aria-label={`Alerts, ${openAlerts} open`}>
          <svg viewBox="0 0 24 24" {...icon}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" /></svg>
          {openAlerts > 0 && <span className="badge fig">{openAlerts}</span>}
        </a>
      </nav>
      <a className="bottom" href="#" title="Wrist station and settings" aria-label="Wrist station and settings">
        <svg viewBox="0 0 24 24" {...icon}><rect x="7" y="6" width="10" height="12" rx="3" /><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3" /></svg>
      </a>
    </aside>
  );
}
