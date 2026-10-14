// INLD Admin Portal Logic
const API_BASE = '/api';

const state = {
  token: localStorage.getItem('inld_admin_token') || null,
  admin: null,
  cardLogs: [],
  fields: [],
  subscriptions: [],
  plans: [],
  trialDays: 7,
  trialEnabled: true
};

// DOM Elements
const el = {
  loginScreen: document.getElementById('adminLoginScreen'),
  loginForm: document.getElementById('adminLoginForm'),
  loginUsername: document.getElementById('adminUsername'),
  loginPassword: document.getElementById('adminPassword'),
  loginError: document.getElementById('loginError'),
  btnLoginSubmit: document.getElementById('btnLoginSubmit'),

  dashboardApp: document.getElementById('adminDashboardApp'),
  adminNameDisplay: document.getElementById('adminNameDisplay'),
  adminRoleDisplay: document.getElementById('adminRoleDisplay'),
  adminAvatar: document.getElementById('adminAvatar'),
  btnLogout: document.getElementById('btnLogout'),

  // Tabs
  tabLinks: document.querySelectorAll('.tab-link'),
  tabPanels: document.querySelectorAll('.tab-content-panel'),

  // Stats
  statTotalCards: document.getElementById('statTotalCards'),
  statTodayCards: document.getElementById('statTodayCards'),
  statTotalUsers: document.getElementById('statTotalUsers'),
  statActiveTrials: document.getElementById('statActiveTrials'),
  statSubscribers: document.getElementById('statSubscribers'),
  btnRefreshStats: document.getElementById('btnRefreshStats'),
  btnJumpFields: document.getElementById('btnJumpFields'),
  btnJumpSubs: document.getElementById('btnJumpSubs'),

  // Logs
  cardLogsTableBody: document.getElementById('cardLogsTableBody'),
  logSearchInput: document.getElementById('logSearchInput'),
  logFilterState: document.getElementById('logFilterState'),
  logFilterDistrict: document.getElementById('logFilterDistrict'),
  btnClearLogFilters: document.getElementById('btnClearLogFilters'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs'),
  logsCountInfo: document.getElementById('logsCountInfo'),

  // Fields
  fieldsListContainer: document.getElementById('fieldsListContainer'),
  btnSaveFieldConfigs: document.getElementById('btnSaveFieldConfigs'),
  btnResetDefaultFields: document.getElementById('btnResetDefaultFields'),

  // Subscriptions & Plans & Settings
  settingTrialDays: document.getElementById('settingTrialDays'),
  settingTrialEnabled: document.getElementById('settingTrialEnabled'),
  btnSaveTrialSetting: document.getElementById('btnSaveTrialSetting'),
  plansAdminContainer: document.getElementById('plansAdminContainer'),
  btnSavePlans: document.getElementById('btnSavePlans'),
  subsTableBody: document.getElementById('subsTableBody'),
  subSearchInput: document.getElementById('subSearchInput'),
  subStatusFilter: document.getElementById('subStatusFilter'),
  btnRefreshSubs: document.getElementById('btnRefreshSubs'),

  // Security
  changePasswordForm: document.getElementById('changePasswordForm'),
  currentPassword: document.getElementById('currentPassword'),
  newPassword: document.getElementById('newPassword'),
  confirmNewPassword: document.getElementById('confirmNewPassword'),

  // Modal & Toast
  cardDetailModal: document.getElementById('cardDetailModal'),
  modalCardTitle: document.getElementById('modalCardTitle'),
  modalCardBody: document.getElementById('modalCardBody'),
  btnCloseCardModal: document.getElementById('btnCloseCardModal'),
  adminToast: document.getElementById('adminToast'),
  adminToastMsg: document.getElementById('adminToastMsg')
};

// Toast Helper
function showToast(msg, isSuccess = true) {
  el.adminToastMsg.textContent = msg;
  el.adminToast.style.borderColor = isSuccess ? 'var(--gold)' : 'var(--danger)';
  el.adminToast.classList.add('show');
  setTimeout(() => el.adminToast.classList.remove('show'), 3500);
}

// Authenticated fetch helper
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('सत्र समाप्त हो गया है, कृपया पुनः लॉगिन करें।');
  }
  return res.json();
}

