// INLD Admin Portal Logic
import { jsPDF } from 'jspdf';
import { preloadAssets, renderFrontCard, renderBackCard } from './cardGenerator.js';

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('inld_admin_token') || null,
  admin: null,
  cardLogs: [],
  fields: [],
  activeStatusFilter: 'all',
  sampleAssets: null,
  currentGeneratingCard: null,
  editPhotoData: null
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
  statActiveFields: document.getElementById('statActiveFields'),
  statTotalFields: document.getElementById('statTotalFields'),
  btnRefreshStats: document.getElementById('btnRefreshStats'),
  btnJumpFields: document.getElementById('btnJumpFields'),
  btnJumpLogs: document.getElementById('btnJumpLogs'),

  // Logs
  cardLogsTableBody: document.getElementById('cardLogsTableBody'),
  logSearchInput: document.getElementById('logSearchInput'),
  logFilterState: document.getElementById('logFilterState'),
  logFilterDistrict: document.getElementById('logFilterDistrict'),
  logStatusFilter: document.getElementById('logStatusFilter'),
  btnClearLogFilters: document.getElementById('btnClearLogFilters'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs'),
  logsCountInfo: document.getElementById('logsCountInfo'),

  // Fields
  fieldsListContainer: document.getElementById('fieldsListContainer'),
  btnSaveFieldConfigs: document.getElementById('btnSaveFieldConfigs'),
  btnResetDefaultFields: document.getElementById('btnResetDefaultFields'),

  // Security
  changePasswordForm: document.getElementById('changePasswordForm'),
  currentPassword: document.getElementById('currentPassword'),
  newPassword: document.getElementById('newPassword'),
  confirmNewPassword: document.getElementById('confirmNewPassword'),

  // Modals
  cardDetailModal: document.getElementById('cardDetailModal'),
  modalCardTitle: document.getElementById('modalCardTitle'),
  modalCardBody: document.getElementById('modalCardBody'),
  btnCloseCardModal: document.getElementById('btnCloseCardModal'),

  // Admin Card Generator Modal
  adminCardGenerateModal: document.getElementById('adminCardGenerateModal'),
  btnCloseGenModal: document.getElementById('btnCloseGenModal'),
  genModalMemberTitle: document.getElementById('genModalMemberTitle'),
  genApplicantMetaBar: document.getElementById('genApplicantMetaBar'),
  adminCanvasFront: document.getElementById('adminCanvasFront'),
  adminCanvasBack: document.getElementById('adminCanvasBack'),
  btnAdminDlFront: document.getElementById('btnAdminDlFront'),
  btnAdminDlBack: document.getElementById('btnAdminDlBack'),
  btnAdminDlBoth: document.getElementById('btnAdminDlBoth'),
  btnAdminDlPdf: document.getElementById('btnAdminDlPdf'),
  btnAdminShareWa: document.getElementById('btnAdminShareWa'),
  btnAdminToggleStatus: document.getElementById('btnAdminToggleStatus'),

  // Admin Edit Member Modal
  adminEditCardModal: document.getElementById('adminEditCardModal'),
  btnCloseEditModal: document.getElementById('btnCloseEditModal'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),
  adminEditMemberForm: document.getElementById('adminEditMemberForm'),
  editCardId: document.getElementById('editCardId'),
  editPhotoThumb: document.getElementById('editPhotoThumb'),
  editPhotoInput: document.getElementById('editPhotoInput'),
  editName: document.getElementById('editName'),
  editFather: document.getElementById('editFather'),
  editMobile: document.getElementById('editMobile'),
  editWhatsapp: document.getElementById('editWhatsapp'),
  editState: document.getElementById('editState'),
  editDistrict: document.getElementById('editDistrict'),
  editCity: document.getElementById('editCity'),
  editVillage: document.getElementById('editVillage'),
  editConstituency: document.getElementById('editConstituency'),
  editConscode: document.getElementById('editConscode'),
  editDesignation: document.getElementById('editDesignation'),
  editDob: document.getElementById('editDob'),
  editCaste: document.getElementById('editCaste'),
  editBooth: document.getElementById('editBooth'),
  editStatus: document.getElementById('editStatus'),
  btnSubmitEditCard: document.getElementById('btnSubmitEditCard'),

  // Toast
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

    if (data.success && data.token) {
      state.token = data.token;
      state.admin = data.admin;
      localStorage.setItem('inld_admin_token', data.token);
      showToast(`स्वागत है, ${data.admin.name || data.admin.username}!`);
      initDashboard();
    } else {
      el.loginError.textContent = `⚠️ ${data.error || 'लॉगिन विफल रहा'}`;
      el.loginError.style.display = 'block';
    }
  } catch (err) {
    el.loginError.textContent = '⚠️ नेटवर्क त्रुटि, कृपया पुनः प्रयास करें।';
    el.loginError.style.display = 'block';
  } finally {
    el.btnLoginSubmit.disabled = false;
    el.btnLoginSubmit.textContent = 'डैशबोर्ड में प्रवेश करें';
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

  try {
    state.sampleAssets = await preloadAssets();
  } catch (err) {
    console.warn('Preload assets in admin:', err);
  }

  // Load initial data
  await Promise.all([
    loadStats(),
    loadCardLogs(),
    loadFieldConfigs()
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
    if (targetId === 'tabOverview') loadStats();
    if (targetId === 'tabFieldConfig') loadFieldConfigs();
  });
});

