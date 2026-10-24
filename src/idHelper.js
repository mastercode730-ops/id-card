// Haryana Census 2011 District Codes & INLD Unique Employee ID Formatter
import { HARYANA_CONSTITUENCIES } from './constituencies.js';

export const HARYANA_DISTRICT_CODES = {
  'Panchkula': '069',
  'Ambala': '070',
  'Yamunanagar': '071',
  'Yamuna Nagar': '071',
  'Kurukshetra': '072',
  'Kaithal': '073',
  'Karnal': '074',
  'Panipat': '075',
  'Sonipat': '076',
  'Sonepat': '076',
  'Jind': '077',
  'Fatehabad': '078',
  'Sirsa': '079',
  'Hisar': '080',
  'Hissar': '080',
  'Hansi': '080',
  'Bhiwani': '081',
  'Charkhi Dadri': '081',
  'Dadri': '081',
  'Rohtak': '082',
  'Jhajjar': '083',
  'Mahendragarh': '084',
  'Mohindergarh': '084',
  'Narnaul': '084',
  'Rewari': '085',
  'Gurugram': '086',
  'Gurgaon': '086',
  'Gurugram (Gurgaon)': '086',
  'Mewat': '087',
  'Nuh': '087',
  'Mewat (now Nuh)': '087',
  'Faridabad': '088',
  'Palwal': '089'
};

/**
 * Returns 3-digit Census District Code for Haryana, or '000' fallback
 */
export function getDistrictCode(districtName) {
  if (!districtName) return '079'; // Default Sirsa
  const clean = String(districtName).trim();
  for (const [dist, code] of Object.entries(HARYANA_DISTRICT_CODES)) {
    if (dist.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(dist.toLowerCase())) {
      return code;
    }
  }
  return '079';
}

/**
 * Returns 2-digit Assembly Constituency Code ('01' to '90')
 */
export function getConstituencyCode(constituencyNameOrCode) {
  if (!constituencyNameOrCode) return '45'; // Default Sirsa
  const val = String(constituencyNameOrCode).trim();

  // If already numeric like "2", "02", "45"
  const numMatch = val.match(/^(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 90) {
      return String(n).padStart(2, '0');
    }
  }

  // Search by name in HARYANA_CONSTITUENCIES
  const cleanVal = val.toLowerCase();
  for (const c of HARYANA_CONSTITUENCIES) {
    if (c.name.toLowerCase() === cleanVal || cleanVal.includes(c.name.toLowerCase()) || (c.hi && cleanVal.includes(c.hi))) {
      return c.code;
    }
  }

  return '45';
}

/**
 * Format Employee ID / Membership ID
 * Format: INLD06/<District Code>/<Constituency Code>/<8-digit unique sequential ID>
 * Example: INLD06/069/02/00000001
 */
export function formatEmployeeId(district, constituency, sequenceNumber = 1) {
  const dCode = getDistrictCode(district);
  const cCode = getConstituencyCode(constituency);
  const seq = String(sequenceNumber).padStart(8, '0');
  return `INLD06/${dCode}/${cCode}/${seq}`;
}
