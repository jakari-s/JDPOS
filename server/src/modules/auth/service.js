import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function loginWithEmail(email, password) {
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    include: { branch: { include: { company: true } } },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  return generateTokens(user);
}

export async function loginWithPin(pin, branchId) {
  const users = await prisma.user.findMany({
    where: { branchId, deletedAt: null, isActive: true },
    include: { branch: { include: { company: true } } },
  });

  let matchedUser = null;
  for (const user of users) {
    if (user.pin) {
      const valid = await bcrypt.compare(pin, user.pin);
      if (valid) {
        matchedUser = user;
        break;
      }
    }
  }

  if (!matchedUser) {
    throw new AppError('Invalid PIN', 401);
  }

  return generateTokens(matchedUser);
}

export async function refreshAccessToken(refreshToken) {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: { include: { branch: { include: { company: true } } } } },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = session.user;
  if (!user.isActive || user.deletedAt) {
    throw new AppError('User account is disabled', 401);
  }

  const accessToken = generateAccessToken(user);

  // Rotate refresh token
  const newRefreshToken = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
}

export async function logout(refreshToken) {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

async function generateTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      companyId: user.branch.companyId,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null,
    company: user.branch?.company ? { id: user.branch.company.id, name: user.branch.company.name } : null,
  };
}
