import axios from 'axios';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';

const SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const PRODUCTION_URL = 'https://api.africastalking.com/version1/messaging';

function getUrl() {
  return env.AT_USERNAME === 'sandbox' ? SANDBOX_URL : PRODUCTION_URL;
}

export async function sendSMS(phone, message) {
  // Create log entry
  const log = await prisma.smsLog.create({
    data: { phone, message, status: 'queued' },
  });

  try {
    const response = await axios.post(
      getUrl(),
      new URLSearchParams({
        username: env.AT_USERNAME,
        to: formatPhoneForAT(phone),
        message,
        ...(env.AT_SENDER_ID && { from: env.AT_SENDER_ID }),
      }),
      {
        headers: {
          'apiKey': env.AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      }
    );

    const result = response.data.SMSMessageData?.Recipients?.[0];
    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: result?.statusCode === 101 ? 'sent' : 'failed',
        providerMessageId: result?.messageId || null,
      },
    });

    return { success: true, messageId: result?.messageId };
  } catch (error) {
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'failed' },
    });
    return { success: false, error: error.message };
  }
}

export async function sendBulkSMS(recipients, message) {
  const results = [];
  for (const phone of recipients) {
    const result = await sendSMS(phone, message);
    results.push({ phone, ...result });
  }
  return results;
}

export async function sendReceiptSMS(phone, receiptData) {
  const message = [
    `${receiptData.businessName}`,
    `Receipt: ${receiptData.receiptNumber}`,
    `Date: ${receiptData.date}`,
    `Items: ${receiptData.itemCount}`,
    `Total: KES ${receiptData.total}`,
    receiptData.mpesaCode ? `M-Pesa: ${receiptData.mpesaCode}` : '',
    `Thank you for your purchase!`,
  ].filter(Boolean).join('\n');

  return sendSMS(phone, message);
}

export async function sendCreditReminderSMS(phone, customerName, balance) {
  const message = `Dear ${customerName}, your outstanding balance is KES ${balance}. Please make a payment at your earliest convenience. Thank you.`;
  return sendSMS(phone, message);
}

export async function sendLoyaltyUpdateSMS(phone, customerName, pointsEarned, totalPoints) {
  const message = `Dear ${customerName}, you earned ${pointsEarned} loyalty points. Your balance is ${totalPoints} points. Thank you for shopping with us!`;
  return sendSMS(phone, message);
}

function formatPhoneForAT(phone) {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) cleaned = '+254' + cleaned.substring(1);
  if (cleaned.startsWith('254')) cleaned = '+' + cleaned;
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
}
