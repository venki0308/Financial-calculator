// ═══════════════════════════════════════════════════════════════
// FinCalix World Clock — supplementary country data
// ═══════════════════════════════════════════════════════════════
//
// `countryData.ts` already provides currency symbol + name and the
// phone code for each timezone. This file fills the gaps the
// WorldClock UI needs but were never stored anywhere:
//
//   • currencyCode  — ISO 4217 three-letter code (USD, EUR, INR…)
//   • capital       — capital city
//   • languages     — primary language(s)
//
// Keyed by ISO 3166-1 alpha-2 country code so it composes cleanly
// with the existing `countryCode` field on `CountryMeta`.
//
// Sources: ISO 4217 (currency codes, January 2026 edition),
// CIA World Factbook (capital + languages). Symbols intentionally
// not duplicated here — the existing `currencySymbol` in
// countryData.ts is the single source of truth for those.

export interface WorldClockCountryExtras {
  currencyCode: string;       // ISO 4217 (e.g. "INR")
  capital: string;            // capital city
  languages: string;          // primary language(s)
}

// ── EURO ZONE LOOKUP ─────────────────────────────────────────
// Used by the helper to apply EUR to every euro-area member at
// once instead of repeating in the table below.
const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE',
  'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK', 'AD', 'MC',
  'SM', 'VA', 'ME', 'XK',
]);