// Login
el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.loginError.style.display = 'none';
  el.btnLoginSubmit.disabled = true;
  el.btnLoginSubmit.textContent = 'प्रमाणित किया जा रहा है...';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: el.loginUsername.value.trim(),
        password: el.loginPassword.value
      })
    });

    const data = await res.json();
    if (!data.success) {
      el.loginError.textContent = data.error || 'लॉगिन विफल रहा।';
      el.loginError.style.display = 'block';
      return;
    }

    state.token = data.token;
    state.admin = data.admin;
    localStorage.setItem('inld_admin_token', data.token);

    initDashboard();
    showToast(`स्वागत है, ${data.admin.name || 'प्रशासक'}!`);
  } catch (err) {
    el.loginError.textContent = 'सर्वर से संपर्क नहीं हो सका। कृपया जांचें कि सर्वर चल रहा है।';
    el.loginError.style.display = 'block';
  } finally {
    el.btnLoginSubmit.disabled = false;
    el.btnLoginSubmit.textContent = 'सुरक्षित लॉगिन करें (Sign In)';
  }
});

// Logout
function logout() {
  state.token = null;
  state.admin = null;
  localStorage.removeItem('inld_admin_token');
  el.dashboardApp.style.display = 'none';
  el.loginScreen.style.display = 'flex';
  el.loginPassword.value = '';
}
el.btnLogout.addEventListener('click', logout);

// Initialize Dashboard after auth
async function initDashboard() {
  el.loginScreen.style.display = 'none';
  el.dashboardApp.style.display = 'flex';

  if (state.admin) {
    el.adminNameDisplay.textContent = state.admin.name || state.admin.username;
    el.adminRoleDisplay.textContent = state.admin.role === 'superadmin' ? 'Super Admin' : 'Admin';
    el.adminAvatar.textContent = (state.admin.name || state.admin.username || 'A')[0].toUpperCase();
  }

  // Load all initial data
  await Promise.all([
    loadStats(),
    loadCardLogs(),
    loadFieldConfigs(),
    loadSubscriptions(),
    loadAdminSettings()
  ]);
}

// Tab Switching
el.tabLinks.forEach((btn) => {
  btn.addEventListener('click', () => {
    el.tabLinks.forEach((b) => b.classList.remove('active'));
    el.tabPanels.forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    const targetId = btn.dataset.tab;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.add('active');

    if (targetId === 'tabCardLogs') loadCardLogs();
    if (targetId === 'tabSubscriptions') {
      loadSubscriptions();
      loadAdminSettings();
    }
    if (targetId === 'tabOverview') loadStats();
    if (targetId === 'tabFieldConfig') loadFieldConfigs();
  });
});

el.btnJumpFields?.addEventListener('click', () => {
  document.querySelector('[data-tab="tabFieldConfig"]')?.click();
});

el.btnJumpSubs?.addEventListener('click', () => {
  document.querySelector('[data-tab="tabSubscriptions"]')?.click();
});

