// Country metadata: timezone IANA → country info
export interface CountryMeta {
    flag: string;
    currencySymbol: string;
    currencyName: string;
    phoneCode: string;
    countryCode: string;
    countryName: string;
    region: string;
}

export const TIMEZONE_META: Record<string, CountryMeta> = {
    'Asia/Kolkata': {
        flag: '🇮🇳', currencySymbol: '₹', currencyName: 'Indian Rupee',
        phoneCode: '+91', countryCode: 'IN', countryName: 'India', region: 'Asia'
    },
    'Europe/London': {
        flag: '🇬🇧', currencySymbol: '£', currencyName: 'British Pound',
        phoneCode: '+44', countryCode: 'GB', countryName: 'United Kingdom', region: 'Europe'
    },
    'America/New_York': {
        flag: '🇺🇸', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'Americas'
    },
    'America/Los_Angeles': {
        flag: '🇺🇸', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'Americas'
    },
    'America/Chicago': {
        flag: '🇺🇸', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'Americas'
    },
    'America/Toronto': {
        flag: '🇨🇦', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'Americas'
    },
    'America/Vancouver': {
        flag: '🇨🇦', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'Americas'
    },
    'Asia/Dubai': {
        flag: '🇦🇪', currencySymbol: 'د.إ', currencyName: 'UAE Dirham',
        phoneCode: '+971', countryCode: 'AE', countryName: 'UAE', region: 'Middle East'
    },
    'Asia/Tokyo': {
        flag: '🇯🇵', currencySymbol: '¥', currencyName: 'Japanese Yen',
        phoneCode: '+81', countryCode: 'JP', countryName: 'Japan', region: 'Asia'
    },
    'Asia/Shanghai': {
        flag: '🇨🇳', currencySymbol: '¥', currencyName: 'Chinese Yuan',
        phoneCode: '+86', countryCode: 'CN', countryName: 'China', region: 'Asia'
    },
    'Asia/Singapore': {
        flag: '🇸🇬', currencySymbol: 'S$', currencyName: 'Singapore Dollar',
        phoneCode: '+65', countryCode: 'SG', countryName: 'Singapore', region: 'Asia'
    },
    'Asia/Hong_Kong': {
        flag: '🇭🇰', currencySymbol: 'HK$', currencyName: 'Hong Kong Dollar',
        phoneCode: '+852', countryCode: 'HK', countryName: 'Hong Kong', region: 'Asia'
    },
    'Asia/Seoul': {
        flag: '🇰🇷', currencySymbol: '₩', currencyName: 'South Korean Won',
        phoneCode: '+82', countryCode: 'KR', countryName: 'South Korea', region: 'Asia'
    },
    'Asia/Karachi': {
        flag: '🇵🇰', currencySymbol: '₨', currencyName: 'Pakistani Rupee',
        phoneCode: '+92', countryCode: 'PK', countryName: 'Pakistan', region: 'Asia'
    },
    'Asia/Dhaka': {
        flag: '🇧🇩', currencySymbol: '৳', currencyName: 'Bangladeshi Taka',
        phoneCode: '+880', countryCode: 'BD', countryName: 'Bangladesh', region: 'Asia'
    },
    'Asia/Colombo': {
        flag: '🇱🇰', currencySymbol: 'Rs', currencyName: 'Sri Lankan Rupee',
        phoneCode: '+94', countryCode: 'LK', countryName: 'Sri Lanka', region: 'Asia'
    },
    'Asia/Kathmandu': {
        flag: '🇳🇵', currencySymbol: 'Rs', currencyName: 'Nepalese Rupee',
        phoneCode: '+977', countryCode: 'NP', countryName: 'Nepal', region: 'Asia'
    },
    'Asia/Bangkok': {
        flag: '🇹🇭', currencySymbol: '฿', currencyName: 'Thai Baht',
        phoneCode: '+66', countryCode: 'TH', countryName: 'Thailand', region: 'Asia'
    },
    'Asia/Riyadh': {
        flag: '🇸🇦', currencySymbol: '﷼', currencyName: 'Saudi Riyal',
        phoneCode: '+966', countryCode: 'SA', countryName: 'Saudi Arabia', region: 'Middle East'
    },
    'Asia/Muscat': {
        flag: '🇴🇲', currencySymbol: '﷼', currencyName: 'Omani Rial',
        phoneCode: '+968', countryCode: 'OM', countryName: 'Oman', region: 'Middle East'
    },
    'Asia/Kuwait': {
        flag: '🇰🇼', currencySymbol: 'د.ك', currencyName: 'Kuwaiti Dinar',
        phoneCode: '+965', countryCode: 'KW', countryName: 'Kuwait', region: 'Middle East'
    },
    'Asia/Bahrain': {
        flag: '🇧🇭', currencySymbol: '.د.ب', currencyName: 'Bahraini Dinar',
        phoneCode: '+973', countryCode: 'BH', countryName: 'Bahrain', region: 'Middle East'
    },
    'Asia/Qatar': {
        flag: '🇶🇦', currencySymbol: 'ر.ق', currencyName: 'Qatari Riyal',
        phoneCode: '+974', countryCode: 'QA', countryName: 'Qatar', region: 'Middle East'
    },
    'Asia/Beirut': {
        flag: '🇱🇧', currencySymbol: 'ل.ل', currencyName: 'Lebanese Pound',
        phoneCode: '+961', countryCode: 'LB', countryName: 'Lebanon', region: 'Middle East'
    },
    'Asia/Jakarta': {
        flag: '🇮🇩', currencySymbol: 'Rp', currencyName: 'Indonesian Rupiah',
        phoneCode: '+62', countryCode: 'ID', countryName: 'Indonesia', region: 'Asia'
    },
    'Asia/Manila': {
        flag: '🇵🇭', currencySymbol: '₱', currencyName: 'Philippine Peso',
        phoneCode: '+63', countryCode: 'PH', countryName: 'Philippines', region: 'Asia'
    },
    'Asia/Kuala_Lumpur': {
        flag: '🇲🇾', currencySymbol: 'RM', currencyName: 'Malaysian Ringgit',
        phoneCode: '+60', countryCode: 'MY', countryName: 'Malaysia', region: 'Asia'
    },
    'Europe/Paris': {
        flag: '🇫🇷', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+33', countryCode: 'FR', countryName: 'France', region: 'Europe'
    },
    'Europe/Berlin': {
        flag: '🇩🇪', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+49', countryCode: 'DE', countryName: 'Germany', region: 'Europe'
    },
    'Europe/Rome': {
        flag: '🇮🇹', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+39', countryCode: 'IT', countryName: 'Italy', region: 'Europe'
    },
    'Europe/Madrid': {
        flag: '🇪🇸', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+34', countryCode: 'ES', countryName: 'Spain', region: 'Europe'
    },
    'Europe/Amsterdam': {
        flag: '🇳🇱', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+31', countryCode: 'NL', countryName: 'Netherlands', region: 'Europe'
    },
    'Europe/Brussels': {
        flag: '🇧🇪', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+32', countryCode: 'BE', countryName: 'Belgium', region: 'Europe'
    },
    'Europe/Zurich': {
        flag: '🇨🇭', currencySymbol: 'CHF', currencyName: 'Swiss Franc',
        phoneCode: '+41', countryCode: 'CH', countryName: 'Switzerland', region: 'Europe'
    },
    'Europe/Stockholm': {
        flag: '🇸🇪', currencySymbol: 'kr', currencyName: 'Swedish Krona',
        phoneCode: '+46', countryCode: 'SE', countryName: 'Sweden', region: 'Europe'
    },
    'Europe/Oslo': {
        flag: '🇳🇴', currencySymbol: 'kr', currencyName: 'Norwegian Krone',
        phoneCode: '+47', countryCode: 'NO', countryName: 'Norway', region: 'Europe'
    },
    'Europe/Copenhagen': {
        flag: '🇩🇰', currencySymbol: 'kr', currencyName: 'Danish Krone',
        phoneCode: '+45', countryCode: 'DK', countryName: 'Denmark', region: 'Europe'
    },
    'Europe/Helsinki': {
        flag: '🇫🇮', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+358', countryCode: 'FI', countryName: 'Finland', region: 'Europe'
    },
    'Europe/Warsaw': {
        flag: '🇵🇱', currencySymbol: 'zł', currencyName: 'Polish Zloty',
        phoneCode: '+48', countryCode: 'PL', countryName: 'Poland', region: 'Europe'
    },
    'Europe/Prague': {
        flag: '🇨🇿', currencySymbol: 'Kč', currencyName: 'Czech Koruna',
        phoneCode: '+420', countryCode: 'CZ', countryName: 'Czech Republic', region: 'Europe'
    },
    'Europe/Budapest': {
        flag: '🇭🇺', currencySymbol: 'Ft', currencyName: 'Hungarian Forint',
        phoneCode: '+36', countryCode: 'HU', countryName: 'Hungary', region: 'Europe'
    },
    'Europe/Vienna': {
        flag: '🇦🇹', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+43', countryCode: 'AT', countryName: 'Austria', region: 'Europe'
    },
    'Europe/Athens': {
        flag: '🇬🇷', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+30', countryCode: 'GR', countryName: 'Greece', region: 'Europe'
    },
    'Europe/Lisbon': {
        flag: '🇵🇹', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+351', countryCode: 'PT', countryName: 'Portugal', region: 'Europe'
    },
    'Europe/Istanbul': {
        flag: '🇹🇷', currencySymbol: '₺', currencyName: 'Turkish Lira',
        phoneCode: '+90', countryCode: 'TR', countryName: 'Turkey', region: 'Europe/Asia'
    },
    'Europe/Moscow': {
        flag: '🇷🇺', currencySymbol: '₽', currencyName: 'Russian Ruble',
        phoneCode: '+7', countryCode: 'RU', countryName: 'Russia', region: 'Europe/Asia'
    },
    'Europe/Kiev': {
        flag: '🇺🇦', currencySymbol: '₴', currencyName: 'Ukrainian Hryvnia',
        phoneCode: '+380', countryCode: 'UA', countryName: 'Ukraine', region: 'Europe'
    },
    'Africa/Lagos': {
        flag: '🇳🇬', currencySymbol: '₦', currencyName: 'Nigerian Naira',
        phoneCode: '+234', countryCode: 'NG', countryName: 'Nigeria', region: 'Africa'
    },
    'Africa/Cairo': {
        flag: '🇪🇬', currencySymbol: '£', currencyName: 'Egyptian Pound',
        phoneCode: '+20', countryCode: 'EG', countryName: 'Egypt', region: 'Africa'
    },
    'Africa/Johannesburg': {
        flag: '🇿🇦', currencySymbol: 'R', currencyName: 'South African Rand',
        phoneCode: '+27', countryCode: 'ZA', countryName: 'South Africa', region: 'Africa'
    },
    'Africa/Nairobi': {
        flag: '🇰🇪', currencySymbol: 'KSh', currencyName: 'Kenyan Shilling',
        phoneCode: '+254', countryCode: 'KE', countryName: 'Kenya', region: 'Africa'
    },
    'Africa/Accra': {
        flag: '🇬🇭', currencySymbol: '₵', currencyName: 'Ghanaian Cedi',
        phoneCode: '+233', countryCode: 'GH', countryName: 'Ghana', region: 'Africa'
    },
    'Africa/Addis_Ababa': {
        flag: '🇪🇹', currencySymbol: 'Br', currencyName: 'Ethiopian Birr',
        phoneCode: '+251', countryCode: 'ET', countryName: 'Ethiopia', region: 'Africa'
    },
    'Africa/Casablanca': {
        flag: '🇲🇦', currencySymbol: 'MAD', currencyName: 'Moroccan Dirham',
        phoneCode: '+212', countryCode: 'MA', countryName: 'Morocco', region: 'Africa'
    },
    'Africa/Tunis': {
        flag: '🇹🇳', currencySymbol: 'DT', currencyName: 'Tunisian Dinar',
        phoneCode: '+216', countryCode: 'TN', countryName: 'Tunisia', region: 'Africa'
    },
    'Africa/Algiers': {
        flag: '🇩🇿', currencySymbol: 'دج', currencyName: 'Algerian Dinar',
        phoneCode: '+213', countryCode: 'DZ', countryName: 'Algeria', region: 'Africa'
    },
    'America/Sao_Paulo': {
        flag: '🇧🇷', currencySymbol: 'R$', currencyName: 'Brazilian Real',
        phoneCode: '+55', countryCode: 'BR', countryName: 'Brazil', region: 'Americas'
    },
    'America/Mexico_City': {
        flag: '🇲🇽', currencySymbol: '$', currencyName: 'Mexican Peso',
        phoneCode: '+52', countryCode: 'MX', countryName: 'Mexico', region: 'Americas'
    },
    'America/Argentina/Buenos_Aires': {
        flag: '🇦🇷', currencySymbol: '$', currencyName: 'Argentine Peso',
        phoneCode: '+54', countryCode: 'AR', countryName: 'Argentina', region: 'Americas'
    },
    'America/Bogota': {
        flag: '🇨🇴', currencySymbol: '$', currencyName: 'Colombian Peso',
        phoneCode: '+57', countryCode: 'CO', countryName: 'Colombia', region: 'Americas'
    },
    'America/Lima': {
        flag: '🇵🇪', currencySymbol: 'S/.', currencyName: 'Peruvian Sol',
        phoneCode: '+51', countryCode: 'PE', countryName: 'Peru', region: 'Americas'
    },
    'America/Santiago': {
        flag: '🇨🇱', currencySymbol: '$', currencyName: 'Chilean Peso',
        phoneCode: '+56', countryCode: 'CL', countryName: 'Chile', region: 'Americas'
    },
    'Australia/Sydney': {
        flag: '🇦🇺', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Melbourne': {
        flag: '🇦🇺', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Perth': {
        flag: '🇦🇺', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Pacific/Auckland': {
        flag: '🇳🇿', currencySymbol: 'NZ$', currencyName: 'New Zealand Dollar',
        phoneCode: '+64', countryCode: 'NZ', countryName: 'New Zealand', region: 'Oceania'
    },
    'Pacific/Honolulu': {
        flag: '🇺🇸', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'Americas'
    },
    'UTC': {
        flag: '🌐', currencySymbol: '$', currencyName: 'International',
        phoneCode: '+0', countryCode: 'INT', countryName: 'UTC / International', region: 'Global'
    },
};

