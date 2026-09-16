import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Purging all synthetic/demo data from database...')

  // Delete all demo orders, sales, bills, fact tables & synthetic transactions
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.bill.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.return.deleteMany()
  await prisma.damage.deleteMany()
  await prisma.stockAdjustment.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.aiRecommendation.deleteMany()
  await prisma.forecast.deleteMany()
  await prisma.productPerformance.deleteMany()
  await prisma.inventorySnapshot.deleteMany()
  await prisma.historicalSale.deleteMany()
  await prisma.dailySalesFact.deleteMany()
  await prisma.monthlySalesFact.deleteMany()

  console.log('✨ Clean slate achieved: 0 fake orders, 0 fake sales, 0 fake bills')

  // 1. Core Roles
  const roles = [
    { name: 'ADMIN', description: 'Full system administrator' },
    { name: 'STAFF', description: 'Store manager / inventory clerk' },
    { name: 'CUSTOMER', description: 'Retail store customer' },
  ]
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    })
  }
  console.log('✅ 3 Core Roles seeded')

  // 2. Categories with GST Rates
  const categories = [
    { name: 'Grocery', taxRate: 0.00, description: 'Staples, grains, sugar, salt & flour' },
    { name: 'Dairy', taxRate: 0.05, description: 'Fresh milk, butter, cheese & curd' },
    { name: 'Bakery', taxRate: 0.05, description: 'Fresh breads, buns & toasts' },
    { name: 'Beverages', taxRate: 0.12, description: 'Tea, coffee, fruit juices & mineral water' },
    { name: 'Snacks', taxRate: 0.12, description: 'Biscuits, chips, namkeen & chocolates' },
    { name: 'Personal Care', taxRate: 0.18, description: 'Shampoos, soaps, toothpaste & lotions' },
    { name: 'Home', taxRate: 0.18, description: 'Detergents, dishwash, surface cleaners & towels' },
    { name: 'Stationery', taxRate: 0.12, description: 'Notebooks, pens, registers & markers' },
    { name: 'Accessories', taxRate: 0.18, description: 'School backpacks, lunchboxes & water bottles' },
  ]

  const catMap: Record<string, string> = {}
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: { taxRate: c.taxRate, description: c.description },
      create: c,
    })
    catMap[c.name] = cat.id

    await prisma.gstRate.upsert({
      where: { category: c.name },
      update: { rate: c.taxRate },
      create: { category: c.name, rate: c.taxRate },
    })
  }
  console.log('✅ Categories & GST Rates seeded')

  // 3. 10 Verified FMCG & Supermarket Suppliers
  const suppliers = [
    {
      code: 'S001',
      name: 'Amul Dairy Federation',
      contactName: 'Anil Patel',
      email: 'supply@amuldairy.com',
      phone: '+91 98765 22222',
      address: 'Amul Dairy Road, Anand, Gujarat',
      categories: 'Dairy, Bakery, Beverages',
      rating: 4.9,
      leadTimeDays: 1,
    },
    {
      code: 'S002',
      name: 'ITC Limited',
      contactName: 'Sanjeev Puri',
      email: 'orders@itclimited.in',
      phone: '+91 98765 11111',
      address: '37 J.L. Nehru Road, Kolkata, West Bengal',
      categories: 'Grocery, Snacks, Personal Care',
      rating: 4.8,
      leadTimeDays: 2,
    },
    {
      code: 'S003',
      name: 'Britannia Wholesale Industries',
      contactName: 'Sunil Sharma',
      email: 'distributors@britannia.in',
      phone: '+91 98765 33333',
      address: 'Bandra-Kurla Complex, Mumbai, Maharashtra',
      categories: 'Bakery, Snacks, Dairy',
      rating: 4.7,
      leadTimeDays: 1,
    },
    {
      code: 'S004',
      name: 'Hindustan Unilever Limited (HUL)',
      contactName: 'Priya Nair',
      email: 'wholesale@hulretail.com',
      phone: '+91 98765 44444',
      address: 'Chakala, Andheri East, Mumbai, Maharashtra',
      categories: 'Personal Care, Home Cleaners, Beverages',
      rating: 4.9,
      leadTimeDays: 2,
    },
    {
      code: 'S005',
      name: 'Tata Consumer Products',
      contactName: 'Rajesh Kumar',
      email: 'sales@tataconsumer.com',
      phone: '+91 98765 55555',
      address: 'Bombay House, Homi Mody Street, Mumbai, Maharashtra',
      categories: 'Beverages, Grocery, Salt & Pulses',
      rating: 4.8,
      leadTimeDays: 2,
    },
    {
      code: 'S006',
      name: 'Nestlé India Limited',
      contactName: 'Suresh Menon',
      email: 'b2b@nestle.in',
      phone: '+91 98765 66666',
      address: 'DLF Cyber City, Phase II, Gurugram, Haryana',
      categories: 'Snacks, Dairy, Beverages',
      rating: 4.8,
      leadTimeDays: 2,
    },
    {
      code: 'S007',
      name: 'Dabur India Wholesale',
      contactName: 'Amit Burman',
      email: 'corporate@dabur.com',
      phone: '+91 98765 77777',
      address: 'Kaushambi, Sahibabad, Ghaziabad, Uttar Pradesh',
      categories: 'Beverages, Personal Care, Health Supplements',
      rating: 4.6,
      leadTimeDays: 3,
    },
    {
      code: 'S008',
      name: 'Parle Agro & Foods',
      contactName: 'Prakash Chauhan',
      email: 'distribution@parleagro.com',
      phone: '+91 98765 88888',
      address: 'Western Express Highway, Vile Parle, Mumbai',
      categories: 'Beverages, Snacks, Confectionery',
      rating: 4.7,
      leadTimeDays: 2,
    },
    {
      code: 'S009',
      name: 'Reynolds & Classmate Stationery',
      contactName: 'Vikram Joshi',
      email: 'orders@reynoldsstationery.in',
      phone: '+91 98765 99999',
      address: 'Guindy Industrial Estate, Chennai, Tamil Nadu',
      categories: 'Stationery, School Books, Pens & Art',
      rating: 4.6,
      leadTimeDays: 3,
    },
    {
      code: 'S010',
      name: 'VIP Industries & Skybags',
      contactName: 'Dilip Piramal',
      email: 'retail@vipbags.in',
      phone: '+91 98765 00000',
      address: 'Prabhadevi Industrial Estate, Mumbai, Maharashtra',
      categories: 'Accessories, School Bags, Backpacks, Lunch Boxes',
      rating: 4.7,
      leadTimeDays: 4,
    },
  ]

  const supMap: Record<string, string> = {}
  for (const s of suppliers) {
    const sup = await prisma.supplier.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    })
    supMap[s.code] = sup.id
  }
  console.log('✅ 10 Complete Supplier Details seeded')

  // 4. 25 Products with real baseline available units
  const products = [
    { id: 'P001', sku: 'P001', name: 'India Gate Basmati Rice', catName: 'Grocery', brand: 'India Gate', supCode: 'S002', mrp: 320, sellingPrice: 289, stock: 150, reorderLevel: 25, safetyStock: 10, leadTimeDays: 2, unit: '1 kg', description: 'Premium aged long-grain basmati rice with exquisite aroma.' },
    { id: 'P002', sku: 'P002', name: 'Aashirvaad Wheat Flour', catName: 'Grocery', brand: 'Aashirvaad', supCode: 'S002', mrp: 280, sellingPrice: 249, stock: 120, reorderLevel: 20, safetyStock: 10, leadTimeDays: 2, unit: '5 kg', description: 'Finely stone-milled whole wheat atta for soft, fluffy rotis.' },
    { id: 'P003', sku: 'P003', name: 'Fortune Sunflower Oil', catName: 'Grocery', brand: 'Fortune', supCode: 'S002', mrp: 185, sellingPrice: 165, stock: 80, reorderLevel: 15, safetyStock: 8, leadTimeDays: 2, unit: '1 L', description: 'Light, healthy and refined sunflower cooking oil.' },
    { id: 'P004', sku: 'P004', name: 'Tata Sugar', catName: 'Grocery', brand: 'Tata', supCode: 'S005', mrp: 55, sellingPrice: 50, stock: 200, reorderLevel: 30, safetyStock: 15, leadTimeDays: 2, unit: '1 kg', description: 'Pure sulphur-free refined crystal white sugar.' },
    { id: 'P005', sku: 'P005', name: 'Britannia Marie Biscuits', catName: 'Snacks', brand: 'Britannia', supCode: 'S003', mrp: 35, sellingPrice: 30, stock: 300, reorderLevel: 50, safetyStock: 20, leadTimeDays: 1, unit: '250 g', description: 'Light, crunchy tea-time digestive biscuits.' },
    { id: 'P006', sku: 'P006', name: 'Maggi 2-Minute Noodles', catName: 'Snacks', brand: 'Nestle', supCode: 'S006', mrp: 14, sellingPrice: 12, stock: 500, reorderLevel: 80, safetyStock: 40, leadTimeDays: 2, unit: '70 g', description: 'Classic instant noodles with authentic Indian spices.' },
    { id: 'P007', sku: 'P007', name: 'Amul Fresh Milk', catName: 'Dairy', brand: 'Amul', supCode: 'S001', mrp: 75, sellingPrice: 68, stock: 100, reorderLevel: 20, safetyStock: 15, leadTimeDays: 1, unit: '1 L', description: 'Pasteurized homogenized full cream fresh milk.' },
    { id: 'P008', sku: 'P008', name: 'Modern Sandwich Bread', catName: 'Bakery', brand: 'Modern', supCode: 'S001', mrp: 45, sellingPrice: 40, stock: 12, reorderLevel: 20, safetyStock: 5, leadTimeDays: 1, unit: '400 g', description: 'Daily fresh-baked soft white sandwich bread slices.' },
    { id: 'P009', sku: 'P009', name: 'Farm Fresh Eggs', catName: 'Dairy', brand: 'FarmFresh', supCode: 'S001', mrp: 90, sellingPrice: 80, stock: 200, reorderLevel: 30, safetyStock: 15, leadTimeDays: 1, unit: '12 pcs', description: 'Grade-A vegetarian farm-fresh brown eggs.' },
    { id: 'P010', sku: 'P010', name: 'Tata Tea Premium', catName: 'Beverages', brand: 'Tata', supCode: 'S005', mrp: 320, sellingPrice: 299, stock: 90, reorderLevel: 15, safetyStock: 8, leadTimeDays: 2, unit: '250 g', description: 'Desh ki Chai with rich taste and invigorating aroma.' },
    { id: 'P011', sku: 'P011', name: 'Nescafe Classic Instant Coffee', catName: 'Beverages', brand: 'Nescafe', supCode: 'S006', mrp: 550, sellingPrice: 499, stock: 60, reorderLevel: 12, safetyStock: 5, leadTimeDays: 2, unit: '50 g', description: '100% pure roasted coffee beans for a stimulating brew.' },
    { id: 'P012', sku: 'P012', name: 'Head & Shoulders Shampoo', catName: 'Personal Care', brand: 'P&G', supCode: 'S004', mrp: 350, sellingPrice: 315, stock: 70, reorderLevel: 15, safetyStock: 5, leadTimeDays: 2, unit: '340 mL', description: 'Anti-dandruff daily scalp care shampoo with moisture.' },
    { id: 'P013', sku: 'P013', name: 'Colgate Strong Teeth Toothpaste', catName: 'Personal Care', brand: 'Colgate', supCode: 'S004', mrp: 120, sellingPrice: 105, stock: 150, reorderLevel: 25, safetyStock: 10, leadTimeDays: 2, unit: '200 g', description: 'Amino calcium formula for strong cavity protection.' },
    { id: 'P014', sku: 'P014', name: 'Lux Velvet Glow Soap', catName: 'Personal Care', brand: 'HUL', supCode: 'S004', mrp: 60, sellingPrice: 52, stock: 200, reorderLevel: 30, safetyStock: 15, leadTimeDays: 2, unit: '150 g', description: 'Fragrant bath soap infused with jasmine oil.' },
    { id: 'P015', sku: 'P015', name: 'Surf Excel Detergent Powder', catName: 'Home', brand: 'HUL', supCode: 'S004', mrp: 220, sellingPrice: 199, stock: 80, reorderLevel: 15, safetyStock: 8, leadTimeDays: 2, unit: '1 kg', description: 'Quick wash stain remover washing powder.' },
    { id: 'P016', sku: 'P016', name: 'Vim Dishwash Gel', catName: 'Home', brand: 'HUL', supCode: 'S004', mrp: 110, sellingPrice: 95, stock: 90, reorderLevel: 15, safetyStock: 8, leadTimeDays: 2, unit: '500 mL', description: 'Lemon concentrated grease removal dishwashing gel.' },
    { id: 'P017', sku: 'P017', name: 'Bisleri Mineral Water', catName: 'Beverages', brand: 'Bisleri', supCode: 'S001', mrp: 20, sellingPrice: 18, stock: 300, reorderLevel: 50, safetyStock: 25, leadTimeDays: 1, unit: '1 L', description: '10-stage purified mineral drinking water.' },
    { id: 'P018', sku: 'P018', name: 'Skybags School Bag', catName: 'Accessories', brand: 'Skybags', supCode: 'S010', mrp: 1200, sellingPrice: 999, stock: 4, reorderLevel: 8, safetyStock: 3, leadTimeDays: 4, unit: '1 pc', description: 'Ergonomic 3-compartment waterproof school backpack.' },
    { id: 'P019', sku: 'P019', name: 'Classmate Ruled Notebook', catName: 'Stationery', brand: 'Classmate', supCode: 'S009', mrp: 60, sellingPrice: 52, stock: 200, reorderLevel: 30, safetyStock: 15, leadTimeDays: 3, unit: '172 pg', description: 'High-opacity ruled notebooks for schools and colleges.' },
    { id: 'P020', sku: 'P020', name: 'Reynolds Ball Pen Pack', catName: 'Stationery', brand: 'Reynolds', supCode: 'S009', mrp: 80, sellingPrice: 70, stock: 150, reorderLevel: 25, safetyStock: 10, leadTimeDays: 3, unit: '5 pcs', description: 'Smooth waterproof smudge-free ballpoint pens.' },
    { id: 'P021', sku: 'P021', name: 'Milton Steel Lunch Box', catName: 'Accessories', brand: 'Milton', supCode: 'S010', mrp: 450, sellingPrice: 399, stock: 5, reorderLevel: 10, safetyStock: 4, leadTimeDays: 4, unit: '1 pc', description: 'Insulated stainless steel 3-container leakproof tiffin box.' },
    { id: 'P022', sku: 'P022', name: "Lay's Classic Salted Chips", catName: 'Snacks', brand: 'Lays', supCode: 'S008', mrp: 20, sellingPrice: 18, stock: 400, reorderLevel: 50, safetyStock: 25, leadTimeDays: 2, unit: '26 g', description: 'Crispy golden salted potato chips.' },
    { id: 'P023', sku: 'P023', name: 'Real Mixed Fruit Juice', catName: 'Beverages', brand: 'Real', supCode: 'S007', mrp: 99, sellingPrice: 89, stock: 100, reorderLevel: 20, safetyStock: 10, leadTimeDays: 3, unit: '1 L', description: 'Rich in vitamin C, 100% genuine fruit beverage.' },
    { id: 'P024', sku: 'P024', name: 'Cadbury Dairy Milk Chocolate', catName: 'Snacks', brand: 'Cadbury', supCode: 'S008', mrp: 40, sellingPrice: 35, stock: 250, reorderLevel: 40, safetyStock: 20, leadTimeDays: 2, unit: '45 g', description: 'Creamy smooth classic milk chocolate bar.' },
    { id: 'P025', sku: 'P025', name: 'Spaces Cotton Bath Towel', catName: 'Home', brand: 'Spaces', supCode: 'S004', mrp: 350, sellingPrice: 299, stock: 50, reorderLevel: 10, safetyStock: 5, leadTimeDays: 2, unit: '1 pc', description: '100% Egyptian cotton quick-dry soft bath towel.' },
  ]

  for (const p of products) {
    const categoryId = catMap[p.catName]
    const supplierId = supMap[p.supCode]

    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {
        sku: p.sku,
        name: p.name,
        categoryId,
        supplierId,
        brand: p.brand,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        taxRate: categories.find(c => c.name === p.catName)?.taxRate || 0,
        imageUrl: `/products/${p.id}.svg`,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        leadTimeDays: p.leadTimeDays,
        unit: p.unit,
        description: p.description,
      },
      create: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        categoryId,
        supplierId,
        brand: p.brand,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        taxRate: categories.find(c => c.name === p.catName)?.taxRate || 0,
        imageUrl: `/products/${p.id}.svg`,
        reorderLevel: p.reorderLevel,
        safetyStock: p.safetyStock,
        leadTimeDays: p.leadTimeDays,
        unit: p.unit,
        description: p.description,
      },
    })

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { availableQuantity: p.stock, reservedQuantity: 0, damagedQuantity: 0 },
      create: { productId: product.id, availableQuantity: p.stock, reservedQuantity: 0, damagedQuantity: 0 },
    })
  }
  console.log('✅ 25 Products & Stock Units seeded (No fake historical orders)')

  // 5. RAG Knowledge Documents for Store Policy
  const knowledgeDocs = [
    {
      title: 'Store Return & Refund Policy',
      category: 'OPERATIONS',
      content: 'SmartRetail Mydukur offers a 7-day hassle-free return policy for packaged grocery, stationery, and non-perishable goods. Perishable items such as dairy milk, fresh eggs, and bread must be inspected at delivery and returned within 24 hours. Refunds are credited immediately to original payment mode or customer wallet.',
    },
    {
      title: 'Supplier Lead Times & PO Guidelines',
      category: 'SUPPLIER',
      content: 'Standard PO delivery lead times: Amul Dairy (1 day), ITC Limited (2 days), Britannia (1 day), HUL (2 days), Tata Consumer (2 days), Nestle (2 days), Dabur (3 days), Parle Agro (2 days), Reynolds (3 days), VIP/Skybags (4 days).',
    },
    {
      title: 'GST Tax Compliance & Rates',
      category: 'COMPLIANCE',
      content: 'Store GST classifications: Grocery staples (0%), Dairy & Fresh Bakery (5%), Packaged Snacks, Beverages & Stationery (12%), Personal Care, Home Cleaners & Accessories (18%). All tax rates are locked at order creation.',
    },
    {
      title: 'Inventory Reorder & Safety Stock Policy',
      category: 'INVENTORY',
      content: 'Autonomous Reorder Point (ROP) = (Daily Sales Velocity * Lead Time Days) + Safety Stock. When available units reach or drop below reorderLevel, the AI engine recommends replenishment units for 1-click admin approval.',
    },
  ]

  for (const doc of knowledgeDocs) {
    const existing = await prisma.knowledgeDocument.findFirst({ where: { title: doc.title } })
    if (!existing) {
      await prisma.knowledgeDocument.create({ data: doc })
    }
  }
  console.log('✅ Store Policies & Knowledge Documents seeded')

  // 6. Pincodes
  const pincodes = [
    { pincode: '516172', area: 'Mydukur', city: 'Kadapa', state: 'Andhra Pradesh' },
    { pincode: '516001', area: 'Kadapa HO', city: 'Kadapa', state: 'Andhra Pradesh' },
    { pincode: '516002', area: 'RTC Bus Stand', city: 'Kadapa', state: 'Andhra Pradesh' },
    { pincode: '500001', area: 'Abids', city: 'Hyderabad', state: 'Telangana' },
    { pincode: '500081', area: 'HITEC City', city: 'Hyderabad', state: 'Telangana' },
  ]

  for (const p of pincodes) {
    await prisma.pincode.upsert({
      where: { pincode: p.pincode },
      update: p,
      create: p,
    })
  }
  console.log('✅ Pincodes seeded (516172 Mydukur Kadapa AP primary)')

  console.log('🎉 Database Clean Seed Successfully Completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
