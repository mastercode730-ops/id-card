import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { preloadAssets, renderFrontCard, renderBackCard } from './cardGenerator.js';

// Application State
const state = {
  activeTab: 'front', // 'front' | 'back'
  userPhoto: null,
  photoZoom: 1.0,
  photoOffsetY: 0,
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
  photoFineTune: document.getElementById('photoFineTune'),
  zoomSlider: document.getElementById('zoomSlider'),
  zoomVal: document.getElementById('zoomVal'),
  offsetYSlider: document.getElementById('offsetYSlider'),
  offsetYVal: document.getElementById('offsetYVal'),

  inputName: document.getElementById('inputName'),
  inputFather: document.getElementById('inputFather'),
  inputMobile: document.getElementById('inputMobile'),
  inputState: document.getElementById('inputState'),
  inputDistrict: document.getElementById('inputDistrict'),
  inputConstituency: document.getElementById('inputConstituency'),
  inputConscode: document.getElementById('inputConscode'),
  inputDesignation: document.getElementById('inputDesignation'),
  inputDob: document.getElementById('inputDob'),
  inputBooth: document.getElementById('inputBooth'),
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

// Compute Membership Number
function getComputedMembershipNo() {
  const stateCode = (elements.inputState.value.trim() || 'Haryana').substring(0, 2).toUpperCase();
  const district = elements.inputDistrict.value.trim() || 'SIRSA';
  const code = elements.inputConscode.value.trim() || '45';
  const booth = elements.inputBooth.value.trim() || '30';
  return `INLD/${stateCode}/${district}/${code}/${booth}`;
}

// Collect current form data
function getFormData() {
  const membershipNo = getComputedMembershipNo();

  return {
    name: elements.inputName.value.trim(),
    father: elements.inputFather.value.trim(),
    mobile: elements.inputMobile.value.trim(),
    dob: elements.inputDob.value.trim(),
    caste: 'Gen(Brahmin)', // default from sample card
    designation: elements.inputDesignation.value.trim() || 'Yuva INLD Karyakarta',
    state: elements.inputState.value.trim() || 'Haryana',
    district: elements.inputDistrict.value.trim(),
    constituency: elements.inputConstituency.value.trim(),
    conscode: elements.inputConscode.value.trim(),
    booth: elements.inputBooth.value.trim(),
    membershipNo: membershipNo,
    signatoryName: 'RamPal Majra',
    signatoryTitle: 'Pradeshadhyaksh, INLD',
    photoImg: state.userPhoto || state.sampleAssets?.samplePhoto,
    photoZoom: state.photoZoom,
    photoOffsetY: state.photoOffsetY,
    showWatermark: true,
    showQr: true
  };
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

// Load Sample Data
function loadSampleData() {
  elements.inputName.value = 'Ravi Kant';
  elements.inputFather.value = 'Omparkash';
  elements.inputMobile.value = '9815395397';
  elements.inputState.value = 'Haryana';
  elements.inputDistrict.value = 'Sirsa';
  elements.inputConstituency.value = 'Sursa';
  elements.inputConscode.value = '45';
  elements.inputDesignation.value = 'State Social Media Coordinator';
  elements.inputDob.value = '20/05/1973';
  elements.inputBooth.value = '30';
  elements.whatsappNumber.value = '919815395397';

  // Sample photo
  if (state.sampleAssets?.samplePhoto) {
    state.userPhoto = state.sampleAssets.samplePhoto;
    elements.photoThumb.src = state.sampleAssets.samplePhoto.src;
    elements.photoThumbContainer.style.display = 'block';
    elements.photoFineTune.style.display = 'flex';
  }

  state.photoZoom = 1.0;
  state.photoOffsetY = 0;
  elements.zoomSlider.value = 1.0;
  elements.zoomVal.textContent = '1.0x';
  elements.offsetYSlider.value = 0;
  elements.offsetYVal.textContent = '0%';

  showToast('✓ नमूना डेटा (Sample Data) लोड हो गया है। अब "कार्ड बनाएं" पर क्लिक करें!');
}

// Initialize Application
async function init() {
  try {
    state.sampleAssets = await preloadAssets();
  } catch (err) {
    console.error('Assets loading error:', err);
  }

  setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
  // Photo file picker
  elements.photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state.userPhoto = img;
        elements.photoThumb.src = ev.target.result;
        elements.photoThumbContainer.style.display = 'block';
        elements.photoFineTune.style.display = 'flex';
        if (state.cardGenerated) updateCard();
        showToast('✓ फ़ोटो सफलतापूर्वक लोड की गई!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Zoom slider
  elements.zoomSlider.addEventListener('input', (e) => {
    state.photoZoom = parseFloat(e.target.value);
    elements.zoomVal.textContent = `${state.photoZoom.toFixed(2)}x`;
    if (state.cardGenerated) updateCard();
  });

  // Pan Y slider
  elements.offsetYSlider.addEventListener('input', (e) => {
    state.photoOffsetY = parseFloat(e.target.value);
    elements.offsetYVal.textContent = `${state.photoOffsetY}%`;
    if (state.cardGenerated) updateCard();
  });

  // Sample data button
  elements.btnFillSampleQuick.addEventListener('click', loadSampleData);

  // Form Submit: "कार्ड बनाएं"
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

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

  // Live updates if card is already generated
  const inputs = [
    elements.inputName,
    elements.inputFather,
    elements.inputMobile,
    elements.inputState,
    elements.inputDistrict,
    elements.inputConstituency,
    elements.inputConscode,
    elements.inputDesignation,
    elements.inputDob,
    elements.inputBooth
  ];

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (state.cardGenerated) updateCard();
    });
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
    let num = elements.whatsappNumber.value.trim().replace(/[^0-9]/g, '');
    if (!num) {
      num = elements.inputMobile.value.trim().replace(/[^0-9]/g, '');
      if (num && num.length === 10) num = '91' + num;
    }

    if (!num) {
      alert('कृपया WhatsApp नंबर दर्ज करें (country code सहित, जैसे 919815395397)');
      elements.whatsappNumber.focus();
      return;
    }

    const data = getFormData();
    const msg = encodeURIComponent(
      `🚩 *इंडियन नेशनल लोकदल (INLD)* 🚩\n` +
      `*आधिकारिक सदस्यता पहचान पत्र*\n\n` +
      `👤 *नाम:* ${data.name}\n` +
      `👨‍👦 *पिताजी का नाम:* ${data.father}\n` +
      `📱 *मोबाइल:* ${data.mobile}\n` +
      `🏛️ *ज़िला:* ${data.district}\n` +
      `📍 *विधानसभा:* ${data.constituency}\n` +
      `🎖️ *पद:* ${data.designation}\n` +
      `🆔 *सदस्यता क्रमांक:* ${data.membershipNo}\n\n` +
      `_ताऊ देवी लाल अमर रहें • जय जवान जय किसान_`
    );

    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
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
