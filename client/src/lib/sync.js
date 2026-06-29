import { productsApi, customersApi, categoriesApi, salesApi } from '../api';
import { cacheProducts, cacheCategories, cacheCustomers, getPendingTransactions, markTransactionSynced, clearSyncedTransactions } from './db';
import { useSyncStore } from '../store/syncStore';

export async function syncDown() {
  try {
    // Download fresh data for offline use
    const [productsRes, categoriesRes, customersRes] = await Promise.all([
      productsApi.list({ limit: '1000', isActive: 'true' }),
      categoriesApi.list(),
      customersApi.list({ limit: '1000' }),
    ]);

    await Promise.all([
      cacheProducts(productsRes.data.data || []),
      cacheCategories(categoriesRes.data || []),
      cacheCustomers(customersRes.data.data || []),
    ]);

    useSyncStore.getState().setLastSynced(new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Sync down failed:', error);
    return false;
  }
}

export async function syncUp() {
  const store = useSyncStore.getState();
  store.setSyncStatus('syncing');

  try {
    const pending = await getPendingTransactions();

    if (pending.length === 0) {
      store.setSyncStatus('idle');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    // Sort by createdAt for conflict resolution (oldest first)
    pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const tx of pending) {
      try {
        switch (tx.type) {
          case 'sale':
            await salesApi.create(tx.data);
            break;
          // Add more types as needed
          default:
            console.warn('Unknown transaction type:', tx.type);
        }
        await markTransactionSynced(tx.localId);
        synced++;
      } catch (error) {
        console.error('Failed to sync transaction:', tx.localId, error);
        failed++;
      }
    }

    // Clean up synced transactions
    await clearSyncedTransactions();

    store.setPendingTransactions(failed);
    store.setSyncStatus('idle');

    return { synced, failed };
  } catch (error) {
    store.setSyncStatus('error');
    return { synced: 0, failed: -1 };
  }
}

export async function fullSync() {
  const upResult = await syncUp();
  await syncDown();
  return upResult;
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => fullSync(), 2000);
  });
}
