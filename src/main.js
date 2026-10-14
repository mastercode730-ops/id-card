import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { preloadAssets, renderFrontCard, renderBackCard } from './cardGenerator.js';

// Supported Country Codes
const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91 (India)' },
  { code: '+1', label: '🇺🇸 +1 (USA/Canada)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+966', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+974', label: '🇶🇦 +974 (Qatar)' },
  { code: '+965', label: '🇰🇼 +965 (Kuwait)' },
  { code: '+968', label: '🇴🇲 +968 (Oman)' },
  { code: '+973', label: '🇧🇭 +973 (Bahrain)' },
  { code: '+61', label: '🇦🇺 +61 (Australia)' },
  { code: '+65', label: '🇸🇬 +65 (Singapore)' },
  { code: '+49', label: '🇩🇪 +49 (Germany)' },
  { code: '+64', label: '🇳🇿 +64 (New Zealand)' },
  { code: '+60', label: '🇲🇾 +60 (Malaysia)' },
  { code: '+977', label: '🇳🇵 +977 (Nepal)' },
  { code: '+880', label: '🇧🇩 +880 (Bangladesh)' }
];

// State to Districts Mapping
const STATE_DISTRICT_MAP = {
  'Haryana': [
    'Sirsa', 'Fatehabad', 'Hisar', 'Bhiwani', 'Charkhi Dadri', 'Jind', 'Rohtak',
    'Sonipat', 'Panipat', 'Karnal', 'Kurukshetra', 'Kaithal', 'Ambala',
    'Yamunanagar', 'Panchkula', 'Jhajjar', 'Gurugram', 'Rewari', 'Mahendragarh',
    'Faridabad', 'Palwal', 'Nuh'
  ],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar',
    'SAS Nagar (Mohali)', 'Sangrur', 'SBS Nagar (Nawanshahr)', 'Tarn Taran'
  ],
  'Delhi': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
    'South West Delhi', 'West Delhi'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Bikaner', 'Sri Ganganagar', 'Hanumangarh', 'Churu',
    'Jhunjhunu', 'Sikar', 'Alwar', 'Bharatpur', 'Dholpur', 'Karauli', 'Dausa',
    'Ajmer', 'Tonk', 'Nagaur', 'Pali', 'Barmer', 'Jaisalmer', 'Kota', 'Udaipur'
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ayodhya', 'Baghpat', 'Bareilly', 'Bijnor', 'Bulandshahr',
    'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Gorakhpur', 'Hapur', 'Jhansi',
    'Kanpur', 'Lucknow', 'Mathura', 'Meerut', 'Moradabad', 'Muzaffarnagar',
    'Prayagraj', 'Saharanpur', 'Varanasi'
  ],
  'Chandigarh': [
    'Chandigarh'
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
    'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Nainital', 'Udham Singh Nagar', 'Pauri Garhwal',
    'Tehri Garhwal', 'Almora'
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'
  ],
  'Other': [
    'Central / अन्य'
  ]
};

// Application State
const state = {
  activeTab: 'both', // 'both' | 'front' | 'back'
  userPhoto: null,
  isRendering: false,
  sampleAssets: null,
  cardGenerated: false,
  fieldConfigs: [],
  subscription: null,
  userToken: localStorage.getItem('inld_user_token') || null,
  currentUser: null,
  trialDaysSetting: 7,
  subscriptionPlans: []
};

// DOM Elements
const elements = {
  form: document.getElementById('cardForm'),
  formWrapper: document.getElementById('formWrapper'),
  previewResultSection: document.getElementById('previewResultSection'),
  dualCardsContainer: document.getElementById('dualCardsContainer'),
  canvasFront: document.getElementById('idCardCanvasFront'),
  canvasBack: document.getElementById('idCardCanvasBack'),
  cardStageFront: document.getElementById('cardStageFront'),
  cardStageBack: document.getElementById('cardStageBack'),
  tabBoth: document.getElementById('tabBoth'),
  tabFront: document.getElementById('tabFront'),
  tabBack: document.getElementById('tabBack'),

  // User Header Controls
  headerGuestActions: document.getElementById('headerGuestActions'),
  btnOpenLogin: document.getElementById('btnOpenLogin'),
  btnOpenRegister: document.getElementById('btnOpenRegister'),
  headerUserProfile: document.getElementById('headerUserProfile'),
  headerUserAvatar: document.getElementById('headerUserAvatar'),
  headerUserName: document.getElementById('headerUserName'),
  headerUserStatus: document.getElementById('headerUserStatus'),
  btnLogoutUser: document.getElementById('btnLogoutUser'),

  // First Screen: Auth Hero Portal
  authHeroSection: document.getElementById('authHeroSection'),
  cardStudioSection: document.getElementById('cardStudioSection'),
  heroTrialDaysText: document.getElementById('heroTrialDaysText'),
  heroTabRegister: document.getElementById('heroTabRegister'),
  heroTabLogin: document.getElementById('heroTabLogin'),
  heroPanelRegister: document.getElementById('heroPanelRegister'),
  heroPanelLogin: document.getElementById('heroPanelLogin'),
  heroFormRegister: document.getElementById('heroFormRegister'),
  heroRegName: document.getElementById('heroRegName'),
  heroRegPhone: document.getElementById('heroRegPhone'),
  heroRegPassword: document.getElementById('heroRegPassword'),
  heroRegError: document.getElementById('heroRegError'),
  btnHeroSubmitReg: document.getElementById('btnHeroSubmitReg'),
  heroLinkToLogin: document.getElementById('heroLinkToLogin'),
  heroFormLogin: document.getElementById('heroFormLogin'),
  heroLoginPhone: document.getElementById('heroLoginPhone'),
  heroLoginPassword: document.getElementById('heroLoginPassword'),
  heroLoginError: document.getElementById('heroLoginError'),
  btnHeroSubmitLogin: document.getElementById('btnHeroSubmitLogin'),
  heroLinkToRegister: document.getElementById('heroLinkToRegister'),

  // End-User Auth Modal
  userAuthModal: document.getElementById('userAuthModal'),
  authModalClose: document.getElementById('authModalClose'),
  authModalHeading: document.getElementById('authModalHeading'),
  authModalSubheading: document.getElementById('authModalSubheading'),
  tabBtnRegister: document.getElementById('tabBtnRegister'),
  tabBtnLogin: document.getElementById('tabBtnLogin'),
  panelRegister: document.getElementById('panelRegister'),
  panelLogin: document.getElementById('panelLogin'),
  regTrialDaysLabel: document.getElementById('regTrialDaysLabel'),
  formUserRegister: document.getElementById('formUserRegister'),
  regName: document.getElementById('regName'),
  regPhone: document.getElementById('regPhone'),
  regPassword: document.getElementById('regPassword'),
  regErrorMsg: document.getElementById('regErrorMsg'),
  btnSubmitRegister: document.getElementById('btnSubmitRegister'),
  linkSwitchToLogin: document.getElementById('linkSwitchToLogin'),
  formUserLogin: document.getElementById('formUserLogin'),
  loginPhone: document.getElementById('loginPhone'),
  loginPassword: document.getElementById('loginPassword'),
  loginErrorMsg: document.getElementById('loginErrorMsg'),
  btnSubmitLogin: document.getElementById('btnSubmitLogin'),
  linkSwitchToRegister: document.getElementById('linkSwitchToRegister'),

  // Trial & Subscription
  trialStatusBadge: document.getElementById('trialStatusBadge'),
  trialStatusText: document.getElementById('trialStatusText'),
  subscriptionModal: document.getElementById('subscriptionModal'),
  subModalClose: document.getElementById('subModalClose'),
  subModalHeading: document.getElementById('subModalHeading'),
  subModalSubheading: document.getElementById('subModalSubheading'),
  plansGridContainer: document.getElementById('plansGridContainer'),

  // Inputs
  photoInput: document.getElementById('photoInput'),
  photoThumbContainer: document.getElementById('photoThumbContainer'),
  photoThumb: document.getElementById('photoThumb'),
  btnRemovePhoto: document.getElementById('btnRemovePhoto'),

  inputName: document.getElementById('inputName'),
  inputFather: document.getElementById('inputFather'),
  selectMobileCountry: document.getElementById('selectMobileCountry'),
  inputMobile: document.getElementById('inputMobile'),
  selectState: document.getElementById('selectState'),
  selectDistrict: document.getElementById('selectDistrict'),
  inputConstituency: document.getElementById('inputConstituency'),
  inputConscode: document.getElementById('inputConscode'),
  inputDesignation: document.getElementById('inputDesignation'),
  inputDob: document.getElementById('inputDob'),
  inputCaste: document.getElementById('inputCaste'),
  inputBooth: document.getElementById('inputBooth'),
  selectWaCountry: document.getElementById('selectWaCountry'),
  whatsappNumber: document.getElementById('whatsappNumber'),

  // Buttons
  btnSubmitCard: document.getElementById('btnSubmitCard'),
  btnFillSampleQuick: document.getElementById('btnFillSampleQuick'),
  btnDownloadBoth: document.getElementById('btnDownloadBoth'),
  btnDownloadFrontQuick: document.getElementById('btnDownloadFrontQuick'),
  btnDownloadBackQuick: document.getElementById('btnDownloadBackQuick'),
  btnZoomFront: document.getElementById('btnZoomFront'),
  btnZoomBack: document.getElementById('btnZoomBack'),
  btnDownloadPdf: document.getElementById('btnDownloadPdf'),
  btnPrintCard: document.getElementById('btnPrintCard'),
  btnCopyImage: document.getElementById('btnCopyImage'),
  btnShareWhatsapp: document.getElementById('btnShareWhatsapp'),
  btnBackToForm: document.getElementById('btnBackToForm'),

  // Modal & Toast
  zoomModal: document.getElementById('zoomModal'),
  modalImg: document.getElementById('modalImg'),
  modalClose: document.getElementById('modalClose'),
  toastNotice: document.getElementById('toastNotice'),
  toastMsg: document.getElementById('toastMsg')
};