el.btnJumpFields?.addEventListener('click', () => {
  document.querySelector('[data-tab="tabFieldConfig"]')?.click();
});

el.btnJumpLogs?.addEventListener('click', () => {
  document.querySelector('[data-tab="tabCardLogs"]')?.click();
});

// ==========================================
// 1. STATS / OVERVIEW
// ==========================================
async function loadStats() {
  try {
    const data = await authFetch(`${API_BASE}/admin/stats`);
    if (data.success && data.stats) {
      if (el.statTotalCards) el.statTotalCards.textContent = Number(data.stats.totalCards || 0).toLocaleString();
      if (el.statTodayCards) el.statTodayCards.textContent = Number(data.stats.todayCards || 0).toLocaleString();
      if (el.statActiveFields) el.statActiveFields.textContent = Number(data.stats.activeFields || 0).toLocaleString();
      if (el.statTotalFields) el.statTotalFields.textContent = Number(data.stats.totalFields || 14).toLocaleString();
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
// 2. CARD REQUESTS / LOGS
// ==========================================
async function loadCardLogs() {
  try {
    const q = el.logSearchInput.value.trim();
    const st = el.logFilterState.value;
    const dist = el.logFilterDistrict.value;

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (st && st !== 'all') params.append('state', st);
    if (dist && dist !== 'all') params.append('district', dist);
    if (state.activeStatusFilter && state.activeStatusFilter !== 'all') {
      params.append('status', state.activeStatusFilter);
    }

    const data = await authFetch(`${API_BASE}/cards?${params.toString()}`);
    if (data.success) {
      state.cardLogs = data.logs || [];
      renderCardLogsTable(state.cardLogs);
      populateStateFilters(state.cardLogs);
      el.logsCountInfo.textContent = `${state.cardLogs.length} / ${data.total || state.cardLogs.length} आवेदन प्रदर्शित`;
    }
  } catch (err) {
    console.error('Card logs error:', err);
  }
}

function renderCardLogsTable(logs) {
  // Client-side status filter fallback
  let displayLogs = logs;
  if (state.activeStatusFilter !== 'all') {
    displayLogs = logs.filter(l => (l.status || 'pending') === state.activeStatusFilter);
  }

  if (!displayLogs || displayLogs.length === 0) {
    el.cardLogsTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">
          कोई कार्ड रिकॉर्ड या आवेदन नहीं मिला।
        </td>
      </tr>
    `;
    return;
  }

  el.cardLogsTableBody.innerHTML = displayLogs.map((log) => {
    const formattedDate = new Date(log.created_at).toLocaleString('hi-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const photoSrc = log.photo_url || '/assets/sample_member_photo.jpg';
    const locArr = [];
    if (log.village) locArr.push(log.village);
    if (log.city) locArr.push(log.city);
    const cityVillageStr = locArr.length > 0 ? locArr.join(', ') : '-';

    const statusBadge = (log.status === 'generated')
      ? '<span class="status-badge-generated">✓ तैयार (Generated)</span>'
      : '<span class="status-badge-pending">⏳ लंबित (Pending)</span>';

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
        <td>${escapeHtml(cityVillageStr)}</td>
        <td>${escapeHtml(log.constituency || 'N/A')} ${log.conscode ? `(${escapeHtml(log.conscode)})` : ''}</td>
        <td>${statusBadge}</td>
        <td style="white-space: nowrap;">${formattedDate}</td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-side-download" style="padding: 5px 9px; font-size: 0.78rem;" onclick="window.generateAdminCard(${log.id})">
              🪪 कार्ड बनाएं
            </button>
            <button type="button" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 5px 9px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer;" onclick="window.editCardLog(${log.id})">
              ✏️ एडिट
            </button>
            <button type="button" class="btn-action-delete" title="हटाएं" onclick="window.deleteCardLog(${log.id})">
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

// Status filter pills listener
el.logStatusFilter?.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    el.logStatusFilter.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeStatusFilter = pill.dataset.status || 'all';
    renderCardLogsTable(state.cardLogs);
  });
});

// Search and filter listeners
el.logSearchInput.addEventListener('input', () => loadCardLogs());
el.logFilterState.addEventListener('change', () => loadCardLogs());
el.logFilterDistrict.addEventListener('change', () => loadCardLogs());
el.btnClearLogFilters.addEventListener('click', () => {
  el.logSearchInput.value = '';
  el.logFilterState.value = 'all';
  el.logFilterDistrict.value = 'all';
  state.activeStatusFilter = 'all';
  el.logStatusFilter?.querySelectorAll('.filter-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  loadCardLogs();
  showToast('फ़िल्टर रीसेट कर दिए गए');
});
el.btnRefreshLogs.addEventListener('click', () => {
  loadCardLogs();
  showToast('कार्ड आवेदन सूची रीफ़्रेश हो गई!');
});

// Export CSV
el.btnExportCsv.addEventListener('click', () => {
  if (state.cardLogs.length === 0) {
    showToast('एक्सपोर्ट करने के लिए कोई रिकॉर्ड उपलब्ध नहीं है', false);
    return;
  }

  const headers = ['ID', 'Membership No', 'Name', 'Father Name', 'Mobile', 'WhatsApp', 'State', 'District', 'City', 'Village', 'Constituency', 'Conscode', 'Designation', 'DOB', 'Caste', 'Booth', 'Status', 'Created At'];
  const rows = state.cardLogs.map(l => [
    l.id,
    `"${(l.membership_no || '').replace(/"/g, '""')}"`,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.father_name || '').replace(/"/g, '""')}"`,
    `"${l.mobile || ''}"`,
    `"${l.whatsapp_number || ''}"`,
    `"${l.state || ''}"`,
    `"${l.district || ''}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.village || '').replace(/"/g, '""')}"`,
    `"${(l.constituency || '').replace(/"/g, '""')}"`,
    `"${l.conscode || ''}"`,
    `"${(l.designation || '').replace(/"/g, '""')}"`,
    `"${l.dob || ''}"`,
    `"${(l.caste || '').replace(/"/g, '""')}"`,
    `"${l.booth || ''}"`,
    `"${l.status || 'pending'}"`,
    `"${l.created_at || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `INLD_Card_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✓ CSV सफलतापूर्वक डाउनलोड हो गई!');
});

