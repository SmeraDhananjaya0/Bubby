/**
 * Fitness model — what a runner can do today, from one reference race (a real race, a time trial, or the
 * best recent Strava effort), and the training paces and heart-rate zones that follow from it.
 *
 * Pure, so it runs on the client, in a test, and (the zone bands) mirrored in `supabase/functions/strava-sync`.
 *  - Riegel projects a time from one distance to another: t2 = t1 × (d2 / d1) ^ 1.06.
 *  - Paces hang off the projected 10K pace: recovery +120 s, easy +90, long +75, tempo +15, intervals −15.
 *  - Zones: % of max HR (Z1 < 65 · Z2 65–75 · Z3 75–82 · Z4 82–90 · Z5 90+), or Karvonen on heart-rate
 *    reserve when resting HR is known.
 */
import type { Profile, Race, RecentRace, RunHistory } from '@/types';

export const RIEGEL = 1.06;

export const DIST_MI: Record<Race['distance'], number> = { '5K': 3.1, '10K': 6.2, Half: 13.1, Marathon: 26.2 };

/** Riegel: the time for `targetMi` implied by running `distMi` in `seconds`. */
export function projectTime(distMi: number, seconds: number, targetMi: number): number {
  return seconds * Math.pow(targetMi / distMi, RIEGEL);
}

/** The race that anchors everything: what the runner typed in, else the best recent Strava effort. */
export function referenceRace(profile: Pick<Profile, 'recentRace'>, history?: Pick<RunHistory, 'bestEffort'> | null): RecentRace | null {
  return profile.recentRace ?? history?.bestEffort ?? null;
}

/** Training paces in seconds per mile, plus the race pace this fitness implies at each distance. */
export type Paces = { recovery: number; easy: number; long: number; tempo: number; intervals: number; race: Record<Race['distance'], number> };

export function trainingPaces(ref: RecentRace): Paces {
  const tenK = projectTime(ref.distanceMi, ref.seconds, DIST_MI['10K']) / DIST_MI['10K'];
  const racePace = (d: Race['distance']) => projectTime(ref.distanceMi, ref.seconds, DIST_MI[d]) / DIST_MI[d];
  return {
    recovery: tenK + 120,
    easy: tenK + 90,
    long: tenK + 75,
    tempo: tenK + 15,
    intervals: tenK - 15,
    race: { '5K': racePace('5K'), '10K': tenK, Half: racePace('Half'), Marathon: racePace('Marathon') },
  };
}

/** Projected finish time (seconds) at `distance` from the reference race. */
export function projectedFinish(ref: RecentRace, distance: Race['distance']): number {
  return projectTime(ref.distanceMi, ref.seconds, DIST_MI[distance]);
}

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
export type Zones = Record<Zone, [number, number]>;

const BANDS: Record<Zone, [number, number]> = { Z1: [0.5, 0.65], Z2: [0.65, 0.75], Z3: [0.75, 0.82], Z4: [0.82, 0.9], Z5: [0.9, 1] };

/** bpm bounds per zone. Karvonen (heart-rate reserve) when resting HR is known, else percent of max. */
export function hrZones(maxHr: number, restingHr?: number | null): Zones {
  const rest = restingHr ?? 0;
  const at = (pct: number) => Math.round(rest + pct * (maxHr - rest));
  const out = {} as Zones;
  (Object.keys(BANDS) as Zone[]).forEach((z) => { out[z] = [at(BANDS[z][0]), at(BANDS[z][1])]; });
  return out;
}

/** "Zone 3–4" → "143–171 bpm" for the session card; undefined when there are no zones or no zone number. */
export function zoneRange(zoneLabel: string | undefined, zones: Zones | null): string | undefined {
  if (!zones || !zoneLabel) return undefined;
  const nums = zoneLabel.match(/[1-5]/g);
  if (!nums) return undefined;
  const lo = zones[`Z${nums[0]}` as Zone][0];
  const hi = zones[`Z${nums[nums.length - 1]}` as Zone][1];
  return `${lo}–${hi} bpm`;
}
