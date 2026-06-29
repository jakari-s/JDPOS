import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderTree } from 'lucide-react';
import { categoriesApi } from '../../api';
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
  name: z.string().min(1), description: z.string().optional(), parentId: z.string().optional(),
});

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const { data } = await categoriesApi.list(); setCategories(data || []); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    try {
      if (editItem) { await categoriesApi.update(editItem.id, data); toast.success('Updated'); }
      else { await categoriesApi.create(data); toast.success('Created'); }
      setShowForm(false); setEditItem(null); reset(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const columns = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FolderTree className="h-4 w-4 text-gray-400" />
        <span>{row.original.name}</span>
      </div>
    )},
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: '_count', header: 'Products', cell: ({ getValue }) => getValue()?.products || 0 },
    { accessorKey: 'children', header: 'Subcategories', cell: ({ getValue }) => getValue()?.length || 0 },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditItem(row.original); reset(row.original); setShowForm(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
        <button onClick={async () => { await categoriesApi.delete(row.original.id); load(); toast.success('Deleted'); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => { setEditItem(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
      </div>
      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={categories} columns={columns} />}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Description" {...register('description')} />
          <Select label="Parent Category" options={categories.filter(c => c.id !== editItem?.id).map(c => ({ value: c.id, label: c.name }))} placeholder="None (top-level)" {...register('parentId')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">{editItem ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
