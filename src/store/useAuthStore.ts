/**
 * Who is signed in. Persisted so a session survives an app restart.
 *
 * The app is account-based: signing in switches the active user, and the app
 * store keeps a separate snapshot of training + nutrition data per user id
 * (see `hydrateForUser` in useAppStore). Sign out leaves that data on the
 * device so the same person picks up where they left off next time.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/types';

type AuthState = {
  user: User | null;
  /** True once persisted auth has loaded — the router waits for this. */
  hydrated: boolean;
};

type AuthActions = {
  signIn: (user: User) => void;
  signInGuest: () => void;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,

      signIn: (user) => {
        useAppStore.getState().hydrateForUser(user.id);
        set({ user });
      },

      signInGuest: () => {
        const guest: User = { id: 'guest', name: 'Guest', email: '', provider: 'guest' };
        useAppStore.getState().hydrateForUser(guest.id);
        set({ user: guest });
      },

      signOut: () => set({ user: null }),

      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'bubbie:auth',
      storage: zustandStorage,
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        // Make sure the app store points at the restored user's data.
        if (state?.user) useAppStore.getState().hydrateForUser(state.user.id);
        useAuthStore.getState().setHydrated();
      },
    },
  ),
);
