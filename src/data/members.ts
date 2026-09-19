/**
 * The people who can sign in to the live app. Each has a Supabase account whose password is
 * their personal code (set server-side with the admin API — see supabase/README.md). The
 * addresses are synthetic: nothing is ever emailed to them.
 */
export const members = [
  { id: 'max', name: 'Max', email: 'max@bubbie.run' },
  { id: 'smera', name: 'Smera', email: 'smera@bubbie.run' },
] as const;

export type Member = (typeof members)[number];
