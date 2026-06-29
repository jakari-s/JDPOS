import { useState, useEffect } from 'react';
import { Eye, RefreshCw, Download } from 'lucide-react';
import { salesApi, printerApi } from '../../api';
import { formatKES, formatDateTime } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const { data } = await salesApi.list({ ...filters, limit: '100' });
      setSales(data.data || []);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  };

  const viewSale = async (id) => {
    try {
      const { data } = await salesApi.get(id);
      setSelectedSale(data);
    } catch { toast.error('Failed to load sale details'); }
  };

  const downloadReceipt = async (saleId) => {
    try {
      const { data } = await printerApi.getReceipt(saleId);
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch { toast.error('Failed to generate receipt'); }
  };

  const statusVariant = (status) => {
    const map = { completed: 'success', refunded: 'danger', partially_refunded: 'warning', voided: 'danger', parked: 'default' };
    return map[status] || 'default';
  };

  const columns = [
    { accessorKey: 'receiptNumber', header: 'Receipt #' },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDateTime(getValue()) },
    { accessorKey: 'user', header: 'Cashier', cell: ({ getValue }) => getValue()?.name || 'N/A' },
    { accessorKey: 'customer', header: 'Customer', cell: ({ getValue }) => getValue()?.name || 'Walk-in' },
    { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => formatKES(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge variant={statusVariant(getValue())}>{getValue()}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => viewSale(row.original.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => downloadReceipt(row.original.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <Download className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Button variant="outline" onClick={loadSales}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input type="date" label="From" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
        <Input type="date" label="To" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
        <div className="flex items-end">
          <Button onClick={loadSales}>Filter</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <DataTable data={sales} columns={columns} onRowClick={(sale) => viewSale(sale.id)} />
      )}

      {/* Sale Detail Modal */}
      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title={`Sale: ${selectedSale?.receiptNumber}`} size="lg">
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {formatDateTime(selectedSale.createdAt)}</div>
              <div><span className="text-gray-500">Cashier:</span> {selectedSale.user?.name}</div>
              <div><span className="text-gray-500">Customer:</span> {selectedSale.customer?.name || 'Walk-in'}</div>
              <div><span className="text-gray-500">Status:</span> <Badge variant={statusVariant(selectedSale.status)}>{selectedSale.status}</Badge></div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items?.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="py-2">{item.product?.name}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatKES(item.unitPrice)}</td>
                    <td className="text-right py-2">{formatKES(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right space-y-1 text-sm border-t dark:border-gray-700 pt-2">
              <div>Subtotal: {formatKES(selectedSale.subtotal)}</div>
              {Number(selectedSale.discountAmount) > 0 && <div className="text-green-600">Discount: -{formatKES(selectedSale.discountAmount)}</div>}
              <div>VAT: {formatKES(selectedSale.taxAmount)}</div>
              <div className="text-lg font-bold">Total: {formatKES(selectedSale.total)}</div>
            </div>

            <div className="text-sm">
              <p className="font-medium mb-1">Payments:</p>
              {selectedSale.payments?.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span className="uppercase">{p.method} {p.mpesaCode && `(${p.mpesaCode})`}</span>
                  <span>{formatKES(p.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => downloadReceipt(selectedSale.id)}>
                <Download className="h-4 w-4 mr-2" /> Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
