// Haryana Census 2011 District Codes & INLD Unique Employee ID Formatter (Server)
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

export const HARYANA_CONSTITUENCY_MAP = {
  'kalka': '01', 'panchkula': '02', 'naraingarh': '03', 'ambala cantt': '04',
  'ambala city': '05', 'mullana': '06', 'mulana': '06', 'sadhaura': '07',
  'jagadhri': '08', 'yamunanagar': '09', 'radaur': '10', 'ladwa': '11',
  'shahbad': '12', 'thanesar': '13', 'pehowa': '14', 'guhla': '15',
  'kalayat': '16', 'kaithal': '17', 'pundri': '18', 'nilokheri': '19',
  'indri': '20', 'karnal': '21', 'gharaunda': '22', 'assandh': '23',
  'panipat rural': '24', 'panipat city': '25', 'israna': '26', 'samalkha': '27',
  'ganaur': '28', 'rai': '29', 'kharkhauda': '30', 'sonipat': '31',
  'gohana': '32', 'baroda': '33', 'julana': '34', 'safidon': '35',
  'jind': '36', 'uchana kalan': '37', 'uchana': '37', 'narwana': '38',
  'tohana': '39', 'fatehabad': '40', 'ratia': '41', 'kalanwali': '42',
  'kalawali': '42', 'dabwali': '43', 'rania': '44', 'sirsa': '45',
  'ellenabad': '46', 'adampur': '47', 'uklana': '48', 'narnaund': '49',
  'hansi': '50', 'barwala': '51', 'hisar': '52', 'nalwa': '53',
  'loharu': '54', 'badhra': '55', 'dadri': '56', 'bhiwani': '57',
  'tosham': '58', 'bawani khera': '59', 'meham': '60', 'garhi sampla-kiloi': '61',
  'rohtak': '62', 'kalanaur': '63', 'bahadurgarh': '64', 'badli': '65',
  'jhajjar': '66', 'beri': '67', 'ateli': '68', 'mahendragarh': '69',
  'narnaul': '70', 'nangal chaudhry': '71', 'bawal': '72', 'kosli': '73',
  'rewari': '74', 'pataudi': '75', 'badshahpur': '76', 'gurgaon': '77',
  'gurugram': '77', 'sohna': '78', 'nuh': '79', 'ferozepur jhirka': '80',
  'punahana': '81', 'hathin': '82', 'hodal': '83', 'palwal': '84',
  'prithla': '85', 'faridabad nit': '86', 'badkhal': '87', 'ballabgarh': '88',
  'faridabad': '89', 'tigaon': '90'
};

export function getDistrictCode(districtName) {
  if (!districtName) return '079';
  const clean = String(districtName).trim();
  for (const [dist, code] of Object.entries(HARYANA_DISTRICT_CODES)) {
    if (dist.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(dist.toLowerCase())) {
      return code;
    }
  }
  return '079';
}

export function getConstituencyCode(constituencyNameOrCode) {
  if (!constituencyNameOrCode) return '45';
  const val = String(constituencyNameOrCode).trim();
  const numMatch = val.match(/^(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 90) return String(n).padStart(2, '0');
  }

  const clean = val.toLowerCase();
  for (const [name, code] of Object.entries(HARYANA_CONSTITUENCY_MAP)) {
    if (clean.includes(name)) return code;
  }
  return '45';
}

export function formatEmployeeId(district, constituency, sequenceNumber = 1) {
  const dCode = getDistrictCode(district);
  const cCode = getConstituencyCode(constituency);
  const seq = String(sequenceNumber).padStart(8, '0');
  return `INLD06/${dCode}/${cCode}/${seq}`;
}
