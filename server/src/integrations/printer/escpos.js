import { formatKES, formatDate, formatTime } from '../../utils/index.js';

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT: `${GS}!\x11`,
  NORMAL_SIZE: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  FEED: '\n',
  OPEN_CASH_DRAWER: `${ESC}p\x00\x19\xFA`,
};

export function generateReceiptData(sale, company, options = {}) {
  const width = options.width === 58 ? 32 : 48; // 58mm = 32 chars, 80mm = 48 chars
  const lines = [];

  lines.push(COMMANDS.INIT);
  lines.push(COMMANDS.ALIGN_CENTER);
  lines.push(COMMANDS.BOLD_ON);
  lines.push(COMMANDS.DOUBLE_HEIGHT);
  lines.push(company.name);
  lines.push(COMMANDS.NORMAL_SIZE);
  lines.push(COMMANDS.BOLD_OFF);

  if (company.address) lines.push(company.address);
  if (company.phone) lines.push(`Tel: ${company.phone}`);
  if (company.pin) lines.push(`PIN: ${company.pin}`);
  if (company.vatNumber) lines.push(`VAT: ${company.vatNumber}`);
  lines.push('-'.repeat(width));

  lines.push(COMMANDS.ALIGN_LEFT);
  lines.push(`Receipt: ${sale.receiptNumber}`);
  lines.push(`Date: ${formatDate(sale.createdAt)} ${formatTime(sale.createdAt)}`);
  lines.push(`Cashier: ${sale.user?.name || 'N/A'}`);
  if (sale.customer) {
    lines.push(`Customer: ${sale.customer.name}`);
  }
  lines.push('-'.repeat(width));

  // Items header
  lines.push(COMMANDS.BOLD_ON);
  lines.push(padColumns('Item', 'Qty x Price', 'Total', width));
  lines.push(COMMANDS.BOLD_OFF);
  lines.push('-'.repeat(width));

  // Items
  for (const item of sale.items) {
    const productName = item.product?.name || 'Item';
    const truncatedName = productName.length > width - 20 ? productName.substring(0, width - 23) + '...' : productName;
    lines.push(truncatedName);
    lines.push(padColumns(
      '',
      `${item.quantity} x ${Number(item.unitPrice).toFixed(2)}`,
      formatKES(item.lineTotal),
      width
    ));
    if (Number(item.discountAmount) > 0) {
      lines.push(`  Discount: -${formatKES(item.discountAmount)}`);
    }
  }

  lines.push('-'.repeat(width));

  // Totals
  lines.push(padColumns('Subtotal:', '', formatKES(sale.subtotal), width));
  if (Number(sale.discountAmount) > 0) {
    lines.push(padColumns('Discount:', '', `-${formatKES(sale.discountAmount)}`, width));
  }
  lines.push(padColumns('VAT (16%):', '', formatKES(sale.taxAmount), width));
  lines.push(COMMANDS.BOLD_ON);
  lines.push(COMMANDS.DOUBLE_HEIGHT);
  lines.push(padColumns('TOTAL:', '', formatKES(sale.total), width));
  lines.push(COMMANDS.NORMAL_SIZE);
  lines.push(COMMANDS.BOLD_OFF);

  lines.push('-'.repeat(width));

  // Payments
  lines.push('Payment:');
  for (const payment of sale.payments) {
    let paymentLine = `  ${payment.method.toUpperCase()}: ${formatKES(payment.amount)}`;
    if (payment.mpesaCode) paymentLine += ` (${payment.mpesaCode})`;
    lines.push(paymentLine);
  }

  // Change calculation for cash
  const cashPayment = sale.payments.find((p) => p.method === 'cash');
  if (cashPayment && Number(cashPayment.amount) > Number(sale.total)) {
    const change = Number(cashPayment.amount) - Number(sale.total);
    lines.push(`  Change: ${formatKES(change)}`);
  }

  lines.push('-'.repeat(width));

  // eTIMS info
  if (sale.etimsInvoiceNumber) {
    lines.push(`eTIMS Invoice: ${sale.etimsInvoiceNumber}`);
  }

  lines.push(COMMANDS.ALIGN_CENTER);
  lines.push('');
  lines.push('Thank you for your purchase!');
  lines.push('');

  // QR code placeholder (actual QR printing depends on printer model)
  if (sale.etimsQrCode) {
    lines.push(`[QR: ${sale.etimsQrCode}]`);
  }

  lines.push('');
  lines.push(COMMANDS.FEED);
  lines.push(COMMANDS.FEED);
  lines.push(COMMANDS.FEED);
  lines.push(COMMANDS.PARTIAL_CUT);

  return lines.join('\n');
}

export function generateCashDrawerCommand() {
  return COMMANDS.OPEN_CASH_DRAWER;
}

function padColumns(left, middle, right, width) {
  const rightLen = right.length;
  const middleLen = middle.length;
  const leftLen = left.length;
  const padding = width - leftLen - middleLen - rightLen;
  const spaces = padding > 0 ? ' '.repeat(padding) : ' ';
  return `${left}${spaces}${middle}${right}`;
}
