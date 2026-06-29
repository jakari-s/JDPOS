import { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowRightLeft, Clock } from 'lucide-react';
import { inventoryApi } from '../../api';
import { formatKES } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [stock, setStock] = useState([]);
  const [tab, setTab] = useState('levels'); // levels, movements, expiring
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustData, setAdjustData] = useState({ productId: '', branchId: '', type: 'adjustment_in', quantity: '', unitCost: '', reason: '' });
  const [movements, setMovements] = useState([]);
  const [expiring, setExpiring] = useState([]);

  useEffect(() => { loadStock(); }, []);

  const loadStock = async () => {
    setLoading(true);
    try {
      const { data } = await inventoryApi.getStock({ limit: '200' });
      setStock(data.data || []);
    } catch { toast.error('Failed to load stock'); }
    finally { setLoading(false); }
  };

  const loadMovements = async () => {
    try {
      const { data } = await inventoryApi.getMovements({ limit: '100' });
      setMovements(data.data || []);
    } catch { toast.error('Failed to load movements'); }
  };

  const loadExpiring = async () => {
    try {
      const { data } = await inventoryApi.getExpiring({ days: 30 });
      setExpiring(data || []);
    } catch { toast.error('Failed to load expiring items'); }
  };

  useEffect(() => {
    if (tab === 'movements') loadMovements();
    if (tab === 'expiring') loadExpiring();
  }, [tab]);

  const handleAdjust = async () => {
    try {
      await inventoryApi.adjust({
        ...adjustData,
        quantity: parseInt(adjustData.quantity),
        unitCost: adjustData.unitCost ? parseFloat(adjustData.unitCost) : undefined,
      });
      toast.success('Stock adjusted');
      setShowAdjust(false);
      loadStock();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to adjust stock'); }
  };

  const stockColumns = [
    { accessorKey: 'product', header: 'Product', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'product', id: 'sku', header: 'SKU', cell: ({ getValue }) => getValue()?.sku },
    { accessorKey: 'branch', header: 'Branch', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => {
      const qty = row.original.quantity;
      const min = row.original.product?.minStockLevel || 0;
      return <span className={qty <= min ? 'text-red-500 font-medium' : ''}>{qty}</span>;
    }},
    { id: 'value', header: 'Value', cell: ({ row }) => formatKES(row.original.quantity * Number(row.original.product?.costPrice || 0)) },
  ];

  const movementColumns = [
    { accessorKey: 'product', header: 'Product', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'branch', header: 'Branch', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <Badge>{getValue()}</Badge> },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ getValue }) => <span className={getValue() < 0 ? 'text-red-500' : 'text-green-500'}>{getValue()}</span> },
    { accessorKey: 'user', header: 'User', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'notes', header: 'Notes' },
  ];

  const tabs = [
    { key: 'levels', label: 'Stock Levels', icon: Package },
    { key: 'movements', label: 'Movements', icon: ArrowRightLeft },
    { key: 'expiring', label: 'Expiring', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Button onClick={() => setShowAdjust(true)}>Adjust Stock</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'levels' && <DataTable data={stock} columns={stockColumns} />}
      {tab === 'movements' && <DataTable data={movements} columns={movementColumns} />}
      {tab === 'expiring' && (
        <div className="space-y-3">
          {expiring.length === 0 ? <p className="text-gray-500 text-sm">No items expiring in the next 30 days</p> : expiring.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.product?.name}</p>
                  <p className="text-sm text-gray-500">{item.branch?.name} | Qty: {item.quantity}</p>
                </div>
                <Badge variant="warning">Expires: {new Date(item.expiryDate).toLocaleDateString()}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Adjust Stock Modal */}
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Adjust Stock">
        <div className="space-y-4">
          <Input label="Product ID" value={adjustData.productId} onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })} placeholder="Product UUID" />
          <Input label="Branch ID" value={adjustData.branchId} onChange={(e) => setAdjustData({ ...adjustData, branchId: e.target.value })} placeholder="Branch UUID" />
          <Select label="Type" value={adjustData.type} onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })} options={[{ value: 'adjustment_in', label: 'Stock In' }, { value: 'adjustment_out', label: 'Stock Out' }, { value: 'write_off', label: 'Write Off' }]} />
          <Input label="Quantity" type="number" value={adjustData.quantity} onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })} />
          <Input label="Unit Cost" type="number" step="0.01" value={adjustData.unitCost} onChange={(e) => setAdjustData({ ...adjustData, unitCost: e.target.value })} />
          <Input label="Reason" value={adjustData.reason} onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button onClick={handleAdjust}>Adjust</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
