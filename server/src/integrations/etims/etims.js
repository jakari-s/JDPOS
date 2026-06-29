import axios from 'axios';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { calculateVAT, formatDate } from '../../utils/index.js';

function getClient() {
  return axios.create({
    baseURL: env.ETIMS_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'tin': env.ETIMS_TIN,
      'bhfId': env.ETIMS_BRANCH_ID,
      'cmcKey': env.ETIMS_API_KEY,
    },
    timeout: 30000,
  });
}

export async function submitInvoice(sale) {
  const client = getClient();

  const invoiceItems = sale.items.map((item, index) => {
    const { net, vat } = calculateVAT(Number(item.lineTotal), item.product.taxClass);
    return {
      itemSeq: index + 1,
      itemCd: item.product.sku,
      itemNm: item.product.name,
      qty: item.quantity,
      prc: Number(item.unitPrice),
      splyAmt: net,
      vatTaxblAmt: net,
      vatAmt: vat,
      totAmt: Number(item.lineTotal),
      taxTyCd: item.product.taxClass === 'standard' ? 'V' : item.product.taxClass === 'zero_rated' ? 'Z' : 'E',
    };
  });

  const { net: totalNet, vat: totalVat } = calculateVAT(Number(sale.total));

  const payload = {
    invcNo: sale.receiptNumber,
    orgInvcNo: null,
    custTin: null,
    custNm: sale.customer?.name || 'Walk-in Customer',
    salesTyCd: 'N',
    rcptTyCd: 'S',
    pmtTyCd: mapPaymentType(sale.payments),
    salesSttsCd: '02',
    cfmDt: formatDate(sale.createdAt),
    salesDt: formatDate(sale.createdAt),
    stockRlsDt: null,
    totItemCnt: sale.items.length,
    taxblAmtA: totalNet,
    taxAmtA: totalVat,
    totTaxblAmt: totalNet,
    totTaxAmt: totalVat,
    totAmt: Number(sale.total),
    itemList: invoiceItems,
  };

  // Create submission record
  const submission = await prisma.etimsSubmission.create({
    data: {
      saleId: sale.id,
      status: 'pending',
      request: payload,
    },
  });

  try {
    const response = await client.post('/trnsSales/saveSales', payload);

    const status = response.data.resultCd === '000' ? 'confirmed' : 'failed';
    const invoiceNumber = response.data.data?.intrlKey || response.data.data?.rcptNo || null;

    await prisma.etimsSubmission.update({
      where: { id: submission.id },
      data: {
        status,
        response: response.data,
        invoiceNumber,
        submittedAt: new Date(),
      },
    });

    if (invoiceNumber) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: { etimsInvoiceNumber: invoiceNumber },
      });
    }

    return { success: status === 'confirmed', invoiceNumber, response: response.data };
  } catch (error) {
    await prisma.etimsSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'failed',
        response: { error: error.message },
        retryCount: { increment: 1 },
      },
    });

    return { success: false, error: error.message };
  }
}

export async function submitCreditNote(refund, originalSale) {
  const client = getClient();

  const payload = {
    invcNo: `CN-${refund.id.slice(0, 8)}`,
    orgInvcNo: originalSale.receiptNumber,
    custNm: originalSale.customer?.name || 'Walk-in Customer',
    salesTyCd: 'N',
    rcptTyCd: 'R',
    pmtTyCd: '01',
    salesSttsCd: '02',
    cfmDt: formatDate(new Date()),
    salesDt: formatDate(new Date()),
    totAmt: -Number(refund.amount),
    remark: refund.reason,
  };

  try {
    const response = await client.post('/trnsSales/saveSales', payload);
    return { success: response.data.resultCd === '000', response: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function retryFailedSubmissions() {
  const failed = await prisma.etimsSubmission.findMany({
    where: { status: 'failed', retryCount: { lt: 5 } },
    include: {
      sale: { include: { items: { include: { product: true } }, payments: true, customer: true } },
    },
    take: 10,
  });

  const results = [];
  for (const submission of failed) {
    const result = await submitInvoice(submission.sale);
    results.push({ saleId: submission.saleId, ...result });
  }

  return results;
}

function mapPaymentType(payments) {
  const method = payments[0]?.method;
  switch (method) {
    case 'cash': return '01';
    case 'mpesa': return '04';
    case 'card': return '02';
    case 'credit': return '03';
    default: return '01';
  }
}
