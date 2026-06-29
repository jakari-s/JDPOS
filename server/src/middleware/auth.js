import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'super_admin') {
      return next();
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { permissions: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const rolePermissions = getRolePermissions(user.role);
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
    if (!allPermissions.includes(permission)) {
      return res.status(403).json({ error: `Permission '${permission}' required` });
    }
    next();
  };
}

function getRolePermissions(role) {
  const permissionMap = {
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
  return permissionMap[role] || [];
}