// Get metadata for any IANA timezone (falls back to derived info if not in map)
export function getCountryMeta(iana: string): CountryMeta {
    if (TIMEZONE_META[iana]) return TIMEZONE_META[iana];
    // Partial match
    const partial = Object.keys(TIMEZONE_META).find(k => iana.startsWith(k.split('/')[0]));
    if (partial) {
        const base = TIMEZONE_META[partial];
        return { ...base };
    }
    const parts = iana.split('/');
    const region = parts[0] || '';
    const city = (parts[parts.length - 1] || '').replace(/_/g, ' ');
    return {
        flag: '🌍',
        currencySymbol: '$',
        currencyName: 'Local Currency',
        phoneCode: '+?',
        countryCode: region.slice(0, 2).toUpperCase(),
        countryName: city,
        region,
    };
}

// Approximate sunrise/sunset for a timezone (uses lat approximation)
export function getSunTimes(iana: string, now: Date): { sunrise: string; sunset: string } {
    // Use a simple heuristic by latitude band from region
    const meta = getCountryMeta(iana);
    const month = now.getMonth(); // 0-11
    
    // Season factor: northern hemisphere summer = earlier sunrise, southern = opposite
    const latBands: Record<string, [number, number]> = {
        'Asia': [6, 18], 'Europe': [5, 20], 'Americas': [6, 20],
        'Africa': [6, 18], 'Oceania': [6, 18], 'Middle East': [6, 18],
        'Global': [6, 18],
    };
    
    const region = meta.region.split('/')[0];
    const [baseRise, baseSet] = latBands[region] || [6, 18];
    
    // Seasonal shift ±1 hour for summer/winter
    const isNorthernSummer = month >= 4 && month <= 9;
    const shift = region === 'Oceania' ? (isNorthernSummer ? 1 : -1) : (isNorthernSummer ? -1 : 1);
    
    const sunrise = `0${baseRise + shift}:00 Am`.replace(/^0(\d{2})/, '$1');
    const sunset = `${baseSet - shift}:00 Pm`;
    
    return { sunrise, sunset };
}
