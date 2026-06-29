import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import DashboardPage from './pages/dashboard/DashboardPage';
import POSPage from './pages/pos/POSPage';
import SalesPage from './pages/sales/SalesPage';
import ProductsPage from './pages/products/ProductsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import CustomersPage from './pages/customers/CustomersPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage';
import UsersPage from './pages/users/UsersPage';
import BranchesPage from './pages/branches/BranchesPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import ShiftsPage from './pages/shifts/ShiftsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
