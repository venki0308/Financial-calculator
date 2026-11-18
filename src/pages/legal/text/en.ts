/**
 * English text of the four legal pages (Privacy Policy, Data & Privacy, Terms of Service, About).
 * One source for the website pages and the app screens: the Body components in src/pages/legal/*.tsx
 * read their sentences from here through legalText(lang) (./index.ts). The other languages
 * (./hi.ts, ./te.ts, ./ta.ts, ./kn.ts, ./ml.ts) are objects of the same type, `LegalStrings`.
 *
 * Headings, page titles, hero lines and the "Last Updated" dates are NOT here: they are each
 * page's `meta` (the `T` object in the page's module), already translated.
 *
 * Conventions for translators:
 *   - Emph: a sentence with one bold phrase, rendered `before` + <strong>`strong`</strong> + `after`.
 *     Move words between the three parts as the language needs (any part may be ''), but keep the
 *     phrase that should be bold in `strong`. Spaces at the edges of `before`/`after` are rendered.
 *   - Fixed-length tuples ([string, string, string]) map one-to-one onto cards whose icon, colour
 *     and heading are in the page code: keep the order and the count.
 *   - Plain string[] lists may have a different number of items in a translation.
 *   - Emoji, arrows and bullet signs are in the page code, not in these strings (except the heart in
 *     layout.madeIn); do not add them.
 *   - Keep as-is: email addresses, URLs, domains, "FinCalix", "Google Play", "Google Drive",
 *     "CIBIL®"/"TransUnion CIBIL", "DPDP", "HTTPS", "PDF/Excel/CSV", "LocalStorage" and other
 *     product/organisation names (they may be followed by a translated word).
 */

/** A sentence with one bold phrase: before + <strong>strong</strong> + after. */
export interface Emph {
    before: string;
    strong: string;
    after: string;
}

export interface Resource {
    name: string;
    url: string;
    domain: string;
}

export interface LegalStrings {
    /** The website's frame around a legal page (header link and footer). Not shown in the app. */
    layout: {
        home: string;
        tagline: string;
        madeIn: string;
        privacy: string;
        terms: string;
        about: string;
        copyright: string;
    };
    privacy: {
        collect: { intro: Emph; bullets: string[]; outro: string };
        storage: { intro: Emph; bullets: string[]; boxTitle: string; boxBullets: string[]; boxText: string };
        analytics: {
            intro: string;
            collectedTitle: string;
            collected: string[];
            neverTitle: string;
            never: string[];
            outro: string;
        };
        thirdParty: { intro: string; cardTitle: string; cardText: string; outro: string };
        financial: { boxTitle: string; bullets: string[] };
        backup: { intro: string; bullets: string[] };
        children: { p1: string; p2: string };
        security: { intro: string; bullets: string[] };
        /** Card texts under the headings meta.s.access / s.delete / s.portability. */
        rights: { access: string; delete: string; portability: string };
        changes: { p1: string; p2: string };
        contact: { intro: string; email: string; siteUrl: string; siteLabel: string };
        reporting: { intro: string; safetyTitle: string; safetyBullets: string[]; dataPrivacyLink: string };
        dpdp: {
            title: string;
            intro: string;
            rightsTitle: string;
            rights: string[];
            grievanceTitle: string;
            trademarksTitle: string;
            trademarks: string;
        };
    };
    dataPrivacy: {
        collect: { p1: string; p2: string };
        storage: { p1: string; p2: string; p3: string };
        backup: { p1: Emph; p2: string; p3: string };
        /** p2 is shown in bold as a whole. */
        analytics: { p1: string; p2: string; p3: string; p4: string };
        promises: string[];
        /** Google Play Data Safety table rows (labels are written in capitals). */
        safety: { label: string; value: string }[];
        email: string;
        fullPolicyLink: string;
    };
    terms: {
        /** Texts of the numbered sections 1-5; their headings are meta.s1 … meta.s5. */
        sections: [string, string, string, string, string];
    };
    about: {
        /** The product name under the logo: keep "FinCalix". */
        appName: string;
        /** Texts of the three cards headed meta.s.ref / s.accuracy / s.official. */
        cards: [string, string, string];
        /** Official links (blue, green, yellow dot): translate `name` only. */
        resources: [Resource, Resource, Resource];
        trademarks: [string, string];
        contactTitle: string;
        email: string;
        team: string;
    };
}

