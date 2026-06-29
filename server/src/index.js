import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './modules/auth/routes.js';
import salesRoutes from './modules/sales/routes.js';
import productRoutes from './modules/products/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import customerRoutes from './modules/customers/routes.js';
import supplierRoutes from './modules/suppliers/routes.js';
import poRoutes from './modules/purchase-orders/routes.js';
import userRoutes from './modules/users/routes.js';
import branchRoutes from './modules/branches/routes.js';
import categoryRoutes from './modules/categories/routes.js';
import shiftRoutes from './modules/shifts/routes.js';
import promotionRoutes from './modules/promotions/routes.js';
import reportRoutes from './modules/reports/routes.js';
import mpesaRoutes from './integrations/mpesa/routes.js';
import etimsRoutes from './integrations/etims/routes.js';
import smsRoutes from './integrations/africastalking/routes.js';
import printerRoutes from './integrations/printer/routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting (applied globally, auth has its own stricter limiter)
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/etims', etimsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/printer', printerRoutes);

// Error handler
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;
