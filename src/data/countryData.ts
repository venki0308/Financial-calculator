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
        flag: 'IN', currencySymbol: '₹', currencyName: 'Indian Rupee',
        phoneCode: '+91', countryCode: 'IN', countryName: 'India', region: 'Asia'
    },
    'Asia/Karachi': {
        flag: 'PK', currencySymbol: '₨', currencyName: 'Pakistani Rupee',
        phoneCode: '+92', countryCode: 'PK', countryName: 'Pakistan', region: 'Asia'
    },
    'Asia/Dhaka': {
        flag: 'BD', currencySymbol: '৳', currencyName: 'Bangladeshi Taka',
        phoneCode: '+880', countryCode: 'BD', countryName: 'Bangladesh', region: 'Asia'
    },
    'Asia/Colombo': {
        flag: 'LK', currencySymbol: 'Rs', currencyName: 'Sri Lankan Rupee',
        phoneCode: '+94', countryCode: 'LK', countryName: 'Sri Lanka', region: 'Asia'
    },
    'Asia/Kathmandu': {
        flag: 'NP', currencySymbol: 'Rs', currencyName: 'Nepalese Rupee',
        phoneCode: '+977', countryCode: 'NP', countryName: 'Nepal', region: 'Asia'
    },
    'Asia/Kabul': {
        flag: 'AF', currencySymbol: '؋', currencyName: 'Afghan Afghani',
        phoneCode: '+93', countryCode: 'AF', countryName: 'Afghanistan', region: 'Asia'
    },
    'Asia/Thimphu': {
        flag: 'BT', currencySymbol: 'Nu.', currencyName: 'Bhutanese Ngultrum',
        phoneCode: '+975', countryCode: 'BT', countryName: 'Bhutan', region: 'Asia'
    },
    'Asia/Dubai': {
        flag: 'AE', currencySymbol: 'د.إ', currencyName: 'UAE Dirham',
        phoneCode: '+971', countryCode: 'AE', countryName: 'UAE', region: 'Asia'
    },
    'Asia/Riyadh': {
        flag: 'SA', currencySymbol: '﷼', currencyName: 'Saudi Riyal',
        phoneCode: '+966', countryCode: 'SA', countryName: 'Saudi Arabia', region: 'Asia'
    },
    'Asia/Kuwait': {
        flag: 'KW', currencySymbol: 'د.ك', currencyName: 'Kuwaiti Dinar',
        phoneCode: '+965', countryCode: 'KW', countryName: 'Kuwait', region: 'Asia'
    },
    'Asia/Muscat': {
        flag: 'OM', currencySymbol: '﷼', currencyName: 'Omani Rial',
        phoneCode: '+968', countryCode: 'OM', countryName: 'Oman', region: 'Asia'
    },
    'Asia/Bahrain': {
        flag: 'BH', currencySymbol: '.د.ب', currencyName: 'Bahraini Dinar',
        phoneCode: '+973', countryCode: 'BH', countryName: 'Bahrain', region: 'Asia'
    },
    'Asia/Qatar': {
        flag: 'QA', currencySymbol: 'ر.ق', currencyName: 'Qatari Riyal',
        phoneCode: '+974', countryCode: 'QA', countryName: 'Qatar', region: 'Asia'
    },
    'Asia/Beirut': {
        flag: 'LB', currencySymbol: 'ل.ل', currencyName: 'Lebanese Pound',
        phoneCode: '+961', countryCode: 'LB', countryName: 'Lebanon', region: 'Asia'
    },
    'Asia/Amman': {
        flag: 'JO', currencySymbol: 'د.ا', currencyName: 'Jordanian Dinar',
        phoneCode: '+962', countryCode: 'JO', countryName: 'Jordan', region: 'Asia'
    },
    'Asia/Jerusalem': {
        flag: 'IL', currencySymbol: '₪', currencyName: 'Israeli New Shekel',
        phoneCode: '+972', countryCode: 'IL', countryName: 'Israel', region: 'Asia'
    },
    'Asia/Baghdad': {
        flag: 'IQ', currencySymbol: 'ع.د', currencyName: 'Iraqi Dinar',
        phoneCode: '+964', countryCode: 'IQ', countryName: 'Iraq', region: 'Asia'
    },
    'Asia/Tehran': {
        flag: 'IR', currencySymbol: '﷼', currencyName: 'Iranian Rial',
        phoneCode: '+98', countryCode: 'IR', countryName: 'Iran', region: 'Asia'
    },
    'Asia/Tokyo': {
        flag: 'JP', currencySymbol: '¥', currencyName: 'Japanese Yen',
        phoneCode: '+81', countryCode: 'JP', countryName: 'Japan', region: 'Asia'
    },
    'Asia/Seoul': {
        flag: 'KR', currencySymbol: '₩', currencyName: 'South Korean Won',
        phoneCode: '+82', countryCode: 'KR', countryName: 'South Korea', region: 'Asia'
    },
    'Asia/Shanghai': {
        flag: 'CN', currencySymbol: '¥', currencyName: 'Chinese Yuan',
        phoneCode: '+86', countryCode: 'CN', countryName: 'China', region: 'Asia'
    },
    'Asia/Hong_Kong': {
        flag: 'HK', currencySymbol: 'HK$', currencyName: 'Hong Kong Dollar',
        phoneCode: '+852', countryCode: 'HK', countryName: 'Hong Kong', region: 'Asia'
    },
    'Asia/Taipei': {
        flag: 'TW', currencySymbol: 'NT$', currencyName: 'New Taiwan Dollar',
        phoneCode: '+886', countryCode: 'TW', countryName: 'Taiwan', region: 'Asia'
    },
    'Asia/Ulaanbaatar': {
        flag: 'MN', currencySymbol: '₮', currencyName: 'Mongolian Tögrög',
        phoneCode: '+976', countryCode: 'MN', countryName: 'Mongolia', region: 'Asia'
    },
    'Asia/Pyongyang': {
        flag: 'KP', currencySymbol: '₩', currencyName: 'North Korean Won',
        phoneCode: '+850', countryCode: 'KP', countryName: 'North Korea', region: 'Asia'
    },
    'Asia/Singapore': {
        flag: 'SG', currencySymbol: 'S$', currencyName: 'Singapore Dollar',
        phoneCode: '+65', countryCode: 'SG', countryName: 'Singapore', region: 'Asia'
    },
    'Asia/Bangkok': {
        flag: 'TH', currencySymbol: '฿', currencyName: 'Thai Baht',
        phoneCode: '+66', countryCode: 'TH', countryName: 'Thailand', region: 'Asia'
    },
    'Asia/Jakarta': {
        flag: 'ID', currencySymbol: 'Rp', currencyName: 'Indonesian Rupiah',
        phoneCode: '+62', countryCode: 'ID', countryName: 'Indonesia', region: 'Asia'
    },
    'Asia/Manila': {
        flag: 'PH', currencySymbol: '₱', currencyName: 'Philippine Peso',
        phoneCode: '+63', countryCode: 'PH', countryName: 'Philippines', region: 'Asia'
    },
    'Asia/Kuala_Lumpur': {
        flag: 'MY', currencySymbol: 'RM', currencyName: 'Malaysian Ringgit',
        phoneCode: '+60', countryCode: 'MY', countryName: 'Malaysia', region: 'Asia'
    },
    'Asia/Ho_Chi_Minh': {
        flag: 'VN', currencySymbol: '₫', currencyName: 'Vietnamese Đồng',
        phoneCode: '+84', countryCode: 'VN', countryName: 'Vietnam', region: 'Asia'
    },
    'Asia/Rangoon': {
        flag: 'MM', currencySymbol: 'K', currencyName: 'Burmese Kyat',
        phoneCode: '+95', countryCode: 'MM', countryName: 'Myanmar', region: 'Asia'
    },
    'Asia/Phnom_Penh': {
        flag: 'KH', currencySymbol: '៛', currencyName: 'Cambodian Riel',
        phoneCode: '+855', countryCode: 'KH', countryName: 'Cambodia', region: 'Asia'
    },
    'Asia/Vientiane': {
        flag: 'LA', currencySymbol: '₭', currencyName: 'Lao Kip',
        phoneCode: '+856', countryCode: 'LA', countryName: 'Laos', region: 'Asia'
    },
    'Asia/Dili': {
        flag: 'TL', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+670', countryCode: 'TL', countryName: 'East Timor', region: 'Asia'
    },
    'Asia/Tashkent': {
        flag: 'UZ', currencySymbol: 'soʻm', currencyName: 'Uzbekistani Soʻm',
        phoneCode: '+998', countryCode: 'UZ', countryName: 'Uzbekistan', region: 'Asia'
    },
    'Asia/Almaty': {
        flag: 'KZ', currencySymbol: '₸', currencyName: 'Kazakhstani Tenge',
        phoneCode: '+7', countryCode: 'KZ', countryName: 'Kazakhstan', region: 'Asia'
    },
    'Asia/Ashgabat': {
        flag: 'TM', currencySymbol: 'T', currencyName: 'Turkmenistani Manat',
        phoneCode: '+993', countryCode: 'TM', countryName: 'Turkmenistan', region: 'Asia'
    },
    'Asia/Bishkek': {
        flag: 'KG', currencySymbol: 'с', currencyName: 'Kyrgyzstani Som',
        phoneCode: '+996', countryCode: 'KG', countryName: 'Kyrgyzstan', region: 'Asia'
    },
    'Asia/Dushanbe': {
        flag: 'TJ', currencySymbol: 'ЅМ', currencyName: 'Tajikistani Somoni',
        phoneCode: '+992', countryCode: 'TJ', countryName: 'Tajikistan', region: 'Asia'
    },
    'Asia/Baku': {
        flag: 'AZ', currencySymbol: '₼', currencyName: 'Azerbaijani Manat',
        phoneCode: '+994', countryCode: 'AZ', countryName: 'Azerbaijan', region: 'Asia'
    },
    'Asia/Yerevan': {
        flag: 'AM', currencySymbol: '֏', currencyName: 'Armenian Dram',
        phoneCode: '+374', countryCode: 'AM', countryName: 'Armenia', region: 'Asia'
    },
    'Asia/Tbilisi': {
        flag: 'GE', currencySymbol: '₾', currencyName: 'Georgian Lari',
        phoneCode: '+995', countryCode: 'GE', countryName: 'Georgia', region: 'Asia'
    },
    'Europe/London': {
        flag: 'GB', currencySymbol: '£', currencyName: 'British Pound',
        phoneCode: '+44', countryCode: 'GB', countryName: 'United Kingdom', region: 'Europe'
    },
    'Europe/Paris': {
        flag: 'FR', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+33', countryCode: 'FR', countryName: 'France', region: 'Europe'
    },
    'Europe/Berlin': {
        flag: 'DE', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+49', countryCode: 'DE', countryName: 'Germany', region: 'Europe'
    },
    'Europe/Rome': {
        flag: 'IT', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+39', countryCode: 'IT', countryName: 'Italy', region: 'Europe'
    },
    'Europe/Madrid': {
        flag: 'ES', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+34', countryCode: 'ES', countryName: 'Spain', region: 'Europe'
    },
    'Europe/Amsterdam': {
        flag: 'NL', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+31', countryCode: 'NL', countryName: 'Netherlands', region: 'Europe'
    },
    'Europe/Brussels': {
        flag: 'BE', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+32', countryCode: 'BE', countryName: 'Belgium', region: 'Europe'
    },
    'Europe/Zurich': {
        flag: 'CH', currencySymbol: 'CHF', currencyName: 'Swiss Franc',
        phoneCode: '+41', countryCode: 'CH', countryName: 'Switzerland', region: 'Europe'
    },
    'Europe/Stockholm': {
        flag: 'SE', currencySymbol: 'kr', currencyName: 'Swedish Krona',
        phoneCode: '+46', countryCode: 'SE', countryName: 'Sweden', region: 'Europe'
    },
    'Europe/Oslo': {
        flag: 'NO', currencySymbol: 'kr', currencyName: 'Norwegian Krone',
        phoneCode: '+47', countryCode: 'NO', countryName: 'Norway', region: 'Europe'
    },
    'Europe/Copenhagen': {
        flag: 'DK', currencySymbol: 'kr', currencyName: 'Danish Krone',
        phoneCode: '+45', countryCode: 'DK', countryName: 'Denmark', region: 'Europe'
    },
    'Europe/Helsinki': {
        flag: 'FI', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+358', countryCode: 'FI', countryName: 'Finland', region: 'Europe'
    },
    'Europe/Warsaw': {
        flag: 'PL', currencySymbol: 'zł', currencyName: 'Polish Zloty',
        phoneCode: '+48', countryCode: 'PL', countryName: 'Poland', region: 'Europe'
    },
    'Europe/Prague': {
        flag: 'CZ', currencySymbol: 'Kč', currencyName: 'Czech Koruna',
        phoneCode: '+420', countryCode: 'CZ', countryName: 'Czech Republic', region: 'Europe'
    },
    'Europe/Budapest': {
        flag: 'HU', currencySymbol: 'Ft', currencyName: 'Hungarian Forint',
        phoneCode: '+36', countryCode: 'HU', countryName: 'Hungary', region: 'Europe'
    },
    'Europe/Vienna': {
        flag: 'AT', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+43', countryCode: 'AT', countryName: 'Austria', region: 'Europe'
    },
    'Europe/Athens': {
        flag: 'GR', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+30', countryCode: 'GR', countryName: 'Greece', region: 'Europe'
    },
    'Europe/Lisbon': {
        flag: 'PT', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+351', countryCode: 'PT', countryName: 'Portugal', region: 'Europe'
    },
    'Europe/Istanbul': {
        flag: 'TR', currencySymbol: '₺', currencyName: 'Turkish Lira',
        phoneCode: '+90', countryCode: 'TR', countryName: 'Turkey', region: 'Europe'
    },
    'Europe/Moscow': {
        flag: 'RU', currencySymbol: '₽', currencyName: 'Russian Ruble',
        phoneCode: '+7', countryCode: 'RU', countryName: 'Russia', region: 'Europe'
    },
    'Europe/Kiev': {
        flag: 'UA', currencySymbol: '₴', currencyName: 'Ukrainian Hryvnia',
        phoneCode: '+380', countryCode: 'UA', countryName: 'Ukraine', region: 'Europe'
    },
    'Europe/Bucharest': {
        flag: 'RO', currencySymbol: 'lei', currencyName: 'Romanian Leu',
        phoneCode: '+40', countryCode: 'RO', countryName: 'Romania', region: 'Europe'
    },
    'Europe/Sofia': {
        flag: 'BG', currencySymbol: 'лв', currencyName: 'Bulgarian Lev',
        phoneCode: '+359', countryCode: 'BG', countryName: 'Bulgaria', region: 'Europe'
    },
    'Europe/Minsk': {
        flag: 'BY', currencySymbol: 'Br', currencyName: 'Belarusian Ruble',
        phoneCode: '+375', countryCode: 'BY', countryName: 'Belarus', region: 'Europe'
    },
    'Europe/Riga': {
        flag: 'LV', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+371', countryCode: 'LV', countryName: 'Latvia', region: 'Europe'
    },
    'Europe/Tallinn': {
        flag: 'EE', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+372', countryCode: 'EE', countryName: 'Estonia', region: 'Europe'
    },
    'Europe/Vilnius': {
        flag: 'LT', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+370', countryCode: 'LT', countryName: 'Lithuania', region: 'Europe'
    },
    'Europe/Bratislava': {
        flag: 'SK', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+421', countryCode: 'SK', countryName: 'Slovakia', region: 'Europe'
    },
    'Europe/Zagreb': {
        flag: 'HR', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+385', countryCode: 'HR', countryName: 'Croatia', region: 'Europe'
    },
    'Europe/Sarajevo': {
        flag: 'BA', currencySymbol: 'KM', currencyName: 'Bosnia-Herzegovina Convertible Mark',
        phoneCode: '+387', countryCode: 'BA', countryName: 'Bosnia', region: 'Europe'
    },
    'Europe/Belgrade': {
        flag: 'RS', currencySymbol: 'дин.', currencyName: 'Serbian Dinar',
        phoneCode: '+381', countryCode: 'RS', countryName: 'Serbia', region: 'Europe'
    },
    'Europe/Dublin': {
        flag: 'IE', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+353', countryCode: 'IE', countryName: 'Ireland', region: 'Europe'
    },
    'Europe/Malta': {
        flag: 'MT', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+356', countryCode: 'MT', countryName: 'Malta', region: 'Europe'
    },
    'Atlantic/Reykjavik': {
        flag: 'IS', currencySymbol: 'kr', currencyName: 'Icelandic Króna',
        phoneCode: '+354', countryCode: 'IS', countryName: 'Iceland', region: 'Atlantic'
    },
    'America/New_York': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'America/Chicago': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'America/Denver': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'America/Los_Angeles': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'America/Anchorage': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'Pacific/Honolulu': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'Pacific'
    },
    'America/Toronto': {
        flag: 'CA', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'America'
    },
    'America/Vancouver': {
        flag: 'CA', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'America'
    },
    'America/Mexico_City': {
        flag: 'MX', currencySymbol: '$', currencyName: 'Mexican Peso',
        phoneCode: '+52', countryCode: 'MX', countryName: 'Mexico', region: 'America'
    },
    'America/Sao_Paulo': {
        flag: 'BR', currencySymbol: 'R$', currencyName: 'Brazilian Real',
        phoneCode: '+55', countryCode: 'BR', countryName: 'Brazil', region: 'America'
    },
    'America/Argentina/Buenos_Aires': {
        flag: 'AR', currencySymbol: '$', currencyName: 'Argentine Peso',
        phoneCode: '+54', countryCode: 'AR', countryName: 'Argentina', region: 'America'
    },
    'America/Bogota': {
        flag: 'CO', currencySymbol: '$', currencyName: 'Colombian Peso',
        phoneCode: '+57', countryCode: 'CO', countryName: 'Colombia', region: 'America'
    },
    'America/Lima': {
        flag: 'PE', currencySymbol: 'S/.', currencyName: 'Peruvian Sol',
        phoneCode: '+51', countryCode: 'PE', countryName: 'Peru', region: 'America'
    },
    'America/Santiago': {
        flag: 'CL', currencySymbol: '$', currencyName: 'Chilean Peso',
        phoneCode: '+56', countryCode: 'CL', countryName: 'Chile', region: 'America'
    },
    'America/Caracas': {
        flag: 'VE', currencySymbol: 'Bs.', currencyName: 'Venezuelan Bolívar',
        phoneCode: '+58', countryCode: 'VE', countryName: 'Venezuela', region: 'America'
    },
    'America/Havana': {
        flag: 'CU', currencySymbol: '₱', currencyName: 'Cuban Peso',
        phoneCode: '+53', countryCode: 'CU', countryName: 'Cuba', region: 'America'
    },
    'America/Panama': {
        flag: 'PA', currencySymbol: 'B/.', currencyName: 'Panamanian Balboa',
        phoneCode: '+507', countryCode: 'PA', countryName: 'Panama', region: 'America'
    },
    'America/Costa_Rica': {
        flag: 'CR', currencySymbol: '₡', currencyName: 'Costa Rican Colón',
        phoneCode: '+506', countryCode: 'CR', countryName: 'Costa Rica', region: 'America'
    },
    'America/La_Paz': {
        flag: 'BO', currencySymbol: 'Bs.', currencyName: 'Bolivian Boliviano',
        phoneCode: '+591', countryCode: 'BO', countryName: 'Bolivia', region: 'America'
    },
    'America/Asuncion': {
        flag: 'PY', currencySymbol: '₲', currencyName: 'Paraguayan Guaraní',
        phoneCode: '+595', countryCode: 'PY', countryName: 'Paraguay', region: 'America'
    },
    'America/Montevideo': {
        flag: 'UY', currencySymbol: '$U', currencyName: 'Uruguayan Peso',
        phoneCode: '+598', countryCode: 'UY', countryName: 'Uruguay', region: 'America'
    },
    'America/Guayaquil': {
        flag: 'EC', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+593', countryCode: 'EC', countryName: 'Ecuador', region: 'America'
    },
    'America/Guyana': {
        flag: 'GY', currencySymbol: '$', currencyName: 'Guyanese Dollar',
        phoneCode: '+592', countryCode: 'GY', countryName: 'Guyana', region: 'America'
    },
    'America/Jamaica': {
        flag: 'JM', currencySymbol: 'J$', currencyName: 'Jamaican Dollar',
        phoneCode: '+1', countryCode: 'JM', countryName: 'Jamaica', region: 'America'
    },
    'America/Port-au-Prince': {
        flag: 'HT', currencySymbol: 'G', currencyName: 'Haitian Gourde',
        phoneCode: '+509', countryCode: 'HT', countryName: 'Haiti', region: 'America'
    },
    'America/Nassau': {
        flag: 'BS', currencySymbol: 'B$', currencyName: 'Bahamian Dollar',
        phoneCode: '+1', countryCode: 'BS', countryName: 'Bahamas', region: 'America'
    },
    'America/Barbados': {
        flag: 'BB', currencySymbol: 'Bds$', currencyName: 'Barbadian Dollar',
        phoneCode: '+1', countryCode: 'BB', countryName: 'Barbados', region: 'America'
    },
    'America/Port_of_Spain': {
        flag: 'TT', currencySymbol: 'TT$', currencyName: 'Trinidad and Tobago Dollar',
        phoneCode: '+1', countryCode: 'TT', countryName: 'Trinidad', region: 'America'
    },
    'Africa/Lagos': {
        flag: 'NG', currencySymbol: '₦', currencyName: 'Nigerian Naira',
        phoneCode: '+234', countryCode: 'NG', countryName: 'Nigeria', region: 'Africa'
    },
    'Africa/Cairo': {
        flag: 'EG', currencySymbol: '£', currencyName: 'Egyptian Pound',
        phoneCode: '+20', countryCode: 'EG', countryName: 'Egypt', region: 'Africa'
    },
    'Africa/Johannesburg': {
        flag: 'ZA', currencySymbol: 'R', currencyName: 'South African Rand',
        phoneCode: '+27', countryCode: 'ZA', countryName: 'South Africa', region: 'Africa'
    },
    'Africa/Nairobi': {
        flag: 'KE', currencySymbol: 'KSh', currencyName: 'Kenyan Shilling',
        phoneCode: '+254', countryCode: 'KE', countryName: 'Kenya', region: 'Africa'
    },
    'Africa/Accra': {
        flag: 'GH', currencySymbol: '₵', currencyName: 'Ghanaian Cedi',
        phoneCode: '+233', countryCode: 'GH', countryName: 'Ghana', region: 'Africa'
    },
    'Africa/Addis_Ababa': {
        flag: 'ET', currencySymbol: 'Br', currencyName: 'Ethiopian Birr',
        phoneCode: '+251', countryCode: 'ET', countryName: 'Ethiopia', region: 'Africa'
    },
    'Africa/Casablanca': {
        flag: 'MA', currencySymbol: 'MAD', currencyName: 'Moroccan Dirham',
        phoneCode: '+212', countryCode: 'MA', countryName: 'Morocco', region: 'Africa'
    },
    'Africa/Tunis': {
        flag: 'TN', currencySymbol: 'DT', currencyName: 'Tunisian Dinar',
        phoneCode: '+216', countryCode: 'TN', countryName: 'Tunisia', region: 'Africa'
    },
    'Africa/Algiers': {
        flag: 'DZ', currencySymbol: 'دج', currencyName: 'Algerian Dinar',
        phoneCode: '+213', countryCode: 'DZ', countryName: 'Algeria', region: 'Africa'
    },
    'Africa/Tripoli': {
        flag: 'LY', currencySymbol: 'ل.د', currencyName: 'Libyan Dinar',
        phoneCode: '+218', countryCode: 'LY', countryName: 'Libya', region: 'Africa'
    },
    'Africa/Khartoum': {
        flag: 'SD', currencySymbol: 'ج.س.', currencyName: 'Sudanese Pound',
        phoneCode: '+249', countryCode: 'SD', countryName: 'Sudan', region: 'Africa'
    },
    'Africa/Dar_es_Salaam': {
        flag: 'TZ', currencySymbol: 'TSh', currencyName: 'Tanzanian Shilling',
        phoneCode: '+255', countryCode: 'TZ', countryName: 'Tanzania', region: 'Africa'
    },
    'Africa/Kampala': {
        flag: 'UG', currencySymbol: 'USh', currencyName: 'Ugandan Shilling',
        phoneCode: '+256', countryCode: 'UG', countryName: 'Uganda', region: 'Africa'
    },
    'Africa/Dakar': {
        flag: 'SN', currencySymbol: 'CFA', currencyName: 'West African CFA franc',
        phoneCode: '+221', countryCode: 'SN', countryName: 'Senegal', region: 'Africa'
    },
    'Africa/Abidjan': {
        flag: 'CI', currencySymbol: 'CFA', currencyName: 'West African CFA franc',
        phoneCode: '+225', countryCode: 'CI', countryName: 'Ivory Coast', region: 'Africa'
    },
    'Africa/Douala': {
        flag: 'CM', currencySymbol: 'FCFA', currencyName: 'Central African CFA franc',
        phoneCode: '+237', countryCode: 'CM', countryName: 'Cameroon', region: 'Africa'
    },
    'Africa/Lusaka': {
        flag: 'ZM', currencySymbol: 'ZK', currencyName: 'Zambian Kwacha',
        phoneCode: '+260', countryCode: 'ZM', countryName: 'Zambia', region: 'Africa'
    },
    'Africa/Harare': {
        flag: 'ZW', currencySymbol: '$', currencyName: 'Zimbabwean Dollar',
        phoneCode: '+263', countryCode: 'ZW', countryName: 'Zimbabwe', region: 'Africa'
    },

    // ── ASIA (additional) ──
    'Indian/Maldives': {
        flag: 'MV', currencySymbol: 'Rf', currencyName: 'Maldivian Rufiyaa',
        phoneCode: '+960', countryCode: 'MV', countryName: 'Maldives', region: 'Asia'
    },
    'Asia/Damascus': {
        flag: 'SY', currencySymbol: '£', currencyName: 'Syrian Pound',
        phoneCode: '+963', countryCode: 'SY', countryName: 'Syria', region: 'Asia'
    },
    'Asia/Aden': {
        flag: 'YE', currencySymbol: '﷼', currencyName: 'Yemeni Rial',
        phoneCode: '+967', countryCode: 'YE', countryName: 'Yemen', region: 'Asia'
    },
    'Asia/Nicosia': {
        flag: 'CY', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+357', countryCode: 'CY', countryName: 'Cyprus', region: 'Asia'
    },
    'Asia/Macau': {
        flag: 'MO', currencySymbol: 'P', currencyName: 'Macanese Pataca',
        phoneCode: '+853', countryCode: 'MO', countryName: 'Macau', region: 'Asia'
    },
    'Asia/Brunei': {
        flag: 'BN', currencySymbol: 'B$', currencyName: 'Brunei Dollar',
        phoneCode: '+673', countryCode: 'BN', countryName: 'Brunei', region: 'Asia'
    },

    // ── EUROPE (additional) ──
    'Europe/Ljubljana': {
        flag: 'SI', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+386', countryCode: 'SI', countryName: 'Slovenia', region: 'Europe'
    },
    'Europe/Skopje': {
        flag: 'MK', currencySymbol: 'ден', currencyName: 'Macedonian Denar',
        phoneCode: '+389', countryCode: 'MK', countryName: 'North Macedonia', region: 'Europe'
    },
    'Europe/Chisinau': {
        flag: 'MD', currencySymbol: 'L', currencyName: 'Moldovan Leu',
        phoneCode: '+373', countryCode: 'MD', countryName: 'Moldova', region: 'Europe'
    },
    'Europe/Andorra': {
        flag: 'AD', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+376', countryCode: 'AD', countryName: 'Andorra', region: 'Europe'
    },
    'Europe/Monaco': {
        flag: 'MC', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+377', countryCode: 'MC', countryName: 'Monaco', region: 'Europe'
    },
    'Europe/Luxembourg': {
        flag: 'LU', currencySymbol: '€', currencyName: 'Euro',
        phoneCode: '+352', countryCode: 'LU', countryName: 'Luxembourg', region: 'Europe'
    },
    'Europe/Tirane': {
        flag: 'AL', currencySymbol: 'L', currencyName: 'Albanian Lek',
        phoneCode: '+355', countryCode: 'AL', countryName: 'Albania', region: 'Europe'
    },

    // ── AMERICAS (additional) ──
    'America/Phoenix': {
        flag: 'US', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'US', countryName: 'United States', region: 'America'
    },
    'America/Montreal': {
        flag: 'CA', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'America'
    },
    'America/Edmonton': {
        flag: 'CA', currencySymbol: 'CA$', currencyName: 'Canadian Dollar',
        phoneCode: '+1', countryCode: 'CA', countryName: 'Canada', region: 'America'
    },
    'America/Monterrey': {
        flag: 'MX', currencySymbol: '$', currencyName: 'Mexican Peso',
        phoneCode: '+52', countryCode: 'MX', countryName: 'Mexico', region: 'America'
    },
    'America/Santo_Domingo': {
        flag: 'DO', currencySymbol: '$', currencyName: 'Dominican Peso',
        phoneCode: '+1', countryCode: 'DO', countryName: 'Dominican Republic', region: 'America'
    },
    'America/El_Salvador': {
        flag: 'SV', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+503', countryCode: 'SV', countryName: 'El Salvador', region: 'America'
    },
    'America/Tegucigalpa': {
        flag: 'HN', currencySymbol: 'L', currencyName: 'Honduran Lempira',
        phoneCode: '+504', countryCode: 'HN', countryName: 'Honduras', region: 'America'
    },
    'America/Managua': {
        flag: 'NI', currencySymbol: 'C$', currencyName: 'Nicaraguan Cordoba',
        phoneCode: '+505', countryCode: 'NI', countryName: 'Nicaragua', region: 'America'
    },
    'America/Guatemala': {
        flag: 'GT', currencySymbol: 'Q', currencyName: 'Guatemalan Quetzal',
        phoneCode: '+502', countryCode: 'GT', countryName: 'Guatemala', region: 'America'
    },
    'America/Paramaribo': {
        flag: 'SR', currencySymbol: '$', currencyName: 'Surinamese Dollar',
        phoneCode: '+597', countryCode: 'SR', countryName: 'Suriname', region: 'America'
    },

    // ── AFRICA (additional) ──
    'Africa/Maputo': {
        flag: 'MZ', currencySymbol: 'MT', currencyName: 'Mozambican Metical',
        phoneCode: '+258', countryCode: 'MZ', countryName: 'Mozambique', region: 'Africa'
    },
    'Africa/Luanda': {
        flag: 'AO', currencySymbol: 'Kz', currencyName: 'Angolan Kwanza',
        phoneCode: '+244', countryCode: 'AO', countryName: 'Angola', region: 'Africa'
    },
    'Indian/Antananarivo': {
        flag: 'MG', currencySymbol: 'Ar', currencyName: 'Malagasy Ariary',
        phoneCode: '+261', countryCode: 'MG', countryName: 'Madagascar', region: 'Africa'
    },
    'Africa/Kigali': {
        flag: 'RW', currencySymbol: 'Fr', currencyName: 'Rwandan Franc',
        phoneCode: '+250', countryCode: 'RW', countryName: 'Rwanda', region: 'Africa'
    },
    'Africa/Gaborone': {
        flag: 'BW', currencySymbol: 'P', currencyName: 'Botswana Pula',
        phoneCode: '+267', countryCode: 'BW', countryName: 'Botswana', region: 'Africa'
    },
    'Africa/Windhoek': {
        flag: 'NA', currencySymbol: '$', currencyName: 'Namibian Dollar',
        phoneCode: '+264', countryCode: 'NA', countryName: 'Namibia', region: 'Africa'
    },
    'Africa/Mogadishu': {
        flag: 'SO', currencySymbol: 'Sh', currencyName: 'Somali Shilling',
        phoneCode: '+252', countryCode: 'SO', countryName: 'Somalia', region: 'Africa'
    },
    'Africa/Djibouti': {
        flag: 'DJ', currencySymbol: 'Fr', currencyName: 'Djiboutian Franc',
        phoneCode: '+253', countryCode: 'DJ', countryName: 'Djibouti', region: 'Africa'
    },
    'Africa/Nouakchott': {
        flag: 'MR', currencySymbol: 'UM', currencyName: 'Mauritanian Ouguiya',
        phoneCode: '+222', countryCode: 'MR', countryName: 'Mauritania', region: 'Africa'
    },
    'Africa/Bamako': {
        flag: 'ML', currencySymbol: 'Fr', currencyName: 'West African CFA franc',
        phoneCode: '+223', countryCode: 'ML', countryName: 'Mali', region: 'Africa'
    },
    'Africa/Niamey': {
        flag: 'NE', currencySymbol: 'Fr', currencyName: 'West African CFA franc',
        phoneCode: '+227', countryCode: 'NE', countryName: 'Niger', region: 'Africa'
    },
    'Africa/Ouagadougou': {
        flag: 'BF', currencySymbol: 'Fr', currencyName: 'West African CFA franc',
        phoneCode: '+226', countryCode: 'BF', countryName: 'Burkina Faso', region: 'Africa'
    },
    'Africa/Banjul': {
        flag: 'GM', currencySymbol: 'D', currencyName: 'Gambian Dalasi',
        phoneCode: '+220', countryCode: 'GM', countryName: 'Gambia', region: 'Africa'
    },
    'Africa/Lome': {
        flag: 'TG', currencySymbol: 'Fr', currencyName: 'West African CFA franc',
        phoneCode: '+228', countryCode: 'TG', countryName: 'Togo', region: 'Africa'
    },
    'Africa/Libreville': {
        flag: 'GA', currencySymbol: 'Fr', currencyName: 'Central African CFA franc',
        phoneCode: '+241', countryCode: 'GA', countryName: 'Gabon', region: 'Africa'
    },
    'Africa/Brazzaville': {
        flag: 'CG', currencySymbol: 'Fr', currencyName: 'Central African CFA franc',
        phoneCode: '+242', countryCode: 'CG', countryName: 'Republic of Congo', region: 'Africa'
    },
    'Africa/Kinshasa': {
        flag: 'CD', currencySymbol: 'Fr', currencyName: 'Congolese Franc',
        phoneCode: '+243', countryCode: 'CD', countryName: 'DR Congo', region: 'Africa'
    },

    // ── AUSTRALIA ──
    'Australia/Sydney': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Melbourne': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Brisbane': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Perth': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Adelaide': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Darwin': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },
    'Australia/Hobart': {
        flag: 'AU', currencySymbol: 'A$', currencyName: 'Australian Dollar',
        phoneCode: '+61', countryCode: 'AU', countryName: 'Australia', region: 'Oceania'
    },

    // ── PACIFIC / OCEANIA ──
    'Pacific/Auckland': {
        flag: 'NZ', currencySymbol: 'NZ$', currencyName: 'New Zealand Dollar',
        phoneCode: '+64', countryCode: 'NZ', countryName: 'New Zealand', region: 'Oceania'
    },
    'Pacific/Fiji': {
        flag: 'FJ', currencySymbol: '$', currencyName: 'Fijian Dollar',
        phoneCode: '+679', countryCode: 'FJ', countryName: 'Fiji', region: 'Oceania'
    },
    'Pacific/Port_Moresby': {
        flag: 'PG', currencySymbol: 'K', currencyName: 'Papua New Guinean Kina',
        phoneCode: '+675', countryCode: 'PG', countryName: 'Papua New Guinea', region: 'Oceania'
    },
    'Pacific/Guam': {
        flag: 'GU', currencySymbol: '$', currencyName: 'US Dollar',
        phoneCode: '+1', countryCode: 'GU', countryName: 'Guam', region: 'Oceania'
    },
    'Pacific/Apia': {
        flag: 'WS', currencySymbol: 'T', currencyName: 'Samoan Tala',
        phoneCode: '+685', countryCode: 'WS', countryName: 'Samoa', region: 'Oceania'
    },
    'Pacific/Tongatapu': {
        flag: 'TO', currencySymbol: 'T$', currencyName: 'Tongan Paanga',
        phoneCode: '+676', countryCode: 'TO', countryName: 'Tonga', region: 'Oceania'
    },
    'Pacific/Noumea': {
        flag: 'NC', currencySymbol: 'Fr', currencyName: 'CFP Franc',
        phoneCode: '+687', countryCode: 'NC', countryName: 'New Caledonia', region: 'Oceania'
    },
    'Pacific/Tahiti': {
        flag: 'PF', currencySymbol: 'Fr', currencyName: 'CFP Franc',
        phoneCode: '+689', countryCode: 'PF', countryName: 'French Polynesia', region: 'Oceania'
    },

    // ── UTC ──
    'UTC': {
        flag: '', currencySymbol: '', currencyName: 'Universal',
        phoneCode: '', countryCode: '', countryName: 'Universal Time', region: 'Global'
    },
};

// Get metadata for any IANA timezone (falls back to derived info if not in map)
export function getCountryMeta(iana: string): CountryMeta {
    if (TIMEZONE_META[iana]) return TIMEZONE_META[iana];
    
    // Fallback for unmapped timezones to prevent wrong flags
    const parts = iana.split('/');
    const region = parts[0] || '';
    const city = (parts[parts.length - 1] || '').replace(/_/g, ' ');
    return {
        flag: '🌍',
        currencySymbol: '$',
        currencyName: 'Local Currency',
        phoneCode: '',
        countryCode: '', // Empty prevents incorrect flagcdn requests
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
