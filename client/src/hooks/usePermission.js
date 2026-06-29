import { useAuthStore } from '../store/authStore';

const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'sales.create', 'sales.view', 'sales.refund', 'sales.void',
    'products.create', 'products.edit', 'products.delete', 'products.view',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'customers.create', 'customers.edit', 'customers.view',
    'suppliers.create', 'suppliers.edit', 'suppliers.view',
    'reports.view', 'reports.export',
    'users.create', 'users.edit', 'users.view',
    'shifts.manage', 'eod.close',
    'discounts.apply', 'discounts.override',
    'settings.view',
  ],
  supervisor: [
    'sales.create', 'sales.view', 'sales.refund',
    'products.view',
    'inventory.view', 'inventory.adjust',
    'customers.create', 'customers.edit', 'customers.view',
    'reports.view',
    'shifts.manage',
    'discounts.apply',
  ],
  cashier: [
    'sales.create', 'sales.view',
    'products.view',
    'customers.view',
    'shifts.own',
  ],
};

export function usePermission() {
  const user = useAuthStore((state) => state.user);

  const hasPermission = (permission) => {
    if (!user) return false;
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    if (rolePerms.includes('*')) return true;
    return rolePerms.includes(permission);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return { hasPermission, hasRole };
}
