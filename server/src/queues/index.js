import Bull from 'bull';
import { env } from '../config/env.js';
import { sendReceiptSMS, sendCreditReminderSMS } from '../integrations/africastalking/sms.js';
import { submitInvoice, retryFailedSubmissions } from '../integrations/etims/etims.js';
import { prisma } from '../config/database.js';

let smsQueue, etimsQueue, syncQueue;

try {
  smsQueue = new Bull('sms', env.REDIS_URL, {
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  });

  etimsQueue = new Bull('etims', env.REDIS_URL, {
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 10000 } },
  });

  syncQueue = new Bull('sync', env.REDIS_URL, {
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  });

  // SMS Queue processor
  smsQueue.process(async (job) => {
    const { type, phone, data } = job.data;
    switch (type) {
      case 'receipt':
        return sendReceiptSMS(phone, data);
      case 'credit_reminder':
        return sendCreditReminderSMS(phone, data.customerName, data.balance);
      default:
        throw new Error(`Unknown SMS type: ${type}`);
    }
  });

  // eTIMS Queue processor
  etimsQueue.process(async (job) => {
    const { saleId } = job.data;
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
      },
    });
    if (!sale) throw new Error('Sale not found');
    return submitInvoice(sale);
  });

  // Sync Queue processor (for offline transactions)
  syncQueue.process(async (job) => {
    const { transactions } = job.data;
    const results = [];
    for (const tx of transactions) {
      try {
        // Process each offline transaction
        results.push({ id: tx.id, status: 'synced' });
      } catch (error) {
        results.push({ id: tx.id, status: 'failed', error: error.message });
      }
    }
    return results;
  });

  // Set up recurring eTIMS retry
  etimsQueue.add('retry-failed', {}, {
    repeat: { cron: '*/15 * * * *' }, // Every 15 minutes
  });

  etimsQueue.process('retry-failed', async () => {
    return retryFailedSubmissions();
  });

  smsQueue.on('failed', (job, err) => {
    console.error(`SMS job ${job.id} failed:`, err.message);
  });

  etimsQueue.on('failed', (job, err) => {
    console.error(`eTIMS job ${job.id} failed:`, err.message);
  });
} catch (err) {
  console.warn('Bull queues not available (Redis may be down):', err.message);
}

export function addSmsJob(type, phone, data) {
  if (smsQueue) {
    return smsQueue.add({ type, phone, data });
  }
  console.warn('SMS queue not available');
}

export function addEtimsJob(saleId) {
  if (etimsQueue) {
    return etimsQueue.add({ saleId });
  }
  console.warn('eTIMS queue not available');
}

export function addSyncJob(transactions) {
  if (syncQueue) {
    return syncQueue.add({ transactions });
  }
  console.warn('Sync queue not available');
}

export { smsQueue, etimsQueue, syncQueue };
