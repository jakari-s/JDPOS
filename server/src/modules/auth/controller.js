import * as authService from './service.js';
import { createAuditLog } from '../../utils/audit.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginWithEmail(email, password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog({
      userId: result.user.id,
      branchId: result.user.branchId,
      action: 'login',
      entity: 'user',
      entityId: result.user.id,
      ipAddress: req.ip,
    });

    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function pinLogin(req, res, next) {
  try {
    const { pin, branchId } = req.body;
    const result = await authService.loginWithPin(pin, branchId);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog({
      userId: result.user.id,
      branchId: result.user.branchId,
      action: 'pin_login',
      entity: 'user',
      entityId: result.user.id,
      ipAddress: req.ip,
    });

    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}
