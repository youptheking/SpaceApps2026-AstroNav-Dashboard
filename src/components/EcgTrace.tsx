import { useEffect, useRef } from 'react';

// Stand-in sweep for the sample screen, at the given heart rate.
function syntheticEcg(seconds: number, bpm: number): number {
  const beat = 60 / bpm;
  const p = (seconds % beat) / beat;
  const g = (centre: number, width: number, amp: number) => amp * Math.exp(-((p - centre) ** 2) / (2 * width * width));
  return g(0.18, 0.025, 0.12) - g(0.355, 0.008, 0.12) + g(0.37, 0.01, 1) - g(0.39, 0.009, 0.25) + g(0.62, 0.045, 0.28);
}

interface Props {
  bpm: number;
  // the last few seconds of real ECG in mV, newest last; without it the trace is synthetic
  samples?: (() => number[]) | null;
  // the signal is not a usable heartbeat; drawn dimmed
  poor?: boolean;
}

export function EcgTrace({ bpm, samples, poor = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let w = 0, h = 0, x = 0, t = 0, frame = 0, timer = 0;
    let last = performance.now();

    const yOf = (v: number) => h * 0.72 - v * h * 0.62;

    const drawReal = () => {
      const mv = samples!();
      ctx.clearRect(0, 0, w, h);
      if (mv.length > 1) {
        let lo = Infinity, hi = -Infinity;
        for (const v of mv) { if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = Math.max(hi - lo, 200);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        mv.forEach((v, i) => {
          const px = (i / (mv.length - 1)) * w;
          const py = h - 4 - ((v - lo) / span) * (h - 8);
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
    };

    const drawSynthetic = () => {
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
    };

    const tick = () => {
      if (samples) drawReal(); else drawSynthetic();
      if (!still) frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      x = 0;
      // with reduced motion the trace is redrawn on its own, not every frame
      if (still) tick();
    };

    resize();
    if (!still) tick();
    else if (samples) timer = window.setInterval(drawReal, 1000);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      window.removeEventListener('resize', resize);
    };
  }, [bpm, samples]);

  return <canvas ref={canvasRef} className={poor ? 'ecg poor' : 'ecg'} role="img" aria-label={samples ? 'ECG from the wrist station, live' : 'ECG, sample trace'} />;
}
