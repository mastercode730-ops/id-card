import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPostgres = Boolean(process.env.DATABASE_URL);
let pgPool = null;
let sqliteDb = null;

// Ensure local data directory exists for SQLite
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqliteFilePath = path.join(dataDir, 'database.sqlite');

if (isPostgres) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('✓ Connected to PostgreSQL Database');
} else {
  sqliteDb = new DatabaseSync(sqliteFilePath);
  console.log(`✓ Connected to local SQLite Database at: ${sqliteFilePath}`);
}

/**
 * Universal Query Runner
 */
export async function query(sql, params = []) {
  if (isPostgres) {
    // Translate ? placeholders to $1, $2, etc. for PostgreSQL
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
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return { rowCount: res.rowCount };
  } else {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
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
 * Initialize Tables & Seeds
 */
export async function initDb() {
  // 1. Admin Users Table
  await exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Administrator',
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Card Creation Logs Table
  await exec(`
    CREATE TABLE IF NOT EXISTS card_logs (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
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
      whatsapp_number TEXT,
      photo_url TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Dynamic Field Configuration Table
  await exec(`
    CREATE TABLE IF NOT EXISTS field_configs (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
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

  // 4. User Subscriptions and 7-day Trial Table
  await exec(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY ${isPostgres ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
      phone TEXT UNIQUE NOT NULL,
      trial_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      trial_expires_at DATETIME NOT NULL,
      status TEXT DEFAULT 'trial',
      plan_name TEXT DEFAULT 'free_trial',
      subscription_expires_at DATETIME,
      total_cards_created INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if none exists
  const existingAdmin = await get(`SELECT * FROM admin_users WHERE username = ?`, ['admin']);
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await run(
      `INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['admin', hash, 'INLD Admin', 'superadmin']
    );
    console.log('✓ Seeded default admin user: username=admin, password=admin123');
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
      { key: 'inputConstituency', hi: 'विधानसभा क्षेत्र (Constituency)', en: 'Constituency', type: 'text', req: 1, enab: 1, order: 7, help: 'विधानसभा का नाम' },
      { key: 'inputConscode', hi: 'विधानसभा कोड (Constituency Code)', en: 'Constituency Code', type: 'text', req: 1, enab: 1, order: 8, help: 'जैसे: 45' },
      { key: 'inputDesignation', hi: 'पद / दायित्व (Designation)', en: 'Designation', type: 'text', req: 1, enab: 1, order: 9, help: 'पार्टी में पद' },
      { key: 'inputDob', hi: 'जन्म तिथि (Date of Birth)', en: 'Date of Birth', type: 'text', req: 1, enab: 1, order: 10, help: 'DD/MM/YYYY' },
      { key: 'inputCaste', hi: 'जाति / वर्ग (Caste)', en: 'Caste', type: 'text', req: 1, enab: 1, order: 11, help: 'जैसे: Jat, Gen(Brahmin), OBC...' },
      { key: 'inputBooth', hi: 'बूथ नंबर (Booth No)', en: 'Booth Number', type: 'text', req: 1, enab: 1, order: 12, help: 'बूथ नंबर' },
      { key: 'whatsappNumber', hi: 'WhatsApp नंबर (Card Delivery)', en: 'WhatsApp Number', type: 'tel', req: 1, enab: 1, order: 13, help: 'जिस नंबर पर कार्ड भेजना है' }
    ];

    for (const f of defaultFields) {
      await run(
        `INSERT INTO field_configs (field_key, label_hi, label_en, field_type, is_required, is_enabled, display_order, help_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.key, f.hi, f.en, f.type, f.req, f.enab, f.order, f.help]
      );
    }
    console.log('✓ Seeded default form field configurations');
  }
}
