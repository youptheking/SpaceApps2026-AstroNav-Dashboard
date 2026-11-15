import { expect, test } from 'vitest';
import { DemoWatch } from './demo';
import { LiveModel } from './live';
import { sample } from '../data/sample';

const base = { crew: sample.crew, checkIn: sample.checkIn };

// runs the pretend watch for a number of seconds into a model, the way the console does
function play(seconds: number) {
  const watch = new DemoWatch();
  const model = new LiveModel();
  const start = new Date(2026, 10, 15, 14, 0, 0).getTime();
  for (const [p, at] of watch.history(new Date(start))) model.apply(p, at);
  for (let ms = 0; ms < seconds * 1000; ms += 100) {
    for (const p of watch.tick()) model.apply(p, new Date(start + ms));
  }
  return model.snapshot(base, new Date(start + seconds * 1000));
}

test('the quiet history gives a baseline in the normal resting range', () => {
  const s = play(10);
  expect(s.hrvBaseline).toBeGreaterThan(38);
  expect(s.hrvBaseline).toBeLessThan(58);
  expect(s.vitals.hrEcg).toBeGreaterThanOrEqual(68);
  expect(s.vitals.hrEcg).toBeLessThanOrEqual(73);
  expect(s.cabin.ppco2Hour).toBeLessThan(3);
  expect(s.stressFrom).toBeNull();
});

test('two minutes in, stress is up and CO2 is over 3 mmHg', () => {
  const s = play(125);
  expect(s.stressFrom).not.toBeNull();
  expect(s.vitals.hrEcg).toBeGreaterThan(80);
  expect(s.hrvNow).toBeLessThan(s.hrvBaseline! * 0.8);
  expect(s.cabin.ppco2Now).toBeGreaterThan(3);
  expect(s.alerts.map((a) => a.code)).toEqual(expect.arrayContaining([10, 1, 5]));
});

test('by the end of the story everything has cleared again', () => {
  const s = play(290);
  expect(s.stressFrom).toBeNull();
  expect(s.alerts.every((a) => a.resolution !== null)).toBe(true);
  expect(s.cabin.ppco2Now).toBeLessThan(2.9);
});

// same as play(), for one of the extra crew stories
function playStory(options: ConstructorParameters<typeof DemoWatch>[0], seconds: number) {
  const watch = new DemoWatch(options);
  const model = new LiveModel();
  const start = new Date(2026, 10, 15, 14, 0, 0).getTime();
  for (const [p, at] of watch.history(new Date(start))) model.apply(p, at);
  for (let ms = 0; ms < seconds * 1000; ms += 100) {
    for (const p of watch.tick()) model.apply(p, new Date(start + ms));
  }
  return model.snapshot(base, new Date(start + seconds * 1000));
}

test('each crew story shows something different', () => {
  const co2 = playStory({ story: 'co2' }, 125);
  expect(co2.cabin.ppco2Now).toBeGreaterThan(3);
  expect(co2.stressFrom).toBeNull();

  const stress = playStory({ story: 'stress', restingHr: 74 }, 125);
  expect(stress.stressFrom).not.toBeNull();
  expect(stress.cabin.ppco2Now).toBeLessThan(2.6);

  const calm = playStory({ story: 'calm', restingHr: 61 }, 125);
  expect(calm.alerts.filter((a) => a.resolution === null)).toHaveLength(0);
  expect(calm.vitals.hrEcg).toBeLessThan(66);
});
