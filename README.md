# Kenya POS - Point of Sale System

Production-ready POS system designed for the Kenyan market with M-Pesa integration, KRA eTIMS compliance, and offline-first capabilities.

## Features

- **Sales Processing**: Multi-line sales, split payments, refunds, hold/recall
- **M-Pesa Integration**: STK Push, C2B (Paybill/Till), callback handling
- **KRA eTIMS**: Real-time invoice submission, QR codes, retry queue
- **Inventory Management**: Real-time stock tracking, multi-branch transfers, expiry alerts
- **Products**: SKU/barcode management, variants, bundles, pricing tiers, CSV import/export
- **Customers**: Loyalty points, credit accounts, purchase history
- **Purchase Orders**: PO creation, GRN with stock updates, supplier payments
- **Cashier Reconciliation**: Shift management, cash drops/payouts, X-Report, Z-Report
- **Reports**: Sales, inventory, P&L, cashier, KRA - exportable to PDF/Excel
- **Multi-Branch**: Independent stock, branch-level pricing, cross-branch reporting
- **Offline Mode**: IndexedDB + Service Worker, queue-and-sync on reconnect
- **Hardware**: Thermal printer (ESC/POS), barcode scanner (USB HID), cash drawer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Zustand, React Hook Form + Zod, TanStack Table v8, Recharts |
| Backend | Node.js 20 LTS, Express.js, Prisma ORM |
| Database | PostgreSQL 15+ |
| Cache/Queue | Redis 7+, Bull |
| Integrations | M-Pesa Daraja, KRA eTIMS, Africa's Talking SMS |
| Offline | Dexie.js (IndexedDB), Workbox (Service Worker) |

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- Redis 7+

## Quick Start

```bash
# Clone and install
git clone <repo-url> kenya-pos
cd kenya-pos
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database, Redis, and integration credentials

# Setup database
cd server
npx prisma migrate dev
npx prisma db seed
cd ..

# Start development
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

Open http://localhost:5173

### Default Login Credentials

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| Super Admin | james@nairobimart.co.ke | password123 | 1234 |
| Admin | grace@nairobimart.co.ke | password123 | 5678 |
| Supervisor | peter@nairobimart.co.ke | password123 | 9012 |
| Cashier | faith@nairobimart.co.ke | password123 | 3456 |

## Project Structure

```
kenya-pos/
  client/                    # React frontend
    src/
      api/                   # Axios API client
      components/            # Shared UI components
      hooks/                 # Custom hooks
      lib/                   # Utilities, offline DB
      pages/                 # Page components by module
      store/                 # Zustand stores
  server/                    # Express backend
    prisma/
      schema.prisma          # Database schema
      seed.js                # Seed data
    src/
      config/                # Env, database, Redis
      integrations/          # M-Pesa, eTIMS, SMS, Printer
      middleware/             # Auth, validation, rate limiting
      modules/               # API modules (sales, products, etc.)
      queues/                # Bull job queues
      utils/                 # Shared utilities
  .env.example               # Environment template
  ecosystem.config.cjs       # PM2 configuration
  nginx.conf                 # Nginx reverse proxy config
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/pin-login` - 4-digit PIN login (cashier)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Sales
- `POST /api/sales` - Create sale
- `GET /api/sales` - List sales (with filters)
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales/:id/refund` - Process refund
- `POST /api/sales/park` - Hold/park sale
- `GET /api/sales/parked` - Get held sales
- `GET /api/sales/parked/:id/recall` - Recall held sale

### Products
- `GET/POST /api/products` - List/create products
- `GET/PUT/DELETE /api/products/:id` - CRUD
- `POST /api/products/:id/variants` - Add variant
- `POST /api/products/bundles` - Create bundle
- `POST /api/products/import` - CSV import
- `GET /api/products/export` - CSV export

### Inventory
- `GET /api/stock` - Stock levels
- `POST /api/stock/adjust` - Stock adjustment
- `POST /api/stock/transfer` - Transfer request
- `GET /api/stock/movements` - Movement history
- `GET /api/stock/expiring` - Expiring items

### Payments (M-Pesa)
- `POST /api/mpesa/stk-push` - Initiate STK Push
- `POST /api/mpesa/callback` - Safaricom callback
- `POST /api/mpesa/c2b/confirmation` - C2B confirmation
- `GET /api/mpesa/status/:id` - Query payment status

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/cashier` - Cashier performance
- `GET /api/reports/profit` - P&L report
- `GET /api/reports/:type/export?format=pdf|xlsx` - Export report

## Production Deployment

### DigitalOcean / VPS

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm postgresql redis-server nginx certbot

# Clone and build
git clone <repo-url> /var/www/kenya-pos
cd /var/www/kenya-pos
npm ci --production
cd server && npx prisma migrate deploy && npx prisma db seed
cd ../client && npm run build

# Configure nginx
sudo cp nginx.conf /etc/nginx/sites-available/kenya-pos
sudo ln -s /etc/nginx/sites-available/kenya-pos /etc/nginx/sites-enabled/
sudo certbot --nginx -d pos.example.com
sudo systemctl restart nginx

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## M-Pesa Setup

1. Register at [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
2. Create an app and get Consumer Key/Secret
3. Configure callback URLs to point to your server
4. Set environment variables in `.env`
5. Register C2B URLs: `POST /api/mpesa/register-urls`

## KRA eTIMS Setup

1. Register with KRA for eTIMS access
2. Obtain Device ID and API Key
3. Configure eTIMS environment variables
4. Invoices are automatically submitted on sale completion
5. Failed submissions retry every 15 minutes via Bull queue

## License

Proprietary - All rights reserved.
