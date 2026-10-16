import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, get, run, getSetting, setSetting } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first if present, then .env
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'inld_super_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Admin Auth Middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
}

// User Auth Middleware (Optional / Required)
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'कृपया पहले लॉगिन करें।' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।' });
  }
}

function optionalUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  next();
}

// Phone normalizer
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

// Dynamic Free Trial Cache & Helpers
let currentTrialDaysCache = 7;

async function getActiveTrialDays() {
  try {
    const val = await getSetting('default_trial_days', '7');
    currentTrialDaysCache = Math.max(0, parseInt(val, 10) || 7);
  } catch (err) {
    // keep cached value
  }
  return currentTrialDaysCache;
}

// Synchronize all existing trial users with the active trial days setting
async function syncExistingTrialUsers(trialDays = null) {
  try {
    const days = trialDays !== null ? trialDays : await getActiveTrialDays();
    const trialUsers = await query(`SELECT id, trial_started_at FROM users WHERE plan_name = 'free_trial' OR status = 'trial'`);
    for (const u of trialUsers) {
      const started = u.trial_started_at ? new Date(u.trial_started_at) : new Date();
      const newExpiry = new Date(started.getTime() + days * 24 * 60 * 60 * 1000);
      await run(
        `UPDATE users SET trial_expires_at = ?, updated_at = ? WHERE id = ?`,
        [newExpiry.toISOString(), new Date().toISOString(), u.id]
      );
    }
    console.log(`✓ Synchronized ${trialUsers.length} existing trial users with ${days} trial days.`);
  } catch (err) {
    console.error('Error syncing existing trial users:', err);
  }
}

// Evaluate User Subscription & Trial Dynamically
function evaluateUserStatus(user, activeTrialDays = currentTrialDaysCache) {
  const now = new Date();
  const subExpires = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;

  const isSubscribed = Boolean(
    user.status === 'active' && (!subExpires || subExpires > now)
  );

  let trialExpires;
  if (!isSubscribed && (user.plan_name === 'free_trial' || user.status === 'trial')) {
    // Dynamically calculate trial expiry using the user's trial_started_at + current active system trial days
    const started = user.trial_started_at ? new Date(user.trial_started_at) : now;
    trialExpires = new Date(started.getTime() + activeTrialDays * 24 * 60 * 60 * 1000);
  } else {
    trialExpires = user.trial_expires_at ? new Date(user.trial_expires_at) : now;
  }

  const msRemaining = trialExpires.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialActive = !isSubscribed && msRemaining > 0 && user.status !== 'blocked';
  const isExpired = !isSubscribed && !isTrialActive;

  let currentStatus = user.status;
  if (isSubscribed) {
    currentStatus = 'active';
  } else if (isTrialActive) {
    currentStatus = 'trial';
  } else if (user.status !== 'blocked') {
    currentStatus = 'expired';
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email || '',
    status: currentStatus,
    planName: user.plan_name || 'free_trial',
    isSubscribed,
    isTrialActive,
    canGenerateCard: isSubscribed || isTrialActive,
    daysRemaining,
    trialStartedAt: user.trial_started_at,
    trialExpiresAt: trialExpires.toISOString(),
    subscriptionExpiresAt: user.subscription_expires_at,
    totalCardsCreated: Number(user.total_cards_created || 0)
  };
}

// ==========================================
// 1. END-USER AUTHENTICATION (REGISTER / LOGIN)
// ==========================================

// User Registration: Starts Free Trial Automatically
app.post('/api/user/register', async (req, res) => {
  try {
    const { name, phone: rawPhone, email, password } = req.body;
    const phone = normalizePhone(rawPhone);

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'कृपया अपना पूरा नाम दर्ज करें।' });
    }
    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, error: 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' });
    }

    // Check if phone already registered
    const existingUser = await get(`SELECT * FROM users WHERE phone = ?`, [phone]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'यह मोबाइल नंबर पहले से पंजीकृत है। कृपया लॉगिन करें।'
      });
    }

    // Read admin-configured default trial days
    const trialDaysSetting = await getSetting('default_trial_days', '7');
    const trialDays = Math.max(1, parseInt(trialDaysSetting, 10) || 7);

    const now = new Date();
    const trialExpires = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertRes = await run(
      `INSERT INTO users (name, phone, email, password_hash, trial_started_at, trial_expires_at, status, plan_name, total_cards_created)
       VALUES (?, ?, ?, ?, ?, ?, 'trial', 'free_trial', 0)`,
      [name.trim(), phone, email?.trim() || null, passwordHash, now.toISOString(), trialExpires.toISOString()]
    );

    const userId = insertRes.lastInsertRowid || insertRes.id;
    const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);

    // Issue JWT Token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, name: user.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✓ New User Registered: ${user.name} (${user.phone}) with ${trialDays}-day free trial`);

    res.json({
      success: true,
      message: `पंजीकरण सफल! आपका ${trialDays} दिन का निःशुल्क ट्रायल शुरू हो गया है।`,
      token,
      user: evaluateUserStatus(user),
      trialDays
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'पंजीकरण में त्रुटि हुई। कृपया पुनः प्रयास करें।' });
  }
});

