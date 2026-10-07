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
  activeTab: 'front', // 'front' | 'back'
  userPhoto: null,
  isRendering: false,
  sampleAssets: null,
  cardGenerated: false
};

// DOM Elements
const elements = {
  form: document.getElementById('cardForm'),
  formWrapper: document.getElementById('formWrapper'),
  previewResultSection: document.getElementById('previewResultSection'),
  canvas: document.getElementById('idCardCanvas'),
  cardStage: document.getElementById('cardStage'),
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
  inputConstituency: document.getElementById('inputConstituency'),
  inputConscode: document.getElementById('inputConscode'),
  inputDesignation: document.getElementById('inputDesignation'),
  inputDob: document.getElementById('inputDob'),
  inputBooth: document.getElementById('inputBooth'),
  selectWaCountry: document.getElementById('selectWaCountry'),
  whatsappNumber: document.getElementById('whatsappNumber'),

  // Buttons
  btnSubmitCard: document.getElementById('btnSubmitCard'),
  btnFillSampleQuick: document.getElementById('btnFillSampleQuick'),
  btnDownloadPng: document.getElementById('btnDownloadPng'),
  btnDownloadPdf: document.getElementById('btnDownloadPdf'),
  btnPrintCard: document.getElementById('btnPrintCard'),
  btnCopyImage: document.getElementById('btnCopyImage'),
  btnShareWhatsapp: document.getElementById('btnShareWhatsapp'),
  btnBackToForm: document.getElementById('btnBackToForm'),
  btnFullscreenView: document.getElementById('btnFullscreenView'),

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
    caste: 'Gen(Brahmin)', // default from sample card
    designation: elements.inputDesignation.value.trim() || 'Yuva INLD Karyakarta',
    state: elements.selectState.value.trim() || 'Haryana',
    district: elements.selectDistrict.value.trim(),
    constituency: elements.inputConstituency.value.trim(),
    conscode: elements.inputConscode.value.trim(),
    booth: elements.inputBooth.value.trim(),
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

// Comprehensive Form Validation
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
  if (!state.userPhoto) {
    isValid = false;
    setFieldError('photoInput', 'कृपया अपनी फ़ोटो अपलोड करें');
    if (!firstInvalidEl) firstInvalidEl = elements.photoInput;
  } else {
    clearFieldError('photoInput');
  }

  // 2. Name validation
  const nameVal = elements.inputName.value.trim();
  if (!nameVal) {
    markError('inputName', 'नाम दर्ज करना अनिवार्य है');
  } else if (nameVal.length < 2) {
    markError('inputName', 'नाम कम से कम 2 अक्षरों का होना चाहिए');
  } else {
    clearFieldError('inputName');
  }

  // 3. Father's Name validation
  const fatherVal = elements.inputFather.value.trim();
  if (!fatherVal) {
    markError('inputFather', 'पिताजी का नाम दर्ज करना अनिवार्य है');
  } else if (fatherVal.length < 2) {
    markError('inputFather', 'पिताजी का नाम कम से कम 2 अक्षरों का होना चाहिए');
  } else {
    clearFieldError('inputFather');
  }

  // 4. Mobile Number validation
  const mobileVal = elements.inputMobile.value.trim();
  const mobileCountry = elements.selectMobileCountry.value;
  if (!mobileVal) {
    markError('inputMobile', 'मोबाइल नंबर दर्ज करना अनिवार्य है');
  } else if (mobileCountry === '+91' && !/^[5-9]\d{9}$/.test(mobileVal)) {
    markError('inputMobile', 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें');
  } else if (!/^\d{6,14}$/.test(mobileVal)) {
    markError('inputMobile', 'कृपया मान्य मोबाइल नंबर दर्ज करें (6-14 अंक)');
  } else {
    clearFieldError('inputMobile');
  }

  // 5. State validation
  if (!elements.selectState.value.trim()) {
    markError('selectState', 'कृपया राज्य चुनें');
  } else {
    clearFieldError('selectState');
  }

  // 6. District validation
  if (!elements.selectDistrict.value.trim()) {
    markError('selectDistrict', 'कृपया ज़िला चुनें');
  } else {
    clearFieldError('selectDistrict');
  }

  // 7. Constituency validation
  const constVal = elements.inputConstituency.value.trim();
  if (!constVal) {
    markError('inputConstituency', 'विधानसभा क्षेत्र दर्ज करना अनिवार्य है');
  } else if (constVal.length < 2) {
    markError('inputConstituency', 'विधानसभा क्षेत्र कम से कम 2 अक्षरों का होना चाहिए');
  } else {
    clearFieldError('inputConstituency');
  }

  // 8. Constituency Code validation
  const consCodeVal = elements.inputConscode.value.trim();
  if (!consCodeVal) {
    markError('inputConscode', 'विधानसभा कोड दर्ज करना अनिवार्य है (उदा. 45 या SRS)');
  } else {
    clearFieldError('inputConscode');
  }

  // 9. Designation validation
  const desigVal = elements.inputDesignation.value.trim();
  if (!desigVal) {
    markError('inputDesignation', 'पद/नाम दर्ज करना अनिवार्य है');
  } else {
    clearFieldError('inputDesignation');
  }

  // 10. DOB validation
  const dobVal = elements.inputDob.value.trim();
  if (!dobVal) {
    markError('inputDob', 'जन्म तिथि दर्ज करना अनिवार्य है (DD/MM/YYYY)');
  } else if (!isValidDob(dobVal)) {
    markError('inputDob', 'मान्य जन्म तिथि दर्ज करें प्रारूप: DD/MM/YYYY (उदा. 20/05/1973)');
  } else {
    clearFieldError('inputDob');
  }

  // 11. Booth No validation
  const boothVal = elements.inputBooth.value.trim();
  if (!boothVal) {
    markError('inputBooth', 'बूथ नंबर दर्ज करना अनिवार्य है');
  } else {
    clearFieldError('inputBooth');
  }

  // 12. WhatsApp Number validation
  const waVal = elements.whatsappNumber.value.trim();
  const waCountry = elements.selectWaCountry.value;
  if (!waVal) {
    markError('whatsappNumber', 'WhatsApp नंबर दर्ज करना अनिवार्य है');
  } else if (waCountry === '+91' && !/^[5-9]\d{9}$/.test(waVal)) {
    markError('whatsappNumber', 'कृपया 10 अंकों का मान्य WhatsApp नंबर दर्ज करें');
  } else if (!/^\d{6,14}$/.test(waVal)) {
    markError('whatsappNumber', 'कृपया मान्य WhatsApp नंबर दर्ज करें (6-14 अंक)');
  } else {
    clearFieldError('whatsappNumber');
  }

  return { isValid, firstInvalidEl };
}

// Render Card Canvas
async function updateCard() {
  if (state.isRendering) return;
  state.isRendering = true;

  try {
    const data = getFormData();
    if (state.activeTab === 'front') {
      await renderFrontCard(elements.canvas, data);
    } else {
      await renderBackCard(elements.canvas, data);
    }
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
    'inputDob', 'inputBooth', 'whatsappNumber'
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

// Initialize Application
async function init() {
  initCountryCodes();
  updateDistrictsForState('Haryana', 'Sirsa');

  try {
    state.sampleAssets = await preloadAssets();
  } catch (err) {
    console.error('Assets loading error:', err);
  }

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
    'inputName', 'inputFather', 'inputConstituency', 'inputConscode',
    'inputDesignation', 'inputBooth', 'selectDistrict'
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

  // Form Submit: "कार्ड बनाएं"
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Run strict validation
    const { isValid, firstInvalidEl } = validateForm();

    if (!isValid) {
      showToast('⚠️ कृपया सभी फ़ील्ड सही से भरें!', false);
      if (firstInvalidEl) {
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidEl.focus();
      }
      return;
    }

    // Generate Card
    await updateCard();
    state.cardGenerated = true;

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

  // Front / Back Tabs
  elements.tabFront.addEventListener('click', () => {
    state.activeTab = 'front';
    elements.tabFront.classList.add('active');
    elements.tabBack.classList.remove('active');
    updateCard();
  });

  elements.tabBack.addEventListener('click', () => {
    state.activeTab = 'back';
    elements.tabBack.classList.add('active');
    elements.tabFront.classList.remove('active');
    updateCard();
  });

  // Back to form button
  elements.btnBackToForm.addEventListener('click', () => {
    elements.formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Download PNG
  elements.btnDownloadPng.addEventListener('click', () => {
    const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');
    const side = state.activeTab;
    const link = document.createElement('a');
    link.download = `${name}_INLD_Card_${side}.png`;
    link.href = elements.canvas.toDataURL('image/png', 1.0);
    link.click();
    showToast('📥 HD PNG पहचान पत्र डाउनलोड हो गया!');
  });

  // Download PDF
  elements.btnDownloadPdf.addEventListener('click', async () => {
    try {
      showToast('📄 PDF तैयार हो रहा है...');
      const name = (elements.inputName.value.trim() || 'INLD_Member').replace(/\s+/g, '_');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [140, 93.3] // Standard Card Proportion in mm
      });

      const imgData = elements.canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, 140, 93.3);
      pdf.save(`${name}_INLD_ID_Card.pdf`);
      showToast('✓ प्रिंट-रेडी PDF डाउनलोड हो गया!');
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
      elements.canvas.toBlob(async (blob) => {
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
      `*आधिकारिक सदस्यता पहचान पत्र*\n\n` +
      `👤 *नाम:* ${data.name}\n` +
      `👨‍👦 *पिताजी का नाम:* ${data.father}\n` +
      `📱 *मोबाइल:* ${data.mobile}\n` +
      `🏛️ *राज्य:* ${data.state}\n` +
      `📍 *ज़िला:* ${data.district}\n` +
      `📍 *विधानसभा:* ${data.constituency}\n` +
      `🎖️ *पद:* ${data.designation}\n` +
      `🆔 *सदस्यता क्रमांक:* ${data.membershipNo}\n\n` +
      `_ताऊ देवी लाल अमर रहें • जय जवान जय किसान_`
    );

    window.open(`https://wa.me/${fullWaNumber}?text=${msg}`, '_blank');
  });

  // Fullscreen Zoom
  elements.btnFullscreenView.addEventListener('click', () => {
    elements.modalImg.src = elements.canvas.toDataURL('image/png');
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
