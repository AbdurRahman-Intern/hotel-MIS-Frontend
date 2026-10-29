// Generates db.json for JSON Server. Run: node scripts/seed.mjs
// Deterministic (seeded PRNG) so the demo data is stable between runs.
// NOTE: password hashes are SHA-256 of the demo password. This is NOT production auth.
// Real authentication, hashing (bcrypt/argon2) and tenant isolation belong to the future Laravel backend.
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

let s = 20261028
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => Math.floor(lo + rnd() * (hi - lo + 1))
const hash = (p) => createHash('sha256').update(p).digest('hex')
const pad = (n, w = 3) => String(n).padStart(w, '0')
const iso = (y, m, d) => `${y}-${pad(m, 2)}-${pad(d, 2)}`

const DEMO_PASSWORD_HASH = hash('Demo@123456')
const TODAY = '2026-10-28'

const plans = [
  { id: 'starter', name: 'Starter', priceMonthly: 29, maxUsers: 3 },
  { id: 'professional', name: 'Professional', priceMonthly: 79, maxUsers: 10 },
  { id: 'enterprise', name: 'Enterprise', priceMonthly: 199, maxUsers: 50 },
]

const hotels = [
  { id: 'hotel-001', name: 'Royal Wedding Hall', slug: 'royal-wedding-hall', ownerName: 'Ahmad Zia Royal', ownerEmail: 'owner@royal.demo', phone: '+93 700 111 222', address: 'Shahr-e-Naw, Kabul, Afghanistan', logoUrl: null, status: 'active', planId: 'professional', registeredAt: '2026-01-12', currency: 'AFN', dateFormat: 'dd MMM yyyy', contactEmail: 'info@royal.demo' },
  { id: 'hotel-002', name: 'Kabul Grand Hotel', slug: 'kabul-grand-hotel', ownerName: 'Farid Nazari', ownerEmail: 'owner@kabulgrand.demo', phone: '+93 799 555 010', address: 'Wazir Akbar Khan, Kabul, Afghanistan', logoUrl: null, status: 'active', planId: 'enterprise', registeredAt: '2026-03-04', currency: 'USD', dateFormat: 'dd MMM yyyy', contactEmail: 'events@kabulgrand.demo' },
  { id: 'hotel-003', name: 'Example Palace', slug: 'example-palace', ownerName: 'Sara Ahmadi', ownerEmail: 'owner@palace.demo', phone: '+93 788 200 300', address: 'Herat City Center, Herat, Afghanistan', logoUrl: null, status: 'suspended', planId: 'starter', registeredAt: '2026-07-21', currency: 'AFN', dateFormat: 'dd MMM yyyy', contactEmail: 'hello@palace.demo' },
]

const users = [
  { id: 'user-000', name: 'Platform Admin', email: 'admin@hotelsaas.demo', role: 'super_admin', tenantId: null, passwordHash: DEMO_PASSWORD_HASH },
  { id: 'user-001', name: 'Ahmad Zia Royal', email: 'owner@royal.demo', role: 'hotel_owner', tenantId: 'hotel-001', passwordHash: DEMO_PASSWORD_HASH },
  { id: 'user-002', name: 'Farid Nazari', email: 'owner@kabulgrand.demo', role: 'hotel_owner', tenantId: 'hotel-002', passwordHash: DEMO_PASSWORD_HASH },
  { id: 'user-003', name: 'Sara Ahmadi', email: 'owner@palace.demo', role: 'hotel_owner', tenantId: 'hotel-003', passwordHash: DEMO_PASSWORD_HASH },
]

// price book per hotel: scale converts AFN-ish numbers into the hotel's currency
const books = {
  'hotel-001': { key: 'r', scale: 1, tag: 'RWH' },
  'hotel-002': { key: 'k', scale: 1 / 70, tag: 'KGH' },
}

