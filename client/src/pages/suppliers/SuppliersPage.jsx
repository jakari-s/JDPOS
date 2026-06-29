import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { suppliersApi } from '../../api';
import { formatKES } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1), contactPerson: z.string().optional(), phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')), address: z.string().optional(),
  pin: z.string().optional(), paymentTerms: z.enum(['COD', 'Net7', 'Net14', 'Net30', 'Net60']).default('COD'),
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => { load(); }, []);
  const load = async (q = '') => {
    setLoading(true);
    try { const { data } = await suppliersApi.list({ search: q, limit: '100' }); setSuppliers(data.data || []); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    try {
      if (editItem) { await suppliersApi.update(editItem.id, data); toast.success('Updated'); }
      else { await suppliersApi.create(data); toast.success('Created'); }
      setShowForm(false); setEditItem(null); reset(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'contactPerson', header: 'Contact' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'paymentTerms', header: 'Terms', cell: ({ getValue }) => <Badge>{getValue()}</Badge> },
    { accessorKey: 'balance', header: 'Balance', cell: ({ getValue }) => Number(getValue()) > 0 ? <span className="text-red-500">{formatKES(getValue())}</span> : '-' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditItem(row.original); reset(row.original); setShowForm(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
        <button onClick={async () => { await suppliersApi.delete(row.original.id); load(); toast.success('Deleted'); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button onClick={() => { setEditItem(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="input pl-10" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={suppliers} columns={columns} />}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Supplier' : 'New Supplier'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Contact Person" {...register('contactPerson')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Address" {...register('address')} />
          <Input label="KRA PIN" {...register('pin')} />
          <Select label="Payment Terms" options={['COD', 'Net7', 'Net14', 'Net30', 'Net60'].map(v => ({ value: v, label: v }))} {...register('paymentTerms')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">{editItem ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
