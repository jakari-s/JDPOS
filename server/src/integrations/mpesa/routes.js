import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { mpesaIpWhitelist } from '../../middleware/mpesaIpWhitelist.js';
import { initiateSTKPush, querySTKPushStatus, registerC2BUrls } from './daraja.js';

const router = Router();

// STK Push - initiate payment (authenticated)
router.post('/stk-push', authenticate, async (req, res, next) => {
  try {
    const { phone, amount, saleId } = req.body;

    const result = await initiateSTKPush({
      phone,
      amount,
      accountReference: saleId || 'POS-Payment',
      transactionDesc: 'POS Payment',
    });

    // Store the checkout request for matching later
    if (saleId && result.CheckoutRequestID) {
      await prisma.payment.updateMany({
        where: { saleId, method: 'mpesa', status: 'pending' },
        data: { reference: result.CheckoutRequestID },
      });
    }

    res.json({
      success: true,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      responseDescription: result.ResponseDescription,
    });
  } catch (err) {
    next(err);
  }
});

// STK Push Callback (public, IP-whitelisted)
router.post('/callback', mpesaIpWhitelist, async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    if (ResultCode === 0 && CallbackMetadata) {
      // Payment successful
      const metadata = {};
      for (const item of CallbackMetadata.Item) {
        metadata[item.Name] = item.Value;
      }

      // Update payment record
      await prisma.payment.updateMany({
        where: { reference: CheckoutRequestID, method: 'mpesa' },
        data: {
          status: 'completed',
          mpesaCode: metadata.MpesaReceiptNumber || null,
          mpesaPhone: metadata.PhoneNumber ? String(metadata.PhoneNumber) : null,
        },
      });
    } else {
      // Payment failed
      await prisma.payment.updateMany({
        where: { reference: CheckoutRequestID, method: 'mpesa' },
        data: { status: 'failed' },
      });
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// C2B Confirmation (public, IP-whitelisted)
router.post('/c2b/confirmation', mpesaIpWhitelist, async (req, res) => {
  try {
    const { TransID, TransAmount, BillRefNumber, MSISDN, TransTime } = req.body;

    // Try to match with pending sale by BillRefNumber (receipt number)
    const sale = await prisma.sale.findFirst({
      where: { receiptNumber: BillRefNumber },
      include: { payments: true },
    });

    if (sale) {
      const pendingMpesa = sale.payments.find((p) => p.method === 'mpesa' && p.status === 'pending');
      if (pendingMpesa) {
        await prisma.payment.update({
          where: { id: pendingMpesa.id },
          data: {
            status: 'completed',
            mpesaCode: TransID,
            mpesaPhone: MSISDN,
            amount: parseFloat(TransAmount),
          },
        });
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('C2B confirmation error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// C2B Validation (public, IP-whitelisted)
router.post('/c2b/validation', mpesaIpWhitelist, async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Query STK Push status (authenticated)
router.get('/status/:checkoutRequestId', authenticate, async (req, res, next) => {
  try {
    const result = await querySTKPushStatus(req.params.checkoutRequestId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Register C2B URLs (admin only)
router.post('/register-urls', authenticate, async (req, res, next) => {
  try {
    const result = await registerC2BUrls();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