// User Login
app.post('/api/user/login', async (req, res) => {
  try {
    const { phone, phoneOrEmail, email, password } = req.body;
    const cleanInput = String(phone || phoneOrEmail || email || '').trim();
    if (!cleanInput || !password) {
      return res.status(400).json({ success: false, error: 'मोबाइल नंबर और पासवर्ड आवश्यक हैं।' });
    }

    const phoneDigits = normalizePhone(cleanInput);

    let user = null;
    if (phoneDigits.length >= 10) {
      user = await get(`SELECT * FROM users WHERE phone = ?`, [phoneDigits]);
    }

    if (!user) {
      user = await get(`SELECT * FROM users WHERE email = ?`, [cleanInput]);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'यह मोबाइल नंबर पंजीकृत नहीं है। कृपया पहले नया अकाउंट रजिस्टर करें।'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'गलत पासवर्ड दर्ज किया गया है।' });
    }

    // Issue JWT Token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, name: user.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: `स्वागत है, ${user.name}!`,
      token,
      user: evaluateUserStatus(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'लॉगिन में त्रुटि हुई।' });
  }
});

// Current User Profile & Fresh Status Check
app.get('/api/user/me', authenticateUser, async (req, res) => {
  try {
    const user = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'उपयोगकर्ता नहीं मिला।' });
    }
    const activeTrialDays = await getActiveTrialDays();
    res.json({ success: true, user: evaluateUserStatus(user, activeTrialDays) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'उपयोगकर्ता स्थिति प्राप्त करने में त्रुटि।' });
  }
});

// User Subscribes to a Plan
app.post('/api/user/subscribe', authenticateUser, async (req, res) => {
  try {
    const { planKey } = req.body;
    if (!planKey) {
      return res.status(400).json({ success: false, error: 'प्लान का चयन आवश्यक है।' });
    }

    const plan = await get(`SELECT * FROM subscription_plans WHERE plan_key = ? AND is_active = 1`, [planKey]);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'चयनित प्लान उपलब्ध नहीं है।' });
    }

    const now = new Date();
    const durationDays = Number(plan.duration_days) || 30;
    const subExpires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await run(
      `UPDATE users
       SET status = 'active', plan_name = ?, subscription_expires_at = ?, updated_at = ?
       WHERE id = ?`,
      [plan.name_hi || plan.plan_key, subExpires.toISOString(), now.toISOString(), req.user.id]
    );

    const updated = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    res.json({
      success: true,
      message: `बधाई! ${plan.name_hi} प्रीमियम प्लान सफलतापूर्वक सक्रिय हो गया!`,
      user: evaluateUserStatus(updated)
    });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ success: false, error: 'सब्सक्रिप्शन सक्रिय करने में त्रुटि।' });
  }
});

// Public: Get Active Subscription Plans & Current Trial Days Setting
app.get('/api/subscription-plans', async (req, res) => {
  try {
    const plans = await query(
      `SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC`
    );
    const trialDays = await getSetting('default_trial_days', '7');
    const trialEnabled = await getSetting('trial_enabled', '1');

    res.json({
      success: true,
      trialDays: parseInt(trialDays, 10) || 7,
      trialEnabled: trialEnabled === '1',
      plans: plans.map(p => ({
        ...p,
        features: p.features_json ? JSON.parse(p.features_json) : []
      }))
    });
  } catch (err) {
    console.error('Fetch plans error:', err);
    res.status(500).json({ success: false, error: 'प्लान्स लोड करने में त्रुटि।' });
  }
});

// ==========================================
// 2. CARD GENERATION & LOGS
// ==========================================

