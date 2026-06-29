import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsApi } from '../../api';
import { formatKES, formatDate } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const [tab, setTab] = useState('sales');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [salesReport, setSalesReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [cashierReport, setCashierReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [kraReport, setKraReport] = useState(null);
  const [arReport, setArReport] = useState(null);
  const [apReport, setApReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'sales': { const { data } = await reportsApi.sales(dateRange); setSalesReport(data); break; }
        case 'inventory': { const { data } = await reportsApi.inventory({}); setInventoryReport(data); break; }
        case 'cashier': { const { data } = await reportsApi.cashier(dateRange); setCashierReport(data); break; }
        case 'profit': { const { data } = await reportsApi.profit(dateRange); setProfitReport(data); break; }
        case 'kra': { const { data } = await reportsApi.kra(dateRange); setKraReport(data); break; }
        case 'receivable': { const { data } = await reportsApi.accountsReceivable(); setArReport(data); break; }
        case 'payable': { const { data } = await reportsApi.accountsPayable(); setApReport(data); break; }
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [tab]);

  const exportReport = async (format) => {
    try {
      const type = ['receivable', 'payable', 'kra'].includes(tab) ? 'sales' : tab;
      const { data } = await reportsApi.export(type, { ...dateRange, format });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}-report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      a.click();
    } catch { toast.error('Failed to export'); }
  };

  const tabs = [
    { key: 'sales', label: 'Sales' }, { key: 'inventory', label: 'Inventory' },
    { key: 'cashier', label: 'Cashier' }, { key: 'profit', label: 'P&L' },
    { key: 'kra', label: 'KRA' }, { key: 'receivable', label: 'Receivable' },
    { key: 'payable', label: 'Payable' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('pdf')}><FileText className="h-4 w-4 mr-2" /> PDF</Button>
          <Button variant="outline" onClick={() => exportReport('xlsx')}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input type="date" label="From" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
        <Input type="date" label="To" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
        <div className="flex items-end"><Button onClick={loadReport}>Generate</Button></div>
      </div>

      {loading ? (
        <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div>
          {tab === 'sales' && salesReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sales', value: formatKES(salesReport.summary.totalSales) },
                  { label: 'Transactions', value: salesReport.summary.salesCount },
                  { label: 'Avg Transaction', value: formatKES(salesReport.summary.averageTransaction) },
                  { label: 'Total Tax', value: formatKES(salesReport.summary.totalTax) },
                ].map((s) => (
                  <Card key={s.label}><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold">{s.value}</p></Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Products">
                  <div className="space-y-2">
                    {salesReport.salesByProduct.slice(0, 10).map((p) => (
                      <div key={p.productId} className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="font-medium">{formatKES(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="By Payment Method">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={salesReport.salesByPaymentMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={70} label={({ method }) => method}>
                          {salesReport.salesByPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatKES(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {tab === 'inventory' && inventoryReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Products', value: inventoryReport.summary.totalProducts },
                  { label: 'Stock Value (Cost)', value: formatKES(inventoryReport.summary.totalStockValue) },
                  { label: 'Low Stock', value: inventoryReport.summary.lowStockCount },
                  { label: 'Out of Stock', value: inventoryReport.summary.outOfStockCount },
                ].map((s) => (
                  <Card key={s.label}><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold">{s.value}</p></Card>
                ))}
              </div>
              {inventoryReport.lowStockItems.length > 0 && (
                <Card title="Low Stock Items">
                  <div className="space-y-2">
                    {inventoryReport.lowStockItems.map((item) => (
                      <div key={item.product?.id || item.id} className="flex justify-between text-sm">
                        <span>{item.product?.name} ({item.product?.sku})</span>
                        <span className="text-red-500 font-medium">Qty: {item.quantity} / Min: {item.product?.minStockLevel}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'cashier' && cashierReport && (
            <Card title="Cashier Performance">
              <div className="space-y-3">
                {cashierReport.map((c) => (
                  <div key={c.userId} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-gray-500">{c.salesCount} sales | Avg: {formatKES(c.averageTransaction)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatKES(c.totalSales)}</p>
                      <p className="text-xs text-gray-500">Cash: {formatKES(c.cashTotal)} | M-Pesa: {formatKES(c.mpesaTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'profit' && profitReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Revenue', value: formatKES(profitReport.summary.totalRevenue) },
                  { label: 'COGS', value: formatKES(profitReport.summary.totalCost) },
                  { label: 'Gross Profit', value: formatKES(profitReport.summary.grossProfit) },
                  { label: 'Margin', value: `${profitReport.summary.grossMargin}%` },
                  { label: 'Refunds', value: formatKES(profitReport.summary.totalRefunds) },
                  { label: 'Net Profit', value: formatKES(profitReport.summary.netProfit) },
                ].map((s) => (
                  <Card key={s.label}><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold">{s.value}</p></Card>
                ))}
              </div>
            </div>
          )}

          {tab === 'kra' && kraReport && (
            <Card title="eTIMS Submissions">
              <div className="space-y-2">
                {kraReport.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-sm p-2 border-b dark:border-gray-700">
                    <div>
                      <span className="font-medium">{s.sale?.receiptNumber}</span>
                      <span className="text-gray-500 ml-2">{formatKES(s.sale?.total)}</span>
                    </div>
                    <Badge variant={s.status === 'confirmed' ? 'success' : s.status === 'failed' ? 'danger' : 'warning'}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'receivable' && arReport && (
            <Card title="Accounts Receivable">
              <div className="space-y-2">
                {arReport.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm p-2 border-b dark:border-gray-700">
                    <div><span className="font-medium">{c.name}</span> <span className="text-gray-500">({c.accountNumber})</span></div>
                    <span className="text-red-500 font-medium">{formatKES(c.creditBalance)} / {formatKES(c.creditLimit)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'payable' && apReport && (
            <Card title="Accounts Payable">
              <div className="space-y-2">
                {apReport.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm p-2 border-b dark:border-gray-700">
                    <div><span className="font-medium">{s.name}</span> <span className="text-gray-500">({s.paymentTerms})</span></div>
                    <span className="text-red-500 font-medium">{formatKES(s.balance)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
