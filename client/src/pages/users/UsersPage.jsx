import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { usersApi, branchesApi } from '../../api';
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

const userSchema = z.object({
  name: z.string().min(1, 'Name required'), email: z.string().email('Valid email required'),
  phone: z.string().optional(), role: z.enum(['super_admin', 'admin', 'supervisor', 'cashier']),
  branchId: z.string().min(1, 'Branch required'),
  password: z.string().min(6, 'Min 6 chars').optional().or(z.literal('')),
  pin: z.string().length(4, 'PIN must be 4 digits').optional().or(z.literal('')),
});

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(userSchema) });

  useEffect(() => { load(); loadBranches(); }, []);
  const load = async () => {
    setLoading(true);
    try { const { data } = await usersApi.list({ limit: '100' }); setUsers(data.data || []); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  const loadBranches = async () => {
    try { const { data } = await branchesApi.list(); setBranches(data || []); } catch {}
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (!payload.pin) delete payload.pin;
      if (editItem) { await usersApi.update(editItem.id, payload); toast.success('Updated'); }
      else { await usersApi.create(payload); toast.success('Created'); }
      setShowForm(false); setEditItem(null); reset(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const roleVariant = (r) => ({ super_admin: 'danger', admin: 'primary', supervisor: 'warning', cashier: 'default' }[r] || 'default');

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <Badge variant={roleVariant(getValue())}>{getValue()}</Badge> },
    { accessorKey: 'branch', header: 'Branch', cell: ({ getValue }) => getValue()?.name || '-' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => <Badge variant={getValue() ? 'success' : 'danger'}>{getValue() ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditItem(row.original); reset(row.original); setShowForm(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
        <button onClick={() => setDeleteTarget(row.original)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => { setEditItem(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add User</Button>
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={users} columns={columns} />}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit User' : 'New User'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" {...register('phone')} />
          <Select label="Role" error={errors.role?.message} options={[{ value: 'super_admin', label: 'Super Admin' }, { value: 'admin', label: 'Admin' }, { value: 'supervisor', label: 'Supervisor' }, { value: 'cashier', label: 'Cashier' }]} {...register('role')} />
          <Select label="Branch" error={errors.branchId?.message} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Select branch" {...register('branchId')} />
          <Input label={editItem ? 'New Password (leave blank to keep)' : 'Password'} type="password" error={errors.password?.message} {...register('password')} />
          <Input label="4-Digit PIN" maxLength={4} error={errors.pin?.message} {...register('pin')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">{editItem ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { await usersApi.delete(deleteTarget.id); setDeleteTarget(null); load(); toast.success('Deleted'); }} title="Delete User" message={`Delete "${deleteTarget?.name}"?`} />
    </div>
  );
}
