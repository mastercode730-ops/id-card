import QRCode from 'qrcode';

// Cache leader & logo images for rapid re-rendering
const imageCache = {
  leader1: null, // Abhay Singh Chautala (right)
  leader2: null, // Chaudhary Devi Lal (left 1)
  leader3: null, // Om Prakash Chautala (left 2)
  logoWhite: null,
  logoGreen: null,
  samplePhoto: null
};

// Helper to load an image
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Preload all assets
export async function preloadAssets() {
  const assets = [
    { key: 'leader1', src: '/assets/abhay_chautala.jpg' },
    { key: 'leader2', src: '/assets/devi_lal.jpg' },
    { key: 'leader3', src: '/assets/op_chautala.jpg' },
    { key: 'logoWhite', src: '/assets/logo_img.png' },
    { key: 'logoGreen', src: '/assets/logo_green_img.png' },
    { key: 'samplePhoto', src: '/assets/sample_member_photo.jpg' }
  ];

  await Promise.all(
    assets.map(async (item) => {
      try {
        imageCache[item.key] = await loadImage(item.src);
      } catch (err) {
        console.warn(`Could not preload ${item.key}:`, err);
      }
    })
  );

  // Wait for Google Fonts to ensure crisp text rendering
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    console.warn('Font loading check skipped:', e);
  }

  return imageCache;
}

// Rounded rectangle helper
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw leader circle with golden border
function drawLeaderCircle(ctx, img, cx, cy, radius, borderWidth = 5, borderColor = '#d4af37') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  // Background circle
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Golden stroke
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  // Clip and draw image
  ctx.clip();
  if (img && img.naturalWidth) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max((radius * 2) / iw, (radius * 2) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  }
  ctx.restore();
}

/**
 * Render Front Side of ID Card
 */
