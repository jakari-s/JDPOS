import { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, Edit2, Trash2 } from 'lucide-react';
import { productsApi, categoriesApi } from '../../api';
import { formatKES } from '../../lib/utils';
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

const productSchema = z.object({
  name: z.string().min(1, 'Name required'),
  sku: z.string().min(1, 'SKU required'),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  retailPrice: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0).optional(),
  vipPrice: z.coerce.number().min(0).optional(),
  unitOfMeasure: z.string().default('pcs'),
  taxClass: z.enum(['standard', 'zero_rated', 'exempt']).default('standard'),
  isService: z.boolean().default(false),
  minStockLevel: z.coerce.number().int().min(0).default(0),
  reorderQty: z.coerce.number().int().min(0).default(0),
  description: z.string().optional(),
});

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => { loadProducts(); loadCategories(); }, []);

  const loadProducts = async (searchQuery = '') => {
    setLoading(true);
    try {
      const { data } = await productsApi.list({ search: searchQuery, limit: '100' });
      setProducts(data.data || []);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const { data } = await categoriesApi.list();
      setCategories(data || []);
    } catch { /* optional */ }
  };

  const onSubmit = async (data) => {
    try {
      if (editProduct) {
        await productsApi.update(editProduct.id, data);
        toast.success('Product updated');
      } else {
        await productsApi.create(data);
        toast.success('Product created');
      }
      setShowForm(false);
      setEditProduct(null);
      reset();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    try {
      await productsApi.delete(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      loadProducts();
    } catch { toast.error('Failed to delete product'); }
  };

  const handleExport = async () => {
    try {
      const { data } = await productsApi.export();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      a.click();
    } catch { toast.error('Failed to export'); }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    reset(product);
    setShowForm(true);
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => getValue()?.name || '-' },
    { accessorKey: 'costPrice', header: 'Cost', cell: ({ getValue }) => formatKES(getValue()) },
    { accessorKey: 'retailPrice', header: 'Retail', cell: ({ getValue }) => formatKES(getValue()) },
    { accessorKey: 'taxClass', header: 'Tax', cell: ({ getValue }) => <Badge variant={getValue() === 'standard' ? 'primary' : 'default'}>{getValue()}</Badge> },
    { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => <Badge variant={getValue() ? 'success' : 'danger'}>{getValue() ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(row.original)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => { setEditProduct(null); reset({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-10" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); loadProducts(e.target.value); }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <DataTable data={products} columns={columns} />
      )}

      {/* Product Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditProduct(null); }} title={editProduct ? 'Edit Product' : 'New Product'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" error={errors.name?.message} {...register('name')} />
            <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
            <Input label="Barcode" {...register('barcode')} />
            <Select label="Category" options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select category" {...register('categoryId')} />
            <Input label="Cost Price" type="number" step="0.01" error={errors.costPrice?.message} {...register('costPrice')} />
            <Input label="Retail Price" type="number" step="0.01" error={errors.retailPrice?.message} {...register('retailPrice')} />
            <Input label="Wholesale Price" type="number" step="0.01" {...register('wholesalePrice')} />
            <Input label="VIP Price" type="number" step="0.01" {...register('vipPrice')} />
            <Select label="Unit of Measure" options={[{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kilograms' }, { value: 'ltr', label: 'Litres' }, { value: 'box', label: 'Box' }]} {...register('unitOfMeasure')} />
            <Select label="Tax Class" options={[{ value: 'standard', label: 'Standard (16%)' }, { value: 'zero_rated', label: 'Zero Rated' }, { value: 'exempt', label: 'Exempt' }]} {...register('taxClass')} />
            <Input label="Min Stock Level" type="number" {...register('minStockLevel')} />
            <Input label="Reorder Qty" type="number" {...register('reorderQty')} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isService" {...register('isService')} className="rounded" />
            <label htmlFor="isService" className="text-sm">Service item (no stock deduction)</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditProduct(null); }}>Cancel</Button>
            <Button type="submit">{editProduct ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${deleteTarget?.name}"?`} />
    </div>
  );
}
