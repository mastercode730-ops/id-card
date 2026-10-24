import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first if present (Neon CLI envs), then .env
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const isPostgres = Boolean(process.env.DATABASE_URL);
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✓ Connected to PostgreSQL Database (Neon)');
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqliteFilePath = path.join(dataDir, 'database.sqlite');
  sqliteDb = new DatabaseSync(sqliteFilePath);
  console.log(`✓ Connected to local SQLite Database at: ${sqliteFilePath}`);
}

/**
 * Universal Query Runner
 */
export async function query(sql, params = []) {
  if (isPostgres) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  }
}

/**
 * Single Row Query
 */
export async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Execute INSERT/UPDATE/DELETE
 */
export async function run(sql, params = []) {
  if (isPostgres) {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING *';
    }
    const res = await pgPool.query(pgSql, params);
    const firstRow = res.rows && res.rows[0] ? res.rows[0] : null;
    const lastId = firstRow ? (firstRow.id ?? null) : null;
    return { lastInsertRowid: lastId, id: lastId, row: firstRow, rowCount: res.rowCount };
  } else {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { lastInsertRowid: info.lastInsertRowid, id: info.lastInsertRowid, changes: info.changes };
  }
}

/**
 * Execute raw multi-statement SQL
 */
export async function exec(sql) {
  if (isPostgres) {
    await pgPool.query(sql);
  } else {
    sqliteDb.exec(sql);
  }
}

/**
 * Get Setting Helper
 */
export async function getSetting(key, defaultValue = '') {
  const row = await get(`SELECT setting_value FROM system_settings WHERE setting_key = ?`, [key]);
  return row ? row.setting_value : defaultValue;
}

/**
 * Set Setting Helper
 */
export async function setSetting(key, value, description = '') {
  const existing = await get(`SELECT * FROM system_settings WHERE setting_key = ?`, [key]);
  if (existing) {
    await run(`UPDATE system_settings SET setting_value = ? WHERE setting_key = ?`, [String(value), key]);
  } else {
    await run(`INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)`, [key, String(value), description]);
  }
}

/**
 * Initialize Tables & Seeds
 */
