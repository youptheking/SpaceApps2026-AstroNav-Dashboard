interface Props {
  source: 'sample' | 'live' | 'demo';
  demoCrew: string | null;
  watchName: string;
  onStartDemo: () => void;
  onStopDemo: () => void;
  onConnect: () => void;
  onBackToWatch: () => void;
}

// Says plainly, at the top of the console, when what is on screen is not measured on a real wrist.
export function DataNotice({ source, demoCrew, watchName, onStartDemo, onStopDemo, onConnect, onBackToWatch }: Props) {
  if (demoCrew) {
    return (
      <div className="data-notice demo" role="status">
        <b>Dummy data.</b>
        <span>{demoCrew} is a demo crew member: a pretend watch on this laptop, not real measurements. Only {watchName} can use the real wrist station.</span>
        <button className="btn small" onClick={onBackToWatch}>Back to {watchName}</button>
      </div>
    );
  }
  if (source === 'sample') {
    return (
      <div className="data-notice example" role="status">
        <b>No watch connected.</b>
        <span>This screen shows fixed example values. Don&rsquo;t have the watch? Click <b>Start demo</b> to see the console run on dummy data.</span>
        <button className="btn small primary" onClick={onStartDemo}>Start demo (dummy data)</button>
        <button className="btn small" onClick={onConnect}>Connect watch</button>
      </div>
    );
  }
  if (source === 'demo') {
    return (
      <div className="data-notice demo" role="status">
        <b>Demo running on dummy data.</b>
        <span>A pretend watch on this laptop sends the same packets as the real one. Nothing here is measured.</span>
        <button className="btn small" onClick={onStopDemo}>Stop demo</button>
      </div>
    );
  }
  return null;
}