// ==========================================
// 1. STATS / OVERVIEW
// ==========================================
async function loadStats() {
  try {
    const data = await authFetch(`${API_BASE}/admin/stats`);
    if (data.success && data.stats) {
      el.statTotalCards.textContent = Number(data.stats.totalCards || 0).toLocaleString();
      el.statTodayCards.textContent = Number(data.stats.todayCards || 0).toLocaleString();
      el.statTotalUsers.textContent = Number(data.stats.totalUsers || 0).toLocaleString();
      el.statActiveTrials.textContent = Number(data.stats.activeTrials || 0).toLocaleString();
      el.statSubscribers.textContent = Number(data.stats.activeSubscribers || 0).toLocaleString();
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}
el.btnRefreshStats.addEventListener('click', () => {
  loadStats();
  showToast('आंकड़े रीफ़्रेश कर दिए गए!');
});

// ==========================================
// 2. CARD LOGS
// ==========================================
async function loadCardLogs() {
  try {
    const q = el.logSearchInput.value.trim();
    const st = el.logFilterState.value;
    const dist = el.logFilterDistrict.value;

    let url = `${API_BASE}/cards?limit=200`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (st && st !== 'all') url += `&state=${encodeURIComponent(st)}`;
    if (dist && dist !== 'all') url += `&district=${encodeURIComponent(dist)}`;

    const data = await authFetch(url);
    if (data.success) {
      state.cardLogs = data.logs || [];
      renderCardLogsTable(state.cardLogs);
      populateStateFilters(state.cardLogs);
      el.logsCountInfo.textContent = `${state.cardLogs.length} / ${data.total || state.cardLogs.length} कार्ड प्रदर्शित`;
    }
  } catch (err) {
    console.error('Card logs error:', err);
  }
}

function renderCardLogsTable(logs) {
  if (!logs || logs.length === 0) {
    el.cardLogsTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">
          कोई कार्ड रिकॉर्ड नहीं मिला।
        </td>
      </tr>
    `;
    return;
  }

  el.cardLogsTableBody.innerHTML = logs.map((log) => {
    const formattedDate = new Date(log.created_at).toLocaleString('hi-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const photoSrc = log.photo_url || '/assets/sample_member_photo.jpg';

    return `
      <tr data-id="${log.id}">
        <td>#${log.id}</td>
        <td>
          <div class="member-cell">
            <img src="${photoSrc}" alt="${log.name}" class="member-thumb" onerror="this.src='/assets/sample_member_photo.jpg'">
            <div>
              <div class="member-name-text">${escapeHtml(log.name || 'N/A')}</div>
              <div class="member-id-tag">${escapeHtml(log.membership_no || '')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(log.father_name || 'N/A')}</td>
        <td>
          <div>📱 ${escapeHtml(log.mobile || 'N/A')}</div>
          ${log.whatsapp_number ? `<small style="color: #16a34a;">WA: ${escapeHtml(log.whatsapp_number)}</small>` : ''}
        </td>
        <td>
          <strong>${escapeHtml(log.district || 'N/A')}</strong><br>
          <small style="color: var(--text-muted);">${escapeHtml(log.state || 'Haryana')}</small>
        </td>
        <td>${escapeHtml(log.constituency || 'N/A')} ${log.conscode ? `(${escapeHtml(log.conscode)})` : ''}</td>
        <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${escapeHtml(log.caste || 'N/A')}</span></td>
        <td>${escapeHtml(log.booth || 'N/A')}</td>
        <td style="white-space: nowrap;">${formattedDate}</td>
        <td>
          <div style="display: flex; align-items: center;">
            <button type="button" class="btn-action-view" onclick="window.viewCardDetail(${log.id})">
              👁️ विवरण
            </button>
            <button type="button" class="btn-action-delete" title="डिलीट करें" onclick="window.deleteCardLog(${log.id})">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate State dropdown dynamically from logs
function populateStateFilters(logs) {
  const currentVal = el.logFilterState.value;
  const states = Array.from(new Set(logs.map(l => l.state).filter(Boolean)));
  
  el.logFilterState.innerHTML = `<option value="all">सभी राज्य (All States)</option>` +
    states.map(s => `<option value="${escapeHtml(s)}" ${s === currentVal ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

// View Card Detail Modal
window.viewCardDetail = function(id) {
  const log = state.cardLogs.find(l => l.id === id);
  if (!log) return;

  const photoSrc = log.photo_url || '/assets/sample_member_photo.jpg';

  el.modalCardTitle.textContent = `सदस्य विवरण: ${log.name} (${log.membership_no})`;
  el.modalCardBody.innerHTML = `
    <div style="display: flex; gap: 20px; align-items: center; border-bottom: 1.5px solid var(--border-light); padding-bottom: 16px;">
      <img src="${photoSrc}" style="width: 80px; height: 95px; object-fit: cover; border-radius: 8px; border: 2px solid var(--gold);" onerror="this.src='/assets/sample_member_photo.jpg'">
      <div>
        <h2 style="color: var(--primary); font-size: 1.25rem;">${escapeHtml(log.name)}</h2>
        <div style="font-weight: 700; color: #15803d; font-size: 0.9rem;">${escapeHtml(log.designation || 'सक्रिय सदस्य')}</div>
        <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px;">सदस्यता क्रमांक: <strong>${escapeHtml(log.membership_no)}</strong></div>
      </div>
    </div>

    <div class="card-inspect-grid">
      <div class="inspect-item">
        <strong>पिताजी का नाम (Father's Name)</strong>
        <span>${escapeHtml(log.father_name || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>मोबाइल नंबर (Mobile)</strong>
        <span>${escapeHtml(log.mobile || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>WhatsApp नंबर</strong>
        <span>${escapeHtml(log.whatsapp_number || log.mobile || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>जन्म तिथि (DOB)</strong>
        <span>${escapeHtml(log.dob || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>जाति / वर्ग (Caste)</strong>
        <span>${escapeHtml(log.caste || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>बूथ नंबर (Booth No)</strong>
        <span>${escapeHtml(log.booth || 'N/A')}</span>
      </div>
      <div class="inspect-item">
        <strong>विधानसभा क्षेत्र (Constituency)</strong>
        <span>${escapeHtml(log.constituency || 'N/A')} ${log.conscode ? `(कोड: ${escapeHtml(log.conscode)})` : ''}</span>
      </div>
      <div class="inspect-item">
        <strong>राज्य एवं ज़िला (State & District)</strong>
        <span>${escapeHtml(log.district || '')}, ${escapeHtml(log.state || '')}</span>
      </div>
      <div class="inspect-item" style="grid-column: span 2;">
        <strong>कार्ड जनरेशन समय एवं IP</strong>
        <span>${new Date(log.created_at).toLocaleString('hi-IN')} ${log.ip_address ? `• IP: ${log.ip_address}` : ''}</span>
      </div>
    </div>
  `;

  el.cardDetailModal.classList.add('active');
};

el.btnCloseCardModal.addEventListener('click', () => {
  el.cardDetailModal.classList.remove('active');
});

el.cardDetailModal.addEventListener('click', (e) => {
  if (e.target === el.cardDetailModal) {
    el.cardDetailModal.classList.remove('active');
  }
});

// Delete Card Log
window.deleteCardLog = async function(id) {
  if (!confirm('क्या आप वाकई इस कार्ड रिकॉर्ड को हटाना चाहते हैं?')) return;

  try {
    const res = await authFetch(`${API_BASE}/cards/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('रिकॉर्ड सफलतापूर्वक हटा दिया गया!');
      loadCardLogs();
      loadStats();
    } else {
      showToast(res.error || 'डिलीट करने में त्रुटि', false);
    }
  } catch (err) {
    showToast('त्रुटि हुई', false);
  }
};

// Search & Filter event listeners
let debounceTimer;
el.logSearchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadCardLogs, 300);
});
el.logFilterState.addEventListener('change', loadCardLogs);
el.logFilterDistrict.addEventListener('change', loadCardLogs);
el.btnClearLogFilters.addEventListener('click', () => {
  el.logSearchInput.value = '';
  el.logFilterState.value = 'all';
  el.logFilterDistrict.value = 'all';
  loadCardLogs();
});
el.btnRefreshLogs.addEventListener('click', () => {
  loadCardLogs();
  showToast('लॉग्स रीफ़्रेश हो गए!');
});

// Export CSV
el.btnExportCsv.addEventListener('click', () => {
  if (state.cardLogs.length === 0) {
    showToast('डाउनलोड हेतु कोई रिकॉर्ड उपलब्ध नहीं है।', false);
    return;
  }

  const headers = ['ID', 'Membership_No', 'Name', 'Father_Name', 'Mobile', 'WhatsApp', 'State', 'District', 'Constituency', 'Conscode', 'Designation', 'DOB', 'Caste', 'Booth', 'Created_At'];
  const rows = state.cardLogs.map(l => [
    l.id,
    `"${(l.membership_no || '').replace(/"/g, '""')}"`,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.father_name || '').replace(/"/g, '""')}"`,
    `"${(l.mobile || '')}"`,
    `"${(l.whatsapp_number || '')}"`,
    `"${(l.state || '').replace(/"/g, '""')}"`,
    `"${(l.district || '').replace(/"/g, '""')}"`,
    `"${(l.constituency || '').replace(/"/g, '""')}"`,
    `"${(l.conscode || '')}"`,
    `"${(l.designation || '').replace(/"/g, '""')}"`,
    `"${(l.dob || '')}"`,
    `"${(l.caste || '').replace(/"/g, '""')}"`,
    `"${(l.booth || '')}"`,
    `"${new Date(l.created_at).toISOString()}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `INLD_Card_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast('CSV डाउनलोड हो गया!');
});

// ==========================================
// 3. FIELD CONFIGURATION
// ==========================================
async function loadFieldConfigs() {
  try {
    const data = await authFetch(`${API_BASE}/config/fields`);
    if (data.success) {
      state.fields = data.fields || [];
      renderFieldsList(state.fields);
    }
  } catch (err) {
    console.error('Field config error:', err);
  }
}

function renderFieldsList(fields) {
  el.fieldsListContainer.innerHTML = fields.map((f, idx) => {
    const isEnab = Boolean(f.is_enabled);
    const isReq = Boolean(f.is_required);

    return `
      <div class="field-config-card ${!isEnab ? 'disabled-field' : ''}" data-key="${f.field_key}">
        <div class="field-drag-index">${idx + 1}</div>

        <div class="field-input-group">
          <label>हिंदी लेबल (Hindi Label)</label>
          <input type="text" class="field-label-hi" value="${escapeHtml(f.label_hi)}">
        </div>

        <div class="field-input-group">
          <label>English / Key</label>
          <input type="text" class="field-label-en" value="${escapeHtml(f.label_en)}">
        </div>

        <div class="switch-wrap">
          <span class="switch-label">सक्षम (Show)</span>
          <label class="switch">
            <input type="checkbox" class="field-toggle-enabled" ${isEnab ? 'checked' : ''} onchange="this.closest('.field-config-card').classList.toggle('disabled-field', !this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="switch-wrap">
          <span class="switch-label">अनिवार्य (Req)</span>
          <label class="switch">
            <input type="checkbox" class="field-toggle-required" ${isReq ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <div class="field-input-group">
          <label>क्रम (Order)</label>
          <input type="number" class="field-order" value="${f.display_order || idx + 1}" style="text-align: center;">
        </div>
      </div>
    `;
  }).join('');
}

// Save Field Configs
el.btnSaveFieldConfigs.addEventListener('click', async () => {
  const cards = el.fieldsListContainer.querySelectorAll('.field-config-card');
  const updatedList = Array.from(cards).map(card => {
    return {
      field_key: card.dataset.key,
      label_hi: card.querySelector('.field-label-hi').value.trim(),
      label_en: card.querySelector('.field-label-en').value.trim(),
      is_enabled: card.querySelector('.field-toggle-enabled').checked ? 1 : 0,
      is_required: card.querySelector('.field-toggle-required').checked ? 1 : 0,
      display_order: Number(card.querySelector('.field-order').value || 0)
    };
  });

  try {
    el.btnSaveFieldConfigs.disabled = true;
    el.btnSaveFieldConfigs.textContent = 'सहेजा जा रहा है...';

    const res = await authFetch(`${API_BASE}/config/fields`, {
      method: 'PUT',
      body: JSON.stringify({ fields: updatedList })
    });

    if (res.success) {
      state.fields = res.fields || updatedList;
      renderFieldsList(state.fields);
      showToast('✓ फ़ील्ड सेटिंग्स सफलतापूर्वक सुरक्षित कर ली गईं!');
    } else {
      showToast(res.error || 'सेटिंग्स सहेजने में त्रुटि', false);
    }
  } catch (err) {
    showToast('त्रुटि हुई', false);
  } finally {
    el.btnSaveFieldConfigs.disabled = false;
    el.btnSaveFieldConfigs.textContent = '💾 सेटिंग्स सहेजें (Save Changes)';
  }
});

// Reset Field Configs to Default
el.btnResetDefaultFields.addEventListener('click', async () => {
  if (!confirm('क्या आप फ़ील्ड सेटिंग्स को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) return;

  try {
    const res = await authFetch(`${API_BASE}/config/fields/reset`, { method: 'POST' });
    if (res.success) {
      state.fields = res.fields;
      renderFieldsList(state.fields);
      showToast('✓ फ़ील्ड सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गईं!');
    }
  } catch (err) {
    showToast('रीसेट करने में त्रुटि', false);
  }
});

// ==========================================
// 4. SUBSCRIPTIONS, TRIAL DAYS & PLANS MANAGEMENT
// ==========================================

// 4A. Load Trial Settings & Plans
async function loadAdminSettings() {
  try {
    const data = await authFetch(`${API_BASE}/admin/settings`);
    if (data.success) {
      state.trialDays = data.trialDays;
      state.trialEnabled = data.trialEnabled;
      state.plans = data.plans || [];

      if (el.settingTrialDays) el.settingTrialDays.value = data.trialDays;
      if (el.settingTrialEnabled) el.settingTrialEnabled.checked = data.trialEnabled;

      renderAdminPlans(state.plans);
    }
  } catch (err) {
    console.error('Load admin settings error:', err);
  }
}

// 4B. Render Editable Plan Cards
function renderAdminPlans(plans) {
  if (!el.plansAdminContainer) return;
  if (!plans || plans.length === 0) {
    el.plansAdminContainer.innerHTML = `<p style="color:var(--text-muted); padding:20px;">कोई प्लान उपलब्ध नहीं है।</p>`;
    return;
  }

  el.plansAdminContainer.innerHTML = plans.map(p => {
    const isPopular = p.plan_key === 'yearly' || (p.badge_text && p.badge_text.includes('लोकप्रिय'));
    return `
      <div class="plan-admin-card ${isPopular ? 'featured-card' : ''}" data-key="${p.plan_key}">
        <div class="plan-admin-header">
          <span class="plan-admin-badge">${escapeHtml(p.plan_key)}</span>
          <span style="font-size:0.85rem; font-weight:700; color:var(--primary);">${escapeHtml(p.name_hi || '')}</span>
        </div>

        <div class="plan-edit-row">
          <label>प्लान नाम (Hindi Name)</label>
          <input type="text" class="plan-input-name-hi" value="${escapeHtml(p.name_hi || '')}">
        </div>

        <div class="plan-edit-row">
          <label>अंग्रेजी नाम (English Name)</label>
          <input type="text" class="plan-input-name-en" value="${escapeHtml(p.name_en || '')}">
        </div>

        <div class="plan-price-duration-flex">
          <div class="plan-edit-row">
            <label>मूल्य (Price in ₹)</label>
            <input type="number" class="plan-input-price" value="${Number(p.price || 0)}" min="0">
          </div>
          <div class="plan-edit-row">
            <label>वैधता (Validity Days)</label>
            <input type="number" class="plan-input-days" value="${Number(p.duration_days || 30)}" min="1">
          </div>
        </div>

        <div class="plan-edit-row">
          <label>अवधि लेबल (e.g. प्रति महीना / पूरे 1 वर्ष हेतु)</label>
          <input type="text" class="plan-input-period" value="${escapeHtml(p.period_label || '')}">
        </div>

        <div class="plan-edit-row">
          <label>बैज टेक्स्ट (Badge, e.g. Best Value)</label>
          <input type="text" class="plan-input-badge" value="${escapeHtml(p.badge_text || '')}">
        </div>

        <div class="plan-toggle-row">
          <span>सक्रिय रखें (Active)</span>
          <label class="switch">
            <input type="checkbox" class="plan-input-active" ${p.is_active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  }).join('');
}

// 4C. Save Trial Days Settings
el.btnSaveTrialSetting?.addEventListener('click', async () => {
  const trialDays = parseInt(el.settingTrialDays.value, 10) || 7;
  const trialEnabled = el.settingTrialEnabled.checked;

  try {
    el.btnSaveTrialSetting.disabled = true;
    el.btnSaveTrialSetting.textContent = 'सहेजा जा रहा है...';

    const res = await authFetch(`${API_BASE}/admin/settings/trial`, {
      method: 'PUT',
      body: JSON.stringify({ trialDays, trialEnabled })
    });

    if (res.success) {
      showToast(res.message || 'ट्रायल सेटिंग्स सुरक्षित कर ली गईं!');
      loadSubscriptions();
      loadStats();
    } else {
      showToast(res.error || 'सहेजने में त्रुटि', false);
    }
  } catch (err) {
    showToast('ट्रायल सेटिंग्स अपडेट विफल', false);
  } finally {
    el.btnSaveTrialSetting.disabled = false;
    el.btnSaveTrialSetting.textContent = '💾 ट्रायल सेटिंग्स सहेजें';
  }
});

// 4D. Save Subscription Plans
el.btnSavePlans?.addEventListener('click', async () => {
  const cards = el.plansAdminContainer.querySelectorAll('.plan-admin-card');
  const updatedPlans = [];

  cards.forEach(card => {
    const plan_key = card.dataset.key;
    const existing = state.plans.find(p => p.plan_key === plan_key) || {};
    
    updatedPlans.push({
      plan_key,
      name_hi: card.querySelector('.plan-input-name-hi')?.value.trim() || existing.name_hi,
      name_en: card.querySelector('.plan-input-name-en')?.value.trim() || existing.name_en,
      price: Number(card.querySelector('.plan-input-price')?.value) || 0,
      duration_days: Number(card.querySelector('.plan-input-days')?.value) || 30,
      period_label: card.querySelector('.plan-input-period')?.value.trim() || '',
      badge_text: card.querySelector('.plan-input-badge')?.value.trim() || '',
      features: existing.features || [],
      is_active: card.querySelector('.plan-input-active')?.checked ? 1 : 0,
      display_order: existing.display_order || 1
    });
  });

  try {
    el.btnSavePlans.disabled = true;
    el.btnSavePlans.textContent = 'सहेजा जा रहा है...';

    const res = await authFetch(`${API_BASE}/admin/plans`, {
      method: 'PUT',
      body: JSON.stringify({ plans: updatedPlans })
    });

    if (res.success) {
      state.plans = res.plans || updatedPlans;
      showToast(res.message || 'सभी प्लान्स सफलतापूर्वक सहेज लिए गए!');
      renderAdminPlans(state.plans);
    } else {
      showToast(res.error || 'प्लान्स सहेजने में त्रुटि', false);
    }
  } catch (err) {
    showToast('प्लान्स अपडेट विफल', false);
  } finally {
    el.btnSavePlans.disabled = false;
    el.btnSavePlans.textContent = '💾 सभी प्लान्स सहेजें (Save All Plans)';
  }
});

// 4E. Registered Users Table & Status
async function loadSubscriptions() {
  try {
    const data = await authFetch(`${API_BASE}/admin/subscriptions`);
    if (data.success) {
      state.subscriptions = data.subscriptions || data.users || [];
      renderSubscriptionsTable(state.subscriptions);
    }
  } catch (err) {
    console.error('Subscriptions error:', err);
  }
}

function renderSubscriptionsTable(subs) {
  const q = el.subSearchInput.value.trim().toLowerCase();
  const activePill = el.subStatusFilter.querySelector('.filter-pill.active')?.dataset.status || 'all';

  let filtered = subs;
  if (q) {
    filtered = filtered.filter(s =>
      (s.phone && s.phone.includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q))
    );
  }
  if (activePill !== 'all') {
    filtered = filtered.filter(s => s.status === activePill);
  }

  if (filtered.length === 0) {
    el.subsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
          कोई उपयोगकर्ता / सब्सक्रिप्शन रिकॉर्ड नहीं मिला।
        </td>
      </tr>
    `;
    return;
  }

  el.subsTableBody.innerHTML = filtered.map(s => {
    let statusBadge = '';
    if (s.status === 'active') {
      statusBadge = `<span class="badge-status active">👑 प्रीमियम सक्रिय</span>`;
    } else if (s.status === 'trial') {
      statusBadge = `<span class="badge-status trial">⏳ ट्रायल सक्रिय</span>`;
    } else if (s.status === 'expired') {
      statusBadge = `<span class="badge-status expired">⚠️ समाप्त (Expired)</span>`;
    } else {
      statusBadge = `<span class="badge-status blocked">🚫 ब्लॉक</span>`;
    }

    const trialStart = s.trialStartedAt ? new Date(s.trialStartedAt).toLocaleDateString('hi-IN') : 'N/A';
    const trialExp = s.trialExpiresAt ? new Date(s.trialExpiresAt).toLocaleDateString('hi-IN') : 'N/A';

    return `
      <tr>
        <td>
          <strong>📱 ${escapeHtml(s.phone)}</strong>
          ${s.name ? `<div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">${escapeHtml(s.name)}</div>` : ''}
        </td>
        <td>${statusBadge}</td>
        <td><span style="font-weight: 700; text-transform: capitalize;">${escapeHtml(s.planName || 'Free Trial')}</span></td>
        <td>${trialStart}</td>
        <td>${trialExp}</td>
        <td>
          <strong style="color: ${s.isSubscribed || s.daysRemaining > 0 ? '#15803d' : '#dc2626'}; font-size: 0.95rem;">
            ${s.isSubscribed ? 'असीमित' : `${s.daysRemaining} दिन`}
          </strong>
        </td>
        <td><span style="font-weight: 700;">${s.totalCardsCreated || 0}</span></td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn-action-extend" onclick="window.updateSubStatus('${s.phone}', 'extend_trial')">
              +7 दिन बढ़ाएं
            </button>
            <button type="button" class="btn-action-premium" onclick="window.updateSubStatus('${s.phone}', 'activate_premium')">
              👑 प्रीमियम दें
            </button>
            ${s.status === 'blocked' ? `
              <button type="button" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 8px; font-size:0.72rem; border-radius:4px; cursor:pointer;" onclick="window.updateSubStatus('${s.phone}', 'unblock')">
                अनब्लॉक
              </button>
            ` : `
              <button type="button" style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:4px 8px; font-size:0.72rem; border-radius:4px; cursor:pointer;" onclick="window.updateSubStatus('${s.phone}', 'block')">
                ब्लॉक
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.updateSubStatus = async function(phone, action) {
  try {
    const res = await authFetch(`${API_BASE}/admin/subscriptions/update`, {
      method: 'POST',
      body: JSON.stringify({ phone, action })
    });

    if (res.success) {
      showToast(res.message || 'सफलतापूर्वक अपडेट किया गया!');
      loadSubscriptions();
      loadStats();
    } else {
      showToast(res.error || 'त्रुटि हुई', false);
    }
  } catch (err) {
    showToast('कार्रवाई विफल रही', false);
  }
};

el.subSearchInput.addEventListener('input', () => renderSubscriptionsTable(state.subscriptions));
el.subStatusFilter.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    el.subStatusFilter.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderSubscriptionsTable(state.subscriptions);
  });
});
el.btnRefreshSubs?.addEventListener('click', () => {
  loadSubscriptions();
  loadAdminSettings();
  showToast('सब्सक्रिप्शन सूची एवं सेटिंग्स रीफ़्रेश हो गईं!');
});


// ==========================================
// 5. SECURITY / CHANGE PASSWORD
// ==========================================
el.changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (el.newPassword.value !== el.confirmNewPassword.value) {
    showToast('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!', false);
    return;
  }

  try {
    const res = await authFetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: el.currentPassword.value,
        newPassword: el.newPassword.value
      })
    });

    if (res.success) {
      showToast('✓ पासवर्ड सफलतापूर्वक बदल दिया गया है!');
      el.changePasswordForm.reset();
    } else {
      showToast(res.error || 'पासवर्ड बदलने में त्रुटि हुई', false);
    }
  } catch (err) {
    showToast('त्रुटि हुई', false);
  }
});

// Helper to escape HTML safely
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Auto-check auth on page load
async function checkAuthOnStartup() {
  if (!state.token) {
    el.loginScreen.style.display = 'flex';
    el.dashboardApp.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success && data.admin) {
      state.admin = data.admin;
      initDashboard();
    } else {
      logout();
    }
  } catch (err) {
    console.warn('Auth verify skipped or offline:', err);
    initDashboard();
  }
}

document.addEventListener('DOMContentLoaded', checkAuthOnStartup);
