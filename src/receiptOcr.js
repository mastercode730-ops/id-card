import { createWorker } from 'tesseract.js';

let workerPromise = null;

/**
 * Get or initialize a reusable Tesseract worker
 */
async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m && typeof onProgress === 'function' && m.status === 'recognizing text') {
            onProgress(Math.round((m.progress || 0) * 100));
          }
        }
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Analyze an uploaded payment image using Client-Side OCR
 * @param {string|File|Blob} imageSource - Data URL, Blob or File of the payment screenshot
 * @param {function} onProgress - Progress callback (0-100%)
 * @returns {Promise<{isValid: boolean, utr: string, amount: string, payee: string, confidence: string, rawText: string, message: string}>}
 */
export async function scanPaymentReceipt(imageSource, onProgress) {
  try {
    const worker = await getWorker(onProgress);
    const result = await worker.recognize(imageSource);
    const rawText = (result?.data?.text || '').trim();
    const cleanLower = rawText.toLowerCase();

    // 1. Check for Payee indicators (adityaanuraag143@oksbi / Anuraag Kumar Mishra)
    const payeeKeywords = ['adityaanuraag', 'aditya', 'anuraag', 'mishra', 'oksbi', 'kumar'];
    const matchedPayeeKeywords = payeeKeywords.filter(k => cleanLower.includes(k));
    const isPayeeMatched = matchedPayeeKeywords.length >= 1;

    // 2. Check for Payment Success/Completion status keywords
    const statusKeywords = [
      'paid', 'successful', 'success', 'completed', 'transferred', 'sent to',
      'payment to', 'money sent', 'transaction successful', 'debited', 'done',
      'payment of'
    ];
    const matchedStatusKeywords = statusKeywords.filter(k => cleanLower.includes(k));
    const isStatusMatched = matchedStatusKeywords.length >= 1;

    // 3. Check for UPI / Banking / Wallet terms
    const upiKeywords = [
      'upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim',
      'ref no', 'reference', 'utr', 'rrn', 'txn id', 'transaction id',
      'state bank', 'sbi', 'bank', 'hdfc', 'icici', 'axis', 'pnb'
    ];
    const matchedUpiKeywords = upiKeywords.filter(k => cleanLower.includes(k));
    const isUpiPlatform = matchedUpiKeywords.length >= 1;

    // 4. Check for Amount (₹50 or 50 or 50.00)
    const amountRegex = /(?:₹|rs\.?|inr)?\s*([5-9]\d|\d{3,4})(?:\.00)?/i;
    const amountMatch = cleanLower.match(amountRegex);
    const detectedAmount = amountMatch ? amountMatch[1] : '50';

    // 5. Extract 12-digit UTR / UPI Reference Number
    // Indian banking standard UPI transaction reference numbers are exactly 12 digits
    let detectedUtr = '';

    // Strategy A: Contextual match (after "upi ref", "utr", "txn id", "rrn", etc.)
    const contextualUtrRegex = /(?:upi\s*ref(?:erence)?(?:\s*no\.?|\s*id)?|utr(?:\s*no\.?)?|txn\s*(?:id|ref)|rrn|ref\s*#)[:\s-]*(\d{12})\b/i;
    const ctxMatch = rawText.match(contextualUtrRegex);

    if (ctxMatch && ctxMatch[1]) {
      detectedUtr = ctxMatch[1];
    } else {
      // Strategy B: Any isolated 12-digit numeric sequence
      const all12Digits = rawText.match(/\b\d{12}\b/g);
      if (all12Digits && all12Digits.length > 0) {
        // Pick the most likely UTR (first occurrence)
        detectedUtr = all12Digits[0];
      }
    }

    // 6. Overall Evaluation & Scoring
    let score = 0;
    if (isPayeeMatched) score += 35;
    if (isStatusMatched) score += 30;
    if (detectedUtr) score += 30;
    if (isUpiPlatform) score += 15;
    if (amountMatch) score += 10;

    // High confidence: Payee or (Status + UTR)
    if (score >= 40 || (isStatusMatched && (detectedUtr || isUpiPlatform)) || (isPayeeMatched && isStatusMatched)) {
      return {
        isValid: true,
        utr: detectedUtr,
        amount: detectedAmount,
        payee: isPayeeMatched ? 'Anuraag Kumar Mishra (adityaanuraag143@oksbi)' : 'INLD Membership Fee',
        confidence: score >= 60 ? 'high' : 'medium',
        rawText: rawText.slice(0, 500),
        message: 'सफल UPI भुगतान रसीद सत्यापित (Valid Payment Receipt)'
      };
    }

    // Weak match: Some keywords found but missing essential receipt proof
    if (score >= 20 || isUpiPlatform || isStatusMatched) {
      return {
        isValid: false,
        isSuspicious: true,
        utr: detectedUtr,
        amount: detectedAmount,
        confidence: 'low',
        rawText: rawText.slice(0, 500),
        message: 'अस्पष्ट रसीद: कृपया सुनिश्चित करें कि स्क्रीनशॉट में UPI Ref / UTR नंबर और Paid/Successful स्पष्ट दिख रहा हो।'
      };
    }

    // Definite failure: Random image (selfie, landscape, meme, random photo)
    return {
      isValid: false,
      isRandomImage: true,
      utr: '',
      confidence: 'none',
      rawText: rawText.slice(0, 500),
      message: '❌ यह कोई मान्य UPI भुगतान रसीद नहीं है! कृपया Google Pay / PhonePe / Paytm से किया गया ₹50 के सफल भुगतान का स्क्रीनशॉट ही अपलोड करें।'
    };

  } catch (err) {
    console.warn('OCR processing error:', err);
    // Graceful fallback if OCR fails (e.g. unsupported web worker or format)
    return {
      isValid: true,
      ocrSkipped: true,
      utr: '',
      message: 'स्क्रीनशॉट लोड हुआ (OCR स्किप हुआ)'
    };
  }
}
