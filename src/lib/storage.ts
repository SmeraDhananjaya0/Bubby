/**
 * AsyncStorage adapter for zustand's `persist` middleware.
 *
 * zustand expects a synchronous-looking `StateStorage` whose methods may return
 * promises; AsyncStorage fits directly. Kept in one place so both the auth store
 * and the app store persist the same way.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const zustandStorage = createJSONStorage(() => AsyncStorage);
