import { env } from '../config/env.js';

export function mpesaIpWhitelist(req, res, next) {
  if (env.NODE_ENV === 'development') {
    return next();
  }

  const allowedIps = env.MPESA_ALLOWED_IPS.split(',').map((ip) => ip.trim()).filter(Boolean);
  if (allowedIps.length === 0) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || '';
  const normalizedIp = clientIp.replace('::ffff:', '');

  if (!allowedIps.includes(normalizedIp)) {
    console.warn(`M-Pesa callback from unauthorized IP: ${normalizedIp}`);
    return res.status(403).json({ error: 'Unauthorized IP address' });
  }

  next();
}
