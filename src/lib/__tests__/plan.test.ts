import { describe, expect, it } from 'vitest';
import { fmtPace, buildPlan, type PlanInput } from '@/lib/plan';
import { trainingPaces } from '@/lib/fitness';

// A Monday, with a Sunday marathon 16 weeks out: base, build, peak and taper all present.
const today = '2026-09-21';
const race = { name: 'Test Marathon', distance: 'Marathon' as const, date: '2027-01-10', goalTime: '4:00:00', mode: 'time' as const };
const history = { runs: 12, weeklyAvg: 25, longestMi: 10, avgPaceSec: 600, bestEffort: null };
const tenK50 = { distanceMi: 6.2, seconds: 3000, source: 'manual' as const };

const build = (over: Partial<PlanInput> = {}, profile: PlanInput['profile'] = { runDaysPerWeek: 5, level: 'intermediate' }) =>
  buildPlan({ userId: 'u', race, profile, history, today, ...over });
const peakOf = (p: ReturnType<typeof buildPlan>) => Math.max(...p.periodization.map((w) => w.miles));

describe('level', () => {
  it('ramps to a higher peak the more experienced the runner', () => {
    const peaks = (['new', 'intermediate', 'advanced'] as const).map((level) => peakOf(build({}, { runDaysPerWeek: 5, level })));
    expect(peaks[0]).toBeLessThan(peaks[1]);
    expect(peaks[1]).toBeLessThan(peaks[2]);
  });
  it('caps a new runner well under the distance default', () => {
    expect(peakOf(build({}, { runDaysPerWeek: 5, level: 'new' }))).toBeLessThanOrEqual(39);
  });
});

describe('paces', () => {
  it('come from the reference race when there is one', () => {
    const p = build({ history: { ...history, avgPaceSec: 560 } }, { runDaysPerWeek: 5, recentRace: tenK50 });
    expect(p.paces.source).toBe('race');
    expect(p.paces.easy).toBeCloseTo(3000 / 6.2 + 90, 5);
    expect(p.seed.reference).toEqual(tenK50);
  });
  it('never make easy faster than the everyday pace from history', () => {
    const p = build({}, { runDaysPerWeek: 5, recentRace: tenK50 }); // history easy = 600 − 10
    expect(p.paces.easy).toBe(590);
  });
  it('fall back to the goal time with no reference and no history', () => {
    const p = build({ history: null });
    expect(p.paces.source).toBe('goal');
    expect(p.paces.easy).toBeCloseTo((4 * 3600) / 26.2 + 75, 5);
    expect(p.seed.reference).toBeNull();
  });
});

describe('just finish', () => {
  const p = build({ race: { ...race, mode: 'finish' } }, { runDaysPerWeek: 5, recentRace: tenK50 });
  it('sets race pace from the projection plus a cushion, not the goal time', () => {
    const raceDay = p.sessions.find((s) => s.date === race.date)!;
    expect(raceDay.payload.paceTarget).toBe(fmtPace(trainingPaces(tenK50).race.Marathon + 30));
    expect(p.seed.goalGapSec).toBeNull();
  });
  it('keeps quality at tempo and drops goal-pace segments', () => {
    expect(p.sessions.some((s) => s.type === 'intervals')).toBe(false);
    expect(p.sessions.some((s) => /goal pace/i.test(s.detail))).toBe(false);
  });
});

describe('heart-rate ranges', () => {
  it('appear on every running session when max HR is known', () => {
    const p = build({}, { runDaysPerWeek: 5, maxHr: 190 });
    const running = p.sessions.filter((s) => s.type !== 'rest' && s.date !== race.date);
    expect(running.length).toBeGreaterThan(20);
    for (const s of running) expect(s.payload.hrRange).toMatch(/^\d{2,3}–\d{2,3} bpm$/);
    expect(p.paces.zones?.Z2).toEqual([124, 143]);
  });
  it('are absent without a max HR', () => {
    const p = build();
    expect(p.sessions.every((s) => s.payload.hrRange === undefined)).toBe(true);
    expect(p.paces.zones).toBeNull();
  });
});