// Toast notification helper
function showToast(message, isSuccess = true) {
  elements.toastMsg.textContent = message;
  elements.toastNotice.className = `toast-notice show ${isSuccess ? 'success' : ''}`;
  setTimeout(() => {
    elements.toastNotice.classList.remove('show');
  }, 3500);
}

// Populate Country Code Selectors
function initCountryCodes() {
  const optionsHtml = COUNTRY_CODES.map(
    (item) => `<option value="${item.code}" ${item.code === '+91' ? 'selected' : ''}>${item.label}</option>`
  ).join('');

  elements.selectMobileCountry.innerHTML = optionsHtml;
  elements.selectWaCountry.innerHTML = optionsHtml;
}

// Update Districts based on Selected State
function updateDistrictsForState(selectedState = 'Haryana', defaultDistrict = '') {
  const districts = STATE_DISTRICT_MAP[selectedState] || STATE_DISTRICT_MAP['Other'];
  elements.selectDistrict.innerHTML = districts
    .map((dist) => `<option value="${dist}">${dist}</option>`)
    .join('');

  if (defaultDistrict && districts.includes(defaultDistrict)) {
    elements.selectDistrict.value = defaultDistrict;
  } else if (districts.length > 0) {
    elements.selectDistrict.value = districts[0];
  }
}

// Compute Membership Number
function getComputedMembershipNo() {
  const stateCode = (elements.selectState.value.trim() || 'Haryana').substring(0, 2).toUpperCase();
  const district = elements.selectDistrict.value.trim() || 'SIRSA';
  const code = elements.inputConscode.value.trim() || '45';
  const booth = elements.inputBooth.value.trim() || '30';
  return `INLD/${stateCode}/${district}/${code}/${booth}`;
}

// Collect current form data
function getFormData() {
  const membershipNo = getComputedMembershipNo();
  const mobileVal = elements.inputMobile.value.trim();

  return {
    name: elements.inputName.value.trim(),
    father: elements.inputFather.value.trim(),
    mobile: mobileVal,
    mobileCountryCode: elements.selectMobileCountry.value,
    dob: elements.inputDob.value.trim(),
    caste: elements.inputCaste.value.trim() || 'Gen(Brahmin)',
    designation: elements.inputDesignation.value.trim() || 'INLD Karyakarta',
    state: elements.selectState.value.trim() || 'Haryana',
    district: elements.selectDistrict.value.trim(),
    constituency: elements.inputConstituency.value.trim(),
    conscode: elements.inputConscode.value.trim(),
    booth: elements.inputBooth.value.trim(),
    whatsappNumber: elements.whatsappNumber.value.trim(),
    whatsappCountryCode: elements.selectWaCountry.value,
    membershipNo: membershipNo,
    signatoryName: 'RamPal Majra',
    signatoryTitle: 'Pradeshadhyaksh, INLD',
    photoImg: state.userPhoto || state.sampleAssets?.samplePhoto,
    photoZoom: 1.0,
    photoOffsetY: 0,
    showWatermark: true,
    showQr: true
  };
}

// Date of Birth Validation (DD/MM/YYYY)
function isValidDob(dobStr) {
  if (!dobStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dobStr)) return false;
  const [d, m, y] = dobStr.split('/').map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const currentYear = new Date().getFullYear();
  if (y < 1920 || y > currentYear) return false;
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
}

// Field Error Helpers
function setFieldError(fieldId, errorText) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  const inputEl = document.getElementById(fieldId);

  if (errorEl) {
    if (errorText) {
      errorEl.textContent = `⚠️ ${errorText}`;
      errorEl.classList.add('active');
    } else {
      errorEl.textContent = '';
      errorEl.classList.remove('active');
    }
  }

  if (inputEl) {
    if (errorText) {
      inputEl.classList.add('input-error');
      inputEl.classList.remove('input-valid');
    } else {
      inputEl.classList.remove('input-error');
      if (inputEl.value.trim()) inputEl.classList.add('input-valid');
    }
  }
}

