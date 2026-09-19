/**
 * Apple Health adapter (iOS only).
 *
 * The HealthKit entitlement + usage strings are already in app.json, so an EAS iOS build is
 * HealthKit-capable. Reading workouts needs a native module, which we load lazily so the app
 * still builds and runs (web, Android, Expo Go) when it isn't installed.
 *
 * To turn this on:
 *   npx expo install @kingstinct/react-native-healthkit
 *   add "@kingstinct/react-native-healthkit" to app.json plugins, rebuild the dev client,
 *   then implement `readRecentRuns` below against that module (it exposes queryWorkoutSamples).
 *
 * Everything the app needs from Health is expressed here as plain data so the rest of the
 * codebase never imports HealthKit types directly.
 */
import { Platform } from 'react-native';

export type HealthRun = {
  id: string;
  startedAt: string; // ISO
  distanceMi: number;
  durationSec: number;
  avgHr: number | null;
  kcal: number | null;
};

export type HealthStatus = 'unavailable' | 'needs-module' | 'ready';

type NativeHealth = {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (read: string[], write?: string[]) => Promise<boolean>;
  queryWorkoutSamples: (opts: { limit?: number; ascending?: boolean }) => Promise<any[]>;
};

let native: NativeHealth | null | undefined;

function loadNative(): NativeHealth | null {
  if (native !== undefined) return native;
  native = null;
  if (Platform.OS !== 'ios') return native;
  try {
    // Optional dependency — resolved at runtime only on iOS builds that include it.
    // The module name goes through a variable so Metro doesn't try to resolve it at bundle time.
    const name = '@kingstinct/react-native-healthkit';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(name);
    native = (mod?.default ?? mod) as NativeHealth;
  } catch {
    native = null;
  }
  return native;
}

export async function healthStatus(): Promise<HealthStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  const n = loadNative();
  if (!n) return 'needs-module';
  return (await n.isHealthDataAvailable().catch(() => false)) ? 'ready' : 'unavailable';
}

/** Ask for read access to workouts / heart rate / energy and write access to nutrition. */
export async function requestHealthAccess(): Promise<boolean> {
  const n = loadNative();
  if (!n) return false;
  return n
    .requestAuthorization(
      ['HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierHeartRate', 'HKQuantityTypeIdentifierActiveEnergyBurned', 'HKQuantityTypeIdentifierDistanceWalkingRunning'],
      ['HKQuantityTypeIdentifierDietaryEnergyConsumed', 'HKQuantityTypeIdentifierDietaryCarbohydrates', 'HKQuantityTypeIdentifierDietaryProtein', 'HKQuantityTypeIdentifierDietaryFatTotal', 'HKQuantityTypeIdentifierDietaryWater'],
    )
    .catch(() => false);
}

/** Last `limit` running workouts, newest first. Empty when Health isn't available. */
export async function readRecentRuns(limit = 20): Promise<HealthRun[]> {
  const n = loadNative();
  if (!n) return [];
  const rows = await n.queryWorkoutSamples({ limit, ascending: false }).catch(() => []);
  return rows
    .filter((w) => w.workoutActivityType === 37 /* HKWorkoutActivityTypeRunning */ || w.workoutActivityType === 'running')
    .map((w) => ({
      id: String(w.uuid ?? w.id),
      startedAt: new Date(w.startDate).toISOString(),
      distanceMi: Number(w.totalDistance?.quantity ?? w.totalDistance ?? 0) / 1609.344,
      durationSec: Number(w.duration ?? 0),
      avgHr: w.metadata?.HKAverageHeartRate ? Number(w.metadata.HKAverageHeartRate) : null,
      kcal: w.totalEnergyBurned?.quantity != null ? Number(w.totalEnergyBurned.quantity) : null,
    }));
}