// Create Card Log
app.post('/api/cards', optionalUserAuth, async (req, res) => {
  try {
    const data = req.body;
    let user = null;

    if (req.user?.id) {
      user = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    } else {
      const phone = normalizePhone(data.mobile || data.whatsappNumber);
      if (phone) {
        user = await get(`SELECT * FROM users WHERE phone = ?`, [phone]);
      }
    }

    if (user) {
      // Increment card counter for user
      await run(
        `UPDATE users SET total_cards_created = total_cards_created + 1, updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), user.id]
      );
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Insert card log / request
    const result = await run(
      `INSERT INTO card_logs (
        user_id, membership_no, name, father_name, mobile, state, district,
        city, village, constituency, conscode, designation, dob, caste, booth,
        whatsapp_number, photo_url, status, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user ? user.id : null,
        data.membershipNo || '',
        data.name || '',
        data.father || '',
        data.mobile || '',
        data.state || '',
        data.district || '',
        data.city || '',
        data.village || '',
        data.constituency || '',
        data.conscode || '',
        data.designation || '',
        data.dob || '',
        data.caste || '',
        data.booth || '',
        data.whatsappNumber || '',
        data.photoThumb || '',
        data.status || 'pending',
        ipAddress
      ]
    );

    res.json({
      success: true,
      message: 'पहचान पत्र रिकॉर्ड सुरक्षित कर लिया गया।',
      id: result.lastInsertRowid || result.id
    });
  } catch (err) {
    console.error('Card log creation error:', err);
    res.status(500).json({ success: false, error: 'कार्ड रिकॉर्ड सहेजने में त्रुटि हुई।' });
  }
});

// Admin: Get all card logs
app.get('/api/cards', authenticateAdmin, async (req, res) => {
  try {
    const { q, state, district, status, limit = 100, offset = 0 } = req.query;

    let sql = `SELECT * FROM card_logs WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (q) {
      sql += ` AND (name LIKE ? OR mobile LIKE ? OR father_name LIKE ? OR constituency LIKE ? OR caste LIKE ?)`;
      const searchParam = `%${q.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (state && state !== 'all') {
      sql += ` AND state = ?`;
      params.push(state);
    }

    if (district && district !== 'all') {
      sql += ` AND district = ?`;
      params.push(district);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const logs = await query(sql, params);
    const totalRow = await get(`SELECT COUNT(*) as count FROM card_logs`);

    res.json({
      success: true,
      total: Number(totalRow.count || totalRow.COUNT || 0),
      logs
    });
  } catch (err) {
    console.error('Fetch card logs error:', err);
    res.status(500).json({ success: false, error: 'कार्ड लॉग्स लोड करने में त्रुटि।' });
  }
});

// Admin: Update card log / member request details
app.put('/api/cards/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;

    const existing = await get(`SELECT * FROM card_logs WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'कार्ड रिकॉर्ड नहीं मिला।' });
    }

    const photoUrl = d.photo_url || d.photoThumb || existing.photo_url;

    await run(
      `UPDATE card_logs
       SET name = ?, father_name = ?, mobile = ?, state = ?, district = ?,
           city = ?, village = ?, constituency = ?, conscode = ?,
           designation = ?, dob = ?, caste = ?, booth = ?,
           whatsapp_number = ?, photo_url = ?, status = ?
       WHERE id = ?`,
      [
        d.name !== undefined ? d.name : existing.name,
        d.father_name !== undefined ? d.father_name : (d.father !== undefined ? d.father : existing.father_name),
        d.mobile !== undefined ? d.mobile : existing.mobile,
        d.state !== undefined ? d.state : existing.state,
        d.district !== undefined ? d.district : existing.district,
        d.city !== undefined ? d.city : existing.city,
        d.village !== undefined ? d.village : existing.village,
        d.constituency !== undefined ? d.constituency : existing.constituency,
        d.conscode !== undefined ? d.conscode : existing.conscode,
        d.designation !== undefined ? d.designation : existing.designation,
        d.dob !== undefined ? d.dob : existing.dob,
        d.caste !== undefined ? d.caste : existing.caste,
        d.booth !== undefined ? d.booth : existing.booth,
        d.whatsapp_number !== undefined ? d.whatsapp_number : (d.whatsappNumber !== undefined ? d.whatsappNumber : existing.whatsapp_number),
        photoUrl,
        d.status !== undefined ? d.status : (existing.status || 'pending'),
        id
      ]
    );

    const updated = await get(`SELECT * FROM card_logs WHERE id = ?`, [id]);
    res.json({ success: true, message: 'सदस्यता विवरण सफलतापूर्वक अपडेट कर दिया गया।', card: updated });
  } catch (err) {
    console.error('Update card log error:', err);
    res.status(500).json({ success: false, error: 'कार्ड विवरण अपडेट करने में त्रुटि।' });
  }
});

// Admin: Delete card log
app.delete('/api/cards/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM card_logs WHERE id = ?`, [id]);
    res.json({ success: true, message: 'कार्ड लॉग सफलतापूर्वक हटा दिया गया।' });
  } catch (err) {
    console.error('Delete card log error:', err);
    res.status(500).json({ success: false, error: 'कार्ड लॉग हटाने में त्रुटि।' });
  }
});

// ==========================================
// 3. ADMIN AUTHENTICATION
// ==========================================

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'यूजरनेम और पासवर्ड आवश्यक हैं।' });
    }

    const admin = await get(`SELECT * FROM admin_users WHERE username = ?`, [username.trim()]);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'अमान्य यूजरनेम या पासवर्ड।' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'अमान्य यूजरनेम या पासवर्ड।' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'लॉगिन में त्रुटि हुई।' });
  }
});

