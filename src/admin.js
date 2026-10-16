// INLD Admin Portal Logic
import { jsPDF } from 'jspdf';
import { preloadAssets, renderFrontCard, renderBackCard } from './cardGenerator.js';
import { HARYANA_CONSTITUENCIES } from './constituencies.js';

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

  // Logs & Filters
  cardLogsTableBody: document.getElementById('cardLogsTableBody'),
  logSearchInput: document.getElementById('logSearchInput'),
  logFilterDistrict: document.getElementById('logFilterDistrict'),
  logFilterConstituency: document.getElementById('logFilterConstituency'),
  adminConstituencyFilterList: document.getElementById('adminConstituencyFilterList'),
  logFilterCaste: document.getElementById('logFilterCaste'),
  logFilterVillage: document.getElementById('logFilterVillage'),
  logFilterDob: document.getElementById('logFilterDob'),
  logFilterDateFrom: document.getElementById('logFilterDateFrom'),
  logFilterDateTo: document.getElementById('logFilterDateTo'),
  logStatusFilter: document.getElementById('logStatusFilter'),
  btnClearLogFilters: document.getElementById('btnClearLogFilters'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs'),
  logsCountInfo: document.getElementById('logsCountInfo'),

  // Fields
  fieldsListContainer: document.getElementById('fieldsListContainer'),
  btnSaveFieldConfigs: document.getElementById('btnSaveFieldConfigs'),
  btnResetDefaultFields: document.getElementById('btnResetDefaultFields'),
  btnOpenAddFieldModal: document.getElementById('btnOpenAddFieldModal'),

  // Add Custom Field Modal
  modalAddNewField: document.getElementById('modalAddNewField'),
  btnCloseAddFieldModal: document.getElementById('btnCloseAddFieldModal'),
  btnCancelAddField: document.getElementById('btnCancelAddField'),
  formAddNewCustomField: document.getElementById('formAddNewCustomField'),
  newFieldKey: document.getElementById('newFieldKey'),
  newFieldType: document.getElementById('newFieldType'),
  newFieldLabelHi: document.getElementById('newFieldLabelHi'),
  newFieldLabelEn: document.getElementById('newFieldLabelEn'),
  newFieldOrder: document.getElementById('newFieldOrder'),
  newFieldHelpText: document.getElementById('newFieldHelpText'),
  newFieldRequired: document.getElementById('newFieldRequired'),
  btnSubmitNewField: document.getElementById('btnSubmitNewField'),

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
  adminEditConstituenciesList: document.getElementById('adminEditConstituenciesList'),
  editConscode: document.getElementById('editConscode'),
  editAadhaar: document.getElementById('editAadhaar'),
  editDesignation: document.getElementById('editDesignation'),
  editDob: document.getElementById('editDob'),
  editCaste: document.getElementById('editCaste'),
  editBooth: document.getElementById('editBooth'),
  editStatus: document.getElementById('editStatus'),
  btnSubmitEditCard: document.getElementById('btnSubmitEditCard'),

  // Admin Delete Confirmation Modal
  adminDeleteConfirmModal: document.getElementById('adminDeleteConfirmModal'),
  deleteMemberThumb: document.getElementById('deleteMemberThumb'),
  deleteMemberName: document.getElementById('deleteMemberName'),
  deleteMemberMeta: document.getElementById('deleteMemberMeta'),
  deleteMemberId: document.getElementById('deleteMemberId'),
  btnCancelDelete: document.getElementById('btnCancelDelete'),
  btnConfirmDelete: document.getElementById('btnConfirmDelete'),

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

  // Initialize Haryana 90 constituencies datalists
  initConstituencyDatalists();

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
// 2. CARD REQUESTS / LOGS & FILTERS
// ==========================================

const HARYANA_DISTRICTS = [
  'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
  'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh',
  'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
  'Sonipat', 'Yamunanagar'
];

function initConstituencyDatalists() {
  const optionsHtml = HARYANA_CONSTITUENCIES.map(
    c => `<option value="${c.name}">${c.label}</option>`
  ).join('');

  if (el.adminConstituencyFilterList) {
    el.adminConstituencyFilterList.innerHTML = optionsHtml;
  }
  if (el.adminEditConstituenciesList) {
    el.adminEditConstituenciesList.innerHTML = optionsHtml;
  }
}

function populateDistrictFilters(logs = []) {
  if (!el.logFilterDistrict) return;
  const currentVal = el.logFilterDistrict.value;
  const loggedDistricts = logs.map(l => l.district).filter(Boolean);
  const allDistricts = Array.from(new Set([...HARYANA_DISTRICTS, ...loggedDistricts])).sort();

  el.logFilterDistrict.innerHTML = `<option value="all">सभी ज़िले (All Districts)</option>` +
    allDistricts.map(d => `<option value="${escapeHtml(d)}" ${d === currentVal ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

async function loadCardLogs() {
  try {
    const q = el.logSearchInput ? el.logSearchInput.value.trim() : '';
    const dist = el.logFilterDistrict ? el.logFilterDistrict.value : 'all';
    const constituency = el.logFilterConstituency ? el.logFilterConstituency.value.trim() : '';
    const caste = el.logFilterCaste ? el.logFilterCaste.value.trim() : '';
    const village = el.logFilterVillage ? el.logFilterVillage.value.trim() : '';
    const dob = el.logFilterDob ? el.logFilterDob.value.trim() : '';
    const dateFrom = el.logFilterDateFrom ? el.logFilterDateFrom.value : '';
    const dateTo = el.logFilterDateTo ? el.logFilterDateTo.value : '';

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (dist && dist !== 'all') params.append('district', dist);
    if (constituency && constituency !== 'all') params.append('constituency', constituency);
    if (caste && caste !== 'all') params.append('caste', caste);
    if (village && village !== 'all') params.append('village', village);
    if (dob) params.append('dob', dob);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (state.activeStatusFilter && state.activeStatusFilter !== 'all') {
      params.append('status', state.activeStatusFilter);
    }

    const data = await authFetch(`${API_BASE}/cards?${params.toString()}`);
    if (data.success) {
      state.cardLogs = data.logs || [];
      renderCardLogsTable(state.cardLogs);
      populateDistrictFilters(state.cardLogs);
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
      ? '<span class="status-badge-generated">✓ तैयार</span>'
      : '<span class="status-badge-pending">⏳ लंबित</span>';

    return `
      <tr data-id="${log.id}">
        <td><strong>#${log.id}</strong></td>
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
        <td>${escapeHtml(log.constituency || 'N/A')} ${log.conscode ? `<small>(${escapeHtml(log.conscode)})</small>` : ''}</td>
        <td>${statusBadge}</td>
        <td style="white-space: nowrap;"><small>${formattedDate}</small></td>
        <td>
          <div class="table-actions-group">
            <button type="button" class="btn-action-generate" title="पहचान पत्र स्टूडियो खोलें" onclick="window.generateAdminCard(${log.id})">
              🪪 कार्ड
            </button>
            <button type="button" class="btn-action-pdf" title="व्यक्तिगत सदस्यता आवेदन पर्ची PDF" onclick="window.exportIndividualRecordPdf(${log.id})">
              📄 PDF
            </button>
            <button type="button" class="btn-action-edit" title="विवरण संपादित करें" onclick="window.editCardLog(${log.id})">
              ✏️
            </button>
            <button type="button" class="btn-action-delete" title="आवेदन हटाएं" onclick="window.promptDeleteCardLog(${log.id})">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Export Individual Record PDF
window.exportIndividualRecordPdf = function(id) {
  const log = state.cardLogs.find(l => l.id === id);
  if (!log) {
    showToast('कार्ड रिकॉर्ड नहीं मिला', false);
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryGreen = [11, 77, 46];
    const goldColor = [212, 175, 55];
    const darkText = [30, 41, 59];
    const grayText = [100, 116, 139];

    // Header Banner
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, 210, 32, 'F');

    // Gold accent line
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(0, 32, 210, 2, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('INDIAN NATIONAL LOKDAL (INLD)', 105, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('HARYANA STATE HEADQUARTERS • MEMBERSHIP & CADRE RECORD', 105, 22, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Official Party Membership Application & Verification Record Slip', 105, 28, { align: 'center' });

    // Meta Badge Ribbon
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 38, 180, 14, 2, 2, 'FD');

    const formattedDate = new Date(log.created_at).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(`APPLICATION REF: INLD-REQ-#${log.id}`, 20, 47);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`Submitted: ${formattedDate}`, 95, 47);

    const isGenerated = (log.status === 'generated');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isGenerated ? 22 : 180, isGenerated ? 101 : 83, isGenerated ? 52 : 9);
    doc.text(`Status: ${isGenerated ? 'ISSUED / GENERATED' : 'PENDING VERIFICATION'}`, 190, 47, { align: 'right' });

    // Profile Photo Box (Right side 155mm)
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(155, 58, 38, 48, 2, 2, 'FD');

    let photoAdded = false;
    if (log.photo_url && (log.photo_url.startsWith('data:image/') || log.photo_url.startsWith('http') || log.photo_url.startsWith('/'))) {
      try {
        doc.addImage(log.photo_url, 'JPEG', 156, 59, 36, 46);
        photoAdded = true;
      } catch (e) {
        photoAdded = false;
      }
    }
    if (!photoAdded) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Member Photo', 174, 82, { align: 'center' });
      doc.text('(Passport Size)', 174, 87, { align: 'center' });
    }

    // Details Grid (Left side 15mm to 150mm)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 58, 135, 148, 2, 2, 'FD');

    // Section title
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(15, 58, 135, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MEMBER PERSONAL & CONSTITUENCY DETAILS', 20, 63.5);

    const fields = [
      { label: 'Full Name (सदस्य का नाम)', val: log.name || '-' },
      { label: "Father's Name (पिता का नाम)", val: log.father_name || '-' },
      { label: 'Mobile Number (मोबाइल)', val: log.mobile || '-' },
      { label: 'WhatsApp Number', val: log.whatsapp_number || log.mobile || '-' },
      { label: 'Aadhaar Card No. (आधार नंबर)', val: log.aadhaar_no || '-' },
      { label: 'Date of Birth (जन्म तिथि)', val: log.dob || '-' },
      { label: 'Caste / Category (जाति)', val: log.caste || '-' },
      { label: 'Designation / Role (पद)', val: log.designation || 'INLD Karyakarta' },
      { label: 'State & District (राज्य व ज़िला)', val: `${log.district || '-'}, ${log.state || 'Haryana'}` },
      { label: 'City / Town (शहर)', val: log.city || '-' },
      { label: 'Village (गांव)', val: log.village || '-' },
      { label: 'Assembly Constituency (विधानसभा)', val: `${log.constituency || '-'} ${log.conscode ? '(' + log.conscode + ')' : ''}` },
      { label: 'Booth Number (बूथ नं)', val: log.booth || '-' },
      { label: 'Membership ID (क्रमांक)', val: log.membership_no || `INLD-REQ-${log.id}` }
    ];

    let rowY = 73;
    fields.forEach((f, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(16, rowY - 4.5, 133, 9, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text(f.label, 20, rowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      const safeVal = String(f.val).slice(0, 45);
      doc.text(safeVal, 75, rowY);

      rowY += 9.5;
    });

    // Verification & Signatures Section
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 212, 180, 52, 2, 2, 'FD');

    // Left sign box (Applicant Declaration)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('APPLICANT DECLARATION', 22, 220);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('I hereby confirm that the submitted details are correct and I abide', 22, 226);
    doc.text('by the constitution and principles of Indian National Lokdal (INLD).', 22, 230);
    doc.text('Applicant Signature: _______________________', 22, 252);

    // Right sign box (Authorized Official)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('OFFICIAL ATTESTATION & STAMP', 115, 220);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('Attested by District / Constituency Unit Administrator', 115, 226);
    doc.text(`Record Verified on: ${new Date().toLocaleDateString('en-IN')}`, 115, 230);

    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.roundedRect(115, 236, 72, 22, 1, 1, 'D');
    doc.setFontSize(7);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('SEAL / AUTHORIZED SIGNATORY (INLD)', 151, 253, { align: 'center' });

    // Official Footer
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 276, 210, 21, 'F');

    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(0, 275, 210, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CH. DEVI LAL AMAR RAHEIN • JAI JAWAN JAI KISAN • INLD EKTA', 105, 283, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Generated via INLD Official Cadre Management Portal • Computer Generated Verified Document', 105, 289, { align: 'center' });

    const cleanName = (log.name || 'Member').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`INLD_Record_${cleanName}_#${log.id}.pdf`);
    showToast(`✓ सदस्य ${log.name} का व्यक्तिगत PDF रिकॉर्ड डाउनलोड हो गया!`);
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('PDF डाउनलोड करने में त्रुटि', false);
  }
};

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
el.logSearchInput?.addEventListener('input', () => loadCardLogs());
el.logFilterDistrict?.addEventListener('change', () => loadCardLogs());
el.logFilterConstituency?.addEventListener('input', () => loadCardLogs());
el.logFilterCaste?.addEventListener('input', () => loadCardLogs());
el.logFilterVillage?.addEventListener('input', () => loadCardLogs());
el.logFilterDob?.addEventListener('input', () => loadCardLogs());
el.logFilterDateFrom?.addEventListener('change', () => loadCardLogs());
el.logFilterDateTo?.addEventListener('change', () => loadCardLogs());

el.btnClearLogFilters?.addEventListener('click', () => {
  if (el.logSearchInput) el.logSearchInput.value = '';
  if (el.logFilterDistrict) el.logFilterDistrict.value = 'all';
  if (el.logFilterConstituency) el.logFilterConstituency.value = '';
  if (el.logFilterCaste) el.logFilterCaste.value = '';
  if (el.logFilterVillage) el.logFilterVillage.value = '';
  if (el.logFilterDob) el.logFilterDob.value = '';
  if (el.logFilterDateFrom) el.logFilterDateFrom.value = '';
  if (el.logFilterDateTo) el.logFilterDateTo.value = '';
  state.activeStatusFilter = 'all';
  el.logStatusFilter?.querySelectorAll('.filter-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  loadCardLogs();
  showToast('फ़िल्टर साफ़ कर दिए गए');
});

el.btnRefreshLogs?.addEventListener('click', () => {
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
    <img src="${log.photo_url || '/assets/sample_member_photo.jpg'}" alt="Member" class="meta-avatar-thumb" onerror="this.src='/assets/sample_member_photo.jpg'">
    <div class="meta-details-wrap">
      <div class="meta-name-title">${escapeHtml(log.name)}</div>
      <div class="meta-sub-info">
        पिता: <strong>${escapeHtml(log.father_name || '-')}</strong> • मोबाइल: <strong>${escapeHtml(log.mobile || '-')}</strong> • ज़िला: <strong>${escapeHtml(log.district || '-')}</strong>
      </div>
      ${locDetail ? `<div class="meta-loc-tag">📍 ${escapeHtml(locDetail)}</div>` : ''}
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
  if (el.editAadhaar) el.editAadhaar.value = log.aadhaar_no || '';
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

// Auto match Constituency Code in Admin Edit Form
el.editConstituency?.addEventListener('input', () => {
  const typed = (el.editConstituency.value || '').trim().toLowerCase();
  const matched = HARYANA_CONSTITUENCIES.find(
    c => c.name.toLowerCase() === typed || c.label.toLowerCase().includes(typed)
  );
  if (matched) {
    el.editConscode.value = matched.code;
  }
});

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
    aadhaar_no: el.editAadhaar ? el.editAadhaar.value.trim() : '',
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

// ==========================================
// 2D. ADMIN DELETE CONFIRMATION POPUP
// ==========================================
let pendingDeleteId = null;

window.promptDeleteCardLog = function(id) {
  const log = state.cardLogs.find(l => l.id === id);
  if (!log) return;

  pendingDeleteId = id;
  if (el.deleteMemberName) el.deleteMemberName.textContent = log.name || 'सदस्य';
  if (el.deleteMemberMeta) {
    const locArr = [];
    if (log.district) locArr.push(log.district);
    if (log.state) locArr.push(log.state);
    const locStr = locArr.join(', ') || 'हरियाणा';
    el.deleteMemberMeta.textContent = `📱 ${log.mobile || '-'} • ${locStr}`;
  }
  if (el.deleteMemberId) el.deleteMemberId.textContent = `#${log.id}`;
  if (el.deleteMemberThumb) {
    el.deleteMemberThumb.src = log.photo_url || '/assets/sample_member_photo.jpg';
  }

  el.adminDeleteConfirmModal.classList.add('active');
};

// Close Delete Modal
if (el.btnCancelDelete) {
  el.btnCancelDelete.addEventListener('click', () => {
    pendingDeleteId = null;
    el.adminDeleteConfirmModal.classList.remove('active');
  });
}
if (el.adminDeleteConfirmModal) {
  el.adminDeleteConfirmModal.addEventListener('click', (e) => {
    if (e.target === el.adminDeleteConfirmModal) {
      pendingDeleteId = null;
      el.adminDeleteConfirmModal.classList.remove('active');
    }
  });
}

// Confirm Delete Button Handler
if (el.btnConfirmDelete) {
  el.btnConfirmDelete.addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    el.btnConfirmDelete.disabled = true;
    el.btnConfirmDelete.textContent = 'हटाया जा रहा है...';

    try {
      const res = await authFetch(`${API_BASE}/cards/${pendingDeleteId}`, { method: 'DELETE' });
      if (res.success) {
        state.cardLogs = state.cardLogs.filter(l => l.id !== pendingDeleteId);
        renderCardLogsTable(state.cardLogs);
        loadStats();
        showToast('✓ सदस्यता आवेदन रिकॉर्ड हमेशा के लिए हटा दिया गया!');
        el.adminDeleteConfirmModal.classList.remove('active');
      } else {
        showToast(res.error || 'हटाने में त्रुटि', false);
      }
    } catch (err) {
      showToast('हटाने में त्रुटि हुई', false);
    } finally {
      pendingDeleteId = null;
      el.btnConfirmDelete.disabled = false;
      el.btnConfirmDelete.textContent = 'हाँ, हमेशा के लिए हटाएं (Delete)';
    }
  });
}

// Backward-compatible alias
window.deleteCardLog = window.promptDeleteCardLog;

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
    const isEnabled = Boolean(f.is_enabled);
    return `
      <div class="field-config-card ${isEnabled ? '' : 'is-disabled'}" data-key="${f.field_key}">
        <div class="field-card-header">
          <div class="field-meta-left">
            <span class="field-key-badge">${escapeHtml(f.field_key)}</span>
            <span class="field-type-tag">प्रकार: <strong>${escapeHtml(f.field_type)}</strong></span>
          </div>
          <div class="field-switches">
            <span class="field-switch-status" id="status-text-${f.field_key}">
              ${isEnabled ? 'सक्रिय' : 'बंद'}
            </span>
            <label class="switch" title="फ़ील्ड चालू / बंद करें">
              <input type="checkbox" class="toggle-enabled" ${isEnabled ? 'checked' : ''} onchange="this.closest('.field-config-card').classList.toggle('is-disabled', !this.checked); const st = document.getElementById('status-text-${f.field_key}'); if(st) st.textContent = this.checked ? 'सक्रिय' : 'बंद';">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="field-inputs-grid">
          <div class="field-form-row">
            <label>हिंदी लेबल (Display Label)</label>
            <input type="text" class="input-label-hi" value="${escapeHtml(f.label_hi)}">
          </div>

          <div class="field-form-row">
            <label>अंग्रेजी लेबल (English Label)</label>
            <input type="text" class="input-label-en" value="${escapeHtml(f.label_en)}">
          </div>
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

// Add New Custom Field Modal Listeners
if (el.btnOpenAddFieldModal) {
  el.btnOpenAddFieldModal.addEventListener('click', () => {
    if (el.formAddNewCustomField) el.formAddNewCustomField.reset();
    if (el.newFieldOrder) el.newFieldOrder.value = (state.fields.length || 14) + 1;
    if (el.modalAddNewField) el.modalAddNewField.classList.add('active');
  });
}

if (el.btnCloseAddFieldModal) {
  el.btnCloseAddFieldModal.addEventListener('click', () => {
    if (el.modalAddNewField) el.modalAddNewField.classList.remove('active');
  });
}

if (el.btnCancelAddField) {
  el.btnCancelAddField.addEventListener('click', () => {
    if (el.modalAddNewField) el.modalAddNewField.classList.remove('active');
  });
}

if (el.modalAddNewField) {
  el.modalAddNewField.addEventListener('click', (e) => {
    if (e.target === el.modalAddNewField) el.modalAddNewField.classList.remove('active');
  });
}

if (el.formAddNewCustomField) {
  el.formAddNewCustomField.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fieldKey = (el.newFieldKey.value || '').trim();
    const labelHi = (el.newFieldLabelHi.value || '').trim();
    const labelEn = (el.newFieldLabelEn.value || '').trim();
    const fieldType = el.newFieldType.value || 'text';
    const displayOrder = parseInt(el.newFieldOrder.value, 10) || 15;
    const isRequired = el.newFieldRequired.checked ? 1 : 0;
    const helpText = (el.newFieldHelpText.value || '').trim();

    if (!fieldKey || !labelHi) {
      showToast('फ़ील्ड कोड (Key) और हिंदी नाम आवश्यक हैं!', false);
      return;
    }

    el.btnSubmitNewField.disabled = true;
    el.btnSubmitNewField.textContent = 'सहेजा जा रहा है...';

    try {
      const res = await authFetch(`${API_BASE}/config/fields`, {
        method: 'POST',
        body: JSON.stringify({
          field_key: fieldKey,
          label_hi: labelHi,
          label_en: labelEn || fieldKey,
          field_type: fieldType,
          display_order: displayOrder,
          is_required: isRequired,
          is_enabled: 1,
          help_text: helpText
        })
      });

      if (res.success) {
        showToast(res.message || `✓ नया फ़ील्ड "${labelHi}" सफलतापूर्वक जोड़ दिया गया!`);
        if (el.modalAddNewField) el.modalAddNewField.classList.remove('active');
        await loadFieldConfigs();
        await loadStats();
      } else {
        showToast(res.error || 'फ़ील्ड जोड़ने में त्रुटि', false);
      }
    } catch (err) {
      showToast('फ़ील्ड जोड़ने में त्रुटि हुई', false);
    } finally {
      el.btnSubmitNewField.disabled = false;
      el.btnSubmitNewField.textContent = '✅ नया फ़ील्ड जोड़ें (Add Field)';
    }
  });
}

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
