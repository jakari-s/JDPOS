import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { formatKES, formatDate, formatDateTime } from '../../utils/index.js';

export async function generatePdfReport(type, data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).text('Kenya POS', { align: 'center' });
    doc.fontSize(12).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${formatDateTime(new Date())}`, { align: 'center' });
    doc.moveDown(2);

    switch (type) {
      case 'sales':
        renderSalesPdf(doc, data);
        break;
      case 'inventory':
        renderInventoryPdf(doc, data);
        break;
      case 'cashier':
        renderCashierPdf(doc, data);
        break;
      case 'profit':
        renderProfitPdf(doc, data);
        break;
    }

    doc.end();
  });
}

function renderSalesPdf(doc, data) {
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10);
  doc.text(`Total Sales: ${formatKES(data.summary.totalSales)}`);
  doc.text(`Total Tax: ${formatKES(data.summary.totalTax)}`);
  doc.text(`Total Discounts: ${formatKES(data.summary.totalDiscount)}`);
  doc.text(`Number of Sales: ${data.summary.salesCount}`);
  doc.text(`Average Transaction: ${formatKES(data.summary.averageTransaction)}`);
  doc.moveDown();

  doc.fontSize(14).text('Top Products', { underline: true });
  doc.fontSize(9);
  const topProducts = data.salesByProduct.slice(0, 20);
  for (const p of topProducts) {
    doc.text(`${p.name} (${p.sku}) - Qty: ${p.quantity}, Revenue: ${formatKES(p.revenue)}, Margin: ${p.margin}%`);
  }
  doc.moveDown();

  doc.fontSize(14).text('Sales by Payment Method', { underline: true });
  doc.fontSize(10);
  for (const pm of data.salesByPaymentMethod) {
    doc.text(`${pm.method}: ${formatKES(pm.total)} (${pm.count} transactions)`);
  }
}

function renderInventoryPdf(doc, data) {
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10);
  doc.text(`Total Products: ${data.summary.totalProducts}`);
  doc.text(`Total Stock Value (Cost): ${formatKES(data.summary.totalStockValue)}`);
  doc.text(`Total Stock Value (Retail): ${formatKES(data.summary.totalRetailValue)}`);
  doc.text(`Low Stock Items: ${data.summary.lowStockCount}`);
  doc.text(`Out of Stock Items: ${data.summary.outOfStockCount}`);
  doc.moveDown();

  if (data.lowStockItems.length > 0) {
    doc.fontSize(14).text('Low Stock Alerts', { underline: true });
    doc.fontSize(9);
    for (const item of data.lowStockItems) {
      doc.text(`${item.product.name} (${item.product.sku}) - Qty: ${item.quantity}, Min: ${item.product.minStockLevel}`);
    }
  }
}

function renderCashierPdf(doc, data) {
  doc.fontSize(14).text('Cashier Performance', { underline: true });
  doc.fontSize(10);
  for (const c of data) {
    doc.text(`${c.name}: ${c.salesCount} sales, Total: ${formatKES(c.totalSales)}, Avg: ${formatKES(c.averageTransaction)}`);
    doc.text(`  Cash: ${formatKES(c.cashTotal)}, M-Pesa: ${formatKES(c.mpesaTotal)}, Credit: ${formatKES(c.creditTotal)}`);
    doc.moveDown(0.5);
  }
}

function renderProfitPdf(doc, data) {
  doc.fontSize(14).text('Profit & Loss Summary', { underline: true });
  doc.fontSize(10);
  doc.text(`Total Revenue: ${formatKES(data.summary.totalRevenue)}`);
  doc.text(`Cost of Goods Sold: ${formatKES(data.summary.totalCost)}`);
  doc.text(`Gross Profit: ${formatKES(data.summary.grossProfit)}`);
  doc.text(`Gross Margin: ${data.summary.grossMargin}%`);
  doc.text(`Total Refunds: ${formatKES(data.summary.totalRefunds)}`);
  doc.text(`Net Profit: ${formatKES(data.summary.netProfit)}`);
  doc.moveDown();

  doc.fontSize(14).text('Profit by Product', { underline: true });
  doc.fontSize(9);
  for (const p of data.byProduct.slice(0, 30)) {
    doc.text(`${p.name}: Revenue ${formatKES(p.revenue)}, Profit ${formatKES(p.profit)}, Margin ${p.margin}%`);
  }
}

export async function generateExcelReport(type, data) {
  const workbook = new ExcelJS.Workbook();

  switch (type) {
    case 'sales': {
      const ws = workbook.addWorksheet('Sales Summary');
      ws.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 20 },
      ];
      ws.addRow({ metric: 'Total Sales', value: data.summary.totalSales });
      ws.addRow({ metric: 'Total Tax', value: data.summary.totalTax });
      ws.addRow({ metric: 'Sales Count', value: data.summary.salesCount });
      ws.addRow({ metric: 'Average Transaction', value: data.summary.averageTransaction });

      const prodWs = workbook.addWorksheet('Sales by Product');
      prodWs.columns = [
        { header: 'Product', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Gross Profit', key: 'grossProfit', width: 15 },
        { header: 'Margin %', key: 'margin', width: 10 },
      ];
      data.salesByProduct.forEach((p) => prodWs.addRow(p));

      const pmWs = workbook.addWorksheet('By Payment Method');
      pmWs.columns = [
        { header: 'Method', key: 'method', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Count', key: 'count', width: 10 },
      ];
      data.salesByPaymentMethod.forEach((p) => pmWs.addRow(p));
      break;
    }

    case 'inventory': {
      const ws = workbook.addWorksheet('Stock Levels');
      ws.columns = [
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Cost Value', key: 'costValue', width: 15 },
        { header: 'Retail Value', key: 'retailValue', width: 15 },
      ];
      data.stockLevels.forEach((sl) => ws.addRow({
        product: sl.product.name,
        sku: sl.product.sku,
        branch: sl.branch.name,
        quantity: sl.quantity,
        costValue: sl.quantity * Number(sl.product.costPrice),
        retailValue: sl.quantity * Number(sl.product.retailPrice),
      }));
      break;
    }

    case 'cashier': {
      const ws = workbook.addWorksheet('Cashier Performance');
      ws.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Sales Count', key: 'salesCount', width: 12 },
        { header: 'Total Sales', key: 'totalSales', width: 15 },
        { header: 'Cash', key: 'cashTotal', width: 15 },
        { header: 'M-Pesa', key: 'mpesaTotal', width: 15 },
        { header: 'Credit', key: 'creditTotal', width: 15 },
        { header: 'Avg Transaction', key: 'averageTransaction', width: 15 },
      ];
      data.forEach((c) => ws.addRow(c));
      break;
    }

    case 'profit': {
      const ws = workbook.addWorksheet('Profit Summary');
      ws.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 20 },
      ];
      ws.addRow({ metric: 'Total Revenue', value: data.summary.totalRevenue });
      ws.addRow({ metric: 'COGS', value: data.summary.totalCost });
      ws.addRow({ metric: 'Gross Profit', value: data.summary.grossProfit });
      ws.addRow({ metric: 'Gross Margin %', value: data.summary.grossMargin });
      ws.addRow({ metric: 'Net Profit', value: data.summary.netProfit });

      const prodWs = workbook.addWorksheet('Profit by Product');
      prodWs.columns = [
        { header: 'Product', key: 'name', width: 30 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Cost', key: 'cost', width: 15 },
        { header: 'Profit', key: 'profit', width: 15 },
        { header: 'Margin %', key: 'margin', width: 10 },
      ];
      data.byProduct.forEach((p) => prodWs.addRow(p));
      break;
    }
  }

  return workbook.xlsx.writeBuffer();
}
