import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { pool, withTransaction } from '../config/db.js';
import { initializeDatabase } from './init.js';

const __filename = fileURLToPath(import.meta.url);

export async function seedDatabase({ force = false } = {}) {
  await initializeDatabase();

  const existingUsers = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (existingUsers.rows[0].count > 0 && !force) {
    console.log('Database already seeded. Skipping seed (pass --force to reset).');
    return;
  }

  await withTransaction(async (client) => {
    if (force) {
      await client.query(`
        TRUNCATE TABLE
          stock_movements,
          sale_items,
          sales,
          inventory,
          products,
          customers,
          suppliers,
          categories,
          users
        RESTART IDENTITY CASCADE
      `);
    }

    const adminHash = await bcrypt.hash(env.demoAdminPassword, 10);
    const studentHash = await bcrypt.hash(env.demoStudentPassword, 10);

    const userRes = await client.query(
      `INSERT INTO users (username, full_name, email, password_hash, role, is_active)
       VALUES
         ($1, 'Store Administrator', 'admin@abes.ac.in', $2, 'admin', TRUE),
         ($3, 'Student Operator', 'student.demo@abes.ac.in', $4, 'student', TRUE),
         ('chirag.cse15', 'Chirag Kumar', 'chirag.cse15@abes.ac.in', $2, 'admin', TRUE),
         ('dev.cse15', 'Dev Malik', 'dev.cse15@abes.ac.in', $4, 'student', TRUE)
       RETURNING id, username, role`,
      [env.demoAdminUsername, adminHash, env.demoStudentUsername, studentHash]
    );
    const adminId = userRes.rows[0].id;
    const studentId = userRes.rows[1].id;

    await client.query(
      `INSERT INTO store_settings (
        id, store_name, institution_name, address, phone, email,
        currency_symbol, default_tax_rate, invoice_prefix, student_can_create_sales, updated_by
      ) VALUES (
        1, 'Store Automation', 'ABESEC Ghaziabad',
        '19th KM Stone, NH-09, Ghaziabad, Uttar Pradesh 201009',
        '+91-120-7135112', 'store@abes.ac.in',
        '₹', 0, 'INV', TRUE, $1
      )
      ON CONFLICT (id) DO UPDATE SET updated_by = EXCLUDED.updated_by`,
      [adminId]
    );

    const catRes = await client.query(
      `INSERT INTO categories (name, description) VALUES
        ('Electronics & Accessories', 'USB drives, mice, cables, calculators, and tech essentials'),
        ('Stationery & Supplies', 'Notebooks, pens, engineering drawing sheets, and folders'),
        ('Lab & Engineering Kits', 'Breadboards, Arduino kits, multimeters, and lab coats'),
        ('Campus Apparel', 'College hoodies, t-shirts, and ID lanyards'),
        ('Books & Manuals', 'Lab manuals, reference guides, and competitive exam books')
       RETURNING id, name`
    );
    const catMap = Object.fromEntries(catRes.rows.map((c) => [c.name, c.id]));

    const supRes = await client.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
        ('TechNova Distributors', 'Rajesh Sharma', '+91-9811045231', 'sales@technovadist.in', 'Nehru Place, New Delhi'),
        ('Vidya Stationery Wholesale', 'Anil Gupta', '+91-9871234509', 'orders@vidyastationery.in', 'Raj Nagar, Ghaziabad'),
        ('ElectroLab Systems', 'Priya Verma', '+91-9910456782', 'support@electrolabsys.in', 'Sector 62, Noida'),
        ('CampusWear Apparels', 'Vikram Mehta', '+91-9818223344', 'info@campuswear.in', 'Okhla Phase II, New Delhi')
       RETURNING id, name`
    );
    const supMap = Object.fromEntries(supRes.rows.map((s) => [s.name, s.id]));

    const productSeeds = [
      ['SKU-ELC-101', 'Logitech M185 Wireless Mouse', 'Electronics & Accessories', 'TechNova Distributors', 'Compact 2.4GHz wireless optical mouse with nano receiver', 520, 749, 28, 8],
      ['SKU-ELC-102', 'SanDisk 64GB USB 3.0 Flash Drive', 'Electronics & Accessories', 'TechNova Distributors', 'High-speed USB 3.0 metal flash drive for project backups', 390, 599, 42, 10],
      ['SKU-ELC-103', 'Casio fx-991CW Scientific Calculator', 'Electronics & Accessories', 'TechNova Distributors', 'Non-programmable scientific calculator approved for university exams', 1050, 1450, 6, 8],
      ['SKU-ELC-104', 'USB-C Braided Fast Charging Cable', 'Electronics & Accessories', 'TechNova Distributors', '1.5m durable braided USB-C to USB-C 60W cable', 160, 299, 4, 10],
      ['SKU-STN-201', 'A4 Spiral Engineering Notebook (300 Pages)', 'Stationery & Supplies', 'Vidya Stationery Wholesale', '70 GSM ruled spiral notebook for semester coursework', 85, 140, 95, 20],
      ['SKU-STN-202', 'Pilot V7 Hi-Tecpoint Pen Pack (Blue, 5 pcs)', 'Stationery & Supplies', 'Vidya Stationery Wholesale', 'Smooth liquid ink rollerball pens for exams and notes', 210, 320, 36, 10],
      ['SKU-STN-203', 'Engineering Drawing Sheet Tube & Kit', 'Stationery & Supplies', 'Vidya Stationery Wholesale', 'Protective tube with mini-drafter clips and A2 sheets', 180, 280, 0, 5],
      ['SKU-LAB-301', 'Arduino Uno R3 Starter Kit', 'Lab & Engineering Kits', 'ElectroLab Systems', 'Microcontroller board with breadboard, jumper wires, LEDs, and sensors', 880, 1299, 14, 5],
      ['SKU-LAB-302', 'Digital Multimeter DT830D', 'Lab & Engineering Kits', 'ElectroLab Systems', 'Pocket digital multimeter for ECE/EEE lab experiments', 260, 425, 7, 10],
      ['SKU-LAB-303', 'White Cotton Lab Coat (Free Size)', 'Lab & Engineering Kits', 'CampusWear Apparels', 'Full-sleeve chemistry and workshop protective lab apron', 310, 499, 22, 8],
      ['SKU-APP-401', 'ABESEC Campus Navy Hoodie', 'Campus Apparel', 'CampusWear Apparels', '320 GSM fleece cotton hoodie with embroidered crest', 680, 999, 18, 6],
      ['SKU-BK-501', 'Data Structures & Algorithms Lab Manual', 'Books & Manuals', 'Vidya Stationery Wholesale', '2026 edition practical manual with C++/Java programs', 190, 295, 34, 10],
    ];

    const productIds = [];
    for (const [sku, name, catName, supName, desc, buyPrice, sellPrice, qty, minLevel] of productSeeds) {
      const prodRes = await client.query(
        `INSERT INTO products (sku, name, category_id, supplier_id, description, purchase_price, selling_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, sku, name, purchase_price, selling_price`,
        [sku, name, catMap[catName], supMap[supName], desc, buyPrice, sellPrice]
      );
      const prod = prodRes.rows[0];
      productIds.push({ ...prod, initialQty: qty, minLevel });

      await client.query(
        `INSERT INTO inventory (product_id, available_quantity, min_stock_level, last_restocked_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '15 days')`,
        [prod.id, qty, minLevel]
      );

      if (qty > 0) {
        await client.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity_change, previous_quantity, new_quantity,
            reference_type, notes, created_by, created_at
          ) VALUES ($1, 'IN', $2, 0, $2, 'opening_stock', 'Initial inventory seed', $3, NOW() - INTERVAL '15 days')`,
          [prod.id, qty, adminId]
        );
      }
    }

    const custRes = await client.query(
      `INSERT INTO customers (customer_code, name, phone, email, address, registration_date) VALUES
        ('CUST-1001', 'Aarav Singh', '+91-9810112233', 'aarav.singh@abes.ac.in', 'Hostel Block A, ABESEC Campus, Ghaziabad', CURRENT_DATE - 45),
        ('CUST-1002', 'Sneha Agarwal', '+91-9876543210', 'sneha.agarwal@abes.ac.in', 'Indirapuram, Ghaziabad', CURRENT_DATE - 30),
        ('CUST-1003', 'Rohan Tiwari', '+91-9958114422', 'rohan.tiwari@abes.ac.in', 'Crossings Republik, Ghaziabad', CURRENT_DATE - 20),
        ('CUST-1004', 'Meera Nair', '+91-9811998877', 'meera.nair@abes.ac.in', 'Vaishali Sector 4, Ghaziabad', CURRENT_DATE - 12),
        ('CUST-1005', 'Karan Malhotra', '+91-9717001122', 'karan.m@abes.ac.in', 'Kavi Nagar, Ghaziabad', CURRENT_DATE - 5)
       RETURNING id, name`
    );
    const customers = custRes.rows;

    // Seed realistic historical sales across different days/months without altering current target stock
    const sampleSales = [
      {
        invoice: 'INV-2026-0001',
        customerIdx: 0,
        soldBy: adminId,
        daysAgo: 62,
        payment: 'UPI',
        discountType: 'flat',
        discountVal: 0,
        items: [
          { prodIdx: 0, qty: 2 },
          { prodIdx: 4, qty: 4 },
        ],
      },
      {
        invoice: 'INV-2026-0002',
        customerIdx: 1,
        soldBy: studentId,
        daysAgo: 35,
        payment: 'Card',
        discountType: 'percent',
        discountVal: 5,
        items: [
          { prodIdx: 7, qty: 2 },
          { prodIdx: 11, qty: 3 },
        ],
      },
      {
        invoice: 'INV-2026-0003',
        customerIdx: 2,
        soldBy: adminId,
        daysAgo: 18,
        payment: 'Cash',
        discountType: 'flat',
        discountVal: 50,
        items: [
          { prodIdx: 2, qty: 1 },
          { prodIdx: 5, qty: 2 },
        ],
      },
      {
        invoice: 'INV-2026-0004',
        customerIdx: 3,
        soldBy: studentId,
        daysAgo: 7,
        payment: 'UPI',
        discountType: 'flat',
        discountVal: 0,
        items: [
          { prodIdx: 1, qty: 3 },
          { prodIdx: 10, qty: 2 },
        ],
      },
      {
        invoice: 'INV-2026-0005',
        customerIdx: 4,
        soldBy: adminId,
        daysAgo: 2,
        payment: 'UPI',
        discountType: 'flat',
        discountVal: 100,
        items: [
          { prodIdx: 8, qty: 2 },
          { prodIdx: 9, qty: 3 },
          { prodIdx: 4, qty: 5 },
        ],
      },
      {
        invoice: 'INV-2026-0006',
        customerIdx: 0,
        soldBy: studentId,
        daysAgo: 0,
        payment: 'Cash',
        discountType: 'flat',
        discountVal: 0,
        items: [
          { prodIdx: 3, qty: 2 },
          { prodIdx: 11, qty: 2 },
        ],
      },
    ];

    for (const sale of sampleSales) {
      let subtotal = 0;
      const lineItems = sale.items.map(({ prodIdx, qty }) => {
        const p = productIds[prodIdx];
        const unitPrice = Number(p.selling_price);
        const buyPrice = Number(p.purchase_price);
        const lineTotal = Number((unitPrice * qty).toFixed(2));
        subtotal += lineTotal;
        return { p, qty, unitPrice, buyPrice, lineTotal };
      });
      subtotal = Number(subtotal.toFixed(2));
      const discountAmount =
        sale.discountType === 'percent'
          ? Number(((subtotal * sale.discountVal) / 100).toFixed(2))
          : Math.min(sale.discountVal, subtotal);
      const totalAmount = Number((subtotal - discountAmount).toFixed(2));

      const saleRes = await client.query(
        `INSERT INTO sales (
          invoice_number, customer_id, sold_by, subtotal,
          discount_type, discount_value, discount_amount,
          tax_rate, tax_amount, total_amount, payment_method, status, sale_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 0, 0, $8, $9, 'completed',
          NOW() - ($10 || ' days')::INTERVAL
        ) RETURNING id`,
        [
          sale.invoice,
          customers[sale.customerIdx].id,
          sale.soldBy,
          subtotal,
          sale.discountType,
          sale.discountVal,
          discountAmount,
          totalAmount,
          sale.payment,
          String(sale.daysAgo),
        ]
      );
      const saleId = saleRes.rows[0].id;

      for (const item of lineItems) {
        await client.query(
          `INSERT INTO sale_items (
            sale_id, product_id, product_name, sku, quantity, unit_price, purchase_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            saleId,
            item.p.id,
            item.p.name,
            item.p.sku,
            item.qty,
            item.unitPrice,
            item.buyPrice,
            item.lineTotal,
          ]
        );

        await client.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity_change, previous_quantity, new_quantity,
            reference_type, reference_id, notes, created_by, created_at
          ) VALUES (
            $1, 'SALE', $2, $3, $4, 'sale', $5, $6, $7,
            NOW() - ($8 || ' days')::INTERVAL
          )`,
          [
            item.p.id,
            -item.qty,
            item.p.initialQty + item.qty,
            item.p.initialQty,
            saleId,
            `Invoice ${sale.invoice}`,
            sale.soldBy,
            String(sale.daysAgo),
          ]
        );
      }
    }

    console.log('Seed data inserted successfully.');
  });
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const force = process.argv.includes('--force');
  seedDatabase({ force })
    .then(() => {
      console.log('Seed completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
