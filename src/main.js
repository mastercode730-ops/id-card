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
  fieldConfigs: []
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
  inputCity: document.getElementById('inputCity'),
  inputVillage: document.getElementById('inputVillage'),
  inputConstituency: document.getElementById('inputConstituency'),
  inputConscode: document.getElementById('inputConscode'),
  inputDesignation: document.getElementById('inputDesignation'),
  inputDob: document.getElementById('inputDob'),
  inputCaste: document.getElementById('inputCaste'),
  inputBooth: document.getElementById('inputBooth'),
  selectWaCountry: document.getElementById('selectWaCountry'),
  whatsappNumber: document.getElementById('whatsappNumber'),

  // Buttons & Sections
  btnSubmitCard: document.getElementById('btnSubmitCard'),
  btnFillSampleQuick: document.getElementById('btnFillSampleQuick'),
  submissionSuccessSection: document.getElementById('submissionSuccessSection'),
  successRefNo: document.getElementById('successRefNo'),
  successSummaryBox: document.getElementById('successSummaryBox'),
  btnNewApplication: document.getElementById('btnNewApplication'),

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
    city: elements.inputCity ? elements.inputCity.value.trim() : '',
    village: elements.inputVillage ? elements.inputVillage.value.trim() : '',
    constituency: elements.inputConstituency.value.trim(),
    conscode: elements.inputConscode ? elements.inputConscode.value.trim() : '',
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
  inputCity: 'group-city',
  inputVillage: 'group-village',
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

  // 6B. City validation
  if (isFieldEnabled('inputCity') && elements.inputCity) {
    const cityVal = elements.inputCity.value.trim();
    if (isFieldRequired('inputCity') && !cityVal) {
      markError('inputCity', 'शहर का नाम दर्ज करना अनिवार्य है');
    } else {
      clearFieldError('inputCity');
    }
  }

  // 6C. Village validation
  if (isFieldEnabled('inputVillage') && elements.inputVillage) {
    const villageVal = elements.inputVillage.value.trim();
    if (isFieldRequired('inputVillage') && !villageVal) {
      markError('inputVillage', 'गांव का नाम दर्ज करना अनिवार्य है');
    } else {
      clearFieldError('inputVillage');
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
  if (elements.inputCity) elements.inputCity.value = 'Sirsa';
  if (elements.inputVillage) elements.inputVillage.value = 'Chautala';
  elements.inputConstituency.value = 'Sirsa';
  if (elements.inputConscode) elements.inputConscode.value = '45';
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
// Initialize Application
async function init() {
  initCountryCodes();
  updateDistrictsForState('Haryana', 'Sirsa');

  try {
    state.sampleAssets = await preloadAssets();
  } catch (err) {
    console.error('Assets loading error:', err);
  }

  await loadAndApplyFieldConfigs();
  setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
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
    'inputName', 'inputFather', 'inputCity', 'inputVillage', 'inputConstituency', 'inputConscode',
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

  // Form Submit: Submit Application to Admin
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

    const originalBtnText = elements.btnSubmitCard.textContent;
    elements.btnSubmitCard.disabled = true;
    elements.btnSubmitCard.textContent = 'आवेदन जमा किया जा रहा है...';

    const cardData = {
      ...getFormData(),
      photoThumb: state.userPhoto ? elements.photoThumb.src : ''
    };

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      const data = await res.json();

      if (data.success) {
        // Hide form and show rich success confirmation
        if (elements.formWrapper) elements.formWrapper.style.display = 'none';
        if (elements.submissionSuccessSection) {
          elements.submissionSuccessSection.style.display = 'block';

          const refNumber = cardData.membershipNo || ('INLD-REQ-#' + (data.id || Math.floor(1000 + Math.random() * 9000)));
          if (elements.successRefNo) elements.successRefNo.textContent = refNumber;

          if (elements.successSummaryBox) {
            elements.successSummaryBox.innerHTML = `
              <div class="summary-line"><span>आवेदक का नाम:</span> <strong>${cardData.name}</strong></div>
              <div class="summary-line"><span>पिताजी का नाम:</span> <strong>${cardData.father}</strong></div>
              <div class="summary-line"><span>मोबाइल नंबर:</span> <strong>${cardData.mobile}</strong></div>
              <div class="summary-line"><span>WhatsApp नंबर:</span> <strong>${cardData.whatsappNumber || cardData.mobile}</strong></div>
              <div class="summary-line"><span>ज़िला एवं राज्य:</span> <strong>${cardData.district}, ${cardData.state}</strong></div>
              ${cardData.city ? `<div class="summary-line"><span>शहर:</span> <strong>${cardData.city}</strong></div>` : ''}
              ${cardData.village ? `<div class="summary-line"><span>गांव:</span> <strong>${cardData.village}</strong></div>` : ''}
              <div class="summary-line"><span>विधानसभा क्षेत्र:</span> <strong>${cardData.constituency}</strong></div>
            `;
          }

          // Confetti celebration
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#0b4d2e', '#d4af37', '#16a34a', '#fce278']
          });

          showToast('✓ सदस्यता आवेदन सफलतापूर्वक जमा हो गया!');
          elements.submissionSuccessSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        showToast(data.error || 'आवेदन जमा करने में त्रुटि हुई', false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('नेटवर्क त्रुटि, कृपया पुनः प्रयास करें', false);
    } finally {
      elements.btnSubmitCard.disabled = false;
      elements.btnSubmitCard.textContent = originalBtnText;
    }
  });

  // Submit Another Application Handler
  elements.btnNewApplication?.addEventListener('click', () => {
    elements.form.reset();
    state.userPhoto = null;
    if (elements.photoInput) elements.photoInput.value = '';
    if (elements.photoThumb) elements.photoThumb.src = '';
    if (elements.photoThumbContainer) elements.photoThumbContainer.style.display = 'none';

    if (elements.submissionSuccessSection) elements.submissionSuccessSection.style.display = 'none';
    if (elements.formWrapper) elements.formWrapper.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('नया आवेदन फ़ॉर्म तैयार है।');
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

  // Front / Back / Both Tabs & Canvas Download listeners (if preview section present)
  if (elements.tabBoth) {
    elements.tabBoth.addEventListener('click', () => setActiveTab('both'));
    elements.tabFront.addEventListener('click', () => setActiveTab('front'));
    elements.tabBack.addEventListener('click', () => setActiveTab('back'));

    if (elements.btnBackToForm) {
      elements.btnBackToForm.addEventListener('click', () => {
        elements.formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (elements.btnDownloadBoth) {
      elements.btnDownloadBoth.addEventListener('click', () => {
        const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
        downloadCanvasImage(elements.canvasFront, `${name}_INLD_Front_Card.png`);
        setTimeout(() => {
          downloadCanvasImage(elements.canvasBack, `${name}_INLD_Back_Card.png`);
          showToast('✨ दोनों साइड (Front & Back) HD PNG डाउनलोड हो गए!');
        }, 350);
      });
    }

    if (elements.btnDownloadFrontQuick) {
      elements.btnDownloadFrontQuick.addEventListener('click', () => {
        const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
        downloadCanvasImage(elements.canvasFront, `${name}_INLD_Front_Card.png`);
        showToast('📥 सामने का भाग (Front Side) डाउनलोड हो गया!');
      });
    }

    if (elements.btnDownloadBackQuick) {
      elements.btnDownloadBackQuick.addEventListener('click', () => {
        const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
        downloadCanvasImage(elements.canvasBack, `${name}_INLD_Back_Card.png`);
        showToast('📥 पीछे का भाग (Back Side) डाउनलोड हो गया!');
      });
    }

    if (elements.btnDownloadPdf) {
      elements.btnDownloadPdf.addEventListener('click', async () => {
        try {
          showToast('📄 2-पेज सम्पूर्ण PDF तैयार हो रहा है...');
          const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');

          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [140, 93.3]
          });

          const frontData = elements.canvasFront.toDataURL('image/jpeg', 0.98);
          pdf.addImage(frontData, 'JPEG', 0, 0, 140, 93.3);

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
    }

    if (elements.btnPrintCard) {
      elements.btnPrintCard.addEventListener('click', () => {
        window.print();
      });
    }

    if (elements.btnCopyImage) {
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
          console.error('Copy error:', err);
          showToast('इमेज कॉपी करने में असमर्थ', false);
        }
      });
    }

    // WhatsApp Send
    if (elements.btnShareWhatsapp) {
      elements.btnShareWhatsapp.addEventListener('click', () => {
        const waCountry = elements.selectWaCountry ? elements.selectWaCountry.value.replace('+', '') : '91';
        let num = elements.whatsappNumber ? elements.whatsappNumber.value.trim().replace(/[^0-9]/g, '') : '';

        if (!num) {
          showToast('कृपया WhatsApp नंबर दर्ज करें', false);
          if (elements.whatsappNumber) elements.whatsappNumber.focus();
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
    }

    // Side Zooms
    if (elements.btnZoomFront && elements.modalImg) {
      elements.btnZoomFront.addEventListener('click', () => {
        elements.modalImg.src = elements.canvasFront.toDataURL('image/png');
        if (elements.zoomModal) elements.zoomModal.classList.add('active');
      });
    }

    if (elements.btnZoomBack && elements.modalImg) {
      elements.btnZoomBack.addEventListener('click', () => {
        elements.modalImg.src = elements.canvasBack.toDataURL('image/png');
        if (elements.zoomModal) elements.zoomModal.classList.add('active');
      });
    }

    if (elements.modalClose && elements.zoomModal) {
      elements.modalClose.addEventListener('click', () => {
        elements.zoomModal.classList.remove('active');
      });
    }

    if (elements.zoomModal) {
      elements.zoomModal.addEventListener('click', (e) => {
        if (e.target === elements.zoomModal) {
          elements.zoomModal.classList.remove('active');
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
