import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  isOnline: navigator.onLine,
  pendingTransactions: 0,
  lastSyncedAt: null,
  syncStatus: 'idle', // idle, syncing, error

  setOnline: (isOnline) => set({ isOnline }),
  setPendingTransactions: (count) => set({ pendingTransactions: count }),
  setLastSynced: (date) => set({ lastSyncedAt: date }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSyncStore.getState().setOnline(true));
  window.addEventListener('offline', () => useSyncStore.getState().setOnline(false));
}