// ==========================================
// 2B. ADMIN CARD GENERATOR STUDIO
// ==========================================
window.generateAdminCard = async function(id) {
  const log = state.cardLogs.find(l => l.id === id);
  if (!log) return;

  state.currentGeneratingCard = log;

  el.genModalMemberTitle.textContent = `कार्ड जनरेटर: ${log.name} (${log.membership_no || 'INLD'})`;

  const locArr = [];
  if (log.village) locArr.push(`गांव: ${log.village}`);
  if (log.city) locArr.push(`शहर: ${log.city}`);
  const locDetail = locArr.length > 0 ? locArr.join(' • ') : '';

  el.genApplicantMetaBar.innerHTML = `
    <img src="${log.photo_url || '/assets/sample_member_photo.jpg'}" style="width: 55px; height: 65px; border-radius: 8px; object-fit: cover; border: 2px solid var(--gold);" onerror="this.src='/assets/sample_member_photo.jpg'">
    <div style="flex: 1;">
      <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">${escapeHtml(log.name)}</div>
      <div style="font-size: 0.84rem; color: #475569;">
        पिता: <strong>${escapeHtml(log.father_name || '-')}</strong> • मोबाइल: <strong>${escapeHtml(log.mobile || '-')}</strong> • ज़िला: <strong>${escapeHtml(log.district || '-')}</strong>
      </div>
      ${locDetail ? `<div style="font-size: 0.8rem; color: #15803d; font-weight: 600;">${escapeHtml(locDetail)}</div>` : ''}
    </div>
    <div>
      <span class="${log.status === 'generated' ? 'status-badge-generated' : 'status-badge-pending'}" id="genStatusBadge">
        ${log.status === 'generated' ? '✓ कार्ड तैयार' : '⏳ लंबित'}
      </span>
    </div>
  `;

  // Render Front and Back cards
  try {
    let photoImg = null;
    if (log.photo_url) {
      photoImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(state.sampleAssets?.samplePhoto);
        img.src = log.photo_url;
      });
    } else {
      photoImg = state.sampleAssets?.samplePhoto;
    }

    const cardData = {
      name: log.name,
      father: log.father_name,
      mobile: log.mobile,
      state: log.state || 'Haryana',
      district: log.district || '',
      city: log.city || '',
      village: log.village || '',
      constituency: log.constituency || '',
      conscode: log.conscode || '',
      designation: log.designation || 'INLD Karyakarta',
      dob: log.dob || '',
      caste: log.caste || '',
      booth: log.booth || '',
      whatsappNumber: log.whatsapp_number || log.mobile || '',
      membershipNo: log.membership_no,
      photoImg: photoImg,
      showWatermark: true,
      showQr: true
    };

    await Promise.all([
      renderFrontCard(el.adminCanvasFront, cardData),
      renderBackCard(el.adminCanvasBack, cardData)
    ]);
  } catch (err) {
    console.error('Error rendering admin card:', err);
  }

  // Update toggle status button
  updateAdminStatusBtn(log.status);

  el.adminCardGenerateModal.classList.add('active');
};