export async function renderFrontCard(canvas, data) {
  const ctx = canvas.getContext('2d');
  const W = 1280;
  const H = 853;

  canvas.width = W;
  canvas.height = H;

  // Clear canvas
  ctx.clearRect(0, 0, W, H);

  // Outer Card Background with rounded corners
  ctx.save();
  drawRoundRect(ctx, 0, 0, W, H, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();

  // 1. Watermark in background of details area
  const logoGreen = imageCache.logoGreen;
  if (logoGreen && logoGreen.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = 0.085;
    const wmWidth = 560;
    const wmHeight = wmWidth * (logoGreen.naturalHeight / logoGreen.naturalWidth);
    ctx.drawImage(logoGreen, W / 2 - wmWidth / 2 + 50, H / 2 - wmHeight / 2 + 30, wmWidth, wmHeight);
    ctx.restore();
  }

  // 2. Top Header Bar (Deep Green: #0b4d2e)
  const headerHeight = 236;
  ctx.save();
  drawRoundRect(ctx, 0, 0, W, headerHeight, 24);
  ctx.fillStyle = '#0b4d2e';
  ctx.fill();
  ctx.restore();

  // 3. Draw Leaders on Header
  // Leader 2: Tau Devi Lal (Left 1)
  drawLeaderCircle(ctx, imageCache.leader2, 115, 118, 76, 5, '#d4af37');

  // Leader 3: Om Prakash Chautala (Left 2)
  drawLeaderCircle(ctx, imageCache.leader3, 275, 118, 76, 5, '#d4af37');

  // Leader 1: Abhay Singh Chautala (Right)
  drawLeaderCircle(ctx, imageCache.leader1, W - 140, 118, 80, 5, '#d4af37');

  // 4. Header Center Branding
  const centerX = 705; // Visual balance between left (2 circles) and right (1 circle)
  const logoWhite = imageCache.logoWhite;
  if (logoWhite && logoWhite.naturalWidth) {
    const lWidth = 145;
    const lHeight = lWidth * (logoWhite.naturalHeight / logoWhite.naturalWidth);
    ctx.drawImage(logoWhite, centerX - lWidth / 2, 22, lWidth, lHeight);
  }

  // Hindi Name
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Noto Sans Devanagari", "Outfit", Arial, sans-serif';
  ctx.fillText('इंडियन नेशनल लोकदल', centerX, 116);

  // English Name (Golden)
  ctx.fillStyle = '#fce278';
  ctx.font = '700 24px "Outfit", Georgia, serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('INDIAN NATIONAL LOKDAL', centerX, 156);
  ctx.restore();

  // 5. Member Photo Section (Left Column)
  const px = 55;
  const py = 285;
  const pw = 345;
  const ph = 415;

  // Photo Frame Box
  ctx.save();
  drawRoundRect(ctx, px, py, pw, ph, 18);
  ctx.fillStyle = '#f8faf8';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0b4d2e';
  ctx.stroke();

  // Photo Container (Clipped inside)
  const pad = 7;
  drawRoundRect(ctx, px + pad, py + pad, pw - pad * 2, ph - pad * 2, 14);
  ctx.clip();

  const photo = data.photoImg || imageCache.samplePhoto;
  if (photo && photo.naturalWidth) {
    const pwBox = pw - pad * 2;
    const phBox = ph - pad * 2;
    const iw = photo.naturalWidth;
    const ih = photo.naturalHeight;

    const baseScale = Math.max(pwBox / iw, phBox / ih);
    const userZoom = data.photoZoom || 1.0;
    const scale = baseScale * userZoom;

    const dw = iw * scale;
    const dh = ih * scale;

    const offsetX = (data.photoOffsetX || 0) * (pwBox / 100);
    const offsetY = (data.photoOffsetY || 0) * (phBox / 100);

    const destX = px + pad + (pwBox - dw) / 2 + offsetX;
    const destY = py + pad + (phBox - dh) / 2 + offsetY;

    ctx.drawImage(photo, destX, destY, dw, dh);
  } else {
    // Placeholder if no photo
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(px + pad, py + pad, pw - pad * 2, ph - pad * 2);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 20px "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('फ़ोटो यहाँ प्रदर्शित होगी', px + pw / 2, py + ph / 2);
  }
  ctx.restore();

  // 6. Signatory Name & Title below Photo
  const signatoryX = px + pw / 2;
  const sigName = data.signatoryName || 'RamPal Majra';
  const sigTitle = data.signatoryTitle || 'Pradeshadhyaksh, INLD';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0b4d2e';
  ctx.font = 'italic bold 23px "Outfit", Georgia, serif';
  ctx.fillText(sigName, signatoryX, 724);

  // Underline beneath signatory
  const textWidth = ctx.measureText(sigName).width;
  ctx.strokeStyle = '#0b4d2e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(signatoryX - textWidth / 2 - 8, 730);
  ctx.lineTo(signatoryX + textWidth / 2 + 8, 730);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#22382a';
  ctx.font = '600 14px "Noto Sans Devanagari", "Inter", Arial, sans-serif';
  ctx.fillText(sigTitle, signatoryX, 746);
  ctx.restore();

  // 7. Member Details Section (Right Column)
  const dx = 445;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0b4d2e';
  ctx.font = '800 32px "Outfit", Arial, sans-serif';
  ctx.fillText('MEMBER DETAILS', dx, 305);

  // Golden underline accent bar below MEMBER DETAILS
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(dx, 318);
  ctx.lineTo(dx + 290, 318);
  ctx.stroke();
  ctx.restore();

  // Prepare Membership Number
  const stateCode = (data.state || 'Haryana').substring(0, 2).toUpperCase();
  const districtStr = data.district || '-';
  const consCode = data.conscode || '01';
  const boothStr = data.booth || '-';
  const autoMembNo = `INLD/${stateCode}/${districtStr}/${consCode}/${boothStr}`;
  const membershipNo = data.membershipNo?.trim() ? data.membershipNo.trim() : autoMembNo;

  // Key-value pairs
  const rows = [
    { label: 'Name:', val: data.name || '-' },
    { label: "Father's Name:", val: data.father || '-' },
    { label: 'Mobile No:', val: data.mobile || '-' },
    { label: 'District:', val: data.district || '-' },
    { label: 'Constituency:', val: data.constituency || '-' },
    { label: 'Designation:', val: data.designation || '-' },
    { label: 'DOB:', val: data.dob || '-' },
    { label: 'Caste:', val: data.caste || '-' },
    { label: 'Booth No:', val: data.booth || '-' },
    { label: 'Membership No:', val: membershipNo }
  ];

  let ty = 352;
  const rowStep = 40.5;
  const valX = dx + 225;

  rows.forEach((row) => {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Label
    ctx.fillStyle = '#0b4d2e';
    ctx.font = '600 20px "Inter", Arial, sans-serif';
    ctx.fillText(row.label, dx, ty);

    // Value
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 21px "Outfit", "Inter", Arial, sans-serif';
    ctx.fillText(row.val, valX, ty);

    ctx.restore();
    ty += rowStep;
  });

  // 8. Dynamic QR Code in the bottom right corner
  if (data.showQr !== false) {
    try {
      const qrData = `INLD MEMBER VERIFICATION\nName: ${data.name || ''}\nMobile: ${data.mobile || ''}\nDistrict: ${data.district || ''}\nMembership No: ${membershipNo}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 140,
        color: {
          dark: '#0b4d2e',
          light: '#ffffff'
        }
      });
      const qrImg = await loadImage(qrDataUrl);
      const qrx = W - 170;
      const qry = 575;
      const qrw = 118;

      ctx.save();
      drawRoundRect(ctx, qrx - 5, qry - 5, qrw + 10, qrw + 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#bcd9c6';
      ctx.stroke();

      ctx.drawImage(qrImg, qrx, qry, qrw, qrw);

      // Label below QR
      ctx.font = '700 10px "Inter", sans-serif';
      ctx.fillStyle = '#0b4d2e';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VERIFY', qrx + qrw / 2, qry + qrw + 13);
      ctx.restore();
    } catch (err) {
      console.warn('QR Code generation error:', err);
    }
  }

  // 9. Bottom Footer Bar (Deep Green: #0b4d2e)
  const footerHeight = 90;
  const footerY = H - footerHeight;

  ctx.save();
  drawRoundRect(ctx, 0, footerY, W, footerHeight, 24);
  ctx.fillStyle = '#0b4d2e';
  ctx.fill();
  ctx.restore();

  // Footer Center Spectacles Logo
  if (logoWhite && logoWhite.naturalWidth) {
    const flWidth = 100;
    const flHeight = flWidth * (logoWhite.naturalHeight / logoWhite.naturalWidth);
    ctx.drawImage(logoWhite, W / 2 - flWidth / 2, footerY + 9, flWidth, flHeight);
  }

  // Footer Hindi Text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Noto Sans Devanagari", "Outfit", Arial, sans-serif';
  ctx.fillText('इंडियन नेशनल लोकदल', W / 2, footerY + 54);

  // Footer English Text
  ctx.fillStyle = '#fce278';
  ctx.font = '700 16px "Outfit", Georgia, serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('INDIAN NATIONAL LOKDAL', W / 2, footerY + 75);
  ctx.restore();

  // Outer border of entire card
  ctx.save();
  drawRoundRect(ctx, 1.5, 1.5, W - 3, H - 3, 24);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0b4d2e';
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // Final restore from outer clip
}

/**
 * Render Back Side of ID Card (Bonus Professional Feature)
 */
export async function renderBackCard(canvas, data) {
  const ctx = canvas.getContext('2d');
  const W = 1280;
  const H = 853;

  canvas.width = W;
  canvas.height = H;

  ctx.clearRect(0, 0, W, H);

  // Outer Card Background with rounded corners
  ctx.save();
  drawRoundRect(ctx, 0, 0, W, H, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();

  // Background Watermark
  const logoGreen = imageCache.logoGreen;
  if (logoGreen && logoGreen.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    const wmWidth = 560;
    const wmHeight = wmWidth * (logoGreen.naturalHeight / logoGreen.naturalWidth);
    ctx.drawImage(logoGreen, W / 2 - wmWidth / 2, H / 2 - wmHeight / 2, wmWidth, wmHeight);
    ctx.restore();
  }

  // Top Header Bar
  const headerHeight = 110;
  ctx.save();
  drawRoundRect(ctx, 0, 0, W, headerHeight, 24);
  ctx.fillStyle = '#0b4d2e';
  ctx.fill();

  const logoWhite = imageCache.logoWhite;
  if (logoWhite && logoWhite.naturalWidth) {
    const lWidth = 110;
    const lHeight = lWidth * (logoWhite.naturalHeight / logoWhite.naturalWidth);
    ctx.drawImage(logoWhite, 60, 32, lWidth, lHeight);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Noto Sans Devanagari", Arial, sans-serif';
  ctx.fillText('इंडियन नेशनल लोकदल (हरियाणा)', 200, 52);

  ctx.fillStyle = '#fce278';
  ctx.font = '700 18px "Outfit", Georgia, serif';
  ctx.fillText('INDIAN NATIONAL LOKDAL • OFFICIAL MEMBERSHIP TERMS', 200, 84);
  ctx.restore();

  // Content Columns
  // Left: Instructions & Terms
  const leftX = 70;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0b4d2e';
  ctx.font = '800 24px "Outfit", Arial, sans-serif';
  ctx.fillText('सदस्यता नियम एवं निर्देश (TERMS & CONDITIONS)', leftX, 160);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX, 172);
  ctx.lineTo(leftX + 500, 172);
  ctx.stroke();

  const terms = [
    '1. यह पहचान पत्र केवल इंडियन नेशनल लोकदल के पंजीकृत सदस्य के लिए मान्य है।',
    '2. यह कार्ड अहस्तांतरणीय (Non-Transferable) है। इसका दुरुपयोग दंडनीय है।',
    '3. पार्टी बैठकों, सम्मेलनों एवं मतदान केंद्रों पर यह पहचान पत्र साथ रखना अनिवार्य है।',
    '4. कार्ड खोने अथवा क्षतिग्रस्त होने की स्थिति में तुरंत पार्टी कार्यालय को सूचित करें।',
    '5. सदस्यता की प्रामाणिकता हेतु सामने दिए गए QR कोड को किसी भी स्कैनर से जांचें।'
  ];

  let ty = 215;
  terms.forEach((t) => {
    ctx.fillStyle = '#1e293b';
    ctx.font = '500 19px "Noto Sans Devanagari", "Inter", sans-serif';
    ctx.fillText(t, leftX, ty);
    ty += 46;
  });

  // Right Column: Party Central Office & Contact
  const rightX = 780;
  ctx.fillStyle = '#0b4d2e';
  ctx.font = '800 24px "Outfit", Arial, sans-serif';
  ctx.fillText('पार्टी कार्यालय (CENTRAL OFFICE)', rightX, 160);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rightX, 172);
  ctx.lineTo(rightX + 400, 172);
  ctx.stroke();

  const offices = [
    { label: 'मुख्यालय / Head Office:', val: 'एम.एल.ए. फ्लैट्स, सेक्टर-3, चंडीगढ़' },
    { label: 'केंद्रीय कार्यालय / Camp Office:', val: 'चौधरी देवी लाल भवन, सिरसा (हरियाणा)' },
    { label: 'हेल्पलाइन / Phone:', val: '+91 172 2740000 / +91 94160 00000' },
    { label: 'वेबसाइट / Portal:', val: 'www.inld.in / contact@inld.org' }
  ];

  let oy = 215;
  offices.forEach((o) => {
    ctx.fillStyle = '#0b4d2e';
    ctx.font = '700 17px "Inter", "Noto Sans Devanagari", sans-serif';
    ctx.fillText(o.label, rightX, oy);
    ctx.fillStyle = '#334155';
    ctx.font = '600 18px "Inter", "Noto Sans Devanagari", sans-serif';
    ctx.fillText(o.val, rightX, oy + 26);
    oy += 62;
  });

  // Member Signature Box
  const sigBoxX = leftX;
  const sigBoxY = 560;
  drawRoundRect(ctx, sigBoxX, sigBoxY, 280, 110, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('सदस्य के हस्ताक्षर (Member Signature)', sigBoxX + 140, sigBoxY + 95);

  // General Secretary / Stamp Box
  const stampBoxX = leftX + 320;
  drawRoundRect(ctx, stampBoxX, sigBoxY, 280, 110, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.fillStyle = '#0b4d2e';
  ctx.font = 'italic bold 20px "Outfit", Georgia, serif';
  ctx.fillText('RamPal Majra', stampBoxX + 140, sigBoxY + 50);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('प्रदेशाध्यक्ष, इनेलो (हरियाणा)', stampBoxX + 140, sigBoxY + 95);

  // Slogan Banner
  drawRoundRect(ctx, rightX, 560, 420, 110, 12);
  ctx.fillStyle = '#eafaf0';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#86efac';
  ctx.stroke();

  ctx.fillStyle = '#0b4d2e';
  ctx.font = 'bold 20px "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ताऊ देवी लाल अमर रहें!', rightX + 210, 595);
  ctx.fillStyle = '#15803d';
  ctx.font = '700 16px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('जय जवान • जय किसान • जय कमेरा वर्ग', rightX + 210, 635);

  ctx.restore();

  // Footer Bar
  const footerHeight = 70;
  const footerY = H - footerHeight;

  ctx.save();
  drawRoundRect(ctx, 0, footerY, W, footerHeight, 24);
  ctx.fillStyle = '#0b4d2e';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 17px "Noto Sans Devanagari", "Outfit", Arial, sans-serif';
  ctx.fillText('इंडियन नेशनल लोकदल — किसानों, जवानों और कमेरों की अपनी पार्टी', W / 2, footerY + 35);
  ctx.restore();

  // Outer border of entire card
  ctx.save();
  drawRoundRect(ctx, 1.5, 1.5, W - 3, H - 3, 24);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0b4d2e';
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
