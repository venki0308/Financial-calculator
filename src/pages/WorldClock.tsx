import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, ChevronLeft, Sun, Sunrise, MapPin, DollarSign, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { getCountryMeta, getSunTimes } from '../data/countryData';

interface TimezoneInfo {
    iana: string;
    city: string;
    country: string;
    searchTerms: string; // lowercase combined for fast search
}

// ── Comprehensive hardcoded timezone list grouped by region ──────────────────
// Guarantees India (Asia/Kolkata) and all major countries are ALWAYS present
const WORLD_TIMEZONES: TimezoneInfo[] = [
    // ── INDIA ──
    { iana: 'Asia/Kolkata',                  city: 'Kolkata / Mumbai / Delhi',   country: 'India',          searchTerms: 'india kolkata mumbai delhi new delhi chennai bangalore hyderabad in' },
    // ── SOUTH ASIA ──
    { iana: 'Asia/Karachi',                  city: 'Karachi',                    country: 'Pakistan',        searchTerms: 'pakistan karachi islamabad lahore pk' },
    { iana: 'Asia/Dhaka',                    city: 'Dhaka',                      country: 'Bangladesh',      searchTerms: 'bangladesh dhaka bd' },
    { iana: 'Asia/Colombo',                  city: 'Colombo',                    country: 'Sri Lanka',       searchTerms: 'sri lanka colombo lk' },
    { iana: 'Asia/Kathmandu',                city: 'Kathmandu',                  country: 'Nepal',           searchTerms: 'nepal kathmandu np' },
    { iana: 'Asia/Kabul',                    city: 'Kabul',                      country: 'Afghanistan',     searchTerms: 'afghanistan kabul af' },
    { iana: 'Asia/Thimphu',                  city: 'Thimphu',                    country: 'Bhutan',          searchTerms: 'bhutan thimphu bt' },
    // ── MIDDLE EAST ──
    { iana: 'Asia/Dubai',                    city: 'Dubai / Abu Dhabi',          country: 'UAE',             searchTerms: 'uae dubai abu dhabi emirates ae' },
    { iana: 'Asia/Riyadh',                   city: 'Riyadh',                     country: 'Saudi Arabia',    searchTerms: 'saudi arabia riyadh jeddah sa' },
    { iana: 'Asia/Kuwait',                   city: 'Kuwait City',                country: 'Kuwait',          searchTerms: 'kuwait city kw' },
    { iana: 'Asia/Muscat',                   city: 'Muscat',                     country: 'Oman',            searchTerms: 'oman muscat om' },
    { iana: 'Asia/Bahrain',                  city: 'Manama',                     country: 'Bahrain',         searchTerms: 'bahrain manama bh' },
    { iana: 'Asia/Qatar',                    city: 'Doha',                       country: 'Qatar',           searchTerms: 'qatar doha qa' },
    { iana: 'Asia/Beirut',                   city: 'Beirut',                     country: 'Lebanon',         searchTerms: 'lebanon beirut lb' },
    { iana: 'Asia/Amman',                    city: 'Amman',                      country: 'Jordan',          searchTerms: 'jordan amman jo' },
    { iana: 'Asia/Jerusalem',                city: 'Jerusalem / Tel Aviv',       country: 'Israel',          searchTerms: 'israel jerusalem tel aviv il' },
    { iana: 'Asia/Baghdad',                  city: 'Baghdad',                    country: 'Iraq',            searchTerms: 'iraq baghdad iq' },
    { iana: 'Asia/Tehran',                   city: 'Tehran',                     country: 'Iran',            searchTerms: 'iran tehran ir' },
    // ── EAST ASIA ──
    { iana: 'Asia/Tokyo',                    city: 'Tokyo',                      country: 'Japan',           searchTerms: 'japan tokyo osaka jp' },
    { iana: 'Asia/Seoul',                    city: 'Seoul',                      country: 'South Korea',     searchTerms: 'south korea seoul busan kr' },
    { iana: 'Asia/Shanghai',                 city: 'Shanghai / Beijing',         country: 'China',           searchTerms: 'china beijing shanghai guangzhou cn' },
    { iana: 'Asia/Hong_Kong',                city: 'Hong Kong',                  country: 'Hong Kong',       searchTerms: 'hong kong hk' },
    { iana: 'Asia/Taipei',                   city: 'Taipei',                     country: 'Taiwan',          searchTerms: 'taiwan taipei tw' },
    { iana: 'Asia/Ulaanbaatar',              city: 'Ulaanbaatar',                country: 'Mongolia',        searchTerms: 'mongolia ulaanbaatar mn' },
    { iana: 'Asia/Pyongyang',                city: 'Pyongyang',                  country: 'North Korea',     searchTerms: 'north korea pyongyang kp' },
    // ── SOUTHEAST ASIA ──
    { iana: 'Asia/Singapore',                city: 'Singapore',                  country: 'Singapore',       searchTerms: 'singapore sg' },
    { iana: 'Asia/Bangkok',                  city: 'Bangkok',                    country: 'Thailand',        searchTerms: 'thailand bangkok th' },
    { iana: 'Asia/Jakarta',                  city: 'Jakarta',                    country: 'Indonesia',       searchTerms: 'indonesia jakarta bali id' },
    { iana: 'Asia/Manila',                   city: 'Manila',                     country: 'Philippines',     searchTerms: 'philippines manila ph' },
    { iana: 'Asia/Kuala_Lumpur',             city: 'Kuala Lumpur',               country: 'Malaysia',        searchTerms: 'malaysia kuala lumpur my' },
    { iana: 'Asia/Ho_Chi_Minh',              city: 'Ho Chi Minh City / Hanoi',   country: 'Vietnam',         searchTerms: 'vietnam hanoi ho chi minh vn' },
    { iana: 'Asia/Rangoon',                  city: 'Yangon (Rangoon)',            country: 'Myanmar',         searchTerms: 'myanmar burma yangon rangoon mm' },
    { iana: 'Asia/Phnom_Penh',               city: 'Phnom Penh',                 country: 'Cambodia',        searchTerms: 'cambodia phnom penh kh' },
    { iana: 'Asia/Vientiane',                city: 'Vientiane',                  country: 'Laos',            searchTerms: 'laos vientiane la' },
    { iana: 'Asia/Dili',                     city: 'Dili',                       country: 'East Timor',      searchTerms: 'east timor dili tl' },
    // ── CENTRAL ASIA ──
    { iana: 'Asia/Tashkent',                 city: 'Tashkent',                   country: 'Uzbekistan',      searchTerms: 'uzbekistan tashkent uz' },
    { iana: 'Asia/Almaty',                   city: 'Almaty',                     country: 'Kazakhstan',      searchTerms: 'kazakhstan almaty kz' },
    { iana: 'Asia/Ashgabat',                 city: 'Ashgabat',                   country: 'Turkmenistan',    searchTerms: 'turkmenistan ashgabat tm' },
    { iana: 'Asia/Bishkek',                  city: 'Bishkek',                    country: 'Kyrgyzstan',      searchTerms: 'kyrgyzstan bishkek kg' },
    { iana: 'Asia/Dushanbe',                 city: 'Dushanbe',                   country: 'Tajikistan',      searchTerms: 'tajikistan dushanbe tj' },
    { iana: 'Asia/Baku',                     city: 'Baku',                       country: 'Azerbaijan',      searchTerms: 'azerbaijan baku az' },
    { iana: 'Asia/Yerevan',                  city: 'Yerevan',                    country: 'Armenia',         searchTerms: 'armenia yerevan am' },
    { iana: 'Asia/Tbilisi',                  city: 'Tbilisi',                    country: 'Georgia',         searchTerms: 'georgia tbilisi ge' },
    // ── EUROPE ──
    { iana: 'Europe/London',                 city: 'London',                     country: 'United Kingdom',  searchTerms: 'uk united kingdom london britain england gb' },
    { iana: 'Europe/Paris',                  city: 'Paris',                      country: 'France',          searchTerms: 'france paris fr' },
    { iana: 'Europe/Berlin',                 city: 'Berlin',                     country: 'Germany',         searchTerms: 'germany berlin de' },
    { iana: 'Europe/Rome',                   city: 'Rome',                       country: 'Italy',           searchTerms: 'italy rome milan it' },
    { iana: 'Europe/Madrid',                 city: 'Madrid',                     country: 'Spain',           searchTerms: 'spain madrid barcelona es' },
    { iana: 'Europe/Amsterdam',              city: 'Amsterdam',                  country: 'Netherlands',     searchTerms: 'netherlands amsterdam nl' },
    { iana: 'Europe/Brussels',               city: 'Brussels',                   country: 'Belgium',         searchTerms: 'belgium brussels be' },
    { iana: 'Europe/Zurich',                 city: 'Zurich',                     country: 'Switzerland',     searchTerms: 'switzerland zurich bern ch' },
    { iana: 'Europe/Stockholm',              city: 'Stockholm',                  country: 'Sweden',          searchTerms: 'sweden stockholm se' },
    { iana: 'Europe/Oslo',                   city: 'Oslo',                       country: 'Norway',          searchTerms: 'norway oslo no' },
    { iana: 'Europe/Copenhagen',             city: 'Copenhagen',                 country: 'Denmark',         searchTerms: 'denmark copenhagen dk' },
    { iana: 'Europe/Helsinki',               city: 'Helsinki',                   country: 'Finland',         searchTerms: 'finland helsinki fi' },
    { iana: 'Europe/Warsaw',                 city: 'Warsaw',                     country: 'Poland',          searchTerms: 'poland warsaw pl' },
    { iana: 'Europe/Prague',                 city: 'Prague',                     country: 'Czech Republic',  searchTerms: 'czech republic prague cz' },
    { iana: 'Europe/Budapest',               city: 'Budapest',                   country: 'Hungary',         searchTerms: 'hungary budapest hu' },
    { iana: 'Europe/Vienna',                 city: 'Vienna',                     country: 'Austria',         searchTerms: 'austria vienna at' },
    { iana: 'Europe/Athens',                 city: 'Athens',                     country: 'Greece',          searchTerms: 'greece athens gr' },
    { iana: 'Europe/Lisbon',                 city: 'Lisbon',                     country: 'Portugal',        searchTerms: 'portugal lisbon pt' },
    { iana: 'Europe/Istanbul',               city: 'Istanbul / Ankara',          country: 'Turkey',          searchTerms: 'turkey istanbul ankara tr' },
    { iana: 'Europe/Moscow',                 city: 'Moscow',                     country: 'Russia',          searchTerms: 'russia moscow ru' },
    { iana: 'Europe/Kiev',                   city: 'Kyiv (Kiev)',                country: 'Ukraine',         searchTerms: 'ukraine kyiv kiev ua' },
    { iana: 'Europe/Bucharest',              city: 'Bucharest',                  country: 'Romania',         searchTerms: 'romania bucharest ro' },
    { iana: 'Europe/Sofia',                  city: 'Sofia',                      country: 'Bulgaria',        searchTerms: 'bulgaria sofia bg' },
    { iana: 'Europe/Minsk',                  city: 'Minsk',                      country: 'Belarus',         searchTerms: 'belarus minsk by' },
    { iana: 'Europe/Riga',                   city: 'Riga',                       country: 'Latvia',          searchTerms: 'latvia riga lv' },
    { iana: 'Europe/Tallinn',                city: 'Tallinn',                    country: 'Estonia',         searchTerms: 'estonia tallinn ee' },
    { iana: 'Europe/Vilnius',                city: 'Vilnius',                    country: 'Lithuania',       searchTerms: 'lithuania vilnius lt' },
    { iana: 'Europe/Bratislava',             city: 'Bratislava',                 country: 'Slovakia',        searchTerms: 'slovakia bratislava sk' },
    { iana: 'Europe/Zagreb',                 city: 'Zagreb',                     country: 'Croatia',         searchTerms: 'croatia zagreb hr' },
    { iana: 'Europe/Sarajevo',               city: 'Sarajevo',                   country: 'Bosnia',          searchTerms: 'bosnia sarajevo ba' },
    { iana: 'Europe/Belgrade',               city: 'Belgrade',                   country: 'Serbia',          searchTerms: 'serbia belgrade rs' },
    { iana: 'Europe/Dublin',                 city: 'Dublin',                     country: 'Ireland',         searchTerms: 'ireland dublin ie' },
    { iana: 'Europe/Valletta',               city: 'Valletta',                   country: 'Malta',           searchTerms: 'malta valletta mt' },
    { iana: 'Atlantic/Reykjavik',            city: 'Reykjavik',                  country: 'Iceland',         searchTerms: 'iceland reykjavik is' },
    // ── AMERICAS ──
    { iana: 'America/New_York',              city: 'New York (EST)',              country: 'United States',   searchTerms: 'usa united states new york est eastern us' },
    { iana: 'America/Chicago',               city: 'Chicago (CST)',              country: 'United States',   searchTerms: 'usa chicago cst central us' },
    { iana: 'America/Denver',                city: 'Denver (MST)',               country: 'United States',   searchTerms: 'usa denver mst mountain us' },
    { iana: 'America/Los_Angeles',           city: 'Los Angeles (PST)',          country: 'United States',   searchTerms: 'usa los angeles pst pacific california us' },
    { iana: 'America/Anchorage',             city: 'Anchorage',                  country: 'United States',   searchTerms: 'usa alaska anchorage us' },
    { iana: 'Pacific/Honolulu',              city: 'Honolulu, Hawaii',           country: 'United States',   searchTerms: 'usa hawaii honolulu us' },
    { iana: 'America/Toronto',               city: 'Toronto',                    country: 'Canada',          searchTerms: 'canada toronto ontario ca' },
    { iana: 'America/Vancouver',             city: 'Vancouver',                  country: 'Canada',          searchTerms: 'canada vancouver bc ca' },
    { iana: 'America/Mexico_City',           city: 'Mexico City',                country: 'Mexico',          searchTerms: 'mexico mexico city mx' },
    { iana: 'America/Sao_Paulo',             city: 'São Paulo / Brasília',       country: 'Brazil',          searchTerms: 'brazil sao paulo brasilia br' },
    { iana: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires',             country: 'Argentina',        searchTerms: 'argentina buenos aires ar' },
    { iana: 'America/Bogota',                city: 'Bogotá',                     country: 'Colombia',        searchTerms: 'colombia bogota co' },
    { iana: 'America/Lima',                  city: 'Lima',                       country: 'Peru',            searchTerms: 'peru lima pe' },
    { iana: 'America/Santiago',              city: 'Santiago',                   country: 'Chile',           searchTerms: 'chile santiago cl' },
    { iana: 'America/Caracas',               city: 'Caracas',                    country: 'Venezuela',       searchTerms: 'venezuela caracas ve' },
    { iana: 'America/Havana',                city: 'Havana',                     country: 'Cuba',            searchTerms: 'cuba havana cu' },
    { iana: 'America/Panama',                city: 'Panama City',                country: 'Panama',          searchTerms: 'panama city pa' },
    { iana: 'America/Costa_Rica',            city: 'San José',                   country: 'Costa Rica',      searchTerms: 'costa rica san jose cr' },
    { iana: 'America/La_Paz',                city: 'La Paz',                     country: 'Bolivia',         searchTerms: 'bolivia la paz bo' },
    { iana: 'America/Asuncion',              city: 'Asunción',                   country: 'Paraguay',        searchTerms: 'paraguay asuncion py' },
    { iana: 'America/Montevideo',            city: 'Montevideo',                 country: 'Uruguay',         searchTerms: 'uruguay montevideo uy' },
    { iana: 'America/Guayaquil',             city: 'Quito / Guayaquil',          country: 'Ecuador',         searchTerms: 'ecuador quito guayaquil ec' },
    { iana: 'America/Guyana',                city: 'Georgetown',                 country: 'Guyana',          searchTerms: 'guyana georgetown gy' },
    { iana: 'America/Jamaica',               city: 'Kingston',                   country: 'Jamaica',         searchTerms: 'jamaica kingston jm' },
    { iana: 'America/Port-au-Prince',        city: 'Port-au-Prince',             country: 'Haiti',           searchTerms: 'haiti port au prince ht' },
    { iana: 'America/Nassau',                city: 'Nassau',                     country: 'Bahamas',         searchTerms: 'bahamas nassau bs' },
    { iana: 'America/Barbados',              city: 'Bridgetown',                 country: 'Barbados',        searchTerms: 'barbados bridgetown bb' },
    { iana: 'America/Port_of_Spain',         city: 'Port of Spain',              country: 'Trinidad',        searchTerms: 'trinidad port of spain tt' },
    // ── AFRICA ──
    { iana: 'Africa/Lagos',                  city: 'Lagos / Abuja',              country: 'Nigeria',         searchTerms: 'nigeria lagos abuja ng' },
    { iana: 'Africa/Cairo',                  city: 'Cairo',                      country: 'Egypt',           searchTerms: 'egypt cairo eg' },
    { iana: 'Africa/Johannesburg',           city: 'Johannesburg / Cape Town',   country: 'South Africa',    searchTerms: 'south africa johannesburg cape town za' },
    { iana: 'Africa/Nairobi',                city: 'Nairobi',                    country: 'Kenya',           searchTerms: 'kenya nairobi ke' },
    { iana: 'Africa/Accra',                  city: 'Accra',                      country: 'Ghana',           searchTerms: 'ghana accra gh' },
    { iana: 'Africa/Addis_Ababa',            city: 'Addis Ababa',                country: 'Ethiopia',        searchTerms: 'ethiopia addis ababa et' },
    { iana: 'Africa/Casablanca',             city: 'Casablanca / Rabat',         country: 'Morocco',         searchTerms: 'morocco casablanca rabat ma' },
    { iana: 'Africa/Tunis',                  city: 'Tunis',                      country: 'Tunisia',         searchTerms: 'tunisia tunis tn' },
    { iana: 'Africa/Algiers',                city: 'Algiers',                    country: 'Algeria',         searchTerms: 'algeria algiers dz' },
    { iana: 'Africa/Tripoli',                city: 'Tripoli',                    country: 'Libya',           searchTerms: 'libya tripoli ly' },
    { iana: 'Africa/Khartoum',               city: 'Khartoum',                   country: 'Sudan',           searchTerms: 'sudan khartoum sd' },
    { iana: 'Africa/Dar_es_Salaam',          city: 'Dar es Salaam',              country: 'Tanzania',        searchTerms: 'tanzania dar es salaam tz' },
    { iana: 'Africa/Kampala',                city: 'Kampala',                    country: 'Uganda',          searchTerms: 'uganda kampala ug' },
    { iana: 'Africa/Dakar',                  city: 'Dakar',                      country: 'Senegal',         searchTerms: 'senegal dakar sn' },
    { iana: 'Africa/Abidjan',                city: 'Abidjan',                    country: 'Ivory Coast',     searchTerms: 'ivory coast abidjan ci' },
    { iana: 'Africa/Douala',                 city: 'Douala',                     country: 'Cameroon',        searchTerms: 'cameroon douala cm' },
    { iana: 'Africa/Lusaka',                 city: 'Lusaka',                     country: 'Zambia',          searchTerms: 'zambia lusaka zm' },
    { iana: 'Africa/Harare',                 city: 'Harare',                     country: 'Zimbabwe',        searchTerms: 'zimbabwe harare zw' },
    { iana: 'Africa/Maputo',                 city: 'Maputo',                     country: 'Mozambique',      searchTerms: 'mozambique maputo mz' },
    { iana: 'Africa/Luanda',                 city: 'Luanda',                     country: 'Angola',          searchTerms: 'angola luanda ao' },
    { iana: 'Africa/Antananarivo',           city: 'Antananarivo',              country: 'Madagascar',       searchTerms: 'madagascar antananarivo mg' },
    // ── OCEANIA ──
    { iana: 'Australia/Sydney',              city: 'Sydney',                     country: 'Australia',       searchTerms: 'australia sydney nsw au' },
    { iana: 'Australia/Melbourne',           city: 'Melbourne',                  country: 'Australia',       searchTerms: 'australia melbourne vic au' },
    { iana: 'Australia/Brisbane',            city: 'Brisbane',                   country: 'Australia',       searchTerms: 'australia brisbane qld au' },
    { iana: 'Australia/Perth',               city: 'Perth',                      country: 'Australia',       searchTerms: 'australia perth wa au' },
    { iana: 'Australia/Adelaide',            city: 'Adelaide',                   country: 'Australia',       searchTerms: 'australia adelaide au' },
    { iana: 'Pacific/Auckland',              city: 'Auckland / Wellington',      country: 'New Zealand',     searchTerms: 'new zealand auckland wellington nz' },
    { iana: 'Pacific/Fiji',                  city: 'Suva',                       country: 'Fiji',            searchTerms: 'fiji suva fj' },
    { iana: 'Pacific/Port_Moresby',          city: 'Port Moresby',               country: 'Papua New Guinea', searchTerms: 'papua new guinea port moresby pg' },
    { iana: 'Pacific/Guam',                  city: 'Guam',                       country: 'Guam',            searchTerms: 'guam gu' },
    // ── GLOBAL ──
    { iana: 'UTC',                           city: 'UTC / GMT',                  country: 'Universal Time', searchTerms: 'utc gmt greenwich universal' },
];

const POPULAR_IANA = [
    'Asia/Kolkata', 'Europe/London', 'America/New_York', 'Asia/Dubai',
    'Asia/Tokyo', 'Asia/Singapore', 'Europe/Paris', 'America/Los_Angeles',
    'Australia/Sydney', 'Asia/Shanghai', 'Europe/Berlin', 'America/Chicago',
    'Africa/Lagos', 'America/Sao_Paulo', 'Asia/Seoul', 'Asia/Bangkok',
    'Asia/Karachi', 'Asia/Dhaka', 'Asia/Hong_Kong',
];

// Default selected: always includes India
const DEFAULT_SELECTED = ['Asia/Kolkata', 'Europe/London', 'America/New_York', 'Asia/Dubai'];

function getTimeData(iana: string, now: Date) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).formatToParts(now);

        const get = (type: string) => parts.find(p => p.type === type)?.value || '';
        const hour = parseInt(get('hour')) || 0;
        const minute = parseInt(get('minute')) || 0;
        const second = parseInt(get('second')) || 0;

        const displayParts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true,
        }).formatToParts(now);
        const displayHour = displayParts.find(p => p.type === 'hour')?.value || '12';
        const displayMin = displayParts.find(p => p.type === 'minute')?.value || '00';
        const ampm = displayParts.find(p => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM';

        const offsetStr = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, timeZoneName: 'shortOffset',
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'UTC';

        const jan = new Date(now.getFullYear(), 0, 1);
        const jul = new Date(now.getFullYear(), 6, 1);
        const getOff = (d: Date) => {
            try { return new Date(d.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset(); } catch { return 0; }
        };
        const janOff = getOff(jan);
        const julOff = getOff(jul);
        const isDST = janOff !== julOff;
        const currentlyDST = isDST && getOff(now) === Math.min(janOff, julOff);

        const weekday = get('weekday');
        const day = get('day');
        const month = get('month');

        return { hour, minute, second, displayHour, displayMin, ampm, offsetStr, isDST, currentlyDST, weekday, day, month };
    } catch {
        return { hour: 0, minute: 0, second: 0, displayHour: '12', displayMin: '00', ampm: 'AM', offsetStr: 'UTC', isDST: false, currentlyDST: false, weekday: '', day: '', month: '' };
    }
}

