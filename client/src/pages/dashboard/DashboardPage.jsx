import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Users, Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Card from '../../components/ui/Card';
import { reportsApi, inventoryApi } from '../../api';
import { formatKES, formatDate } from '../../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [salesRes, invRes] = await Promise.all([
        reportsApi.sales({ startDate: startOfMonth, endDate: today.toISOString() }),
        reportsApi.inventory({}),
      ]);

      setSalesData(salesRes.data);
      setInventoryData(invRes.data);
    } catch {
      // dashboard data is optional
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Sales (MTD)',
      value: formatKES(salesData?.summary?.totalSales || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      label: 'Transactions',
      value: salesData?.summary?.salesCount || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      label: 'Avg Transaction',
      value: formatKES(salesData?.summary?.averageTransaction || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      label: 'Low Stock Items',
      value: inventoryData?.summary?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Heatmap */}
        <Card title="Sales by Hour (Today)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData?.hourlyHeatmap || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatKES(value)}
                  labelFormatter={(h) => `${h}:00 - ${h + 1}:00`}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Payment Method */}
        <Card title="Sales by Payment Method">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesData?.salesByPaymentMethod || []}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ method, total }) => `${method}: ${formatKES(total)}`}
                >
                  {(salesData?.salesByPaymentMethod || []).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatKES(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Products */}
        <Card title="Top Products">
          <div className="space-y-3">
            {(salesData?.salesByProduct || []).slice(0, 8).map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-6">{index + 1}.</span>
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">Qty: {product.quantity}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">{formatKES(product.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Cashiers */}
        <Card title="Cashier Performance">
          <div className="space-y-3">
            {(salesData?.salesByCashier || []).slice(0, 8).map((cashier) => (
              <div key={cashier.userId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{cashier.name}</p>
                  <p className="text-xs text-gray-500">{cashier.count} sales</p>
                </div>
                <span className="text-sm font-medium">{formatKES(cashier.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
