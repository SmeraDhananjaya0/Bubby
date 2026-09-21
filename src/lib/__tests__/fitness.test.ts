import { describe, expect, it } from 'vitest';
import { hrZones, projectTime, projectedFinish, referenceRace, trainingPaces, zoneRange } from '@/lib/fitness';

const tenK50 = { distanceMi: 6.2, seconds: 3000, source: 'manual' as const };

describe('projectTime', () => {
  it('projects a 5K to a 10K with the Riegel exponent', () => {
    expect(projectTime(3.1, 1500, 6.2)).toBeCloseTo(1500 * 2 ** 1.06, 0);
  });
  it('is the identity at the same distance', () => {
    expect(projectTime(6.2, 3000, 6.2)).toBe(3000);
  });
});

describe('trainingPaces', () => {
  const p = trainingPaces(tenK50);
  const tenKPace = 3000 / 6.2;
  it('spaces the paces around 10K pace', () => {
    expect(p.easy).toBeCloseTo(tenKPace + 90, 5);
    expect(p.long).toBeCloseTo(tenKPace + 75, 5);
    expect(p.tempo).toBeCloseTo(tenKPace + 15, 5);
    expect(p.intervals).toBeCloseTo(tenKPace - 15, 5);
    expect(p.recovery).toBeCloseTo(tenKPace + 120, 5);
  });
  it('slows race pace as the distance grows', () => {
    expect(p.race.Marathon).toBeGreaterThan(p.race.Half);
    expect(p.race.Half).toBeGreaterThan(p.race['10K']);
    expect(p.race['10K']).toBeCloseTo(tenKPace, 5);
  });
});

describe('projectedFinish', () => {
  it('projects a marathon from a 10K', () => {
    expect(projectedFinish(tenK50, 'Marathon')).toBeCloseTo(3000 * (26.2 / 6.2) ** 1.06, 0);
  });
});

describe('hrZones', () => {
  it('uses percent of max when resting HR is unknown', () => {
    expect(hrZones(190).Z2).toEqual([124, 143]);
    expect(hrZones(190).Z5[1]).toBe(190);
  });
  it('uses heart-rate reserve when resting HR is known', () => {
    expect(hrZones(190, 50).Z2).toEqual([141, 155]);
  });
});

describe('zoneRange', () => {
  const z = hrZones(190);
  it('spans a zone range label', () => {
    expect(zoneRange('Zone 3–4', z)).toBe('143–171 bpm');
    expect(zoneRange('Zone 2', z)).toBe('124–143 bpm');
  });
  it('is undefined without zones or for labels without a zone number', () => {
    expect(zoneRange('Zone 2', null)).toBeUndefined();
    expect(zoneRange('Race', z)).toBeUndefined();
    expect(zoneRange(undefined, z)).toBeUndefined();
  });
});

describe('referenceRace', () => {
  const strava = { distanceMi: 5, seconds: 2400, date: '2026-09-05', source: 'strava' as const };
  it('prefers the race the runner typed in', () => {
    expect(referenceRace({ recentRace: tenK50 }, { bestEffort: strava })).toEqual(tenK50);
  });
  it('falls back to the best Strava effort, then to nothing', () => {
    expect(referenceRace({}, { bestEffort: strava })).toEqual(strava);
    expect(referenceRace({}, { bestEffort: null })).toBeNull();
    expect(referenceRace({}, null)).toBeNull();
  });
});
