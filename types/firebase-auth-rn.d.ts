/**
 * Firebase JS SDK v12 typing gap workaround.
 *
 * `getReactNativePersistence` ships in the React Native build of
 * `@firebase/auth` (and is present in the runtime bundles used by Metro on
 * every platform), but it is missing from the public type surface
 * (`auth-public.d.ts`) that TypeScript resolves for `firebase/auth`.
 *
 * Runtime resolution is correct — Metro picks the react-native build via the
 * package's "react-native" field — so this file only restores the types that
 * the SDK forgot to publish. Remove this file once firebase fixes the gap.
 *
 * Verified against firebase 12.10.0 / @firebase/auth 1.12.1:
 *   - node_modules/@firebase/auth/dist/rn/index.rn.d.ts exports the function
 *   - node_modules/@firebase/auth/dist/auth-public.d.ts does not
 */
import type { Persistence } from 'firebase/auth';

/** Structural shape of the storage engine required for native persistence. */
interface ReactNativeStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeStorageLike): Persistence;
}
