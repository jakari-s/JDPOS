import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef'),
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().default(''),
  MPESA_CONSUMER_SECRET: z.string().default(''),
  MPESA_SHORTCODE: z.string().default('174379'),
  MPESA_PASSKEY: z.string().default(''),
  MPESA_CALLBACK_URL: z.string().default(''),
  MPESA_C2B_CONFIRMATION_URL: z.string().default(''),
  MPESA_C2B_VALIDATION_URL: z.string().default(''),
  MPESA_B2C_INITIATOR_NAME: z.string().default(''),
  MPESA_B2C_SECURITY_CREDENTIAL: z.string().default(''),
  MPESA_ALLOWED_IPS: z.string().default(''),
  ETIMS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ETIMS_BASE_URL: z.string().default('https://etims-api-sbx.kra.go.ke/etims-api'),
  ETIMS_DEVICE_ID: z.string().default(''),
  ETIMS_API_KEY: z.string().default(''),
  ETIMS_TIN: z.string().default(''),
  ETIMS_BRANCH_ID: z.string().default('00'),
  AT_API_KEY: z.string().default(''),
  AT_USERNAME: z.string().default('sandbox'),
  AT_SENDER_ID: z.string().default('KENYAPOS'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SENTRY_DSN: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