function AnalogClock({ hour, minute, second }: { hour: number; minute: number; second: number }) {
    const cx = 50; const cy = 50; const r = 42;
    const hourAngle = ((hour % 12) + minute / 60) * 30 - 90;
    const minAngle = (minute + second / 60) * 6 - 90;
    const secAngle = second * 6 - 90;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const hand = (angle: number, len: number) => ({
        x2: cx + len * Math.cos(toRad(angle)),
        y2: cy + len * Math.sin(toRad(angle)),
    });

    return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0" style={{ filter: 'drop-shadow(0 4px 12px rgba(100,80,255,0.3))' }}>
            <circle cx={cx} cy={cy} r={r + 3} fill="#3730a3" opacity="0.3" />
            <circle cx={cx} cy={cy} r={r} fill="white" />
            {Array.from({ length: 12 }).map((_, i) => {
                const a = toRad(i * 30 - 90);
                return (
                    <line key={i}
                        x1={cx + (r - 6) * Math.cos(a)} y1={cy + (r - 6) * Math.sin(a)}
                        x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
                        stroke="#6366f1" strokeWidth={i % 3 === 0 ? 2 : 1}
                    />
                );
            })}
            <line x1={cx} y1={cy} {...hand(hourAngle, 26)} stroke="#1e1b4b" strokeWidth={3} strokeLinecap="round" />
            <line x1={cx} y1={cy} {...hand(minAngle, 35)} stroke="#1e1b4b" strokeWidth={2} strokeLinecap="round" />
            <line x1={cx} y1={cy} {...hand(secAngle, 38)} stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={2.5} fill="#6366f1" />
        </svg>
    );
}

