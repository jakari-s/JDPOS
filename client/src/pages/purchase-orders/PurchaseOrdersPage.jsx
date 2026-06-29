import { useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle } from 'lucide-react';
import { purchaseOrdersApi, suppliersApi } from '../../api';
import { formatKES, formatDate } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const { data } = await purchaseOrdersApi.list({ limit: '100' }); setOrders(data.data || []); }
    catch { toast.error('Failed to load POs'); } finally { setLoading(false); }
  };

  const viewPO = async (id) => {
    try { const { data } = await purchaseOrdersApi.get(id); setSelectedPO(data); }
    catch { toast.error('Failed to load PO'); }
  };

  const statusVariant = (s) => ({ draft: 'default', sent: 'primary', partial: 'warning', received: 'success', cancelled: 'danger' }[s] || 'default');

  const columns = [
    { accessorKey: 'poNumber', header: 'PO #' },
    { accessorKey: 'supplier', header: 'Supplier', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'subtotal', header: 'Total', cell: ({ getValue }) => formatKES(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge variant={statusVariant(getValue())}>{getValue()}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button onClick={() => viewPO(row.original.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Eye className="h-4 w-4" /></button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={orders} columns={columns} />}
      <Modal isOpen={!!selectedPO} onClose={() => setSelectedPO(null)} title={`PO: ${selectedPO?.poNumber}`} size="lg">
        {selectedPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Supplier:</span> {selectedPO.supplier?.name}</div>
              <div><span className="text-gray-500">Status:</span> <Badge variant={statusVariant(selectedPO.status)}>{selectedPO.status}</Badge></div>
              <div><span className="text-gray-500">Date:</span> {formatDate(selectedPO.createdAt)}</div>
              <div><span className="text-gray-500">Total:</span> {formatKES(selectedPO.subtotal)}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Product</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Received</th><th className="text-right py-2">Cost</th></tr></thead>
              <tbody>
                {selectedPO.items?.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="py-2">{item.product?.name}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{item.receivedQuantity}</td>
                    <td className="text-right py-2">{formatKES(item.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
