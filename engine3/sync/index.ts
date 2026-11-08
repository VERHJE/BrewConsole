// Engine 3 · synchronisatie · publieke ingang voor de app (client-kant).
export { deriveKey, newSalt, KDF_ITERATIONS } from './crypto.ts';
export type { CryptoDeps } from './crypto.ts';
export { newSyncState, pendingEvents } from './blocks.ts';
export type { SyncState } from './blocks.ts';
export { compact, ensureSalt, fetchSalt, listBlockIds, pull, push, syncOnce, SyncError } from './client.ts';
export type { SyncConfig, SyncErrorKind, PullResult, PushResult } from './client.ts';