function updateAdminStatusBtn(status) {
  if (status === 'generated') {
    el.btnAdminToggleStatus.textContent = '✓ स्थिति: कार्ड तैयार (Generated)';
    el.btnAdminToggleStatus.style.background = '#dcfce7';
    el.btnAdminToggleStatus.style.color = '#166534';
  } else {
    el.btnAdminToggleStatus.textContent = 'मार्क करें: ✓ कार्ड तैयार (Generated)';
    el.btnAdminToggleStatus.style.background = '#f0fdf4';
    el.btnAdminToggleStatus.style.color = '#166534';
  }
}

// Close Gen Modal
el.btnCloseGenModal.addEventListener('click', () => {
  el.adminCardGenerateModal.classList.remove('active');
});
el.adminCardGenerateModal.addEventListener('click', (e) => {
  if (e.target === el.adminCardGenerateModal) {
    el.adminCardGenerateModal.classList.remove('active');
  }
});

// Download Canvas Helper
function downloadAdminCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

// Download Front
el.btnAdminDlFront.addEventListener('click', () => {
  const name = (state.currentGeneratingCard?.name || 'INLD_Member').replace(/\s+/g, '_');
  downloadAdminCanvas(el.adminCanvasFront, `${name}_INLD_Front_Card.png`);
  showToast('📥 सामने का भाग (Front PNG) डाउनलोड हो गया!');
});

