import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, get, run } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'inld_super_secret_jwt_key_2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Auth Middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
}

// ==========================================
// 1. AUTHENTICATION ROUTES
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
// 2. SUBSCRIPTION & 7-DAY TRIAL ROUTES
// ==========================================

// Normalize phone number (removes spaces, +, etc., keeps last 10 digits if 91 prefix)
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

// Helper to calculate trial status
function evaluateSubscription(sub) {
  const now = new Date();
  const trialExpires = new Date(sub.trial_expires_at);
  const subExpires = sub.subscription_expires_at ? new Date(sub.subscription_expires_at) : null;

  const isSubscribed = Boolean(
    sub.status === 'active' && (!subExpires || subExpires > now)
  );

  const msRemaining = trialExpires.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialActive = !isSubscribed && msRemaining > 0 && sub.status !== 'blocked';
  const isExpired = !isSubscribed && !isTrialActive;

  let currentStatus = sub.status;
  if (isSubscribed) {
    currentStatus = 'active';
  } else if (isTrialActive) {
    currentStatus = 'trial';
  } else if (sub.status !== 'blocked') {
    currentStatus = 'expired';
  }

  return {
    phone: sub.phone,
    status: currentStatus,
    planName: sub.plan_name || 'free_trial',
    isSubscribed,
    isTrialActive,
    canGenerateCard: isSubscribed || isTrialActive,
    daysRemaining,
    trialStartedAt: sub.trial_started_at,
    trialExpiresAt: sub.trial_expires_at,
    subscriptionExpiresAt: sub.subscription_expires_at,
    totalCardsCreated: Number(sub.total_cards_created || 0)
  };
}

// Check or automatically initiate 7-day trial for a phone
app.get('/api/subscriptions/check', async (req, res) => {
  try {
    const rawPhone = req.query.phone;
    const phone = normalizePhone(rawPhone);

    if (!phone || phone.length < 6) {
      return res.status(400).json({ success: false, error: 'कृपया एक मान्य फ़ोन नंबर प्रदान करें।' });
    }

    let sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);

    if (!sub) {
      // First time user: Start 7-Day Free Trial!
      const now = new Date();
      const trialExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

      await run(
        `INSERT INTO user_subscriptions (phone, trial_started_at, trial_expires_at, status, plan_name, total_cards_created)
         VALUES (?, ?, ?, 'trial', 'free_trial', 0)`,
        [phone, now.toISOString(), trialExpires.toISOString()]
      );

      sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
      console.log(`✓ New 7-day trial started for phone: ${phone}`);
    }

    const result = evaluateSubscription(sub);
    res.json({ success: true, subscription: result });
  } catch (err) {
    console.error('Check subscription error:', err);
    res.status(500).json({ success: false, error: 'सब्सक्रिप्शन स्थिति जांचने में त्रुटि हुई।' });
  }
});

// Upgrade / Subscribe to a plan
app.post('/api/subscriptions/subscribe', async (req, res) => {
  try {
    const { phone: rawPhone, planName, durationMonths = 1 } = req.body;
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return res.status(400).json({ success: false, error: 'फ़ोन नंबर आवश्यक है।' });
    }

    let sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
    const now = new Date();
    let subExpires = null;

    if (planName === 'monthly') {
      subExpires = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
    } else if (planName === 'yearly') {
      subExpires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else if (planName === 'lifetime') {
      subExpires = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
    } else {
      subExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!sub) {
      const trialExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await run(
        `INSERT INTO user_subscriptions (phone, trial_started_at, trial_expires_at, status, plan_name, subscription_expires_at, total_cards_created)
         VALUES (?, ?, ?, 'active', ?, ?, 0)`,
        [phone, now.toISOString(), trialExpires.toISOString(), planName, subExpires.toISOString()]
      );
    } else {
      await run(
        `UPDATE user_subscriptions
         SET status = 'active', plan_name = ?, subscription_expires_at = ?, updated_at = ?
         WHERE phone = ?`,
        [planName, subExpires.toISOString(), now.toISOString(), phone]
      );
    }

    const updated = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
    res.json({
      success: true,
      message: 'प्रीमियम सब्सक्रिप्शन सफलतापूर्वक सक्रिय हो गया!',
      subscription: evaluateSubscription(updated)
    });
  } catch (err) {
    console.error('Subscription purchase error:', err);
    res.status(500).json({ success: false, error: 'सब्सक्रिप्शन सक्रिय करने में त्रुटि हुई।' });
  }
});

// Admin: List all user subscriptions
app.get('/api/admin/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM user_subscriptions ORDER BY created_at DESC`);
    const evaluated = rows.map(evaluateSubscription);
    res.json({ success: true, subscriptions: evaluated });
  } catch (err) {
    console.error('Admin subscriptions error:', err);
    res.status(500).json({ success: false, error: 'सब्सक्रिप्शन सूची प्राप्त करने में त्रुटि।' });
  }
});