// Verify Admin Token
app.get('/api/auth/verify', authenticateAdmin, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Change Admin Password
app.post('/api/auth/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'दोनों पासवर्ड फ़ील्ड आवश्यक हैं।' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' });
    }

    const admin = await get(`SELECT * FROM admin_users WHERE id = ?`, [req.admin.id]);
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'वर्तमान पासवर्ड गलत है।' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await run(`UPDATE admin_users SET password_hash = ? WHERE id = ?`, [newHash, req.admin.id]);

    res.json({ success: true, message: 'पासवर्ड सफलतापूर्वक बदल दिया गया है।' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ success: false, error: 'पासवर्ड बदलने में त्रुटि हुई।' });
  }
});

// ==========================================
// 4. ADMIN: TRIAL DAYS & SUBSCRIPTION PLANS MANAGEMENT
// ==========================================

// Get All Admin Settings (Trial Days & Subscription Plans)
app.get('/api/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const trialDays = await getSetting('default_trial_days', '7');
    const trialEnabled = await getSetting('trial_enabled', '1');
    const plans = await query(`SELECT * FROM subscription_plans ORDER BY display_order ASC`);

    res.json({
      success: true,
      trialDays: parseInt(trialDays, 10) || 7,
      trialEnabled: trialEnabled === '1',
      plans: plans.map(p => ({
        ...p,
        features: p.features_json ? JSON.parse(p.features_json) : []
      }))
    });
  } catch (err) {
    console.error('Admin settings error:', err);
    res.status(500).json({ success: false, error: 'सेटिंग्स प्राप्त करने में त्रुटि।' });
  }
});

// Update Default Free Trial Days
app.put('/api/admin/settings/trial', authenticateAdmin, async (req, res) => {
  try {
    const { trialDays, trialEnabled } = req.body;
    const days = Math.max(0, parseInt(trialDays, 10) || 7);

    await setSetting('default_trial_days', String(days), 'नए उपयोगकर्ताओं के लिए निःशुल्क ट्रायल के दिन');
    if (trialEnabled !== undefined) {
      await setSetting('trial_enabled', trialEnabled ? '1' : '0');
    }
    currentTrialDaysCache = days;

    // Dynamically synchronize all existing trial users with the updated trial days
    await syncExistingTrialUsers(days);

    console.log(`✓ Admin updated default trial days to: ${days} days & synchronized existing trial users`);
    res.json({
      success: true,
      message: `निःशुल्क ट्रायल अवधि सफलतापूर्वक ${days} दिन सेट कर दी गई है और सभी मौजूदा सदस्यों का ट्रायल अपडेट कर दिया गया है!`,
      trialDays: days
    });
  } catch (err) {
    console.error('Update trial days error:', err);
    res.status(500).json({ success: false, error: 'ट्रायल सेटिंग्स सहेजने में त्रुटि।' });
  }
});