// Download Back
el.btnAdminDlBack.addEventListener('click', () => {
  const name = (state.currentGeneratingCard?.name || 'INLD_Member').replace(/\s+/g, '_');
  downloadAdminCanvas(el.adminCanvasBack, `${name}_INLD_Back_Card.png`);
  showToast('📥 पीछे का भाग (Back PNG) डाउनलोड हो गया!');
});

// Download Both
el.btnAdminDlBoth.addEventListener('click', () => {
  const name = (state.currentGeneratingCard?.name || 'INLD_Member').replace(/\s+/g, '_');
  downloadAdminCanvas(el.adminCanvasFront, `${name}_INLD_Front_Card.png`);
  setTimeout(() => {
    downloadAdminCanvas(el.adminCanvasBack, `${name}_INLD_Back_Card.png`);
    showToast('✨ दोनों साइड्स (Front & Back) डाउनलोड हो गए!');
  }, 350);
});

// Download 2-Page PDF
el.btnAdminDlPdf.addEventListener('click', () => {
  try {
    const name = (state.currentGeneratingCard?.name || 'INLD_Member').replace(/\s+/g, '_');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [140, 93.3]
    });

    const frontData = el.adminCanvasFront.toDataURL('image/jpeg', 0.98);
    pdf.addImage(frontData, 'JPEG', 0, 0, 140, 93.3);

    pdf.addPage([140, 93.3], 'landscape');
    const backData = el.adminCanvasBack.toDataURL('image/jpeg', 0.98);
    pdf.addImage(backData, 'JPEG', 0, 0, 140, 93.3);

    pdf.save(`${name}_INLD_Full_ID_Card.pdf`);
    showToast('✓ 2-पेज सम्पूर्ण PDF डाउनलोड हो गया!');
  } catch (err) {
    console.error('PDF error:', err);
    showToast('PDF बनाने में त्रुटि', false);
  }
});

// WhatsApp Direct Share
el.btnAdminShareWa.addEventListener('click', () => {
  const log = state.currentGeneratingCard;
  if (!log) return;

  const rawNum = (log.whatsapp_number || log.mobile || '').replace(/[^0-9]/g, '');
  if (!rawNum) {
    showToast('सदस्य का WhatsApp नंबर उपलब्ध नहीं है', false);
    return;
  }

  const fullNum = rawNum.length === 10 ? `91${rawNum}` : rawNum;
  const msg = encodeURIComponent(
    `🚩 *इंडियन नेशनल लोकदल (INLD)* 🚩\n\n` +
    `नमस्कार *${log.name}* जी,\n` +
    `आपका आधिकारिक सदस्यता पहचान पत्र (INLD Identity Card) तैयार हो गया है!\n\n` +
    `🆔 *सदस्यता क्रमांक:* ${log.membership_no || 'INLD'}\n` +
    `📍 *विधानसभा:* ${log.constituency || '-'}\n` +
    `🎖️ *पद:* ${log.designation || 'सक्रिय सदस्य'}\n\n` +
    `_चौधरी देवी लाल अमर रहें • जय जवान जय किसान_`
  );

  window.open(`https://wa.me/${fullNum}?text=${msg}`, '_blank');
});

