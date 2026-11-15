import { useEffect, useRef } from 'react';

// Placeholder sweep at the given heart rate until the real 250 Hz ECG packets arrive.
function syntheticEcg(seconds: number, bpm: number): number {
  const beat = 60 / bpm;
  const p = (seconds % beat) / beat;
  const g = (centre: number, width: number, amp: number) => amp * Math.exp(-((p - centre) ** 2) / (2 * width * width));
  return g(0.18, 0.025, 0.12) - g(0.355, 0.008, 0.12) + g(0.37, 0.01, 1) - g(0.39, 0.009, 0.25) + g(0.62, 0.045, 0.28);
}

export function EcgTrace({ bpm }: { bpm: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let w = 0, h = 0, x = 0, t = 0, frame = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      x = 0;
      // with reduced motion the trace is drawn once, so draw it again at the new size
      if (still) draw();
    };
    const yOf = (v: number) => h * 0.72 - v * h * 0.62;
    let last = performance.now();
    const draw = () => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.25;
      // sweep by elapsed time, so a throttled window keeps the right speed
      const nowMs = performance.now();
      const steps = still ? w : Math.min(w, (nowMs - last) * 0.144);
      last = nowMs;
      for (let i = 0; i < steps; i++) {
        ctx.clearRect(x + 2, 0, 12, h);
        ctx.beginPath();
        ctx.moveTo(x, yOf(syntheticEcg(t, bpm)));
        t += 0.008;
        ctx.lineTo(x + 1, yOf(syntheticEcg(t, bpm)));
        ctx.stroke();
        x = x + 1 >= w ? 0 : x + 1;
      }
      if (!still) frame = requestAnimationFrame(draw);
    };
    resize();
    if (!still) draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [bpm]);

  return <canvas ref={canvasRef} className="ecg" role="img" aria-label="ECG from the wrist station, live" />;
}
