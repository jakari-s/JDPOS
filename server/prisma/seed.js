import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT = 12;

async function main() {
  console.log('Seeding database...');

  // Company
  const company = await prisma.company.create({
    data: {
      name: 'Nairobi Mart Ltd',
      email: 'info@nairobimart.co.ke',
      phone: '+254 720 123 456',
      address: 'Kenyatta Avenue, Nairobi CBD',
      pin: 'P051234567A',
      vatNumber: 'VAT-0051234567',
      currency: 'KES',
      settings: {
        receiptHeader: 'Nairobi Mart Ltd',
        receiptFooter: 'Thank you for shopping with us!',
        loyaltyPointsPerKes: 10,
        defaultTaxClass: 'standard',
      },
    },
  });

  // Branches
  const [nairobi, mombasa, kisumu] = await Promise.all([
    prisma.branch.create({
      data: { companyId: company.id, name: 'Nairobi CBD', address: 'Kenyatta Avenue, Nairobi', phone: '+254 720 123 456', email: 'nairobi@nairobimart.co.ke' },
    }),
    prisma.branch.create({
      data: { companyId: company.id, name: 'Mombasa Branch', address: 'Moi Avenue, Mombasa', phone: '+254 720 789 012', email: 'mombasa@nairobimart.co.ke' },
    }),
    prisma.branch.create({
      data: { companyId: company.id, name: 'Kisumu Branch', address: 'Oginga Odinga Street, Kisumu', phone: '+254 720 345 678', email: 'kisumu@nairobimart.co.ke' },
    }),
  ]);

  // Users
  const hashedPassword = await bcrypt.hash('password123', SALT);
  const hashedPin = await bcrypt.hash('1234', SALT);

  const [superAdmin, adminUser, supervisor, cashier1, cashier2] = await Promise.all([
    prisma.user.create({
      data: { companyId: company.id, branchId: nairobi.id, name: 'James Kamau', email: 'james@nairobimart.co.ke', password: hashedPassword, pin: hashedPin, role: 'super_admin', phone: '+254 712 345 678' },
    }),
    prisma.user.create({
      data: { companyId: company.id, branchId: nairobi.id, name: 'Grace Wanjiku', email: 'grace@nairobimart.co.ke', password: hashedPassword, pin: await bcrypt.hash('5678', SALT), role: 'admin', phone: '+254 722 345 678' },
    }),
    prisma.user.create({
      data: { companyId: company.id, branchId: nairobi.id, name: 'Peter Ochieng', email: 'peter@nairobimart.co.ke', password: hashedPassword, pin: await bcrypt.hash('9012', SALT), role: 'supervisor', phone: '+254 733 345 678' },
    }),
    prisma.user.create({
      data: { companyId: company.id, branchId: nairobi.id, name: 'Faith Njeri', email: 'faith@nairobimart.co.ke', password: hashedPassword, pin: await bcrypt.hash('3456', SALT), role: 'cashier', phone: '+254 745 345 678' },
    }),
    prisma.user.create({
      data: { companyId: company.id, branchId: mombasa.id, name: 'Hassan Omar', email: 'hassan@nairobimart.co.ke', password: hashedPassword, pin: await bcrypt.hash('7890', SALT), role: 'cashier', phone: '+254 756 345 678' },
    }),
  ]);

  // Categories
  const [beverages, dairy, snacks, household, grains, produce, personal] = await Promise.all([
    prisma.category.create({ data: { companyId: company.id, name: 'Beverages', description: 'Drinks and beverages' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Dairy', description: 'Milk, yogurt, and dairy products' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Snacks', description: 'Chips, biscuits, and confectionery' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Household', description: 'Cleaning and household supplies' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Grains & Cereals', description: 'Rice, maize flour, wheat' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Fresh Produce', description: 'Fruits and vegetables', taxClass: 'zero_rated' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Personal Care', description: 'Toiletries and personal items' } }),
  ]);

  // Products (Kenyan market products)
  const productData = [
    { name: 'Tusker Lager 500ml', sku: 'BEV-001', barcode: '6901234567890', categoryId: beverages.id, costPrice: 150, retailPrice: 200, wholesalePrice: 180, minStockLevel: 24, reorderQty: 48, unitOfMeasure: 'pcs' },
    { name: 'Coca-Cola 500ml', sku: 'BEV-002', barcode: '5449000000996', categoryId: beverages.id, costPrice: 35, retailPrice: 50, wholesalePrice: 42, minStockLevel: 48, reorderQty: 120 },
    { name: 'Kericho Gold Tea 100g', sku: 'BEV-003', barcode: '6891234567890', categoryId: beverages.id, costPrice: 120, retailPrice: 180, wholesalePrice: 155, minStockLevel: 20, reorderQty: 50 },
    { name: 'Nescafe Classic 50g', sku: 'BEV-004', barcode: '7613032579982', categoryId: beverages.id, costPrice: 200, retailPrice: 280, wholesalePrice: 250, minStockLevel: 15, reorderQty: 30 },
    { name: 'Brookside Milk 500ml', sku: 'DAI-001', barcode: '6901234568001', categoryId: dairy.id, costPrice: 45, retailPrice: 60, wholesalePrice: 52, minStockLevel: 30, reorderQty: 60, taxClass: 'zero_rated' },
    { name: 'KCC Yogurt 250ml', sku: 'DAI-002', barcode: '6901234568002', categoryId: dairy.id, costPrice: 40, retailPrice: 55, wholesalePrice: 48, minStockLevel: 20, reorderQty: 40 },
    { name: 'Tuzo Butter 250g', sku: 'DAI-003', barcode: '6901234568003', categoryId: dairy.id, costPrice: 180, retailPrice: 250, wholesalePrice: 220, minStockLevel: 10, reorderQty: 20 },
    { name: 'Tropical Heat Crisps 100g', sku: 'SNK-001', barcode: '6901234569001', categoryId: snacks.id, costPrice: 80, retailPrice: 120, wholesalePrice: 100, minStockLevel: 30, reorderQty: 60 },
    { name: 'Cadbury Dairy Milk 100g', sku: 'SNK-002', barcode: '7622210100634', categoryId: snacks.id, costPrice: 150, retailPrice: 220, wholesalePrice: 190, minStockLevel: 15, reorderQty: 30 },
    { name: 'Manji Glucose Biscuits 200g', sku: 'SNK-003', barcode: '6901234569003', categoryId: snacks.id, costPrice: 25, retailPrice: 40, wholesalePrice: 32, minStockLevel: 40, reorderQty: 100 },
    { name: 'Omo Detergent 1kg', sku: 'HOU-001', barcode: '6901234570001', categoryId: household.id, costPrice: 200, retailPrice: 280, wholesalePrice: 250, minStockLevel: 12, reorderQty: 24 },
    { name: 'Harpic Toilet Cleaner 500ml', sku: 'HOU-002', barcode: '5000204854893', categoryId: household.id, costPrice: 150, retailPrice: 220, wholesalePrice: 190, minStockLevel: 10, reorderQty: 20 },
    { name: 'Pembe Maize Flour 2kg', sku: 'GRN-001', barcode: '6901234571001', categoryId: grains.id, costPrice: 100, retailPrice: 140, wholesalePrice: 120, minStockLevel: 50, reorderQty: 100, taxClass: 'zero_rated' },
    { name: 'Daawat Basmati Rice 2kg', sku: 'GRN-002', barcode: '8901052161031', categoryId: grains.id, costPrice: 350, retailPrice: 480, wholesalePrice: 420, minStockLevel: 20, reorderQty: 50 },
    { name: 'Exe Wheat Flour 2kg', sku: 'GRN-003', barcode: '6901234571003', categoryId: grains.id, costPrice: 120, retailPrice: 170, wholesalePrice: 150, minStockLevel: 30, reorderQty: 60, taxClass: 'zero_rated' },
    { name: 'Sukuma Wiki (Kale) 500g', sku: 'PRD-001', barcode: '6901234572001', categoryId: produce.id, costPrice: 20, retailPrice: 40, wholesalePrice: 30, minStockLevel: 20, reorderQty: 50, taxClass: 'zero_rated' },
    { name: 'Tomatoes 1kg', sku: 'PRD-002', barcode: '6901234572002', categoryId: produce.id, costPrice: 50, retailPrice: 80, wholesalePrice: 65, minStockLevel: 20, reorderQty: 50, taxClass: 'zero_rated' },
    { name: 'Colgate Toothpaste 100ml', sku: 'PER-001', barcode: '8901314200013', categoryId: personal.id, costPrice: 80, retailPrice: 120, wholesalePrice: 100, minStockLevel: 15, reorderQty: 30 },
    { name: 'Dettol Soap 175g', sku: 'PER-002', barcode: '5000204854894', categoryId: personal.id, costPrice: 90, retailPrice: 140, wholesalePrice: 120, minStockLevel: 15, reorderQty: 30 },
    { name: 'Always Pads Regular 8s', sku: 'PER-003', barcode: '4015400781790', categoryId: personal.id, costPrice: 70, retailPrice: 110, wholesalePrice: 90, minStockLevel: 20, reorderQty: 40, taxClass: 'exempt' },
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        ...p,
      },
    });
    products.push(product);

    // Create stock levels for each branch
    await Promise.all([
      prisma.stockLevel.create({
        data: { productId: product.id, branchId: nairobi.id, quantity: Math.floor(Math.random() * 100) + 20 },
      }),
      prisma.stockLevel.create({
        data: { productId: product.id, branchId: mombasa.id, quantity: Math.floor(Math.random() * 80) + 10 },
      }),
      prisma.stockLevel.create({
        data: { productId: product.id, branchId: kisumu.id, quantity: Math.floor(Math.random() * 60) + 5 },
      }),
    ]);
  }

  // Customers
  const customerData = [
    { name: 'Wanjiru Muthoni', phone: '+254 722 111 111', email: 'wanjiru@gmail.com', customerType: 'retail' },
    { name: 'Otieno Odhiambo', phone: '+254 733 222 222', email: 'otieno@gmail.com', customerType: 'wholesale', creditLimit: 50000 },
    { name: 'Fatima Hassan', phone: '+254 712 333 333', email: 'fatima@gmail.com', customerType: 'vip', creditLimit: 100000, loyaltyPoints: 500 },
    { name: 'David Kipchoge', phone: '+254 745 444 444', customerType: 'retail', loyaltyPoints: 150 },
    { name: 'Amina Abdi', phone: '+254 756 555 555', customerType: 'wholesale', creditLimit: 75000 },
    { name: 'Kariuki Store', phone: '+254 720 666 666', customerType: 'wholesale', creditLimit: 200000 },
    { name: 'Njoroge Mini-Mart', phone: '+254 722 777 777', customerType: 'wholesale', creditLimit: 150000 },
    { name: 'Achieng Sarah', phone: '+254 733 888 888', customerType: 'retail', loyaltyPoints: 320 },
  ];

  const customerAcctCounter = { val: 1 };
  for (const c of customerData) {
    await prisma.customer.create({
      data: {
        companyId: company.id,
        accountNumber: `CUST-${String(customerAcctCounter.val++).padStart(6, '0')}`,
        ...c,
      },
    });
  }

  // Suppliers
  const supplierData = [
    { name: 'EABL Distributors', contactPerson: 'John Mwangi', phone: '+254 720 100 100', email: 'orders@eabl.co.ke', pin: 'P012345678A', paymentTerms: 'Net30' },
    { name: 'Coca-Cola Bottlers Kenya', contactPerson: 'Sarah Kimani', phone: '+254 720 200 200', email: 'supply@cocacola.co.ke', paymentTerms: 'Net14' },
    { name: 'Brookside Dairy Ltd', contactPerson: 'Peter Ndegwa', phone: '+254 720 300 300', email: 'sales@brookside.co.ke', paymentTerms: 'COD' },
    { name: 'Unilever Kenya', contactPerson: 'Jane Akinyi', phone: '+254 720 400 400', email: 'orders@unilever.co.ke', paymentTerms: 'Net30' },
    { name: 'Pembe Flour Mills', contactPerson: 'Ali Hassan', phone: '+254 720 500 500', email: 'sales@pembe.co.ke', paymentTerms: 'Net7' },
  ];

  for (const s of supplierData) {
    await prisma.supplier.create({
      data: { companyId: company.id, ...s },
    });
  }

  // Promotions
  await prisma.promotion.create({
    data: {
      companyId: company.id,
      name: 'Weekend Special - 10% Off Snacks',
      type: 'percentage',
      value: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      products: {
        create: productData.filter((p) => p.categoryId === snacks.id).slice(0, 3).map((_, i) => ({
          productId: products.find((pr) => pr.sku === `SNK-00${i + 1}`)?.id || products[0].id,
        })),
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Super Admin: james@nairobimart.co.ke / password123 (PIN: 1234)');
  console.log('  Admin:       grace@nairobimart.co.ke / password123 (PIN: 5678)');
  console.log('  Supervisor:  peter@nairobimart.co.ke / password123 (PIN: 9012)');
  console.log('  Cashier:     faith@nairobimart.co.ke / password123 (PIN: 3456)');
  console.log('  Cashier:     hassan@nairobimart.co.ke / password123 (PIN: 7890)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
