import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck,
  FileText, BarChart3, Settings, Store, Tag, Clock, CreditCard,
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', permission: null },
  { label: 'POS', icon: ShoppingCart, path: '/pos', permission: 'sales.create' },
  { label: 'Sales', icon: CreditCard, path: '/sales', permission: 'sales.view' },
  { label: 'Products', icon: Package, path: '/products', permission: 'products.view' },
  { label: 'Inventory', icon: Boxes, path: '/inventory', permission: 'inventory.view' },
  { label: 'Customers', icon: Users, path: '/customers', permission: 'customers.view' },
  { label: 'Suppliers', icon: Truck, path: '/suppliers', permission: 'suppliers.view' },
  { label: 'Purchase Orders', icon: FileText, path: '/purchase-orders', permission: 'suppliers.view' },
  { label: 'Categories', icon: Tag, path: '/categories', permission: 'products.view' },
  { label: 'Shifts', icon: Clock, path: '/shifts', permission: 'shifts.own' },
  { label: 'Reports', icon: BarChart3, path: '/reports', permission: 'reports.view' },
  { label: 'Branches', icon: Store, path: '/branches', permission: 'settings.view' },
  { label: 'Users', icon: Users, path: '/users', permission: 'users.view' },
  { label: 'Settings', icon: Settings, path: '/settings', permission: 'settings.view' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const { hasPermission } = usePermission();

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-gray-900 text-white transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {!collapsed && <span className="text-lg font-bold">Kenya POS</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        {!collapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
