import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { branchesApi } from '../../api';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1), address: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')),
});

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const { data } = await branchesApi.list(); setBranches(data || []); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    try {
      if (editItem) { await branchesApi.update(editItem.id, data); toast.success('Updated'); }
      else { await branchesApi.create(data); toast.success('Created'); }
      setShowForm(false); setEditItem(null); reset(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'address', header: 'Address' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => <Badge variant={getValue() ? 'success' : 'danger'}>{getValue() ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditItem(row.original); reset(row.original); setShowForm(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branches</h1>
        <Button onClick={() => { setEditItem(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Branch</Button>
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={branches} columns={columns} />}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Branch' : 'New Branch'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Address" {...register('address')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">{editItem ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
