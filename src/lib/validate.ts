/**
 * Input validation for the things a runner types during onboarding (and later edits in Settings).
 * Every check returns `null` when the value is fine, or a short sentence to show under the field.
 * Screens block "Continue" while any check fails, so a bad date can never reach the plan builder.
 */
import { localISO, parseISO } from '@/lib/format';

/** Keep only digits and lay them out as YYYY-MM-DD while the person types. */
export function formatDateInput(text: string) {
  const d = text.replace(/[^0-9]/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

/** Digits and colons only, e.g. "3:45:00" or "47:30". */
export function formatTimeInput(text: string) {
  return text.replace(/[^0-9:]/g, '').replace(/:{2,}/g, ':').slice(0, 8);
}

/** A race date must be a real calendar day, tomorrow or later, and within a year. */
export function validateRaceDate(iso: string, today = localISO()): string | null {
  if (!iso) return 'Enter your race date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Use the format YYYY-MM-DD, e.g. 2026-12-06.';
  const d = parseISO(iso);
  if (!d) return "That isn't a real date. Check the month and day.";
  const t = parseISO(today)!;
  const days = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (days < 1) return 'Your race date needs to be in the future.';
  if (days > 366) return 'Bubbie plans up to a year ahead. Pick a date within the next 12 months.';
  return null;
}

/** Parse "H:MM:SS" or "MM:SS" into seconds; null when malformed. */
export function parseGoalTime(text: string): number | null {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(text.trim())) return null;
  const p = text.trim().split(':').map(Number);
  if (p.slice(1).some((x) => x >= 60)) return null;
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}

/** A goal time has to be well formed and imply a pace a human can run (4:00–20:00 /mi). */
export function validateGoalTime(text: string, miles: number): string | null {
  if (!text) return 'Enter a goal time.';
  const secs = parseGoalTime(text);
  if (secs == null) return 'Use H:MM:SS for anything over an hour, or MM:SS.';
  const pace = secs / miles;
  if (pace < 240) return `That works out under 4:00 /mi. Double-check the time.`;
  if (pace > 1200) return `That works out over 20:00 /mi. Double-check the time.`;
  return null;
}

export function validateRaceName(name: string): string | null {
  return name.trim().length >= 2 ? null : 'Give your race a name, e.g. Honolulu Marathon.';
}

/** Profile fields: broad but honest ranges so the calorie baseline is meaningful. */
export const validateProfile = {
  age: (v: number) => (v >= 13 && v <= 100 ? null : 'Enter an age between 13 and 100.'),
  heightIn: (v: number) => (v >= 48 && v <= 90 ? null : 'Enter a height between 4 ft and 7 ft 6.'),
  weightLb: (v: number) => (v >= 60 && v <= 450 ? null : 'Enter a weight between 60 and 450 lb.'),
  maxHr: (v: number) => (v >= 100 && v <= 230 ? null : 'Max heart rate is usually between 100 and 230.'),
  restingHr: (v: number) => (v >= 30 && v <= 120 ? null : 'Resting heart rate is usually between 30 and 120.'),
};
