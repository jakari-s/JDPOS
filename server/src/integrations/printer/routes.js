import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { generateReceiptData, generateCashDrawerCommand } from './escpos.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { formatKES, formatDate, formatTime } from '../../utils/index.js';

const router = Router();
router.use(authenticate);

// Generate ESC/POS receipt data
router.get('/receipt/:saleId/escpos', async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.saleId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
        user: { select: { name: true } },
        branch: { include: { company: true } },
      },
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const width = parseInt(req.query.width) || 80;
    const data = generateReceiptData(sale, sale.branch.company, { width });

    res.setHeader('Content-Type', 'text/plain');
    res.send(data);
  } catch (err) { next(err); }
});

// Generate PDF receipt
router.get('/receipt/:saleId/pdf', async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.saleId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
        user: { select: { name: true } },
        branch: { include: { company: true } },
      },
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const company = sale.branch.company;
    const doc = new PDFDocument({ size: [226, 600], margin: 10 }); // 80mm width
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=receipt-${sale.receiptNumber}.pdf`);
      res.send(buffer);
    });

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text(company.name, { align: 'center' });
    doc.fontSize(8).font('Helvetica');
    if (company.address) doc.text(company.address, { align: 'center' });
    if (company.phone) doc.text(`Tel: ${company.phone}`, { align: 'center' });
    if (company.pin) doc.text(`PIN: ${company.pin}`, { align: 'center' });
    doc.moveDown(0.5);

    doc.text('─'.repeat(30), { align: 'center' });
    doc.text(`Receipt: ${sale.receiptNumber}`);
    doc.text(`Date: ${formatDate(sale.createdAt)} ${formatTime(sale.createdAt)}`);
    doc.text(`Cashier: ${sale.user?.name || 'N/A'}`);
    if (sale.customer) doc.text(`Customer: ${sale.customer.name}`);
    doc.text('─'.repeat(30), { align: 'center' });

    // Items
    for (const item of sale.items) {
      doc.text(item.product.name);
      doc.text(`  ${item.quantity} x ${Number(item.unitPrice).toFixed(2)}    ${formatKES(item.lineTotal)}`, { align: 'right' });
    }

    doc.text('─'.repeat(30), { align: 'center' });
    doc.text(`Subtotal: ${formatKES(sale.subtotal)}`, { align: 'right' });
    if (Number(sale.discountAmount) > 0) {
      doc.text(`Discount: -${formatKES(sale.discountAmount)}`, { align: 'right' });
    }
    doc.text(`VAT: ${formatKES(sale.taxAmount)}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`TOTAL: ${formatKES(sale.total)}`, { align: 'right' });
    doc.font('Helvetica').fontSize(8);

    doc.text('─'.repeat(30), { align: 'center' });

    // Payments
    for (const payment of sale.payments) {
      let line = `${payment.method.toUpperCase()}: ${formatKES(payment.amount)}`;
      if (payment.mpesaCode) line += ` (${payment.mpesaCode})`;
      doc.text(line);
    }

    doc.moveDown();

    // QR Code
    if (sale.etimsInvoiceNumber || sale.receiptNumber) {
      try {
        const qrData = sale.etimsQrCode || `https://pos.example.com/receipt/${sale.receiptNumber}`;
        const qrImage = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
        doc.image(qrImage, { width: 80, align: 'center' });
      } catch {
        // QR generation failed, skip
      }
    }

    doc.moveDown();
    doc.text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  } catch (err) { next(err); }
});

// Open cash drawer
router.post('/cash-drawer', async (req, res) => {
  const command = generateCashDrawerCommand();
  res.json({ command: Buffer.from(command).toString('base64') });
});

export default router;