// ── PRIMARY LOOKUP TABLE ─────────────────────────────────────
const COUNTRY_EXTRAS: Record<string, WorldClockCountryExtras> = {
  // ── SOUTH ASIA ──
  IN: { currencyCode: 'INR', capital: 'New Delhi',  languages: 'Hindi, English' },
  PK: { currencyCode: 'PKR', capital: 'Islamabad',  languages: 'Urdu, English' },
  BD: { currencyCode: 'BDT', capital: 'Dhaka',      languages: 'Bengali' },
  LK: { currencyCode: 'LKR', capital: 'Colombo',    languages: 'Sinhala, Tamil' },
  NP: { currencyCode: 'NPR', capital: 'Kathmandu',  languages: 'Nepali' },
  AF: { currencyCode: 'AFN', capital: 'Kabul',      languages: 'Pashto, Dari' },
  BT: { currencyCode: 'BTN', capital: 'Thimphu',    languages: 'Dzongkha' },
  MV: { currencyCode: 'MVR', capital: 'Malé',       languages: 'Dhivehi' },

  // ── MIDDLE EAST ──
  AE: { currencyCode: 'AED', capital: 'Abu Dhabi',  languages: 'Arabic, English' },
  SA: { currencyCode: 'SAR', capital: 'Riyadh',     languages: 'Arabic' },
  KW: { currencyCode: 'KWD', capital: 'Kuwait City', languages: 'Arabic' },
  OM: { currencyCode: 'OMR', capital: 'Muscat',     languages: 'Arabic' },
  BH: { currencyCode: 'BHD', capital: 'Manama',     languages: 'Arabic' },
  QA: { currencyCode: 'QAR', capital: 'Doha',       languages: 'Arabic' },
  LB: { currencyCode: 'LBP', capital: 'Beirut',     languages: 'Arabic' },
  JO: { currencyCode: 'JOD', capital: 'Amman',      languages: 'Arabic' },
  IL: { currencyCode: 'ILS', capital: 'Jerusalem',  languages: 'Hebrew, Arabic' },
  IQ: { currencyCode: 'IQD', capital: 'Baghdad',    languages: 'Arabic, Kurdish' },
  IR: { currencyCode: 'IRR', capital: 'Tehran',     languages: 'Persian (Farsi)' },
  YE: { currencyCode: 'YER', capital: 'Sanaa',      languages: 'Arabic' },
  SY: { currencyCode: 'SYP', capital: 'Damascus',   languages: 'Arabic' },
  CY: { currencyCode: 'EUR', capital: 'Nicosia',    languages: 'Greek, Turkish' },
  TR: { currencyCode: 'TRY', capital: 'Ankara',     languages: 'Turkish' },

  // ── EAST ASIA ──
  JP: { currencyCode: 'JPY', capital: 'Tokyo',      languages: 'Japanese' },
  KR: { currencyCode: 'KRW', capital: 'Seoul',      languages: 'Korean' },
  CN: { currencyCode: 'CNY', capital: 'Beijing',    languages: 'Mandarin Chinese' },
  HK: { currencyCode: 'HKD', capital: 'Hong Kong',  languages: 'Cantonese, English' },
  TW: { currencyCode: 'TWD', capital: 'Taipei',     languages: 'Mandarin Chinese' },
  MN: { currencyCode: 'MNT', capital: 'Ulaanbaatar', languages: 'Mongolian' },
  KP: { currencyCode: 'KPW', capital: 'Pyongyang',  languages: 'Korean' },
  MO: { currencyCode: 'MOP', capital: 'Macau',      languages: 'Cantonese, Portuguese' },

  // ── SOUTHEAST ASIA ──
  SG: { currencyCode: 'SGD', capital: 'Singapore',  languages: 'English, Mandarin, Malay, Tamil' },
  TH: { currencyCode: 'THB', capital: 'Bangkok',    languages: 'Thai' },
  ID: { currencyCode: 'IDR', capital: 'Jakarta',    languages: 'Indonesian' },
  PH: { currencyCode: 'PHP', capital: 'Manila',     languages: 'Filipino, English' },
  MY: { currencyCode: 'MYR', capital: 'Kuala Lumpur', languages: 'Malay, English' },
  VN: { currencyCode: 'VND', capital: 'Hanoi',      languages: 'Vietnamese' },
  MM: { currencyCode: 'MMK', capital: 'Naypyidaw',  languages: 'Burmese' },
  KH: { currencyCode: 'KHR', capital: 'Phnom Penh', languages: 'Khmer' },
  LA: { currencyCode: 'LAK', capital: 'Vientiane',  languages: 'Lao' },
  TL: { currencyCode: 'USD', capital: 'Dili',       languages: 'Tetum, Portuguese' },
  BN: { currencyCode: 'BND', capital: 'Bandar Seri Begawan', languages: 'Malay' },

  // ── CENTRAL ASIA ──
  UZ: { currencyCode: 'UZS', capital: 'Tashkent',   languages: 'Uzbek' },
  KZ: { currencyCode: 'KZT', capital: 'Astana',     languages: 'Kazakh, Russian' },
  TM: { currencyCode: 'TMT', capital: 'Ashgabat',   languages: 'Turkmen' },
  KG: { currencyCode: 'KGS', capital: 'Bishkek',    languages: 'Kyrgyz, Russian' },
  TJ: { currencyCode: 'TJS', capital: 'Dushanbe',   languages: 'Tajik' },
  AZ: { currencyCode: 'AZN', capital: 'Baku',       languages: 'Azerbaijani' },
  AM: { currencyCode: 'AMD', capital: 'Yerevan',    languages: 'Armenian' },
  GE: { currencyCode: 'GEL', capital: 'Tbilisi',    languages: 'Georgian' },

  // ── EUROPE ──
  GB: { currencyCode: 'GBP', capital: 'London',     languages: 'English' },
  CH: { currencyCode: 'CHF', capital: 'Bern',       languages: 'German, French, Italian' },
  SE: { currencyCode: 'SEK', capital: 'Stockholm',  languages: 'Swedish' },
  NO: { currencyCode: 'NOK', capital: 'Oslo',       languages: 'Norwegian' },
  DK: { currencyCode: 'DKK', capital: 'Copenhagen', languages: 'Danish' },
  PL: { currencyCode: 'PLN', capital: 'Warsaw',     languages: 'Polish' },
  CZ: { currencyCode: 'CZK', capital: 'Prague',     languages: 'Czech' },
  HU: { currencyCode: 'HUF', capital: 'Budapest',   languages: 'Hungarian' },
  RO: { currencyCode: 'RON', capital: 'Bucharest',  languages: 'Romanian' },
  BG: { currencyCode: 'BGN', capital: 'Sofia',      languages: 'Bulgarian' },
  RU: { currencyCode: 'RUB', capital: 'Moscow',     languages: 'Russian' },
  UA: { currencyCode: 'UAH', capital: 'Kyiv',       languages: 'Ukrainian' },
  BY: { currencyCode: 'BYN', capital: 'Minsk',      languages: 'Belarusian, Russian' },
  IS: { currencyCode: 'ISK', capital: 'Reykjavík',  languages: 'Icelandic' },
  RS: { currencyCode: 'RSD', capital: 'Belgrade',   languages: 'Serbian' },
  AL: { currencyCode: 'ALL', capital: 'Tirana',     languages: 'Albanian' },
  MK: { currencyCode: 'MKD', capital: 'Skopje',     languages: 'Macedonian' },
  BA: { currencyCode: 'BAM', capital: 'Sarajevo',   languages: 'Bosnian, Croatian, Serbian' },
  MD: { currencyCode: 'MDL', capital: 'Chișinău',   languages: 'Romanian' },

  // ── AMERICAS ──
  US: { currencyCode: 'USD', capital: 'Washington, D.C.', languages: 'English' },
  CA: { currencyCode: 'CAD', capital: 'Ottawa',     languages: 'English, French' },
  MX: { currencyCode: 'MXN', capital: 'Mexico City', languages: 'Spanish' },
  BR: { currencyCode: 'BRL', capital: 'Brasília',   languages: 'Portuguese' },
  AR: { currencyCode: 'ARS', capital: 'Buenos Aires', languages: 'Spanish' },
  CO: { currencyCode: 'COP', capital: 'Bogotá',     languages: 'Spanish' },
  PE: { currencyCode: 'PEN', capital: 'Lima',       languages: 'Spanish, Quechua' },
  CL: { currencyCode: 'CLP', capital: 'Santiago',   languages: 'Spanish' },
  VE: { currencyCode: 'VES', capital: 'Caracas',    languages: 'Spanish' },
  CU: { currencyCode: 'CUP', capital: 'Havana',     languages: 'Spanish' },
  PA: { currencyCode: 'PAB', capital: 'Panama City', languages: 'Spanish' },
  CR: { currencyCode: 'CRC', capital: 'San José',   languages: 'Spanish' },
  BO: { currencyCode: 'BOB', capital: 'La Paz',     languages: 'Spanish, Quechua, Aymara' },
  PY: { currencyCode: 'PYG', capital: 'Asunción',   languages: 'Spanish, Guaraní' },
  UY: { currencyCode: 'UYU', capital: 'Montevideo', languages: 'Spanish' },
  EC: { currencyCode: 'USD', capital: 'Quito',      languages: 'Spanish' },
  GY: { currencyCode: 'GYD', capital: 'Georgetown', languages: 'English' },
  JM: { currencyCode: 'JMD', capital: 'Kingston',   languages: 'English' },
  HT: { currencyCode: 'HTG', capital: 'Port-au-Prince', languages: 'French, Haitian Creole' },
  BS: { currencyCode: 'BSD', capital: 'Nassau',     languages: 'English' },
  BB: { currencyCode: 'BBD', capital: 'Bridgetown', languages: 'English' },
  TT: { currencyCode: 'TTD', capital: 'Port of Spain', languages: 'English' },
  DO: { currencyCode: 'DOP', capital: 'Santo Domingo', languages: 'Spanish' },
  SV: { currencyCode: 'USD', capital: 'San Salvador', languages: 'Spanish' },
  HN: { currencyCode: 'HNL', capital: 'Tegucigalpa', languages: 'Spanish' },
  NI: { currencyCode: 'NIO', capital: 'Managua',    languages: 'Spanish' },
  GT: { currencyCode: 'GTQ', capital: 'Guatemala City', languages: 'Spanish' },
  SR: { currencyCode: 'SRD', capital: 'Paramaribo', languages: 'Dutch' },

  // ── AFRICA ──
  NG: { currencyCode: 'NGN', capital: 'Abuja',      languages: 'English' },
  EG: { currencyCode: 'EGP', capital: 'Cairo',      languages: 'Arabic' },
  ZA: { currencyCode: 'ZAR', capital: 'Pretoria',   languages: 'English, Afrikaans, Zulu' },
  KE: { currencyCode: 'KES', capital: 'Nairobi',    languages: 'Swahili, English' },
  GH: { currencyCode: 'GHS', capital: 'Accra',      languages: 'English' },
  ET: { currencyCode: 'ETB', capital: 'Addis Ababa', languages: 'Amharic' },
  MA: { currencyCode: 'MAD', capital: 'Rabat',      languages: 'Arabic, Berber' },
  TN: { currencyCode: 'TND', capital: 'Tunis',      languages: 'Arabic' },
  DZ: { currencyCode: 'DZD', capital: 'Algiers',    languages: 'Arabic, Berber' },
  LY: { currencyCode: 'LYD', capital: 'Tripoli',    languages: 'Arabic' },
  SD: { currencyCode: 'SDG', capital: 'Khartoum',   languages: 'Arabic, English' },
  TZ: { currencyCode: 'TZS', capital: 'Dodoma',     languages: 'Swahili, English' },
  UG: { currencyCode: 'UGX', capital: 'Kampala',    languages: 'English, Swahili' },
  SN: { currencyCode: 'XOF', capital: 'Dakar',      languages: 'French' },
  CI: { currencyCode: 'XOF', capital: 'Yamoussoukro', languages: 'French' },
  CM: { currencyCode: 'XAF', capital: 'Yaoundé',    languages: 'French, English' },
  ZM: { currencyCode: 'ZMW', capital: 'Lusaka',     languages: 'English' },
  ZW: { currencyCode: 'ZWL', capital: 'Harare',     languages: 'English, Shona, Ndebele' },
  MZ: { currencyCode: 'MZN', capital: 'Maputo',     languages: 'Portuguese' },
  AO: { currencyCode: 'AOA', capital: 'Luanda',     languages: 'Portuguese' },
  MG: { currencyCode: 'MGA', capital: 'Antananarivo', languages: 'Malagasy, French' },
  RW: { currencyCode: 'RWF', capital: 'Kigali',     languages: 'Kinyarwanda, English, French' },
  BW: { currencyCode: 'BWP', capital: 'Gaborone',   languages: 'English, Tswana' },
  NA: { currencyCode: 'NAD', capital: 'Windhoek',   languages: 'English' },
  SO: { currencyCode: 'SOS', capital: 'Mogadishu',  languages: 'Somali, Arabic' },
  DJ: { currencyCode: 'DJF', capital: 'Djibouti',   languages: 'French, Arabic' },
  MR: { currencyCode: 'MRU', capital: 'Nouakchott', languages: 'Arabic' },
  ML: { currencyCode: 'XOF', capital: 'Bamako',     languages: 'French' },
  NE: { currencyCode: 'XOF', capital: 'Niamey',     languages: 'French' },
  BF: { currencyCode: 'XOF', capital: 'Ouagadougou', languages: 'French' },
  GM: { currencyCode: 'GMD', capital: 'Banjul',     languages: 'English' },
  TG: { currencyCode: 'XOF', capital: 'Lomé',       languages: 'French' },
  GA: { currencyCode: 'XAF', capital: 'Libreville', languages: 'French' },
  CG: { currencyCode: 'XAF', capital: 'Brazzaville', languages: 'French' },
  CD: { currencyCode: 'CDF', capital: 'Kinshasa',   languages: 'French' },

  // ── OCEANIA ──
  AU: { currencyCode: 'AUD', capital: 'Canberra',   languages: 'English' },
  NZ: { currencyCode: 'NZD', capital: 'Wellington', languages: 'English, Māori' },
  FJ: { currencyCode: 'FJD', capital: 'Suva',       languages: 'English, Fijian, Hindi' },
  PG: { currencyCode: 'PGK', capital: 'Port Moresby', languages: 'English, Tok Pisin' },
  GU: { currencyCode: 'USD', capital: 'Hagåtña',    languages: 'English, Chamorro' },
  WS: { currencyCode: 'WST', capital: 'Apia',       languages: 'Samoan, English' },
  TO: { currencyCode: 'TOP', capital: "Nukuʻalofa", languages: 'Tongan, English' },
  NC: { currencyCode: 'XPF', capital: 'Nouméa',     languages: 'French' },
  PF: { currencyCode: 'XPF', capital: 'Papeete',    languages: 'French, Tahitian' },
};

/** Look up the supplementary data (currency code, capital, languages)
 *  for a country by its ISO 3166-1 alpha-2 code.
 *
 *  Returns `null` when the code is unknown so the UI can render a
 *  graceful "data unavailable" fallback rather than blank fields. */
export function getWorldClockExtras(countryCode: string | undefined | null): WorldClockCountryExtras | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  const direct = COUNTRY_EXTRAS[cc];
  if (direct) return direct;
  // Euro-zone fallback for any country in the EURO_COUNTRIES set
  // that we didn't list explicitly above (capital and languages
  // missing — the UI will show "—" for those fields).
  if (EURO_COUNTRIES.has(cc)) {
    return { currencyCode: 'EUR', capital: '', languages: '' };
  }
  return null;
}