function clearFieldError(fieldId) {
  setFieldError(fieldId, '');
}

// Field Mapping to DOM group IDs
const FIELD_GROUP_MAP = {
  photoInput: 'group-photo',
  inputName: 'group-name',
  inputFather: 'group-father',
  inputMobile: 'group-mobile',
  selectState: 'group-state',
  selectDistrict: 'group-district',
  inputConstituency: 'group-constituency',
  inputConscode: 'group-conscode',
  inputDesignation: 'group-designation',
  inputDob: 'group-dob',
  inputCaste: 'group-caste',
  inputBooth: 'group-booth',
  whatsappNumber: 'group-whatsapp'
};

function isFieldEnabled(key) {
  const f = state.fieldConfigs.find(c => c.field_key === key);
  return f ? Boolean(f.is_enabled) : true;
}

function isFieldRequired(key) {
  const f = state.fieldConfigs.find(c => c.field_key === key);
  return f ? Boolean(f.is_required) : true;
}

// Fetch and Apply Dynamic Field Configurations from Admin
async function loadAndApplyFieldConfigs() {
  try {
    const res = await fetch('/api/config/fields');
    const data = await res.json();
    if (data.success && Array.isArray(data.fields)) {
      state.fieldConfigs = data.fields;
      data.fields.forEach((f) => {
        const groupId = FIELD_GROUP_MAP[f.field_key];
        const groupEl = document.getElementById(groupId);
        if (groupEl) {
          groupEl.style.display = f.is_enabled ? '' : 'none';
          const labelEl = groupEl.querySelector('.field-label');
          if (labelEl && f.label_hi) {
            const reqStar = f.is_required ? ' <span class="req-star">*</span>' : '';
            labelEl.innerHTML = `${f.label_hi}${reqStar}`;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Field config fetch skipped (offline/standalone):', err);
  }
}

// ==========================================
// USER AUTHENTICATION & TRIAL / SUBSCRIPTION LOGIC
// ==========================================

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

// Render Header User Profile or Guest Actions
function renderHeaderUser() {
  if (state.currentUser) {
    // Authenticated user: show Studio, hide Hero Screen
    if (elements.authHeroSection) elements.authHeroSection.style.display = 'none';
    if (elements.cardStudioSection) elements.cardStudioSection.style.display = 'block';
    if (elements.btnFillSampleQuick) elements.btnFillSampleQuick.style.display = 'inline-flex';

    if (elements.headerGuestActions) elements.headerGuestActions.style.display = 'none';
    if (elements.headerUserProfile) elements.headerUserProfile.style.display = 'flex';

    if (elements.headerUserName) {
      elements.headerUserName.textContent = state.currentUser.name || 'सदस्य';
    }
    if (elements.headerUserAvatar) {
      elements.headerUserAvatar.textContent = (state.currentUser.name || 'U')[0].toUpperCase();
    }
    if (elements.headerUserStatus) {
      if (state.currentUser.isSubscribed) {
        elements.headerUserStatus.textContent = '👑 ' + (state.currentUser.planName || 'प्रीमियम');
        elements.headerUserStatus.style.color = '#fef08a';
      } else if (state.currentUser.isTrialActive) {
        elements.headerUserStatus.textContent = `⏳ ${state.currentUser.daysRemaining} दिन ट्रायल`;
        elements.headerUserStatus.style.color = '#86efac';
      } else {
        elements.headerUserStatus.textContent = '⚠️ ट्रायल समाप्त';
        elements.headerUserStatus.style.color = '#fca5a5';
      }
    }

    // Auto-fill member form fields if empty
    if (elements.inputName && !elements.inputName.value.trim()) {
      elements.inputName.value = state.currentUser.name;
    }
    if (elements.inputMobile && !elements.inputMobile.value.trim() && state.currentUser.phone) {
      elements.inputMobile.value = state.currentUser.phone;
    }
    if (elements.whatsappNumber && !elements.whatsappNumber.value.trim() && state.currentUser.phone) {
      elements.whatsappNumber.value = state.currentUser.phone;
    }
  } else {
    // Guest: First screen is the engaging Login/Register Hero Screen!
    if (elements.authHeroSection) elements.authHeroSection.style.display = 'block';
    if (elements.cardStudioSection) elements.cardStudioSection.style.display = 'none';
    if (elements.btnFillSampleQuick) elements.btnFillSampleQuick.style.display = 'none';

    if (elements.headerGuestActions) elements.headerGuestActions.style.display = 'flex';
    if (elements.headerUserProfile) elements.headerUserProfile.style.display = 'none';
  }
}

// Check User Session on load
async function checkUserSession() {
  if (!state.userToken) {
    renderHeaderUser();
    return;
  }

  try {
    const res = await fetch('/api/user/me', {
      headers: { 'Authorization': `Bearer ${state.userToken}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
    } else {
      state.userToken = null;
      state.currentUser = null;
      localStorage.removeItem('inld_user_token');
    }
  } catch (err) {
    console.warn('User session check skipped:', err);
  }
  renderHeaderUser();
}

// Load Subscription Plans & Trial Days Setting
async function loadSubscriptionPlans() {
  try {
    const res = await fetch('/api/subscription-plans');
    const data = await res.json();
    if (data.success) {
      state.trialDaysSetting = data.trialDays || 7;
      state.subscriptionPlans = data.plans || [];

      if (elements.regTrialDaysLabel) {
        elements.regTrialDaysLabel.textContent = `${state.trialDaysSetting} दिन`;
      }
      if (elements.heroTrialDaysText) {
        elements.heroTrialDaysText.textContent = `${state.trialDaysSetting} दिन`;
      }

      renderPlansGrid(state.subscriptionPlans);
    }
  } catch (err) {
    console.warn('Subscription plans fetch skipped:', err);
  }
}

// Render Dynamic Plans Grid in Subscription Modal
function renderPlansGrid(plans) {
  if (!elements.plansGridContainer) return;
  if (!plans || plans.length === 0) {
    elements.plansGridContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; grid-column:1/-1;">कोई प्लान उपलब्ध नहीं है।</p>';
    return;
  }

  elements.plansGridContainer.innerHTML = plans.map(p => {
    const isPopular = p.plan_key === 'yearly' || (p.badge_text && p.badge_text.includes('लोकप्रिय'));
    const featuresList = (p.features || []).map(f => `<li>✓ ${escapeHtml(f)}</li>`).join('');

    return `
      <div class="plan-card ${isPopular ? 'popular-plan' : ''}" data-plan="${escapeHtml(p.plan_key)}">
        ${p.badge_text ? `<span class="plan-popular-badge">${escapeHtml(p.badge_text)}</span>` : ''}
        <span class="plan-tag ${isPopular ? 'tag-gold' : ''}">${escapeHtml(p.name_hi || p.plan_key)}</span>
        <h4>₹${Number(p.price || 0)}</h4>
        <span class="plan-period">${escapeHtml(p.period_label || `${p.duration_days} दिन`)}</span>
        <ul class="plan-features">
          ${featuresList || '<li>✓ असीमित HD कार्ड निर्माण</li><li>✓ Front & Back दोनों साइड्स</li>'}
        </ul>
        <button type="button" class="btn-choose-plan ${isPopular ? 'btn-plan-popular' : ''}" data-plan="${escapeHtml(p.plan_key)}">
          ${escapeHtml(p.name_hi || 'प्लान')} लें (₹${Number(p.price || 0)})
        </button>
      </div>
    `;
  }).join('');

  // Rebind plan buttons
  elements.plansGridContainer.querySelectorAll('.btn-choose-plan').forEach(btn => {
    btn.addEventListener('click', () => {
      const planKey = btn.dataset.plan;
      subscribeToPlan(planKey, btn);
    });
  });
}

// User Subscribes to Plan
async function subscribeToPlan(planKey, btn) {
  if (!state.currentUser) {
    closeSubscriptionModal();
    openAuthModal('login', 'सब्सक्रिप्शन लेने के लिए कृपया पहले लॉगिन करें।');
    return;
  }

  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'सक्रिय किया जा रहा है...';
  }

  try {
    const res = await fetch('/api/user/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.userToken}`
      },
      body: JSON.stringify({ planKey })
    });
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
      renderHeaderUser();
      closeSubscriptionModal();
      showToast('👑 बधाई! आपका प्रीमियम प्लान सक्रिय हो गया है!');
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#0b4d2e', '#d4af37', '#16a34a', '#fce278']
      });
      // If form is valid, auto submit
      elements.form.requestSubmit();
    } else {
      showToast(data.error || 'सब्सक्राइब करने में त्रुटि', false);
    }
  } catch (err) {
    showToast('सब्सक्रिप्शन प्रक्रिया विफल रही', false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// Auth Modal Helpers
function openAuthModal(tab = 'register', promptMsg = '') {
  if (!elements.userAuthModal) return;

  if (promptMsg && elements.authModalSubheading) {
    elements.authModalSubheading.textContent = promptMsg;
  } else if (elements.authModalSubheading) {
    elements.authModalSubheading.textContent = 'नया खाता बनाएं और तुरंत अपना निःशुल्क ट्रायल शुरू करें';
  }

  if (elements.regErrorMsg) elements.regErrorMsg.style.display = 'none';
  if (elements.loginErrorMsg) elements.loginErrorMsg.style.display = 'none';

  switchAuthTab(tab);
  elements.userAuthModal.classList.add('active');
}

function closeAuthModal() {
  if (elements.userAuthModal) {
    elements.userAuthModal.classList.remove('active');
  }
}

function switchAuthTab(tab = 'register') {
  if (tab === 'register') {
    elements.tabBtnRegister?.classList.add('active');
    elements.tabBtnLogin?.classList.remove('active');
    if (elements.panelRegister) elements.panelRegister.style.display = 'block';
    if (elements.panelLogin) elements.panelLogin.style.display = 'none';
  } else {
    elements.tabBtnLogin?.classList.add('active');
    elements.tabBtnRegister?.classList.remove('active');
    if (elements.panelLogin) elements.panelLogin.style.display = 'block';
    if (elements.panelRegister) elements.panelRegister.style.display = 'none';
  }
}

// Hero First-Screen Tab Switcher
function switchHeroAuthTab(tab = 'register') {
  if (tab === 'register') {
    elements.heroTabRegister?.classList.add('active');
    elements.heroTabLogin?.classList.remove('active');
    if (elements.heroPanelRegister) elements.heroPanelRegister.style.display = 'block';
    if (elements.heroPanelLogin) elements.heroPanelLogin.style.display = 'none';
  } else {
    elements.heroTabLogin?.classList.add('active');
    elements.heroTabRegister?.classList.remove('active');
    if (elements.heroPanelLogin) elements.heroPanelLogin.style.display = 'block';
    if (elements.heroPanelRegister) elements.heroPanelRegister.style.display = 'none';
  }
}

function openSubscriptionModal() {
  if (elements.subscriptionModal) {
    elements.subscriptionModal.classList.add('active');
  }
}

function closeSubscriptionModal() {
  if (elements.subscriptionModal) {
    elements.subscriptionModal.classList.remove('active');
  }
}


// Comprehensive Dynamic Form Validation
function validateForm() {
  let isValid = true;
  let firstInvalidEl = null;

  function markError(id, msg) {
    isValid = false;
    setFieldError(id, msg);
    if (!firstInvalidEl) {
      firstInvalidEl = document.getElementById(id);
    }
  }

  // 1. Photo validation
  if (isFieldEnabled('photoInput')) {
    if (isFieldRequired('photoInput') && !state.userPhoto) {
      isValid = false;
      setFieldError('photoInput', 'कृपया अपनी फ़ोटो अपलोड करें');
      if (!firstInvalidEl) firstInvalidEl = elements.photoInput;
    } else {
      clearFieldError('photoInput');
    }
  }

  // 2. Name validation
  const nameVal = elements.inputName.value.trim();
  if (isFieldEnabled('inputName')) {
    if (isFieldRequired('inputName') && !nameVal) {
      markError('inputName', 'नाम दर्ज करना अनिवार्य है');
    } else if (nameVal && nameVal.length < 2) {
      markError('inputName', 'नाम कम से कम 2 अक्षरों का होना चाहिए');
    } else {
      clearFieldError('inputName');
    }
  }

  // 3. Father's Name validation
  const fatherVal = elements.inputFather.value.trim();
  if (isFieldEnabled('inputFather')) {
    if (isFieldRequired('inputFather') && !fatherVal) {
      markError('inputFather', 'पिताजी का नाम दर्ज करना अनिवार्य है');
    } else if (fatherVal && fatherVal.length < 2) {
      markError('inputFather', 'पिताजी का नाम कम से कम 2 अक्षरों का होना चाहिए');
    } else {
      clearFieldError('inputFather');
    }
  }

  // 4. Mobile Number validation
  const mobileVal = elements.inputMobile.value.trim();
  const mobileCountry = elements.selectMobileCountry.value;
  if (isFieldEnabled('inputMobile')) {
    if (isFieldRequired('inputMobile') && !mobileVal) {
      markError('inputMobile', 'मोबाइल नंबर दर्ज करना अनिवार्य है');
    } else if (mobileVal && mobileCountry === '+91' && !/^[5-9]\d{9}$/.test(mobileVal)) {
      markError('inputMobile', 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें');
    } else if (mobileVal && !/^\d{6,14}$/.test(mobileVal)) {
      markError('inputMobile', 'कृपया मान्य मोबाइल नंबर दर्ज करें (6-14 अंक)');
    } else {
      clearFieldError('inputMobile');
    }
  }

  // 5. State validation
  if (isFieldEnabled('selectState')) {
    if (isFieldRequired('selectState') && !elements.selectState.value.trim()) {
      markError('selectState', 'कृपया राज्य चुनें');
    } else {
      clearFieldError('selectState');
    }
  }

  // 6. District validation
  if (isFieldEnabled('selectDistrict')) {
    if (isFieldRequired('selectDistrict') && !elements.selectDistrict.value.trim()) {
      markError('selectDistrict', 'कृपया ज़िला चुनें');
    } else {
      clearFieldError('selectDistrict');
    }
  }

  // 7. Constituency validation
  const constVal = elements.inputConstituency.value.trim();
  if (isFieldEnabled('inputConstituency')) {
    if (isFieldRequired('inputConstituency') && !constVal) {
      markError('inputConstituency', 'विधानसभा क्षेत्र दर्ज करना अनिवार्य है');
    } else if (constVal && constVal.length < 2) {
      markError('inputConstituency', 'विधानसभा क्षेत्र कम से कम 2 अक्षरों का होना चाहिए');
    } else {
      clearFieldError('inputConstituency');
    }
  }

  // 8. Constituency Code validation
  const consCodeVal = elements.inputConscode.value.trim();
  if (isFieldEnabled('inputConscode')) {
    if (isFieldRequired('inputConscode') && !consCodeVal) {
      markError('inputConscode', 'विधानसभा कोड दर्ज करना अनिवार्य है (उदा. 45 या SRS)');
    } else {
      clearFieldError('inputConscode');
    }
  }

  // 9. Designation validation
  const desigVal = elements.inputDesignation.value.trim();
  if (isFieldEnabled('inputDesignation')) {
    if (isFieldRequired('inputDesignation') && !desigVal) {
      markError('inputDesignation', 'पद/नाम दर्ज करना अनिवार्य है');
    } else {
      clearFieldError('inputDesignation');
    }
  }

  // 10. DOB validation
  const dobVal = elements.inputDob.value.trim();
  if (isFieldEnabled('inputDob')) {
    if (isFieldRequired('inputDob') && !dobVal) {
      markError('inputDob', 'जन्म तिथि दर्ज करना अनिवार्य है (DD/MM/YYYY)');
    } else if (dobVal && !isValidDob(dobVal)) {
      markError('inputDob', 'मान्य जन्म तिथि दर्ज करें प्रारूप: DD/MM/YYYY (उदा. 20/05/1973)');
    } else {
      clearFieldError('inputDob');
    }
  }

  // 11. Caste validation
  const casteVal = elements.inputCaste.value.trim();
  if (isFieldEnabled('inputCaste')) {
    if (isFieldRequired('inputCaste') && !casteVal) {
      markError('inputCaste', 'जाति / वर्ग (Caste) दर्ज करना अनिवार्य है');
    } else {
      clearFieldError('inputCaste');
    }
  }

  // 12. Booth No validation
  const boothVal = elements.inputBooth.value.trim();
  if (isFieldEnabled('inputBooth')) {
    if (isFieldRequired('inputBooth') && !boothVal) {
      markError('inputBooth', 'बूथ नंबर दर्ज करना अनिवार्य है');
    } else {
      clearFieldError('inputBooth');
    }
  }

  // 13. WhatsApp Number validation
  const waVal = elements.whatsappNumber.value.trim();
  const waCountry = elements.selectWaCountry.value;
  if (isFieldEnabled('whatsappNumber')) {
    if (isFieldRequired('whatsappNumber') && !waVal) {
      markError('whatsappNumber', 'WhatsApp नंबर दर्ज करना अनिवार्य है');
    } else if (waVal && waCountry === '+91' && !/^[5-9]\d{9}$/.test(waVal)) {
      markError('whatsappNumber', 'कृपया 10 अंकों का मान्य WhatsApp नंबर दर्ज करें');
    } else if (waVal && !/^\d{6,14}$/.test(waVal)) {
      markError('whatsappNumber', 'कृपया मान्य WhatsApp नंबर दर्ज करें (6-14 अंक)');
    } else {
      clearFieldError('whatsappNumber');
    }
  }

  return { isValid, firstInvalidEl };
}

// Render Card Canvases (Both Front & Back)
async function updateCard() {
  if (state.isRendering) return;
  state.isRendering = true;

  try {
    const data = getFormData();
    await Promise.all([
      renderFrontCard(elements.canvasFront, data),
      renderBackCard(elements.canvasBack, data)
    ]);
  } catch (err) {
    console.error('Rendering error:', err);
  } finally {
    state.isRendering = false;
  }
}

// Load Sample Data (For Quick Testing)
function loadSampleData() {
  // Clear any existing validation errors
  [
    'photoInput', 'inputName', 'inputFather', 'inputMobile', 'selectState',
    'selectDistrict', 'inputConstituency', 'inputConscode', 'inputDesignation',
    'inputDob', 'inputCaste', 'inputBooth', 'whatsappNumber'
  ].forEach(clearFieldError);

  elements.inputName.value = 'Ravi Kant';
  elements.inputFather.value = 'Omparkash';
  elements.selectMobileCountry.value = '+91';
  elements.inputMobile.value = '9815395397';
  elements.selectState.value = 'Haryana';
  updateDistrictsForState('Haryana', 'Sirsa');
  elements.inputConstituency.value = 'Sursa';
  elements.inputConscode.value = '45';
  elements.inputDesignation.value = 'State Social Media Coordinator';
  elements.inputDob.value = '20/05/1973';
  elements.inputCaste.value = 'Gen(Brahmin)';
  elements.inputBooth.value = '30';
  elements.selectWaCountry.value = '+91';
  elements.whatsappNumber.value = '9815395397';

  // Load sample member photo
  if (state.sampleAssets?.samplePhoto) {
    state.userPhoto = state.sampleAssets.samplePhoto;
    elements.photoThumb.src = state.sampleAssets.samplePhoto.src;
    elements.photoThumbContainer.style.display = 'block';
  }

  showToast('✓ नमूना डेटा (Sample Data) लोड हो गया है। अब "कार्ड बनाएं" पर क्लिक करें!');
}

// ==========================================
// USER AUTH ACTIONS (REGISTER, LOGIN, LOGOUT)
// ==========================================

function showAuthError(el, msg) {
  if (el) {
    el.textContent = `⚠️ ${msg}`;
    el.style.display = 'block';
  }
}

// Handle Registration
async function handleRegister(e) {
  e.preventDefault();
  const name = elements.regName.value.trim();
  const phone = elements.regPhone.value.trim();
  const password = elements.regPassword.value;

  if (elements.regErrorMsg) elements.regErrorMsg.style.display = 'none';

  if (!name || name.length < 2) {
    showAuthError(elements.regErrorMsg, 'कृपया अपना पूरा नाम दर्ज करें');
    return;
  }
  if (!phone || phone.length < 10) {
    showAuthError(elements.regErrorMsg, 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
    return;
  }
  if (!password || password.length < 4) {
    showAuthError(elements.regErrorMsg, 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
    return;
  }

  elements.btnSubmitRegister.disabled = true;
  elements.btnSubmitRegister.textContent = 'खाता बनाया जा रहा है...';

  try {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      state.userToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('inld_user_token', data.token);

      closeAuthModal();
      renderHeaderUser();

      showToast(`🎉 बधाई! आपका ${data.trialDays || 7} दिन का फ्री ट्रायल शुरू हो गया है!`);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#0b4d2e', '#d4af37', '#16a34a', '#fce278']
      });

      // Auto fill form inputs
      if (elements.inputName && !elements.inputName.value) elements.inputName.value = name;
      if (elements.inputMobile && !elements.inputMobile.value) elements.inputMobile.value = phone;
    } else {
      showAuthError(elements.regErrorMsg, data.error || 'पंजीकरण में त्रुटि हुई');
    }
  } catch (err) {
    showAuthError(elements.regErrorMsg, 'नेटवर्क त्रुटि, कृपया पुनः प्रयास करें');
  } finally {
    elements.btnSubmitRegister.disabled = false;
    elements.btnSubmitRegister.textContent = '🚀 खाता बनाएं और फ्री ट्रायल शुरू करें';
  }
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  const phone = elements.loginPhone.value.trim();
  const password = elements.loginPassword.value;

  if (elements.loginErrorMsg) elements.loginErrorMsg.style.display = 'none';

  if (!phone) {
    showAuthError(elements.loginErrorMsg, 'कृपया अपना मोबाइल नंबर दर्ज करें');
    return;
  }
  if (!password) {
    showAuthError(elements.loginErrorMsg, 'कृपया अपना पासवर्ड दर्ज करें');
    return;
  }

  elements.btnSubmitLogin.disabled = true;
  elements.btnSubmitLogin.textContent = 'लॉगिन किया जा रहा है...';

  try {
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      state.userToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('inld_user_token', data.token);

      closeAuthModal();
      renderHeaderUser();
      showToast(`✓ स्वागत है, ${data.user.name}!`);

      if (elements.inputName && !elements.inputName.value) elements.inputName.value = data.user.name;
      if (elements.inputMobile && !elements.inputMobile.value) elements.inputMobile.value = data.user.phone;
    } else {
      showAuthError(elements.loginErrorMsg, data.error || 'लॉगिन में त्रुटि');
    }
  } catch (err) {
    showAuthError(elements.loginErrorMsg, 'नेटवर्क त्रुटि, कृपया पुनः प्रयास करें');
  } finally {
    elements.btnSubmitLogin.disabled = false;
    elements.btnSubmitLogin.textContent = '🔑 लॉगिन करें';
  }
}

// Handle Hero Register
async function handleHeroRegister(e) {
  e.preventDefault();
  const name = elements.heroRegName?.value.trim() || '';
  const phone = elements.heroRegPhone?.value.trim() || '';
  const password = elements.heroRegPassword?.value || '';

  if (elements.heroRegError) elements.heroRegError.style.display = 'none';

  if (!name || name.length < 2) {
    showAuthError(elements.heroRegError, 'कृपया अपना पूरा नाम दर्ज करें');
    return;
  }
  if (!phone || phone.length < 10) {
    showAuthError(elements.heroRegError, 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
    return;
  }
  if (!password || password.length < 4) {
    showAuthError(elements.heroRegError, 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए');
    return;
  }

  if (elements.btnHeroSubmitReg) {
    elements.btnHeroSubmitReg.disabled = true;
    elements.btnHeroSubmitReg.textContent = 'खाता बनाया जा रहा है...';
  }

  try {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      state.userToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('inld_user_token', data.token);

      renderHeaderUser();

      showToast(`🎉 बधाई! आपका ${data.trialDays || 7} दिन का फ्री ट्रायल शुरू हो गया है!`);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#0b4d2e', '#d4af37', '#16a34a', '#fce278']
      });

      // Auto fill form inputs
      if (elements.inputName && !elements.inputName.value) elements.inputName.value = name;
      if (elements.inputMobile && !elements.inputMobile.value) elements.inputMobile.value = phone;

      // Smooth scroll down to card studio
      elements.cardStudioSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      showAuthError(elements.heroRegError, data.error || 'पंजीकरण में त्रुटि हुई');
    }
  } catch (err) {
    showAuthError(elements.heroRegError, 'नेटवर्क त्रुटि, कृपया पुनः प्रयास करें');
  } finally {
    if (elements.btnHeroSubmitReg) {
      elements.btnHeroSubmitReg.disabled = false;
      elements.btnHeroSubmitReg.textContent = '🚀 तुरंत शुरू करें (Free Trial)';
    }
  }
}

// Handle Hero Login
async function handleHeroLogin(e) {
  e.preventDefault();
  const phone = elements.heroLoginPhone?.value.trim() || '';
  const password = elements.heroLoginPassword?.value || '';

  if (elements.heroLoginError) elements.heroLoginError.style.display = 'none';

  if (!phone) {
    showAuthError(elements.heroLoginError, 'कृपया अपना मोबाइल नंबर दर्ज करें');
    return;
  }
  if (!password) {
    showAuthError(elements.heroLoginError, 'कृपया अपना पासवर्ड दर्ज करें');
    return;
  }

  if (elements.btnHeroSubmitLogin) {
    elements.btnHeroSubmitLogin.disabled = true;
    elements.btnHeroSubmitLogin.textContent = 'लॉगिन किया जा रहा है...';
  }

  try {
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      state.userToken = data.token;
      state.currentUser = data.user;
      localStorage.setItem('inld_user_token', data.token);

      renderHeaderUser();
      showToast(`✓ स्वागत है, ${data.user.name}!`);

      if (elements.inputName && !elements.inputName.value) elements.inputName.value = data.user.name;
      if (elements.inputMobile && !elements.inputMobile.value) elements.inputMobile.value = data.user.phone;

      // Smooth scroll down to card studio
      elements.cardStudioSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      showAuthError(elements.heroLoginError, data.error || 'लॉगिन में त्रुटि');
    }
  } catch (err) {
    showAuthError(elements.heroLoginError, 'नेटवर्क त्रुटि, कृपया पुनः प्रयास करें');
  } finally {
    if (elements.btnHeroSubmitLogin) {
      elements.btnHeroSubmitLogin.disabled = false;
      elements.btnHeroSubmitLogin.textContent = '🔑 पोर्टल में प्रवेश करें';
    }
  }
}

// Handle Logout
function handleLogout() {
  state.userToken = null;
  state.currentUser = null;
  localStorage.removeItem('inld_user_token');
  renderHeaderUser();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('सफलतापूर्वक लॉगआउट कर दिया गया है।');
}

// Initialize Application
async function init() {
  initCountryCodes();
  updateDistrictsForState('Haryana', 'Sirsa');

  try {
    state.sampleAssets = await preloadAssets();
  } catch (err) {
    console.error('Assets loading error:', err);
  }

  // Load user session, subscription plans & trial days setting, and dynamic form fields
  await Promise.all([
    checkUserSession(),
    loadSubscriptionPlans(),
    loadAndApplyFieldConfigs()
  ]);

  setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
  // Header User Auth Buttons
  elements.btnOpenLogin?.addEventListener('click', () => {
    if (elements.authHeroSection && elements.authHeroSection.style.display !== 'none') {
      switchHeroAuthTab('login');
      elements.heroPanelLogin?.scrollIntoView({ behavior: 'smooth' });
    } else {
      openAuthModal('login');
    }
  });
  elements.btnOpenRegister?.addEventListener('click', () => {
    if (elements.authHeroSection && elements.authHeroSection.style.display !== 'none') {
      switchHeroAuthTab('register');
      elements.heroPanelRegister?.scrollIntoView({ behavior: 'smooth' });
    } else {
      openAuthModal('register');
    }
  });
  elements.btnLogoutUser?.addEventListener('click', handleLogout);

  // Hero First-Screen Auth Controls & Submit
  elements.heroTabRegister?.addEventListener('click', () => switchHeroAuthTab('register'));
  elements.heroTabLogin?.addEventListener('click', () => switchHeroAuthTab('login'));
  elements.heroLinkToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    switchHeroAuthTab('login');
  });
  elements.heroLinkToRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    switchHeroAuthTab('register');
  });
  elements.heroFormRegister?.addEventListener('submit', handleHeroRegister);
  elements.heroFormLogin?.addEventListener('submit', handleHeroLogin);
  elements.heroRegPhone?.addEventListener('input', () => {
    elements.heroRegPhone.value = elements.heroRegPhone.value.replace(/[^0-9]/g, '');
  });
  elements.heroLoginPhone?.addEventListener('input', () => {
    elements.heroLoginPhone.value = elements.heroLoginPhone.value.replace(/[^0-9]/g, '');
  });

  // Auth Modal Controls
  elements.authModalClose?.addEventListener('click', closeAuthModal);
  elements.userAuthModal?.addEventListener('click', (e) => {
    if (e.target === elements.userAuthModal) closeAuthModal();
  });
  elements.tabBtnRegister?.addEventListener('click', () => switchAuthTab('register'));
  elements.tabBtnLogin?.addEventListener('click', () => switchAuthTab('login'));
  elements.linkSwitchToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });
  elements.linkSwitchToRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('register');
  });

  // Auth Forms Submit
  elements.formUserRegister?.addEventListener('submit', handleRegister);
  elements.formUserLogin?.addEventListener('submit', handleLogin);

  // Restrict register phone to digits only
  elements.regPhone?.addEventListener('input', () => {
    elements.regPhone.value = elements.regPhone.value.replace(/[^0-9]/g, '');
  });
  elements.loginPhone?.addEventListener('input', () => {
    elements.loginPhone.value = elements.loginPhone.value.replace(/[^0-9]/g, '');
  });

  // State dropdown change -> update districts
  elements.selectState.addEventListener('change', () => {
    updateDistrictsForState(elements.selectState.value);
    clearFieldError('selectState');
    clearFieldError('selectDistrict');
    if (state.cardGenerated) updateCard();
  });

  // Photo file picker
  elements.photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setFieldError('photoInput', 'कृपया केवल फ़ोटो (JPG, PNG, WebP) चुनें');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state.userPhoto = img;
        elements.photoThumb.src = ev.target.result;
        elements.photoThumbContainer.style.display = 'block';
        clearFieldError('photoInput');
        if (state.cardGenerated) updateCard();
        showToast('✓ फ़ोटो सफलतापूर्वक लोड की गई!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Remove Photo Button
  elements.btnRemovePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    state.userPhoto = null;
    elements.photoInput.value = '';
    elements.photoThumb.src = '';
    elements.photoThumbContainer.style.display = 'none';
    if (state.cardGenerated) updateCard();
    showToast('फ़ोटो हटा दी गई');
  });

  // Restrict mobile input to digits only & auto-clear error
  elements.inputMobile.addEventListener('input', () => {
    elements.inputMobile.value = elements.inputMobile.value.replace(/[^0-9]/g, '');
    clearFieldError('inputMobile');
    if (state.cardGenerated) updateCard();
  });

  // Restrict whatsapp input to digits only & auto-clear error
  elements.whatsappNumber.addEventListener('input', () => {
    elements.whatsappNumber.value = elements.whatsappNumber.value.replace(/[^0-9]/g, '');
    clearFieldError('whatsappNumber');
  });

  // Auto-format DOB with slashes (DD/MM/YYYY)
  elements.inputDob.addEventListener('input', (e) => {
    let v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length > 2 && v.length <= 4) {
      v = v.substring(0, 2) + '/' + v.substring(2);
    } else if (v.length > 4) {
      v = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
    }
    e.target.value = v;
    clearFieldError('inputDob');
    if (state.cardGenerated) updateCard();
  });

  // Clear errors on field input/change
  const textFields = [
    'inputName', 'inputFather', 'inputConstituency', 'inputConscode',
    'inputDesignation', 'inputCaste', 'inputBooth', 'selectDistrict'
  ];
  textFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        clearFieldError(id);
        if (state.cardGenerated) updateCard();
      });
      el.addEventListener('change', () => {
        clearFieldError(id);
        if (state.cardGenerated) updateCard();
      });
    }
  });

  // Sample data button
  elements.btnFillSampleQuick.addEventListener('click', loadSampleData);

  // Subscription Modal Controls
  elements.subModalClose?.addEventListener('click', closeSubscriptionModal);
  elements.subscriptionModal?.addEventListener('click', (e) => {
    if (e.target === elements.subscriptionModal) closeSubscriptionModal();
  });

  // Form Submit: "कार्ड बनाएं"
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Run strict form validation
    const { isValid, firstInvalidEl } = validateForm();

    if (!isValid) {
      showToast('⚠️ कृपया सभी फ़ील्ड सही से भरें!', false);
      if (firstInvalidEl) {
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidEl.focus();
      }
      return;
    }

    // 2. Check User Authentication
    if (!state.currentUser) {
      openAuthModal('register', 'कार्ड बनाने के लिए कृपया खाता बनाएं — तुरंत निःशुल्क ट्रायल शुरू होगा!');
      return;
    }

    // 3. Check Free Trial / Subscription Status
    if (!state.currentUser.canGenerateCard) {
      openSubscriptionModal();
      return;
    }

    // 4. Generate Card
    await updateCard();
    state.cardGenerated = true;

    // 5. Send Card Creation Log to Backend
    try {
      const cardData = {
        ...getFormData(),
        photoThumb: state.userPhoto ? elements.photoThumb.src : ''
      };
      const headers = { 'Content-Type': 'application/json' };
      if (state.userToken) {
        headers['Authorization'] = `Bearer ${state.userToken}`;
      }

      fetch('/api/cards', {
        method: 'POST',
        headers,
        body: JSON.stringify(cardData)
      }).then(r => r.json()).then(data => {
        if (data.success && state.currentUser) {
          state.currentUser.totalCardsCreated = (state.currentUser.totalCardsCreated || 0) + 1;
        }
      }).catch(err => console.warn('Card log failed:', err));
    } catch (e) {}

    // Reveal preview section
    elements.previewResultSection.style.display = 'block';

    // Confetti celebration
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#0b4d2e', '#d4af37', '#16a34a', '#fce278']
    });

    showToast('🎉 आपका पहचान पत्र तैयार हो गया है!');

    // Smooth scroll down to preview
    setTimeout(() => {
      elements.previewResultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });

  // Download canvas helper
  function downloadCanvasImage(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }

  // Tab switching helper
  function setActiveTab(tab) {
    state.activeTab = tab;
    elements.tabBoth.classList.toggle('active', tab === 'both');
    elements.tabFront.classList.toggle('active', tab === 'front');
    elements.tabBack.classList.toggle('active', tab === 'back');

    elements.dualCardsContainer.classList.remove('show-front-only', 'show-back-only');
    if (tab === 'front') {
      elements.dualCardsContainer.classList.add('show-front-only');
    } else if (tab === 'back') {
      elements.dualCardsContainer.classList.add('show-back-only');
    }
  }

  // Front / Back / Both Tabs
  elements.tabBoth.addEventListener('click', () => setActiveTab('both'));
  elements.tabFront.addEventListener('click', () => setActiveTab('front'));
  elements.tabBack.addEventListener('click', () => setActiveTab('back'));

  // Back to form button
  elements.btnBackToForm.addEventListener('click', () => {
    elements.formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Download Both Sides as HD PNG
  elements.btnDownloadBoth.addEventListener('click', () => {
    const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
    downloadCanvasImage(elements.canvasFront, `${name}_INLD_Front_Card.png`);
    setTimeout(() => {
      downloadCanvasImage(elements.canvasBack, `${name}_INLD_Back_Card.png`);
      showToast('✨ दोनों साइड (Front & Back) HD PNG डाउनलोड हो गए!');
    }, 350);
  });

  // Download Front Side PNG
  elements.btnDownloadFrontQuick.addEventListener('click', () => {
    const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
    downloadCanvasImage(elements.canvasFront, `${name}_INLD_Front_Card.png`);
    showToast('📥 सामने का भाग (Front Side) डाउनलोड हो गया!');
  });

  // Download Back Side PNG
  elements.btnDownloadBackQuick.addEventListener('click', () => {
    const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
    downloadCanvasImage(elements.canvasBack, `${name}_INLD_Back_Card.png`);
    showToast('📥 पीछे का भाग (Back Side) डाउनलोड हो गया!');
  });

  // Download 2-Page Full PDF (Front + Back)
  elements.btnDownloadPdf.addEventListener('click', async () => {
    try {
      showToast('📄 2-पेज सम्पूर्ण PDF तैयार हो रहा है...');
      const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [140, 93.3] // Standard Card Proportion in mm
      });

      // Page 1: Front
      const frontData = elements.canvasFront.toDataURL('image/jpeg', 0.98);
      pdf.addImage(frontData, 'JPEG', 0, 0, 140, 93.3);

      // Page 2: Back
      pdf.addPage([140, 93.3], 'landscape');
      const backData = elements.canvasBack.toDataURL('image/jpeg', 0.98);
      pdf.addImage(backData, 'JPEG', 0, 0, 140, 93.3);

      pdf.save(`${name}_INLD_Full_ID_Card.pdf`);
      showToast('✓ 2-पेज सम्पूर्ण PDF (Front + Back) डाउनलोड हो गया!');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('PDF बनाने में त्रुटि हुई', false);
    }
  });

  // Print Card
  elements.btnPrintCard.addEventListener('click', () => {
    window.print();
  });

  // Copy Image to Clipboard
  elements.btnCopyImage.addEventListener('click', async () => {
    try {
      const targetCanvas = state.activeTab === 'back' ? elements.canvasBack : elements.canvasFront;
      targetCanvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋 कार्ड इमेज क्लिपबोर्ड पर कॉपी हो गई!');
      });
    } catch (err) {
      console.warn('Clipboard error:', err);
      showToast('इमेज कॉपी समर्थित नहीं है, कृपया डाउनलोड करें', false);
    }
  });

  // WhatsApp Send
  elements.btnShareWhatsapp.addEventListener('click', () => {
    const waCountry = elements.selectWaCountry.value.replace('+', '');
    let num = elements.whatsappNumber.value.trim().replace(/[^0-9]/g, '');

    if (!num) {
      showToast('कृपया WhatsApp नंबर दर्ज करें', false);
      elements.whatsappNumber.focus();
      return;
    }

    const fullWaNumber = `${waCountry}${num}`;
    const data = getFormData();
    const msg = encodeURIComponent(
      `🚩 *इंडियन नेशनल लोकदल (INLD)* 🚩\n` +
      `*आधिकारिक सदस्यता पहचान पत्र (सम्पूर्ण - Front & Back)*\n\n` +
      `👤 *नाम:* ${data.name}\n` +
      `👨‍👦 *पिताजी का नाम:* ${data.father}\n` +
      `📱 *मोबाइल:* ${data.mobile}\n` +
      `🏛️ *राज्य:* ${data.state}\n` +
      `📍 *ज़िला:* ${data.district}\n` +
      `📍 *विधानसभा:* ${data.constituency}\n` +
      `🎖️ *पद:* ${data.designation}\n` +
      `🧬 *जाति:* ${data.caste}\n` +
      `🆔 *सदस्यता क्रमांक:* ${data.membershipNo}\n\n` +
      `_ताऊ देवी लाल अमर रहें • जय जवान जय किसान_`
    );

    window.open(`https://wa.me/${fullWaNumber}?text=${msg}`, '_blank');
  });

  // Side Zooms
  elements.btnZoomFront.addEventListener('click', () => {
    elements.modalImg.src = elements.canvasFront.toDataURL('image/png');
    elements.zoomModal.classList.add('active');
  });

  elements.btnZoomBack.addEventListener('click', () => {
    elements.modalImg.src = elements.canvasBack.toDataURL('image/png');
    elements.zoomModal.classList.add('active');
  });

  elements.modalClose.addEventListener('click', () => {
    elements.zoomModal.classList.remove('active');
  });

  elements.zoomModal.addEventListener('click', (e) => {
    if (e.target === elements.zoomModal) {
      elements.zoomModal.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