// Update or Create Subscription Plans
app.put('/api/admin/plans', authenticateAdmin, async (req, res) => {
  try {
    const { plans } = req.body;
    if (!Array.isArray(plans)) {
      return res.status(400).json({ success: false, error: 'अमान्य प्लान्स डेटा।' });
    }

    for (const p of plans) {
      if (!p.plan_key) continue;

      const featuresJson = typeof p.features === 'string'
        ? p.features
        : JSON.stringify(Array.isArray(p.features) ? p.features : []);

      const existing = await get(`SELECT id FROM subscription_plans WHERE plan_key = ?`, [p.plan_key]);
      if (existing) {
        await run(
          `UPDATE subscription_plans
           SET name_hi = ?, name_en = ?, price = ?, duration_days = ?, period_label = ?, badge_text = ?, features_json = ?, is_active = ?, display_order = ?
           WHERE plan_key = ?`,
          [
            p.name_hi,
            p.name_en,
            Number(p.price) || 0,
            Number(p.duration_days) || 30,
            p.period_label || '',
            p.badge_text || '',
            featuresJson,
            p.is_active ? 1 : 0,
            Number(p.display_order) || 1,
            p.plan_key
          ]
        );
      } else {
        await run(
          `INSERT INTO subscription_plans (plan_key, name_hi, name_en, price, duration_days, period_label, badge_text, features_json, is_active, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.plan_key,
            p.name_hi,
            p.name_en,
            Number(p.price) || 0,
            Number(p.duration_days) || 30,
            p.period_label || '',
            p.badge_text || '',
            featuresJson,
            p.is_active ? 1 : 0,
            Number(p.display_order) || 1
          ]
        );
      }
    }

    const updatedPlans = await query(`SELECT * FROM subscription_plans ORDER BY display_order ASC`);
    res.json({
      success: true,
      message: 'सब्सक्रिप्शन प्लान्स सफलतापूर्वक अपडेट कर दिए गए हैं!',
      plans: updatedPlans.map(p => ({
        ...p,
        features: p.features_json ? JSON.parse(p.features_json) : []
      }))
    });
  } catch (err) {
    console.error('Update plans error:', err);
    res.status(500).json({ success: false, error: 'प्लान्स सहेजने में त्रुटि।' });
  }
});

// Admin: List all registered users & trial status
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const activeTrialDays = await getActiveTrialDays();
    const rows = await query(`SELECT * FROM users ORDER BY created_at DESC`);
    const evaluated = rows.map(u => evaluateUserStatus(u, activeTrialDays));
    res.json({ success: true, users: evaluated });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, error: 'उपयोगकर्ता सूची प्राप्त करने में त्रुटि।' });
  }
});

// Admin: Update user status (extend trial, activate premium, block)
app.post('/api/admin/users/update', authenticateAdmin, async (req, res) => {
  try {
    const { userId, phone: rawPhone, action, planName, extendDays = 7 } = req.body;
    const phone = normalizePhone(rawPhone);

    let user = null;
    if (userId) {
      user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
    } else if (phone) {
      user = await get(`SELECT * FROM users WHERE phone = ?`, [phone]);
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'उपयोगकर्ता नहीं मिला।' });
    }

    const now = new Date();
    if (action === 'extend_trial') {
      const baseDate = new Date(user.trial_expires_at) > now ? new Date(user.trial_expires_at) : now;
      const newExpiry = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
      await run(
        `UPDATE users SET trial_expires_at = ?, status = 'trial', updated_at = ? WHERE id = ?`,
        [newExpiry.toISOString(), now.toISOString(), user.id]
      );
    } else if (action === 'activate_premium') {
      const plan = planName || 'वार्षिक (Admin Granted)';
      const days = plan.includes('लाइफटाइम') ? 36500 : 365;
      const subExpires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await run(
        `UPDATE users SET status = 'active', plan_name = ?, subscription_expires_at = ?, updated_at = ? WHERE id = ?`,
        [plan, subExpires.toISOString(), now.toISOString(), user.id]
      );
    } else if (action === 'block') {
      await run(`UPDATE users SET status = 'blocked', updated_at = ? WHERE id = ?`, [now.toISOString(), user.id]);
    } else if (action === 'unblock') {
      await run(`UPDATE users SET status = 'trial', updated_at = ? WHERE id = ?`, [now.toISOString(), user.id]);
    }

    const updated = await get(`SELECT * FROM users WHERE id = ?`, [user.id]);
    const activeTrialDays = await getActiveTrialDays();
    res.json({
      success: true,
      message: 'उपयोगकर्ता स्थिति सफलतापूर्वक अपडेट की गई।',
      user: evaluateUserStatus(updated, activeTrialDays)
    });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ success: false, error: 'अपडेट करने में त्रुटि।' });
  }
});

// Admin Subscriptions Aliases
app.get('/api/admin/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const activeTrialDays = await getActiveTrialDays();
    const rows = await query(`SELECT * FROM users ORDER BY created_at DESC`);
    const evaluated = rows.map(u => evaluateUserStatus(u, activeTrialDays));
    res.json({ success: true, subscriptions: evaluated, users: evaluated });
  } catch (err) {
    console.error('Admin subs alias error:', err);
    res.status(500).json({ success: false, error: 'डेटा लोड करने में त्रुटि।' });
  }
});

app.post('/api/admin/subscriptions/update', authenticateAdmin, async (req, res, next) => {
  // Delegate to /api/admin/users/update logic
  req.url = '/api/admin/users/update';
  app._router.handle(req, res, next);
});


// ==========================================
// 5. FIELD CONFIGURATION ROUTES
// ==========================================

// Public: Get active form field configuration
app.get('/api/config/fields', async (req, res) => {
  try {
    const fields = await query(`SELECT * FROM field_configs ORDER BY display_order ASC`);
    res.json({ success: true, fields });
  } catch (err) {
    console.error('Fetch fields error:', err);
    res.status(500).json({ success: false, error: 'फ़ील्ड कॉन्फ़िगरेशन लोड करने में त्रुटि।' });
  }
});

// Admin: Update field configuration (Enable/disable, required, labels)
app.put('/api/config/fields', authenticateAdmin, async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) {
      return res.status(400).json({ success: false, error: 'अमान्य फ़ील्ड सूची।' });
    }

    for (const f of fields) {
      if (!f.field_key) continue;

      await run(
        `UPDATE field_configs
         SET label_hi = ?, label_en = ?, is_required = ?, is_enabled = ?, display_order = ?, help_text = ?
         WHERE field_key = ?`,
        [
          f.label_hi,
          f.label_en,
          f.is_required ? 1 : 0,
          f.is_enabled ? 1 : 0,
          Number(f.display_order || 0),
          f.help_text || '',
          f.field_key
        ]
      );
    }

    const updated = await query(`SELECT * FROM field_configs ORDER BY display_order ASC`);
    res.json({ success: true, message: 'फ़ील्ड सेटिंग्स सफलतापूर्वक अपडेट की गईं!', fields: updated });
  } catch (err) {
    console.error('Update fields error:', err);
    res.status(500).json({ success: false, error: 'फ़ील्ड सेटिंग्स सहेजने में त्रुटि।' });
  }
});

// Admin: Reset field configuration to default
app.post('/api/config/fields/reset', authenticateAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM field_configs`);
    await initDb();
    const fields = await query(`SELECT * FROM field_configs ORDER BY display_order ASC`);
    res.json({ success: true, message: 'फ़ील्ड सेटिंग्स डिफ़ॉल्ट पर रीसेट कर दी गईं!', fields });
  } catch (err) {
    console.error('Reset fields error:', err);
    res.status(500).json({ success: false, error: 'रीसेट करने में त्रुटि।' });
  }
});

// ==========================================
// 6. ADMIN ANALYTICS & STATS
// ==========================================

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const isPg = Boolean(process.env.DATABASE_URL);
    const todayCardsSql = isPg
      ? `SELECT COUNT(*) as count FROM card_logs WHERE created_at::date = CURRENT_DATE`
      : `SELECT COUNT(*) as count FROM card_logs WHERE date(created_at) = date('now')`;

    const totalCardsRow = await get(`SELECT COUNT(*) as count FROM card_logs`);
    const todayCardsRow = await get(todayCardsSql);
    const activeFieldsRow = await get(`SELECT COUNT(*) as count FROM field_configs WHERE is_enabled = 1`);
    const totalFieldsRow = await get(`SELECT COUNT(*) as count FROM field_configs`);

    res.json({
      success: true,
      stats: {
        totalCards: Number(totalCardsRow?.count || 0),
        todayCards: Number(todayCardsRow?.count || 0),
        activeFields: Number(activeFieldsRow?.count || 0),
        totalFields: Number(totalFieldsRow?.count || 14)
      }
    });
  } catch (err) {
    console.error('Fetch stats error:', err);
    res.status(500).json({ success: false, error: 'आंकड़े लोड करने में त्रुटि।' });
  }
});

let dbInitialized = false;
export async function ensureDbReady() {
  if (!dbInitialized) {
    await initDb();
    await syncExistingTrialUsers();
    dbInitialized = true;
  }
}

// Start Server
async function start() {
  try {
    await ensureDbReady();
    app.listen(PORT, () => {
      console.log(`🚀 INLD ID Card Backend Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.VERCEL !== '1') {
  start();
}

export default app;
