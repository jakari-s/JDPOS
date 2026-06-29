import { prisma } from '../config/database.js';

export async function createAuditLog({
  userId,
  branchId,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      branchId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      ipAddress,
    },
  });
}