// Toggle Card Status to Generated
el.btnAdminToggleStatus.addEventListener('click', async () => {
  const log = state.currentGeneratingCard;
  if (!log) return;

  const newStatus = log.status === 'generated' ? 'pending' : 'generated';
  try {
    const res = await authFetch(`${API_BASE}/cards/${log.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    if (res.success) {
      log.status = newStatus;
      updateAdminStatusBtn(newStatus);
      const badge = document.getElementById('genStatusBadge');
      if (badge) {
        badge.className = newStatus === 'generated' ? 'status-badge-generated' : 'status-badge-pending';
        badge.textContent = newStatus === 'generated' ? '✓ कार्ड तैयार' : '⏳ लंबित';
      }
      renderCardLogsTable(state.cardLogs);
      showToast(`✓ स्थिति अपडेट कर दी गई: ${newStatus === 'generated' ? 'कार्ड तैयार' : 'लंबित'}`);
    }
  } catch (err) {
    showToast('स्थिति अपडेट करने में त्रुटि', false);
  }
});

// ==========================================
// 2C. ADMIN EDIT MEMBER APPLICATION
// ==========================================
window.editCardLog = function(id) {
  const log = state.cardLogs.find(l => l.id === id);
  if (!log) return;

  el.editCardId.value = log.id;
  el.editName.value = log.name || '';
  el.editFather.value = log.father_name || '';
  el.editMobile.value = log.mobile || '';
  el.editWhatsapp.value = log.whatsapp_number || log.mobile || '';
  el.editState.value = log.state || 'Haryana';
  el.editDistrict.value = log.district || '';
  el.editCity.value = log.city || '';
  el.editVillage.value = log.village || '';
  el.editConstituency.value = log.constituency || '';
  el.editConscode.value = log.conscode || '';
  el.editDesignation.value = log.designation || 'INLD Karyakarta';
  el.editDob.value = log.dob || '';
  el.editCaste.value = log.caste || '';
  el.editBooth.value = log.booth || '';
  el.editStatus.value = log.status || 'pending';

  el.editPhotoThumb.src = log.photo_url || '/assets/sample_member_photo.jpg';
  state.editPhotoData = null;
  el.editPhotoInput.value = '';

  el.adminEditCardModal.classList.add('active');
};

// Handle Edit Photo Input
el.editPhotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    el.editPhotoThumb.src = ev.target.result;
    state.editPhotoData = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Close Edit Modal
el.btnCloseEditModal.addEventListener('click', () => el.adminEditCardModal.classList.remove('active'));
el.btnCancelEdit.addEventListener('click', () => el.adminEditCardModal.classList.remove('active'));
el.adminEditCardModal.addEventListener('click', (e) => {
  if (e.target === el.adminEditCardModal) {
    el.adminEditCardModal.classList.remove('active');
  }
});

// Submit Edit Form
el.adminEditMemberForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.editCardId.value;
  if (!id) return;

  el.btnSubmitEditCard.disabled = true;
  el.btnSubmitEditCard.textContent = 'सहेजा जा रहा है...';

  const updatePayload = {
    name: el.editName.value.trim(),
    father_name: el.editFather.value.trim(),
    mobile: el.editMobile.value.trim(),
    whatsapp_number: el.editWhatsapp.value.trim(),
    state: el.editState.value.trim(),
    district: el.editDistrict.value.trim(),
    city: el.editCity.value.trim(),
    village: el.editVillage.value.trim(),
    constituency: el.editConstituency.value.trim(),
    conscode: el.editConscode.value.trim(),
    designation: el.editDesignation.value.trim(),
    dob: el.editDob.value.trim(),
    caste: el.editCaste.value.trim(),
    booth: el.editBooth.value.trim(),
    status: el.editStatus.value
  };

  if (state.editPhotoData) {
    updatePayload.photo_url = state.editPhotoData;
  }

  try {
    const res = await authFetch(`${API_BASE}/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatePayload)
    });

    if (res.success && res.card) {
      // Update local cardLogs array
      const idx = state.cardLogs.findIndex(l => l.id === Number(id));
      if (idx !== -1) {
        state.cardLogs[idx] = { ...state.cardLogs[idx], ...res.card };
      }
      renderCardLogsTable(state.cardLogs);
      showToast('✓ सदस्य विवरण सफलतापूर्वक सहेज दिया गया!');
      el.adminEditCardModal.classList.remove('active');
    } else {
      showToast(res.error || 'अपडेट करने में त्रुटि', false);
    }
  } catch (err) {
    showToast('अपडेट प्रक्रिया विफल रही', false);
  } finally {
    el.btnSubmitEditCard.disabled = false;
    el.btnSubmitEditCard.textContent = '💾 परिवर्तन सहेजें (Save Changes)';
  }
});

