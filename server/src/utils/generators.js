import { prisma } from '../config/database.js';

export function generateReceiptNumber() {
  const date = new Date();
  const prefix = 'RCP';
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `${prefix}-${datePart}-${random}`;
}

export async function generatePONumber() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}`;
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });

  let seq = 1;
  if (lastPO) {
    const parts = lastPO.poNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export function generateAccountNumber() {
  const prefix = 'CUST';
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${prefix}-${random}`;
}

export function generateTransactionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
