import axios from 'axios';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_URL = 'https://api.safaricom.co.ke';

function getBaseUrl() {
  return env.MPESA_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;
}

export async function getOAuthToken() {
  // Check cache first
  if (redis) {
    try {
      const cached = await redis.get('mpesa:token');
      if (cached) return cached;
    } catch {
      // Redis unavailable, proceed without cache
    }
  }

  const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString('base64');

  const response = await axios.get(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const token = response.data.access_token;

  // Cache token (expires in ~3600s, cache for 3500s)
  if (redis) {
    try {
      await redis.setex('mpesa:token', 3500, token);
    } catch {
      // Redis unavailable, continue without cache
    }
  }

  return token;
}

export async function initiateSTKPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getOAuthToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  // Format phone number (ensure 254 prefix)
  const formattedPhone = formatPhoneNumber(phone);

  const response = await axios.post(
    `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: accountReference || 'POS Payment',
      TransactionDesc: transactionDesc || 'POS Payment',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

export async function querySTKPushStatus(checkoutRequestId) {
  const token = await getOAuthToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  const response = await axios.post(
    `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

export async function registerC2BUrls() {
  const token = await getOAuthToken();

  const response = await axios.post(
    `${getBaseUrl()}/mpesa/c2b/v1/registerurl`,
    {
      ShortCode: env.MPESA_SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: env.MPESA_C2B_CONFIRMATION_URL,
      ValidationURL: env.MPESA_C2B_VALIDATION_URL,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

export async function initiateB2C({ phone, amount, remarks }) {
  const token = await getOAuthToken();
  const formattedPhone = formatPhoneNumber(phone);

  const response = await axios.post(
    `${getBaseUrl()}/mpesa/b2c/v1/paymentrequest`,
    {
      InitiatorName: env.MPESA_B2C_INITIATOR_NAME,
      SecurityCredential: env.MPESA_B2C_SECURITY_CREDENTIAL,
      CommandID: 'BusinessPayment',
      Amount: Math.ceil(amount),
      PartyA: env.MPESA_SHORTCODE,
      PartyB: formattedPhone,
      Remarks: remarks || 'Refund',
      QueueTimeOutURL: `${env.MPESA_CALLBACK_URL}/timeout`,
      ResultURL: `${env.MPESA_CALLBACK_URL}/b2c/result`,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
  return cleaned;
}
