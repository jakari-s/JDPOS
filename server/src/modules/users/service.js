import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 12;

export async function createUser(data) {
  const { password, pin, ...rest } = data;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const pinHash = pin ? await bcrypt.hash(pin, BCRYPT_ROUNDS) : null;

  return prisma.user.create({
    data: {
      ...rest,
      passwordHash,
      pin: pinHash,
    },
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function updateUser(id, data) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);

  const updateData = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    delete updateData.password;
  }
  if (data.pin) {
    updateData.pin = await bcrypt.hash(data.pin, BCRYPT_ROUNDS);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function deleteUser(id) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export async function getUser(id) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, email: true, role: true, permissions: true,
      branchId: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function listUsers(query, companyId) {
  const { page = '1', limit = '20', search, role, branchId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    branch: { companyId },
    deletedAt: null,
    ...(role && { role }),
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        branchId: true, isActive: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}