const inventoryDefs = [
  ['rice', 'Rice (Basmati)', 'Grains', 'kg', 820, 200, 92],
  ['beef', 'Beef Meat', 'Meat', 'kg', 120, 50, 450],
  ['chicken', 'Chicken', 'Meat', 'kg', 60, 50, 280],
  ['veg', 'Mixed Vegetables', 'Vegetables', 'kg', 45, 100, 40],
  ['onion', 'Onion', 'Vegetables', 'kg', 0, 80, 35],
  ['oil', 'Cooking Oil', 'Oil', 'liter', 25, 30, 180],
  ['flour', 'Flour', 'Grains', 'kg', 300, 150, 45],
  ['spices', 'Spices Mix', 'Spices', 'kg', 15, 20, 320],
  ['yogurt', 'Yogurt', 'Dairy', 'kg', 40, 50, 90],
  ['potato', 'Potatoes', 'Vegetables', 'kg', 200, 100, 38],
  ['drinks', 'Soft Drinks (Bottle)', 'Beverages', 'bottle', 250, 300, 55],
  ['salad', 'Fresh Salad', 'Vegetables', 'kg', 40, 20, 65],
  ['dessert', 'Dessert (Sweet)', 'Others', 'kg', 30, 20, 150],
  ['bread', 'Bread (Naan)', 'Others', 'piece', 400, 300, 20],
]

const menuDefs = [
  { id: 'a', name: 'Special Menu A', price: 840, mix: { rice: 0.4, beef: 0.25, chicken: 0.15, veg: 0.2, oil: 0.05, drinks: 1, salad: 0.1, dessert: 0.08, bread: 1, spices: 0.02 } },
  { id: 'b', name: 'Classic Menu B', price: 640, mix: { rice: 0.35, chicken: 0.25, veg: 0.15, oil: 0.04, drinks: 1, bread: 1, spices: 0.015 } },
  { id: 'c', name: 'Premium Menu C', price: 1100, mix: { rice: 0.4, beef: 0.35, chicken: 0.2, veg: 0.2, oil: 0.06, drinks: 2, salad: 0.12, dessert: 0.1, bread: 1, yogurt: 0.1, spices: 0.025 } },
]

const clients = ['Ahmad Khan', 'Sadiq Wazir', 'Noreen Family', 'Rehman', 'Farid Ahmad', 'Layla & Hamid', 'Tariq Shah', 'Zahra Noori', 'Bashir Ahmad', 'Khalid Rahimi', 'Mansoor Safi', 'Shabnam & Omar', 'Wahid Karimi', 'Nargis Hotak', 'Jawad Amiri', 'Parwin Stanikzai', 'Ali & Zara', 'Hassan Family']
const clientsK = ['Daud Sultani', 'Mina & Yousuf', 'Emal Popal', 'Rohina Safi', 'Hamid Qaderi', 'Fatima & Reza', 'Naser Barakzai', 'Shukria Mohib', 'Latif Frotan', 'Hila & Sami', 'Rashid Totakhel', 'Zarmina Aria', 'Omid Faqiri', 'Basira Nikzad', 'Idrees Kamgar', 'Anisa Rahmani', 'Waheed Sidiqi', 'Marwa & Elham']
const eventTypes = ['Wedding', 'Wedding', 'Wedding', 'Engagement', 'Reception', 'Birthday', 'Corporate']

const db = { plans, users: users, hotels, halls: [], menus: [], bookings: [], inventoryItems: [], stockMovements: [], employees: [], salaryPayments: [], partners: [], loans: [], expenses: [], externalIncome: [], activity: [] }

