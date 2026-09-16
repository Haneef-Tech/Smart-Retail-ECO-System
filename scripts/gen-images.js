const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'products');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const products = [
  { id: 'P001', name: 'India Gate Rice', cat: 'Grocery', color: '#16a34a', emoji: '🌾' },
  { id: 'P002', name: 'Aashirvaad Atta', cat: 'Grocery', color: '#d97706', emoji: '🌾' },
  { id: 'P003', name: 'Fortune Oil', cat: 'Grocery', color: '#eab308', emoji: '🌻' },
  { id: 'P004', name: 'Tata Sugar', cat: 'Grocery', color: '#0284c7', emoji: '🍬' },
  { id: 'P005', name: 'Marie Biscuits', cat: 'Snacks', color: '#c05621', emoji: '🍪' },
  { id: 'P006', name: 'Maggi Noodles', cat: 'Snacks', color: '#dc2626', emoji: '🍜' },
  { id: 'P007', name: 'Amul Milk', cat: 'Dairy', color: '#2563eb', emoji: '🥛' },
  { id: 'P008', name: 'Modern Bread', cat: 'Bakery', color: '#ea580c', emoji: '🍞' },
  { id: 'P009', name: 'Fresh Eggs', cat: 'Dairy', color: '#d97706', emoji: '🥚' },
  { id: 'P010', name: 'Tata Tea', cat: 'Beverages', color: '#15803d', emoji: '☕' },
  { id: 'P011', name: 'Nescafe Coffee', cat: 'Beverages', color: '#7c2d12', emoji: '☕' },
  { id: 'P012', name: 'H&S Shampoo', cat: 'Personal Care', color: '#0284c7', emoji: '🧴' },
  { id: 'P013', name: 'Colgate Paste', cat: 'Personal Care', color: '#b91c1c', emoji: '🪥' },
  { id: 'P014', name: 'Lux Soap', cat: 'Personal Care', color: '#db2777', emoji: '🧼' },
  { id: 'P015', name: 'Surf Excel', cat: 'Home', color: '#1d4ed8', emoji: '🧺' },
  { id: 'P016', name: 'Vim Liquid', cat: 'Home', color: '#65a30d', emoji: '🍋' },
  { id: 'P017', name: 'Bisleri Water', cat: 'Beverages', color: '#06b6d4', emoji: '💧' },
  { id: 'P018', name: 'Skybags Bag', cat: 'Accessories', color: '#4f46e5', emoji: '🎒' },
  { id: 'P019', name: 'Notebook', cat: 'Stationery', color: '#9333ea', emoji: '📓' },
  { id: 'P020', name: 'Reynolds Pens', cat: 'Stationery', color: '#2563eb', emoji: '🖊️' },
  { id: 'P021', name: 'Milton Lunchbox', cat: 'Accessories', color: '#059669', emoji: '🍱' },
  { id: 'P022', name: 'Lays Chips', cat: 'Snacks', color: '#ca8a04', emoji: '🥔' },
  { id: 'P023', name: 'Real Juice', cat: 'Beverages', color: '#ea580c', emoji: '🧃' },
  { id: 'P024', name: 'Dairy Milk', cat: 'Snacks', color: '#581c87', emoji: '🍫' },
  { id: 'P025', name: 'Bath Towel', cat: 'Home', color: '#0891b2', emoji: '🛋️' }
];

products.forEach(p => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f8fafc" rx="24"/>
    <circle cx="200" cy="180" r="110" fill="${p.color}" opacity="0.12"/>
    <circle cx="200" cy="180" r="85" fill="${p.color}" opacity="0.2"/>
    <text x="200" y="200" font-size="72" text-anchor="middle" dominant-baseline="central">${p.emoji}</text>
    <rect x="40" y="300" width="320" height="60" fill="white" rx="14" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.05))"/>
    <text x="200" y="325" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#1e293b" text-anchor="middle">${p.name}</text>
    <text x="200" y="345" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="${p.color}" text-anchor="middle">${p.cat} • ${p.id}</text>
  </svg>`;

  fs.writeFileSync(path.join(dir, `${p.id}.svg`), svg);
  fs.writeFileSync(path.join(dir, `${p.id}.webp`), svg);
});

console.log('✅ Generated 25 clean SVG product images in /public/products/!');