export const en: LegalStrings = {
    layout: {
        home: 'Home',
        tagline: 'FinCalix — Smart Financial Planning Tool',
        madeIn: 'Made with ❤️ in India',
        privacy: 'Privacy',
        terms: 'Terms',
        about: 'About',
        copyright: '© 2026 FinCalix. All rights reserved.',
    },

    privacy: {
        collect: {
            intro: {
                before: 'FinCalix does ',
                strong: 'not',
                after: ' ask for, collect or store your name, contact details or financial data.',
            },
            bullets: [
                'No name, email address, phone number, or postal address is collected',
                'No financial data (salary, investments, EMI amounts) is collected',
                'No account creation or login is required to use the app',
                'No user profiles are created or stored',
            ],
            outro: 'You can open the app and start calculating instantly — we never ask for any personal details.',
        },
        storage: {
            intro: {
                before: 'FinCalix stores the following data ',
                strong: 'locally on your device only',
                after: " using your browser's LocalStorage:",
            },
            bullets: [
                'Calculation inputs — Numbers you enter in calculators',
                'Recently used calculators — For quick access on the home screen',
                'Saved calculations — When you manually save a result',
                'App preferences — Theme (dark/light), language choice',
            ],
            boxTitle: 'This data stays on your device permanently until you:',
            boxBullets: [
                'Clear the app data from your device settings',
                'Uninstall the app',
                'Clear browser data (on web version)',
            ],
            boxText: 'We cannot see the data stored on your device. It is never synced to any server and leaves your device only in a backup file you export yourself. Usage analytics (see Analytics & Tracking) record which calculators you use and your language, never the numbers you enter.',
        },
        analytics: {
            intro: 'To improve the app, FinCalix collects anonymous usage statistics, such as which features and screens are used most. The app and this website send the following to an analytics service, which processes it on our behalf. Financial amounts are never sent.',
            collectedTitle: 'What Is Collected',
            collected: [
                'Events: page view, screen view (including app open), calculator used, scheme viewed, language changed, PDF/Excel export, calculation completed, report exported (PDF, Excel, CSV). The analytics service also records first open, session start and engagement time automatically. On the website: taps on the Google Play buttons.',
                'Event details: screen name, page path, calculator type, scheme type (central or state), language, export type, platform',
                'Identifiers: a random client ID and a random installation ID',
                'Device data: screen resolution, language, OS and browser version',
                'Approximate country, derived from your IP address by the analytics service',
            ],
            neverTitle: 'Never Collected',
            never: [
                'Your calculation inputs',
                'Financial figures',
                'Personal identity',
                'Name or email',
                'Browsing history',
            ],
            outro: 'This data is pseudonymous: it is tied to a random ID, not to your name or contact details. Advertising features and ad personalisation are disabled. Usage analytics run for every user of the app and this website.',
        },
        thirdParty: {
            intro: 'FinCalix uses the following third-party service for analytics:',
            cardTitle: 'Analytics service',
            cardText: 'An analytics service processes the usage statistics listed above on our behalf. The data is sent to its servers, which may be outside India.',
            outro: 'The app also loads its font from a web font service and checks fincalix.com for update information; like any web request, these reveal your IP address to the server. No advertising networks, tracking pixels or data-selling services are used.',
        },
        financial: {
            boxTitle: 'Your financial data stays on your device',
            bullets: [
                'All numbers you enter (salary, EMI, tax inputs, SIP amounts, etc.) are processed entirely on your device',
                'We never see, store, or transmit your financial figures',
                'All calculations happen in your browser/app — not on any server',
                'There is no backend or API that receives your financial data',
            ],
        },
        backup: {
            intro: 'FinCalix includes an optional Backup & Restore feature so you can move your data to a new device. The backup file contains all your locally stored app data — expenses, budgets, Business Tracker entries, loans, credit cards, CIBIL profile inputs, saved calculations and settings. Business Tracker entries are stored locally on your device, exactly like all other data.',
            bullets: [
                'Export and sharing are entirely user-initiated — nothing is backed up automatically',
                'The backup file is created on your device and goes only where you choose to send it (phone storage, Google Drive, email)',
                'Keeping the backup file secure is your responsibility — anyone with the file can read your financial data',
                'Importing a backup replaces the data currently on the device',
                'FinCalix never uploads your backup to any server',
            ],
        },
        children: {
            p1: 'FinCalix is designed for users 18 years of age and above. The app contains financial calculators intended for adult use (tax planning, loan EMI, investment returns, etc.).',
            p2: 'We do not knowingly collect data from anyone under 18 years of age.',
        },
        security: {
            intro: 'FinCalix has no servers of its own and never receives your financial data. Usage statistics are processed by an analytics service on our behalf, as described above.',
            bullets: [
                'Your data security equals your device security',
                'All web traffic uses HTTPS encryption',
                'We recommend using a device lock screen (PIN, fingerprint, face unlock) to protect your locally stored data',
            ],
        },
        rights: {
            access: 'All the data you enter is visible directly in the app (Saved Calculations, History, Preferences).',
            delete: 'Clear app data from your device settings, or simply uninstall the app. All data on your device is removed instantly.',
            portability: 'Your financial data never reaches us, so there is nothing for us to delete. Usage analytics are tied only to a random ID; uninstalling the app or clearing its data removes that ID from your device.',
        },
        changes: {
            p1: 'We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page.',
            p2: 'Continued use of FinCalix after changes to this policy constitutes acceptance of the updated terms. We encourage you to review this policy periodically.',
        },
        contact: {
            intro: 'If you have any questions or concerns about this Privacy Policy, feel free to reach out:',
            email: 'support@fincalix.com',
            siteUrl: 'https://fincalix.com',
            siteLabel: 'www.fincalix.com',
        },
        reporting: {
            intro: 'An analytics service processes the usage statistics described in section 3 on our behalf. Its servers may be outside India, which makes this a cross-border transfer. No financial data is included. FinCalix does not use crash reporting.',
            safetyTitle: 'Data Safety',
            safetyBullets: [
                'All calculations are performed locally on your device.',
                'No financial data is stored on our servers.',
                'No third-party data selling.',
            ],
            dataPrivacyLink: 'View Data & Privacy (Play Store Data Safety)',
        },
        dpdp: {
            title: 'DPDP Act 2023 & Grievance',
            intro: 'FinCalix complies with the Digital Personal Data Protection Act, 2023. Your financial inputs are stored only on your device. FinCalix collects anonymous usage statistics, such as which features are used most; financial amounts are never sent. For any privacy concerns, grievances, or questions about how this app handles your data,',
            rightsTitle: 'Your Rights as a Data Principal',
            rights: [
                'Right to access — all the data you enter is visible inside the app at any time',
                'Right to correction — edit any saved entry inside the app',
                'Right to erasure — clear app data from device settings or uninstall the app',
                'Right to grievance redressal — email support@fincalix.com',
            ],
            grievanceTitle: 'Grievance Contact',
            trademarksTitle: 'Third-Party Trademarks',
            trademarks: 'CIBIL® is a registered trademark of TransUnion CIBIL Limited. FinCalix is not affiliated with, endorsed by, or partnered with TransUnion CIBIL or any credit bureau. All other trademarks (RBI, SEBI, IRDAI, AMFI, IT Department, India Post, etc.) are the property of their respective owners and are referenced for educational purposes only.',
        },
    },

    dataPrivacy: {
        collect: {
            p1: 'FinCalix does not ask for or store your name, contact details or financial data.',
            p2: 'No registration, no login, no account needed. Your name, email and phone number are never asked or stored by us.',
        },
        storage: {
            p1: "Your calculation history is saved in your device's local storage.",
            p2: 'This data stays on your phone or browser unless you export a backup. We never see the numbers you enter or your results.',
            p3: 'Clearing app data or uninstalling removes it completely.',
        },
        backup: {
            p1: {
                before: 'Your expenses, calculations and other saved records leave your device ',
                strong: 'ONLY',
                after: ' via a user-initiated export / share — when you yourself create a backup file and choose where to send it.',
            },
            p2: 'The backup file contains, at a high level: expenses & budgets, Business Tracker entries, loans & credit cards, CIBIL profile inputs, saved calculations and app settings.',
            p3: 'FinCalix never uploads the backup to any server. Importing a backup replaces the data currently on the device.',
        },
        analytics: {
            p1: 'To improve the app, FinCalix collects anonymous usage statistics, such as which features and calculators are used most. An analytics service processes them on our behalf.',
            p2: 'What is sent: which screens and calculators are opened, scheme views, language changes, completed calculations and exported reports (PDF, Excel, CSV), with a random app ID, device type, language, OS version and approximate country. On the website, taps on the Google Play buttons are also sent.',
            p3: 'This data is pseudonymous: it is tied to a random ID, not to your name or contact details.',
            p4: 'Your financial inputs (salary, EMI amounts, etc.) are never part of analytics.',
        },
        promises: [
            'We never sell your data',
            'We never share your data with advertisers',
            'We never store your financial figures on our servers',
            'We never require you to create an account',
            'All calculations happen locally on your device',
        ],
        safety: [
            { label: 'DATA COLLECTED', value: 'App interactions, device or other IDs, approximate location' },
            { label: 'DATA SHARED WITH THIRD PARTIES', value: 'Processed by an analytics service on our behalf; not sold, not used for advertising' },
            { label: 'DATA ENCRYPTED IN TRANSIT', value: 'Yes (HTTPS)' },
            { label: 'CAN USERS REQUEST DELETION', value: 'No in-app option. Analytics data is tied only to a random ID; uninstalling the app or clearing its data removes that ID from your device' },
            { label: 'DATA USED TO TRACK USERS', value: 'No' },
        ],
        email: 'support@fincalix.com',
        fullPolicyLink: 'Read Full Privacy Policy',
    },

    terms: {
        sections: [
            'The results provided by our calculators are estimates based on standard financial formulas and are for informational purposes only. Actual bank or government figures may vary.',
            'This app does not provide professional financial, legal, or tax advice. Users are encouraged to consult with qualified professionals before making significant financial decisions.',
            'While we provide details of government schemes, we are NOT an official government entity. Always verify details on official portals (e.g., .gov.in domains) as rules are subject to change.',
            'FinCalix shall not be liable for any financial losses or decisions made based on the data provided within this application.',
            'You are solely responsible for safekeeping backup files you export from FinCalix and for any data loss caused by importing a wrong or outdated backup — importing a backup replaces the data currently on the device. FinCalix is not liable for backup files shared to third-party services such as Google Drive or email, or for their loss, exposure or misuse.',
        ],
    },

    about: {
        appName: 'FinCalix',
        cards: [
            'This application is designed as a companion tool for Indian citizens to explore government schemes and perform financial projections.',
            'We strive to provide the most accurate and up-to-date information for 2026. However, interest rates and scheme rules change frequently.',
            'All calculations and scheme details are based on publicly available data from official portals like india.gov.in, npsc.gov.in, etc.',
        ],
        resources: [
            { name: 'National Portal of India', url: 'https://india.gov.in', domain: 'india.gov.in' },
            { name: 'Income Tax Department', url: 'https://incometax.gov.in', domain: 'incometax.gov.in' },
            { name: 'RBI Official Website', url: 'https://rbi.org.in', domain: 'rbi.org.in' },
        ],
        trademarks: [
            'CIBIL is a registered trademark of TransUnion CIBIL Limited. FinCalix is not affiliated with, endorsed by, or partnered with TransUnion CIBIL or any credit bureau. All CIBIL scores entered in this app are manually self-declared by the user and are never fetched from any bureau or uploaded to any server.',
            'FinCalix provides educational calculators and reference information only. We are not a SEBI-registered investment advisor, lender, or financial advisor. All outputs are automated calculations, not financial advice. Consult a licensed professional for personal advice.',
        ],
        contactTitle: 'Contact',
        email: 'support@fincalix.com',
        team: 'FinCalix Team · Hyderabad, India',
    },
};