export async function initDb() {
  const idCol = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timeType = isPostgres ? 'TIMESTAMP' : 'DATETIME';

  // 1. Admin Users Table
  await exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id ${idCol},
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Administrator',
      role TEXT DEFAULT 'admin',
      created_at ${timeType} DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Registered Users Table (Card Creators with Authentication & Trial)
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${idCol},
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      trial_started_at ${timeType} DEFAULT CURRENT_TIMESTAMP,
      trial_expires_at ${timeType} NOT NULL,
      status TEXT DEFAULT 'trial',
      plan_name TEXT DEFAULT 'free_trial',
      subscription_expires_at ${timeType},
      total_cards_created INTEGER DEFAULT 0,
      created_at ${timeType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${timeType} DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. System Settings Table (Default Trial Days, etc.)
  await exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      description TEXT
    );
  `);

  // 4. Subscription Plans Table (Dynamic Pricing & Duration)
  await exec(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id ${idCol},
      plan_key TEXT UNIQUE NOT NULL,
      name_hi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      period_label TEXT NOT NULL,
      badge_text TEXT DEFAULT '',
      features_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 1
    );
  `);

  // 5. Card Creation Logs Table
  await exec(`
    CREATE TABLE IF NOT EXISTS card_logs (
      id ${idCol},
      user_id INTEGER,
      membership_no TEXT NOT NULL,
      name TEXT NOT NULL,
      father_name TEXT,
      mobile TEXT NOT NULL,
      state TEXT,
      district TEXT,
      constituency TEXT,
      conscode TEXT,
      designation TEXT,
      dob TEXT,
      caste TEXT,
      booth TEXT,
      city TEXT,
      village TEXT,
      whatsapp_number TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'pending',
      payment_screenshot_url TEXT,
      payment_amount INTEGER DEFAULT 50,
      utr_number TEXT,
      ip_address TEXT,
      created_at ${timeType} DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure user_id, city, village, status, aadhaar_no, payment columns exist on card_logs
  try { await exec(`ALTER TABLE card_logs ADD COLUMN user_id INTEGER`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN city TEXT`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN village TEXT`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN status TEXT DEFAULT 'pending'`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN aadhaar_no TEXT`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN payment_screenshot_url TEXT`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN payment_amount INTEGER DEFAULT 50`); } catch (e) {}
  try { await exec(`ALTER TABLE card_logs ADD COLUMN utr_number TEXT`); } catch (e) {}

  // 6. Dynamic Field Configuration Table
  await exec(`
    CREATE TABLE IF NOT EXISTS field_configs (
      id ${idCol},
      field_key TEXT UNIQUE NOT NULL,
      label_hi TEXT NOT NULL,
      label_en TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      is_required INTEGER NOT NULL DEFAULT 1,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      help_text TEXT DEFAULT ''
    );
  `);

  // Seed default admin if none exists
  const existingAdmin = await get(`SELECT * FROM admin_users WHERE username = ?`, ['Indian National Lokdal']);
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Inld2029', salt);
    await run(
      `INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['Indian National Lokdal', hash, 'Indian National Lokdal', 'superadmin']
    );
    console.log('✓ Seeded default admin user: username=Indian National Lokdal, password=Inld2029');
  }

  // Seed default system settings if empty
  const defaultTrialDays = await getSetting('default_trial_days');
  if (!defaultTrialDays) {
    await setSetting('default_trial_days', '7', 'नए उपयोगकर्ताओं के लिए निःशुल्क ट्रायल के दिन');
    await setSetting('trial_enabled', '1', 'क्या फ्री ट्रायल सक्षम है');
    console.log('✓ Seeded default system settings: trial=7 days');
  }

  // Seed default subscription plans if empty
  const planCountRow = await get(`SELECT COUNT(*) as count FROM subscription_plans`);
  const planCount = planCountRow ? Number(planCountRow.count || planCountRow.COUNT || 0) : 0;
  if (planCount === 0) {
    const defaultPlans = [
      {
        key: 'monthly',
        hi: 'मासिक',
        en: 'Monthly Plan',
        price: 99,
        days: 30,
        period: 'प्रति महीना (1 Month)',
        badge: '',
        features: JSON.stringify([
          'असीमित HD कार्ड जनरेशन',
          'Front & Back दोनों साइड्स',
          '300 DPI प्रिंट-रेडी PDF'
        ]),
        active: 1,
        order: 1
      },
      {
        key: 'yearly',
        hi: 'वार्षिक',
        en: 'Yearly Plan',
        price: 499,
        days: 365,
        period: 'पूरे 1 वर्ष हेतु (1 Year)',
        badge: 'सर्वाधिक लोकप्रिय (Best Value)',
        features: JSON.stringify([
          'असीमित HD कार्ड निर्माण',
          'फ्रंट व बैक दोनों साइड्स',
          '2-पेज सम्पूर्ण PDF एक्सपोर्ट',
          'WhatsApp डायरेक्ट सेंड',
          '60% की भारी बचत'
        ]),
        active: 1,
        order: 2
      },
      {
        key: 'lifetime',
        hi: 'लाइफटाइम',
        en: 'Lifetime Access',
        price: 999,
        days: 36500,
        period: 'एक बार भुगतान (Lifetime)',
        badge: 'वीआईपी (VIP)',
        features: JSON.stringify([
          'हमेशा के लिए असीमित कार्ड्स',
          'वीआईपी प्राथमिकता सपोर्ट',
          'भविष्य के सभी नए फ़ीचर्स'
        ]),
        active: 1,
        order: 3
      }
    ];

    for (const p of defaultPlans) {
      await run(
        `INSERT INTO subscription_plans (plan_key, name_hi, name_en, price, duration_days, period_label, badge_text, features_json, is_active, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.key, p.hi, p.en, p.price, p.days, p.period, p.badge, p.features, p.active, p.order]
      );
    }
    console.log('✓ Seeded default subscription plans');
  }

  // Seed default field configurations if empty
  const fieldCountRow = await get(`SELECT COUNT(*) as count FROM field_configs`);
  const fieldCount = fieldCountRow ? Number(fieldCountRow.count || fieldCountRow.COUNT || 0) : 0;

  if (fieldCount === 0) {
    const defaultFields = [
      { key: 'photoInput', hi: 'फ़ोटो (Member Photo)', en: 'Passport Photo', type: 'file', req: 1, enab: 1, order: 1, help: 'सदस्य की पासपोर्ट साइज फोटो अपलोड करें' },
      { key: 'inputName', hi: 'सदस्य का पूरा नाम (Full Name)', en: 'Full Name', type: 'text', req: 1, enab: 1, order: 2, help: 'जैसे: Ravi Kant' },
      { key: 'inputFather', hi: 'पिताजी का नाम (Father Name)', en: 'Father Name', type: 'text', req: 1, enab: 1, order: 3, help: 'जैसे: Omparkash' },
      { key: 'inputMobile', hi: 'मोबाइल नंबर (Mobile No)', en: 'Mobile Number', type: 'tel', req: 1, enab: 1, order: 4, help: '10 अंकों का मोबाइल नंबर' },
      { key: 'selectState', hi: 'राज्य (State)', en: 'State', type: 'select', req: 1, enab: 1, order: 5, help: 'राज्य चुनें' },
      { key: 'selectDistrict', hi: 'ज़िला (District)', en: 'District', type: 'select', req: 1, enab: 1, order: 6, help: 'ज़िला चुनें' },
      { key: 'inputCity', hi: 'शहर (City)', en: 'City', type: 'text', req: 0, enab: 1, order: 7, help: 'शहर का नाम (यदि लागू हो)' },
      { key: 'inputVillage', hi: 'गांव (Village)', en: 'Village', type: 'text', req: 0, enab: 1, order: 8, help: 'गांव का नाम (यदि लागू हो)' },
      { key: 'inputConstituency', hi: 'विधानसभा क्षेत्र (Constituency)', en: 'Constituency', type: 'text', req: 1, enab: 1, order: 9, help: 'विधानसभा का नाम' },
      { key: 'inputConscode', hi: 'विधानसभा कोड (Constituency Code)', en: 'Constituency Code', type: 'text', req: 0, enab: 0, order: 10, help: 'जैसे: 45' },
      { key: 'inputDesignation', hi: 'पद / दायित्व (Designation)', en: 'Designation', type: 'text', req: 1, enab: 1, order: 11, help: 'पार्टी में पद' },
      { key: 'inputDob', hi: 'जन्म तिथि (Date of Birth)', en: 'Date of Birth', type: 'text', req: 1, enab: 1, order: 12, help: 'DD/MM/YYYY' },
      { key: 'inputCaste', hi: 'जाति / वर्ग (Caste)', en: 'Caste', type: 'text', req: 1, enab: 1, order: 13, help: 'जैसे: Jat, Gen(Brahmin), OBC...' },
      { key: 'inputBooth', hi: 'बूथ नंबर (Booth No)', en: 'Booth Number', type: 'text', req: 1, enab: 1, order: 14, help: 'बूथ नंबर' },
      { key: 'whatsappNumber', hi: 'WhatsApp नंबर (Card Delivery)', en: 'WhatsApp Number', type: 'tel', req: 1, enab: 1, order: 15, help: 'जिस नंबर पर कार्ड भेजना है' }
    ];

    for (const f of defaultFields) {
      await run(
        `INSERT INTO field_configs (field_key, label_hi, label_en, field_type, is_required, is_enabled, display_order, help_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.key, f.hi, f.en, f.type, f.req, f.enab, f.order, f.help]
      );
    }
    console.log('✓ Seeded default form field configurations');
  } else {
    // Ensure inputCity and inputVillage exist in existing field_configs
    try {
      const cityField = await get(`SELECT id FROM field_configs WHERE field_key = 'inputCity'`);
      if (!cityField) {
        await run(
          `INSERT INTO field_configs (field_key, label_hi, label_en, field_type, is_required, is_enabled, display_order, help_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['inputCity', 'शहर (City)', 'City', 'text', 0, 1, 7, 'शहर का नाम (यदि लागू हो)']
        );
        console.log('✓ Added inputCity to existing field_configs');
      }
      const villageField = await get(`SELECT id FROM field_configs WHERE field_key = 'inputVillage'`);
      if (!villageField) {
        await run(
          `INSERT INTO field_configs (field_key, label_hi, label_en, field_type, is_required, is_enabled, display_order, help_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['inputVillage', 'गांव (Village)', 'Village', 'text', 0, 1, 8, 'गांव का नाम (यदि लागू हो)']
        );
        console.log('✓ Added inputVillage to existing field_configs');
      }

      const aadhaarField = await get(`SELECT id FROM field_configs WHERE field_key = 'inputAadhaar'`);
      if (!aadhaarField) {
        await run(
          `INSERT INTO field_configs (field_key, label_hi, label_en, field_type, is_required, is_enabled, display_order, help_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['inputAadhaar', 'आधार नंबर (Aadhaar No)', 'Aadhaar Number', 'text', 0, 1, 16, '12 अंकों का आधार नंबर']
        );
        console.log('✓ Added inputAadhaar to existing field_configs');
      }

      // Ensure inputConscode is disabled by default unless admin modified
      await run(`UPDATE field_configs SET is_enabled = 0, is_required = 0 WHERE field_key = 'inputConscode' AND is_enabled = 1`);
    } catch (err) {
      console.warn('Field sync error:', err.message);
    }
  }
}
