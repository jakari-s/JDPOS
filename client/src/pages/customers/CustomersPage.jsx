import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { customersApi } from '../../api';
import { formatKES, formatDate } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const customerSchema = z.object({
  name: z.string().min(1, 'Name required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  customerType: z.enum(['retail', 'wholesale', 'vip']).default('retail'),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(customerSchema) });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async (q = '') => {
    setLoading(true);
    try {
      const { data } = await customersApi.list({ search: q, limit: '100' });
      setCustomers(data.data || []);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    try {
      if (editCustomer) {
        await customersApi.update(editCustomer.id, data);
        toast.success('Customer updated');
      } else {
        await customersApi.create(data);
        toast.success('Customer created');
      }
      setShowForm(false); setEditCustomer(null); reset(); loadCustomers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
  };

  const viewCustomer = async (id) => {
    try {
      const { data } = await customersApi.get(id);
      setSelectedCustomer(data);
    } catch { toast.error('Failed to load customer'); }
  };

  const tierVariant = (tier) => ({ bronze: 'default', silver: 'default', gold: 'warning', platinum: 'primary' }[tier] || 'default');

  const columns = [
    { accessorKey: 'accountNumber', header: 'Account #' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'customerType', header: 'Type', cell: ({ getValue }) => <Badge>{getValue()}</Badge> },
    { accessorKey: 'loyaltyTier', header: 'Tier', cell: ({ getValue }) => <Badge variant={tierVariant(getValue())}>{getValue()}</Badge> },
    { accessorKey: 'loyaltyPoints', header: 'Points' },
    { accessorKey: 'creditBalance', header: 'Credit', cell: ({ getValue }) => Number(getValue()) > 0 ? <span className="text-red-500">{formatKES(getValue())}</span> : '-' },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => viewCustomer(row.original.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Eye className="h-4 w-4" /></button>
          <button onClick={() => { setEditCustomer(row.original); reset(row.original); setShowForm(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(row.original)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => { setEditCustomer(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="input pl-10" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); loadCustomers(e.target.value); }} />
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={customers} columns={columns} />}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditCustomer(null); }} title={editCustomer ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Address" {...register('address')} />
          <Select label="Type" options={[{ value: 'retail', label: 'Retail' }, { value: 'wholesale', label: 'Wholesale' }, { value: 'vip', label: 'VIP' }]} {...register('customerType')} />
          <Input label="Credit Limit (KES)" type="number" step="0.01" {...register('creditLimit')} />
          <Input label="Notes" {...register('notes')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">{editCustomer ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title={`Customer: ${selectedCustomer?.name}`} size="lg">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Account:</span> {selectedCustomer.accountNumber}</div>
              <div><span className="text-gray-500">Phone:</span> {selectedCustomer.phone || '-'}</div>
              <div><span className="text-gray-500">Type:</span> <Badge>{selectedCustomer.customerType}</Badge></div>
              <div><span className="text-gray-500">Tier:</span> <Badge variant={tierVariant(selectedCustomer.loyaltyTier)}>{selectedCustomer.loyaltyTier}</Badge></div>
              <div><span className="text-gray-500">Points:</span> {selectedCustomer.loyaltyPoints}</div>
              <div><span className="text-gray-500">Credit:</span> {formatKES(selectedCustomer.creditBalance)} / {formatKES(selectedCustomer.creditLimit)}</div>
            </div>
            {selectedCustomer.loyaltyTransactions?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Loyalty Activity</h4>
                {selectedCustomer.loyaltyTransactions.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex justify-between text-sm py-1 border-b dark:border-gray-700">
                    <span>{t.type} - {t.description || ''}</span>
                    <span className={t.points > 0 ? 'text-green-500' : 'text-red-500'}>{t.points > 0 ? '+' : ''}{t.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { await customersApi.delete(deleteTarget.id); setDeleteTarget(null); loadCustomers(); toast.success('Customer deleted'); }} title="Delete Customer" message={`Delete "${deleteTarget?.name}"?`} />
    </div>
  );
}
