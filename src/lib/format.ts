export const n = (v: number) => v.toLocaleString('en-US');

export const todayLabel = (d = new Date()) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function daysUntil(iso: string) {
  const race = new Date(iso + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((race.getTime() - today.getTime()) / 86400000));
}

export function weeksUntil(iso: string) {
  return Math.max(1, Math.round(daysUntil(iso) / 7));
}

/** "3:45:00" over 26.2 mi → "8:35" */
export function paceFor(goalTime: string, miles: number) {
  const parts = goalTime.split(':').map(Number);
  const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  const per = secs / miles;
  const m = Math.floor(per / 60);
  const s = Math.round(per % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