function CityDetailView({ tz, now, onBack }: { tz: TimezoneInfo; now: Date; onBack: () => void }) {
    const td = getTimeData(tz.iana, now);
    const meta = getCountryMeta(tz.iana);
    const sun = getSunTimes(tz.iana, now);

    return (
        <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-40 bg-white dark:bg-[#0F172A] overflow-y-auto"
            style={{ paddingBottom: '6rem' }}
        >
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                        <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">DETAILS</h2>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                {/* TIME */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Time</p>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 relative overflow-hidden shadow-xl">
                        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-black/10" />
                        <div className="relative">
                            <h3 className="text-white font-bold text-xl">{tz.city}</h3>
                            <p className="text-indigo-200 text-xs uppercase tracking-wider mb-4">{tz.country.toUpperCase()}</p>
                            <div className="flex items-center gap-4">
                                <AnalogClock hour={td.hour} minute={td.minute} second={td.second} />
                                <div className="flex-1">
                                    <div className="font-mono text-white font-bold tracking-widest leading-none mb-1" style={{ fontSize: '2.2rem', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                                        {td.displayHour}:{td.displayMin}
                                    </div>
                                    <p className="text-indigo-200 text-xs">{td.weekday}, {td.day} {td.month}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">{td.offsetStr}</span>
                                        {td.currentlyDST && <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">☀️ DST</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sunrise/Sunset */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sunrise size={14} className="text-amber-500" />
                            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">Sunrise</p>
                        </div>
                        <p className="text-slate-900 dark:text-white font-bold text-lg">{sun.sunrise}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sun size={14} className="text-orange-500" />
                            <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase">Sunset</p>
                        </div>
                        <p className="text-slate-900 dark:text-white font-bold text-lg">{sun.sunset}</p>
                    </div>
                </div>

                {/* Economic Info */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Economic Info</p>
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 flex items-center gap-4 shadow-lg">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-indigo-200 font-semibold uppercase">Currency</span>
                                <span className="text-yellow-300 font-bold text-xl leading-none">{meta.currencySymbol}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <DollarSign size={12} className="text-indigo-200" />
                                <span className="text-[10px] text-indigo-200 uppercase font-bold">Currency</span>
                            </div>
                            <p className="text-white font-bold text-base">{meta.currencyName}</p>
                        </div>
                    </div>
                </div>

                {/* Geography */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Geography</p>
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 flex items-center gap-4 shadow-lg">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-white/20 flex flex-col items-center justify-center gap-2">
                                <img 
                                    src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                                    alt={meta.countryCode}
                                    className="w-8 h-auto shadow-[0_0_10px_rgba(0,0,0,0.2)] rounded-sm"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <MapPin size={10} className="text-indigo-200" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Country :</span>
                                <span className="text-white font-bold">{tz.country}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Country Code :</span>
                                <span className="text-white font-bold">{meta.countryCode}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Region :</span>
                                <span className="text-white font-bold">{meta.region}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Phone Code :</span>
                                <span className="text-white font-bold">{meta.phoneCode}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timezone Info */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Timezone Info</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">IANA Name</span>
                            <span className="text-slate-900 dark:text-white font-mono text-xs">{tz.iana}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">UTC Offset</span>
                            <span className="text-slate-900 dark:text-white font-medium">{td.offsetStr}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">DST</span>
                            <span className={`font-medium ${td.isDST ? 'text-amber-500' : 'text-slate-500'}`}>
                                {td.isDST ? (td.currentlyDST ? 'Active' : 'Observing') : 'Not observed'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function WorldClock() {
    useEffect(() => { AnalyticsService.trackScreen('World_Clock'); }, []);
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());
    const [selectedIana, setSelectedIana] = useState<string[]>(DEFAULT_SELECTED);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailZone, setDetailZone] = useState<TimezoneInfo | null>(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const activeZones = useMemo(() => {
        return selectedIana
            .map(iana => WORLD_TIMEZONES.find(t => t.iana === iana))
            .filter(Boolean) as TimezoneInfo[];
    }, [selectedIana]);

    const availableZones = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const notSelected = WORLD_TIMEZONES.filter(t => !selectedIana.includes(t.iana));
        if (!q) {
            // Show popular first
            const popular = notSelected.filter(t => POPULAR_IANA.includes(t.iana));
            const rest = notSelected.filter(t => !POPULAR_IANA.includes(t.iana));
            return [...popular, ...rest];
        }
        return notSelected.filter(t =>
            t.searchTerms.includes(q) ||
            t.city.toLowerCase().includes(q) ||
            t.country.toLowerCase().includes(q) ||
            t.iana.toLowerCase().includes(q)
        );
    }, [selectedIana, searchQuery]);

    const addZone = (iana: string) => {
        setSelectedIana(prev => [...prev, iana]);
        setShowAddPanel(false);
        setSearchQuery('');
    };

    const removeZone = (iana: string) => {
        setSelectedIana(prev => prev.filter(p => p !== iana));
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#0F172A] animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">World Clock</h1>
                            <p className="text-slate-500 text-xs">{WORLD_TIMEZONES.length} cities · Tap for details</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAddPanel(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                        <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">Add</span>
                    </button>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            {/* Clock Cards */}
            <div className="px-4 pt-3 pb-28 space-y-3">
                {activeZones.map((tz, i) => {
                    const td = getTimeData(tz.iana, now);
                    const meta = getCountryMeta(tz.iana);
                    const isDark = td.hour < 6 || td.hour >= 20;

                    return (
                        <motion.div key={tz.iana} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform select-none"
                            onClick={() => setDetailZone(tz)}
                        >
                            <div className={`absolute inset-0 ${isDark
                                ? 'bg-gradient-to-r from-slate-800 to-indigo-900'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-600'}`} />
                            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
                            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/10" />

                            <div className="relative p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-[36px] flex-shrink-0 flex items-center justify-center">
                                        <img 
                                            src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                                            alt={meta.countryCode}
                                            className="w-full h-auto shadow-md rounded-[2px]"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-bold text-base">{tz.city}</h3>
                                            {td.currentlyDST && (
                                                <span className="text-[9px] bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded-full font-bold">DST</span>
                                            )}
                                        </div>
                                        <p className="text-indigo-200 text-[11px]">{tz.country} · {td.offsetStr}</p>
                                        <p className="text-indigo-300 text-[10px]">{td.weekday}, {td.day} {td.month}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <div className="font-mono text-white font-bold" style={{ fontSize: '1.6rem', textShadow: '0 0 20px rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                        {td.displayHour}:{td.displayMin}
                                    </div>
                                    <span className="text-indigo-200 text-xs uppercase">{td.ampm}</span>
                                    {selectedIana.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeZone(tz.iana); }}
                                            className="mt-1 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <X size={12} className="text-white/60" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {activeZones.length === 0 && (
                    <div className="text-center py-16">
                        <Globe size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No cities added. Tap Add to begin.</p>
                    </div>
                )}
            </div>

            {/* Add Zone Bottom Sheet */}
            <AnimatePresence>
                {showAddPanel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50"
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowAddPanel(false); setSearchQuery(''); } }}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1E293B] rounded-t-3xl flex flex-col"
                            style={{ maxHeight: '75vh' }}
                        >
                            <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Time Zone</h3>
                                    <p className="text-slate-500 text-xs">{WORLD_TIMEZONES.length} countries & cities available</p>
                                </div>
                                <button onClick={() => { setShowAddPanel(false); setSearchQuery(''); }}
                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <X size={18} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="px-6 mb-3 flex-shrink-0">
                                <div className="relative">
                                    <Search size={16} className="absolute inset-y-0 my-auto left-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search India, Japan, New York, UTC..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 my-auto right-4 text-slate-400">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!searchQuery && (
                                <p className="px-6 text-[10px] text-indigo-500 font-bold uppercase mb-2 flex-shrink-0">
                                    🌟 Popular Cities
                                </p>
                            )}

                            <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-2">
                                {availableZones.map(tz => {
                                    const meta = getCountryMeta(tz.iana);
                                    return (
                                        <button key={tz.iana} onClick={() => addZone(tz.iana)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-400 transition-colors text-left">
                                            <div className="w-8 flex-shrink-0 flex items-center justify-center">
                                                <img 
                                                    src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                                                    alt={meta.countryCode}
                                                    className="w-full h-auto shadow-sm rounded-sm"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{tz.city}</p>
                                                <p className="text-slate-400 text-xs truncate">{tz.country} · {tz.iana}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                    <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {availableZones.length === 0 && (
                                    <div className="text-center py-8">
                                        <Globe size={32} className="text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">No matching cities found</p>
                                        <p className="text-slate-400 text-xs mt-1">Try "India", "Japan" or "New York"</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail View */}
            <AnimatePresence>
                {detailZone && (
                    <CityDetailView tz={detailZone} now={now} onBack={() => setDetailZone(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