// Delete Card Log
window.deleteCardLog = async function(id) {
  if (!confirm('क्या आप वाकई इस सदस्यता आवेदन रिकॉर्ड को हटाना चाहते हैं?')) return;

  try {
    const res = await authFetch(`${API_BASE}/cards/${id}`, { method: 'DELETE' });
    if (res.success) {
      state.cardLogs = state.cardLogs.filter(l => l.id !== id);
      renderCardLogsTable(state.cardLogs);
      loadStats();
      showToast('✓ रिकॉर्ड सफलतापूर्वक हटा दिया गया!');
    } else {
      showToast(res.error || 'हटाने में त्रुटि', false);
    }
  } catch (err) {
    showToast('हटाने में त्रुटि हुई', false);
  }
};

// ==========================================
// 3. FIELD CONFIGURATION
// ==========================================
async function loadFieldConfigs() {
  try {
    const res = await authFetch(`${API_BASE}/config/fields`);
    if (res.success && Array.isArray(res.fields)) {
      state.fields = res.fields;
      renderFieldsList(state.fields);
    }
  } catch (err) {
    console.error('Load fields error:', err);
  }
}

function renderFieldsList(fields) {
  if (!el.fieldsListContainer) return;
  if (!fields || fields.length === 0) {
    el.fieldsListContainer.innerHTML = '<p style="color:var(--text-muted); padding: 20px;">कोई फ़ील्ड उपलब्ध नहीं है।</p>';
    return;
  }

  el.fieldsListContainer.innerHTML = fields.map((f) => {
    return `
      <div class="field-config-card" data-key="${f.field_key}">
        <div class="field-card-header">
          <div>
            <span class="field-key-badge">${escapeHtml(f.field_key)}</span>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">प्रकार: <strong>${escapeHtml(f.field_type)}</strong></div>
          </div>
          <div class="field-switches">
            <label class="switch" title="सक्षम / अक्षम">
              <input type="checkbox" class="toggle-enabled" ${f.is_enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="field-form-row">
          <label>हिंदी लेबल (Display Label)</label>
          <input type="text" class="input-label-hi" value="${escapeHtml(f.label_hi)}">
        </div>

        <div class="field-form-row">
          <label>अंग्रेजी लेबल (English Label)</label>
          <input type="text" class="input-label-en" value="${escapeHtml(f.label_en)}">
        </div>

        <div class="field-bottom-toggles">
          <label class="checkbox-label">
            <input type="checkbox" class="toggle-required" ${f.is_required ? 'checked' : ''}>
            <span>अनिवार्य फ़ील्ड (Required *)</span>
          </label>
          <div class="order-input-wrap">
            <label>क्रम (Order):</label>
            <input type="number" class="input-display-order" value="${f.display_order}" min="0" max="99">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Save Field Configs
el.btnSaveFieldConfigs.addEventListener('click', async () => {
  const cards = el.fieldsListContainer.querySelectorAll('.field-config-card');
  const updatedFields = [];

  cards.forEach((card) => {
    const key = card.dataset.key;
    const labelHi = card.querySelector('.input-label-hi').value.trim();
    const labelEn = card.querySelector('.input-label-en').value.trim();
    const isEnabled = card.querySelector('.toggle-enabled').checked;
    const isRequired = card.querySelector('.toggle-required').checked;
    const order = parseInt(card.querySelector('.input-display-order').value, 10) || 0;

    updatedFields.push({
      field_key: key,
      label_hi: labelHi,
      label_en: labelEn,
      is_enabled: isEnabled ? 1 : 0,
      is_required: isRequired ? 1 : 0,
      display_order: order
    });
  });

  el.btnSaveFieldConfigs.disabled = true;
  el.btnSaveFieldConfigs.textContent = 'सहेजा जा रहा है...';

  try {
    const res = await authFetch(`${API_BASE}/config/fields`, {
      method: 'PUT',
      body: JSON.stringify({ fields: updatedFields })
    });

    if (res.success) {
      state.fields = res.fields;
      renderFieldsList(state.fields);
      loadStats();
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
      loadStats();
      showToast('✓ फ़ील्ड सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गईं!');
    }
  } catch (err) {
    showToast('रीसेट करने में त्रुटि', false);
  }
});

// ==========================================
// 4. SECURITY / CHANGE PASSWORD
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
