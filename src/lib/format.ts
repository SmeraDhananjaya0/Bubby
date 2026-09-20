export const n = (v: number) => v.toLocaleString('en-US');

export const todayLabel = (d = new Date()) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// ---------------------------------------------------------------- dates (local, YYYY-MM-DD)

/** Local calendar date as YYYY-MM-DD. */
export const localISO = (d = new Date()) => d.toLocaleDateString('en-CA');

/** Parse YYYY-MM-DD as a local midnight; null when malformed or not a real day. */
export function parseISO(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) || localISO(d) !== iso ? null : d;
}

export function isoAdd(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localISO(d);
}

/** Monday of the week containing `iso`. */
export function mondayOf(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return isoAdd(iso, -((d.getDay() + 6) % 7));
}

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dowOf = (iso: string) => DOW[new Date(iso + 'T00:00:00').getDay()];

export const shortDate = (iso: string) => {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date not set';
};

export const monthLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Whole days from today to `iso`; null when the date is invalid (never NaN). */
export function daysUntil(iso: string): number | null {
  const race = parseISO(iso);
  if (!race) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((race.getTime() - today.getTime()) / 86400000));
}

export function weeksUntil(iso: string): number | null {
  const d = daysUntil(iso);
  return d == null ? null : Math.max(1, Math.round(d / 7));
}

/** "3:45:00" over 26.2 mi → "8:35"; "—" when the time is malformed. */
export function paceFor(goalTime: string, miles: number) {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(goalTime.trim()) || !miles) return '—';
  const parts = goalTime.trim().split(':').map(Number);
  const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  const per = secs / miles;
  const m = Math.floor(per / 60);
  const s = Math.round(per % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
