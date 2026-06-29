import Dexie from 'dexie';

export const db = new Dexie('KenyaPOS');

db.version(1).stores({
  // Offline-cached data for POS operation
  products: 'id, sku, barcode, name, categoryId, isActive',
  categories: 'id, name, parentId',
  customers: 'id, name, phone, accountNumber',

  // Offline transaction queue
  pendingTransactions: '++localId, type, status, createdAt',

  // Sync metadata
  syncMeta: 'key',
});

export async function cacheProducts(products) {
  await db.products.clear();
  await db.products.bulkPut(products);
  await db.syncMeta.put({ key: 'products_synced', value: new Date().toISOString() });
}

export async function cacheCategories(categories) {
  await db.categories.clear();
  await db.categories.bulkPut(categories);
}

export async function cacheCustomers(customers) {
  await db.customers.clear();
  await db.customers.bulkPut(customers);
}

export async function getOfflineProducts(search = '') {
  if (!search) return db.products.where('isActive').equals(1).toArray();
  const lower = search.toLowerCase();
  return db.products
    .filter((p) => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower) || (p.barcode && p.barcode.includes(search)))
    .toArray();
}

export async function getOfflineCustomers(search = '') {
  if (!search) return db.customers.toArray();
  const lower = search.toLowerCase();
  return db.customers
    .filter((c) => c.name.toLowerCase().includes(lower) || (c.phone && c.phone.includes(search)))
    .toArray();
}

export async function queueTransaction(transaction) {
  return db.pendingTransactions.add({
    ...transaction,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingTransactions() {
  return db.pendingTransactions.where('status').equals('pending').toArray();
}

export async function markTransactionSynced(localId) {
  return db.pendingTransactions.update(localId, { status: 'synced' });
}

export async function clearSyncedTransactions() {
  return db.pendingTransactions.where('status').equals('synced').delete();
}
