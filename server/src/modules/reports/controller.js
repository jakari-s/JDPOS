import * as reportService from './service.js';
import { generatePdfReport, generateExcelReport } from './exporters.js';

export async function getSalesReport(req, res, next) {
  try {
    const report = await reportService.getSalesReport(req.query, req.user);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getInventoryReport(req, res, next) {
  try {
    const report = await reportService.getInventoryReport(req.query, req.user);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getCashierReport(req, res, next) {
  try {
    const report = await reportService.getCashierReport(req.query, req.user);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getProfitReport(req, res, next) {
  try {
    const report = await reportService.getProfitReport(req.query, req.user);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getEodReport(req, res, next) {
  try {
    const report = await reportService.getEodReport(req.params.date, req.user.branchId);
    if (!report) return res.status(404).json({ error: 'EOD report not found for this date' });
    res.json(report);
  } catch (err) { next(err); }
}

export async function getKraReport(req, res, next) {
  try {
    const report = await reportService.getKraReport(req.query);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getAccountsReceivable(req, res, next) {
  try {
    const report = await reportService.getAccountsReceivable(req.user.companyId);
    res.json(report);
  } catch (err) { next(err); }
}

export async function getAccountsPayable(req, res, next) {
  try {
    const report = await reportService.getAccountsPayable(req.user.companyId);
    res.json(report);
  } catch (err) { next(err); }
}

export async function exportReport(req, res, next) {
  try {
    const { type } = req.params;
    const { format = 'pdf' } = req.query;

    let data;
    switch (type) {
      case 'sales': data = await reportService.getSalesReport(req.query, req.user); break;
      case 'inventory': data = await reportService.getInventoryReport(req.query, req.user); break;
      case 'cashier': data = await reportService.getCashierReport(req.query, req.user); break;
      case 'profit': data = await reportService.getProfitReport(req.query, req.user); break;
      default: return res.status(400).json({ error: 'Invalid report type' });
    }

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await generateExcelReport(type, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);
      return res.send(buffer);
    }

    const buffer = await generatePdfReport(type, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
    res.send(buffer);
  } catch (err) { next(err); }
}
