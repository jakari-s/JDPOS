import * as userService from './service.js';
import { createAuditLog } from '../../utils/audit.js';

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    await createAuditLog({
      userId: req.user.id, branchId: req.user.branchId,
      action: 'user_created', entity: 'user', entityId: user.id,
      newValue: { name: user.name, role: user.role }, ipAddress: req.ip,
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (err) { next(err); }
}

export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUser(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.query, req.user.companyId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getMe(req, res, next) {
  try {
    const user = await userService.getUser(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
}