// Admin: Update user subscription (Extend trial, activate premium, block)
app.post('/api/admin/subscriptions/update', authenticateAdmin, async (req, res) => {
  try {
    const { phone: rawPhone, action, planName, extendDays = 7 } = req.body;
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      return res.status(400).json({ success: false, error: 'फ़ोन नंबर आवश्यक है।' });
    }

    const sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'उपयोगकर्ता नहीं मिला।' });
    }

    const now = new Date();
    if (action === 'extend_trial') {
      const baseDate = new Date(sub.trial_expires_at) > now ? new Date(sub.trial_expires_at) : now;
      const newExpiry = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
      await run(
        `UPDATE user_subscriptions SET trial_expires_at = ?, status = 'trial', updated_at = ? WHERE phone = ?`,
        [newExpiry.toISOString(), now.toISOString(), phone]
      );
    } else if (action === 'activate_premium') {
      const plan = planName || 'yearly';
      const days = plan === 'lifetime' ? 36500 : (plan === 'yearly' ? 365 : 30);
      const subExpires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await run(
        `UPDATE user_subscriptions SET status = 'active', plan_name = ?, subscription_expires_at = ?, updated_at = ? WHERE phone = ?`,
        [plan, subExpires.toISOString(), now.toISOString(), phone]
      );
    } else if (action === 'block') {
      await run(`UPDATE user_subscriptions SET status = 'blocked', updated_at = ? WHERE phone = ?`, [now.toISOString(), phone]);
    } else if (action === 'unblock') {
      await run(`UPDATE user_subscriptions SET status = 'trial', updated_at = ? WHERE phone = ?`, [now.toISOString(), phone]);
    }

    const updated = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
    res.json({
      success: true,
      message: 'उपयोगकर्ता स्थिति सफलतापूर्वक अपडेट की गई।',
      subscription: evaluateSubscription(updated)
    });
  } catch (err) {
    console.error('Admin update subscription error:', err);
    res.status(500).json({ success: false, error: 'अपडेट करने में त्रुटि।' });
  }
});

// ==========================================
// 3. CARD GENERATION & LOGS ROUTES
// ==========================================

// Create Card Log
app.post('/api/cards', async (req, res) => {
  try {
    const data = req.body;
    const phone = normalizePhone(data.mobile || data.whatsappNumber);

    // Verify trial/subscription limit before recording
    if (phone) {
      let sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
      if (!sub) {
        const now = new Date();
        const trialExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await run(
          `INSERT INTO user_subscriptions (phone, trial_started_at, trial_expires_at, status, plan_name, total_cards_created)
           VALUES (?, ?, ?, 'trial', 'free_trial', 0)`,
          [phone, now.toISOString(), trialExpires.toISOString()]
        );
        sub = await get(`SELECT * FROM user_subscriptions WHERE phone = ?`, [phone]);
      }

      const evalSub = evaluateSubscription(sub);
      if (!evalSub.canGenerateCard) {
        return res.status(403).json({
          success: false,
          error: 'आपका 7-दिन का फ्री ट्रायल समाप्त हो चुका है। कृपया पहचान पत्र बनाने हेतु सब्सक्रिप्शन लें।',
          trialExpired: true,
          subscription: evalSub
        });
      }

      // Increment card count
      await run(
        `UPDATE user_subscriptions SET total_cards_created = total_cards_created + 1, updated_at = ? WHERE phone = ?`,
        [new Date().toISOString(), phone]
      );
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Insert card log
    const result = await run(
      `INSERT INTO card_logs (
        membership_no, name, father_name, mobile, state, district,
        constituency, conscode, designation, dob, caste, booth,
        whatsapp_number, photo_url, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.membershipNo || '',
        data.name || '',
        data.father || '',
        data.mobile || '',
        data.state || '',
        data.district || '',
        data.constituency || '',
        data.conscode || '',
        data.designation || '',
        data.dob || '',
        data.caste || '',
        data.booth || '',
        data.whatsappNumber || '',
        data.photoThumb || '',
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

// Admin: Get all card logs (with search, filter, pagination)
app.get('/api/cards', authenticateAdmin, async (req, res) => {
  try {
    const { q, state, district, limit = 100, offset = 0 } = req.query;

    let sql = `SELECT * FROM card_logs WHERE 1=1`;
    const params = [];

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
// 4. FIELD CONFIGURATION ROUTES
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
// 5. ADMIN ANALYTICS & STATS
// ==========================================

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalCardsRow = await get(`SELECT COUNT(*) as count FROM card_logs`);
    const todayCardsRow = await get(
      `SELECT COUNT(*) as count FROM card_logs WHERE date(created_at) = date('now')`
    );
    const totalUsersRow = await get(`SELECT COUNT(*) as count FROM user_subscriptions`);
    const activeSubscribersRow = await get(
      `SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'`
    );
    const activeTrialsRow = await get(
      `SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'trial' AND trial_expires_at > datetime('now')`
    );

    res.json({
      success: true,
      stats: {
        totalCards: Number(totalCardsRow?.count || 0),
        todayCards: Number(todayCardsRow?.count || 0),
        totalUsers: Number(totalUsersRow?.count || 0),
        activeSubscribers: Number(activeSubscribersRow?.count || 0),
        activeTrials: Number(activeTrialsRow?.count || 0)
      }
    });
  } catch (err) {
    console.error('Fetch stats error:', err);
    res.status(500).json({ success: false, error: 'आंकड़े लोड करने में त्रुटि।' });
  }
});

// Start Server
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 INLD ID Card Backend Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