for (const hotel of hotels.slice(0, 2)) {
  const { key, scale, tag } = books[hotel.id]
  const t = hotel.id
  const money = (afn) => Math.max(1, Math.round(afn * scale))
  const round = (n, step) => Math.round(n / step) * step

  // halls
  const hallNames = hotel.id === 'hotel-001' ? [['Grand Hall', 600], ['Royal Hall', 350], ['Pearl Hall', 150]] : [['Ballroom One', 700], ['Sapphire Hall', 300], ['Garden Terrace', 200]]
  const halls = hallNames.map(([name, capacity], i) => ({ id: `hall-${key}-${i + 1}`, tenantId: t, name, capacity }))
  db.halls.push(...halls)

  // inventory
  const inv = inventoryDefs.map(([k, name, category, unit, qty, min, cost], i) => ({
    id: `inv-${key}-${k}`, tenantId: t, name, category, unit,
    quantity: hotel.id === 'hotel-001' ? qty : Math.round(qty * (0.6 + rnd() * 1.1)),
    minQuantity: min,
    unitCost: scale === 1 ? cost : Math.round(cost * scale * 100) / 100,
    spoiledQuantity: i % 4 === 0 ? int(1, 6) : 0,
    updatedAt: iso(2026, 10, int(10, 27)),
  }))
  if (hotel.id === 'hotel-002') { inv[4].quantity = 0; inv[0].quantity = 90 }
  db.inventoryItems.push(...inv)

  // menus
  db.menus.push(...menuDefs.map((m) => ({
    id: `menu-${key}-${m.id}`, tenantId: t, name: m.name, pricePerPerson: scale === 1 ? m.price : round(m.price * scale, 1),
    ingredients: Object.entries(m.mix).map(([ik, perPerson]) => ({ inventoryItemId: `inv-${key}-${ik}`, perPerson })),
  })))

  // bookings across 2026
  const names = hotel.id === 'hotel-001' ? clients : clientsK
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  names.forEach((client, i) => {
    const month = months[i % 12] + (i >= 12 ? 0 : 0)
    const m = i < 12 ? months[i] : [9, 10, 11, 11, 12, 12][i - 12]
    const day = int(2, 27)
    const eventDate = iso(2026, m, day)
    const guests = pick([80, 120, 150, 180, 220, 250, 280, 300, 350, 400, 450])
    const menu = pick(db.menus.filter((x) => x.tenantId === t))
    const hall = pick(halls)
    const food = menu.pricePerPerson
    const photo = money(pick([20000, 30000, 40000]))
    const deco = money(pick([15000, 25000, 40000]))
    const service = money(pick([10000, 15000, 20000]))
    const total = guests * food + photo + deco + service
    const past = eventDate < TODAY
    const status = past ? (rnd() < 0.08 ? 'cancelled' : 'completed') : pick(['confirmed', 'confirmed', 'pending', 'draft'])
    const advance = status === 'draft' ? 0 : round(total * (past && status === 'completed' ? 1 : 0.2 + rnd() * 0.4), money(1000))
    db.bookings.push({
      id: `bk-${key}-${pad(i + 1)}`, tenantId: t, reference: `BK-2026-${tag}-${pad(i + 1)}`,
      clientName: client, clientPhone: `+93 7${int(0, 9)}${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`,
      eventType: pick(eventTypes), eventDate, shift: pick(['Day', 'Night']), guestCount: guests, hallName: hall.name,
      menuId: menu.id, foodPricePerPerson: food, photographyPrice: photo, decorationPrice: deco, serviceCharge: service, otherCharges: 0, discount: 0,
      advancePaid: Math.min(advance, total), payments: [], status, notes: '', createdAt: `${iso(2026, Math.max(1, m - 1), 5)}T10:30:00`,
    })
  })
  // make sure there are a few events today / this week
  const mine = db.bookings.filter((b) => b.tenantId === t)
  mine[mine.length - 1].eventDate = TODAY
  mine[mine.length - 1].status = 'confirmed'
  mine[mine.length - 2].eventDate = '2026-11-02'
  mine[mine.length - 2].status = 'confirmed'
  // a booking with extra payment
  const withPayments = mine.find((b) => b.status === 'confirmed')
  if (withPayments) withPayments.payments.push({ date: '2026-10-15', amount: money(30000) })

  // stock movements
  const sup = ['ABC Market', 'Food Supplier', 'Local Market', 'Fresh Market', 'Kabul Wholesale']
  let mv = 1
  for (const [k, qty] of [['rice', 500], ['chicken', 300], ['oil', 100], ['veg', 200], ['flour', 500], ['beef', 150]]) {
    const item = inv.find((x) => x.id === `inv-${key}-${k}`)
    db.stockMovements.push({ id: `mv-${key}-${pad(mv++)}`, tenantId: t, itemId: item.id, type: 'in', quantity: Math.round(qty * (scale === 1 ? 1 : 0.5)), unitCost: item.unitCost, date: iso(2026, 10, int(1, 20)), supplier: pick(sup), reference: `INV-${int(100, 999)}` })
  }
  for (const [k, qty, ref] of [['rice', 120, mine[mine.length - 1]], ['chicken', 45, mine[mine.length - 1]], ['veg', 60, mine[mine.length - 2]], ['oil', 15, mine[mine.length - 2]]]) {
    const item = inv.find((x) => x.id === `inv-${key}-${k}`)
    db.stockMovements.push({ id: `mv-${key}-${pad(mv++)}`, tenantId: t, itemId: item.id, type: 'out', quantity: Math.round(qty * (scale === 1 ? 1 : 0.5)), unitCost: item.unitCost, date: iso(2026, 10, int(21, 27)), reference: `Wedding - ${ref.clientName}`, bookingId: ref.id })
  }

  // employees
  const empDefs = [
    ['Ahmad Khan', 'Chef', 'Kitchen', 'Male', 45000, true, 'active'],
    ['Zahra Rezaie', 'Waiter', 'Service', 'Female', 25000, true, 'active'],
    ['Karim Safi', 'Driver', 'Logistics', 'Male', 22000, false, 'active'],
    ['Sara Noori', 'Reception', 'Front Office', 'Female', 28000, true, 'active'],
    ['Nadeem Popal', 'Cleaner', 'Housekeeping', 'Male', 18000, false, 'active'],
    ['Fawad Amiri', 'Cook', 'Kitchen', 'Male', 30000, true, 'active'],
    ['Shabana Qaderi', 'Cleaner', 'Housekeeping', 'Female', 18000, false, 'on_leave'],
    ['Jalil Sultani', 'Gardener', 'Maintenance', 'Male', 18000, false, 'inactive'],
  ]
  const emps = empDefs.map(([fullName, position, department, gender, salary, eligible, status], i) => ({
    id: `emp-${key}-${pad(i + 1)}`, tenantId: t,
    fullName: hotel.id === 'hotel-001' ? fullName : fullName.replace(/^\w+/, pick(['Naveed', 'Hila', 'Sami', 'Rohina', 'Emal', 'Daud', 'Mina', 'Omid'])),
    phone: `+93 7${int(0, 9)}${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`,
    position, department, employeeType: 'Full Time', gender, salary: money(salary), joinDate: iso(2025 + (i % 2), int(1, 12), int(1, 27)), status,
    serviceChargeEligible: eligible, address: hotel.address, idNumber: `${int(1000, 9999)}-${int(100000, 999999)}`, emergencyContact: `+93 7${int(0, 9)}${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`, notes: '',
  }))
  db.employees.push(...emps)

  // salary payments for Sep and Oct 2026
  for (const month of ['2026-09', '2026-10']) {
    emps.filter((e) => e.status !== 'inactive').forEach((e, i) => {
      const sc = e.serviceChargeEligible ? money(pick([3000, 4000, 5000])) : 0
      const paid = month === '2026-09' || i % 3 !== 2
      db.salaryPayments.push({
        id: `sal-${key}-${month}-${pad(i + 1)}`, tenantId: t, employeeId: e.id, month, basicSalary: e.salary, serviceCharge: sc,
        advanceDeduction: i === 1 ? money(2000) : 0, otherDeduction: 0, paidDate: paid ? `${month}-${month === '2026-10' ? '05' : '30'}` : null,
        status: paid ? 'paid' : 'pending', notes: '',
      })
    })
  }

  // partners
  const partnerNames = hotel.id === 'hotel-001' ? ['Ahmad Zia Royal', 'Sadiq Wazir', 'Noreen Family', 'Rehman'] : ['Farid Nazari', 'Omar Sharifi', 'Jamila Hakimi']
  const shares = hotel.id === 'hotel-001' ? [30, 30, 20, 20] : [50, 30, 20]
  partnerNames.forEach((name, i) => {
    const investment = money(pick([300000, 500000, 800000]) * 10)
    db.partners.push({
      id: `par-${key}-${pad(i + 1)}`, tenantId: t, fullName: name, phone: `+93 7${int(0, 9)}${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`, email: '', address: '', investment, sharePercent: shares[i],
      startDate: iso(2026, 1, 15), status: hotel.id === 'hotel-001' && i === 3 ? 'inactive' : 'active', notes: '',
      transactions: [
        { date: '2026-01-15', type: 'contribution', amount: investment, note: 'Initial investment' },
        { date: '2026-06-30', type: 'profit_share', amount: Math.round(investment * 0.12), note: 'H1 profit share' },
        { date: '2026-07-10', type: 'withdrawal', amount: Math.round(investment * 0.06), note: 'Cash out' },
      ],
    })
  })

  // loans
  const loanDefs = [
    ['borrowed', 'Kabul Wholesale Market', 500000, '2026-08-01', '2026-12-31', [{ date: '2026-09-15', amount: 150000 }]],
    ['borrowed', 'Bank Al-Falah Micro Loan', 800000, '2026-05-10', '2027-02-10', [{ date: '2026-07-10', amount: 200000 }, { date: '2026-09-10', amount: 200000 }]],
    ['lent', 'Sadiq Wazir', 120000, '2026-09-20', '2026-11-20', []],
    ['lent', 'Hamid Catering', 300000, '2026-06-01', '2026-10-01', [{ date: '2026-08-01', amount: 300000 }]],
  ]
  loanDefs.forEach(([type, party, amount, issueDate, dueDate, repayments], i) => db.loans.push({ id: `loan-${key}-${pad(i + 1)}`, tenantId: t, type, party, amount: money(amount), issueDate, dueDate, repayments: repayments.map((r) => ({ ...r, amount: money(r.amount) })), notes: '' }))

  // expenses across 2026
  const expDefs = [['Utilities', 'Electricity bill', 8500], ['Fuel', 'Generator fuel', 12000], ['Office Supplies', 'Cleaning materials', 4500], ['Maintenance', 'Kitchen repair', 25000], ['Internet', 'Monthly internet', 3000], ['Transport', 'Staff transport', 7500], ['Miscellaneous', 'Other expenses', 2300], ['Rent', 'Office rent', 40000], ['Gas', 'Kitchen gas cylinders', 9000]]
  let ex = 1
  for (let m = 1; m <= 10; m++) {
    for (let j = 0; j < 3; j++) {
      const [category, description, amt] = expDefs[(m + j * 3) % expDefs.length]
      db.expenses.push({ id: `exp-${key}-${pad(ex++)}`, tenantId: t, date: iso(2026, m, int(1, 27)), category, description, amount: money(amt * (0.8 + rnd() * 0.6)), paymentMethod: pick(['Cash', 'Cash', 'Bank']), paidBy: 'Admin', reference: '', notes: '' })
    }
  }

  // external income
  const incDefs = [['Parking', 'Event parking fees', 6000], ['Recycling', 'Sold plastic bottles', 3500], ['Other', 'Chair rental', 9000], ['Parking', 'Weekend parking', 5000], ['Recycling', 'Sold cardboard', 2200], ['Other', 'Stage rental', 12000]]
  incDefs.forEach(([source, description, amt], i) => db.externalIncome.push({ id: `inc-${key}-${pad(i + 1)}`, tenantId: t, date: iso(2026, 5 + i, int(1, 27)), source, description, amount: money(amt), receivedBy: 'Admin', notes: '' }))
}

db.activity = [
  { id: 'act-1', date: '2026-10-27T09:12:00', message: 'Kabul Grand Hotel upgraded to Enterprise plan' },
  { id: 'act-2', date: '2026-10-25T14:40:00', message: 'Example Palace account suspended (payment overdue)' },
  { id: 'act-3', date: '2026-10-20T11:05:00', message: 'Royal Wedding Hall added 3 new users' },
  { id: 'act-4', date: '2026-10-12T16:30:00', message: 'Platform maintenance completed' },
]

writeFileSync(new URL('../db.json', import.meta.url), JSON.stringify(db, null, 2))
console.log('db.json written:', Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length])))
