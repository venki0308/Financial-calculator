// Every FinCalix image: size, layout, copy, the real capture it shows, a
// caption suggestion, the claims it makes and the sources for its figures.
//
// `F('emi.emi')` inserts a figure the app itself computed (read by
// capture.mjs into marketing-assets/_captures/facts.json). No app figure is
// typed by hand here. Demo inputs (from demo-data.mjs) are written out where a
// sentence needs them, and figures that are law (limits, rates) carry a source.
//
// Copy rules are listed in README.md. In short: only true claims, and the
// privacy wording is limited to the four phrases in PRIVACY below.

const PRIVACY = ['Your financial data stays on your device', 'No login', 'No ads', 'Works offline'];

// Official sources, read 16 Nov 2026.
const SRC = {
    app: 'Figure computed by FinCalix (marketing-assets/_captures/facts.json)',
    slabs: 'Income-tax Act 2025 s.202 slabs: wm.incometaxindia.gov.in/w/section-202-78; no rate change in Finance Bill 2026: indiabudget.gov.in/doc/memo.pdf',
    rebate: 'Rebate up to Rs 12 lakh, s.156: incometaxindia.gov.in/w/section-156-84',
    stdDed: 'Standard deduction Rs 75,000 / Rs 50,000, s.19: wm.incometaxindia.gov.in/w/section-19-206',
    s123: 'Rs 1,50,000 limit, s.123 (earlier 80C): incometaxindia.gov.in/w/section-123-96',
    s126: 'Health insurance deduction, s.126 (earlier 80D): incometaxindia.gov.in/w/section-126-96',
    ppfRate: 'PPF 7.1% p.a.: indiapost.gov.in/banking-services/savings (30.10.2026)',
    ppfRules: 'PPF limit and tax treatment: nsiindia.gov.in/InternalPage.aspx?Id_Pk=55; deduction: incometaxindia.gov.in/w/schedule-xv-3',
    rbi: 'RBI (Pre-payment Charges on Loans) Directions, 2025, para 5(i): rbi.org.in/Scripts/NotificationUser.aspx?Id=12878',
    hra: 'HRA rule, Income-tax Rules 2026, Rule 279: incometaxindia.gov.in/w/rule-279-1',
    thumb: 'Lender thumb rule, not an official limit',
    badge: 'Official Google Play badge artwork, unaltered: play.google.com/intl/en_us/badges',
};

const TAGS = '#FinCalix #PersonalFinance #MoneyMatters #India';
const name = (category, n, topic, w, h) => `fincalix_${category}_${String(n).padStart(2, '0')}_${topic}_${w}x${h}.png`;
const S = (id, extra = {}) => ({ id, lang: 'en', theme: 'dark', ...extra });
const TRADEMARK = 'Google Play and the Google Play logo are trademarks of Google LLC.';

// Share of each capture to skip at the top of a Play Store screenshot, so the
// most useful part of the real screen sits under the headline.
const PLAY_CROP = { tax: 0, foreclosure: 0, sip: 0, 'expenses-monthly': 0.03, 'goal-planner': 0, schemes: 0.04, export: 0, 'settings-language': 0.2, 'hi:tax': 0.04 };

export function build(F) {
    const items = [];
    const add = (folder, category, topic, w, h, layout, data) => {
        const n = items.filter(i => i.folder === folder).length + 1;
        items.push({ folder, file: name(category, n, topic, w, h), topic, w, h, layout, lang: 'en', ...data });
    };

    // ── Play Store ────────────────────────────────────────────────────────
    add('playstore/icon', 'playstore-icon', 'app-icon', 512, 512, 'icon', {
        channel: 'Google Play: app icon', headline: 'App icon (existing artwork, re-encoded as 32-bit PNG)',
        caption: '', claims: [], sources: ['ic_launcher_512.png in the repository, pixels unchanged'],
    });
    add('playstore/feature-graphic', 'feature-graphic', 'main', 1024, 500, 'feature', {
        channel: 'Google Play: feature graphic', headline: '45+ finance calculators for India',
        screen: S('tax'), screen2: S('sip'),
        caption: '', claims: ['45+ calculators'], sources: ['47 calculators in src/data/calculatorList.ts'],
    });

    const playCopy = {
        en: [
            ['income-tax', 'tax', 'Old vs New Regime, compared', 'Income tax for FY 2026-27 in seconds'],
            ['emi-prepayment', 'foreclosure', 'Plan your EMI and prepayment', 'See the interest saved before you prepay'],
            ['sip-investments', 'sip', 'See your SIP grow', 'SIP, FD, RD, PPF and more'],
            ['expense-tracker', 'expenses-monthly', 'Track every rupee you spend', 'Monthly budgets and yearly reports'],
            ['goal-planner', 'goal-planner', 'Plan goals, month by month', 'Know how much to invest each month'],
            ['government-schemes', 'schemes', 'Government schemes, explained simply', 'Eligibility, benefits and how to apply'],
            ['reports', 'export', 'Reports in PDF and Excel', 'Save or share your calculations'],
            ['languages-offline', 'settings-language', 'Works offline in 6 languages', 'No login. Your financial data stays on your device.'],
        ],
        te: [
            ['income-tax', 'tax', 'పాత vs కొత్త పన్ను విధానం', 'FY 2026-27 ఆదాయపు పన్ను, క్షణాల్లో'],
            ['emi-prepayment', 'foreclosure', 'EMI, ముందస్తు చెల్లింపు ప్లాన్', 'ముందే చెల్లిస్తే ఎంత వడ్డీ ఆదా అవుతుందో చూడండి'],
            ['sip-investments', 'sip', 'మీ SIP ఎలా పెరుగుతుందో చూడండి', 'SIP, FD, RD, PPF ఇంకా మరెన్నో'],
            ['expense-tracker', 'expenses-monthly', 'ప్రతి రూపాయి ఖర్చును ట్రాక్ చేయండి', 'నెలవారీ బడ్జెట్‌లు, వార్షిక నివేదికలు'],
            ['goal-planner', 'goal-planner', 'లక్ష్యాలను నెలవారీగా ప్లాన్ చేయండి', 'ప్రతి నెలా ఎంత పెట్టుబడి పెట్టాలో తెలుసుకోండి'],
            ['government-schemes', 'schemes', 'ప్రభుత్వ పథకాలు, సులభంగా', 'అర్హత, ప్రయోజనాలు, దరఖాస్తు విధానం'],
            ['reports', 'export', 'PDF, Excel లో నివేదికలు', 'మీ లెక్కలను సేవ్ చేయండి లేదా షేర్ చేయండి'],
            ['languages-offline', 'settings-language', '6 భాషల్లో, ఆఫ్‌లైన్‌లో పనిచేస్తుంది', 'లాగిన్ అవసరం లేదు. మీ ఆర్థిక డేటా మీ ఫోన్‌లోనే.'],
        ],
        hi: [
            ['income-tax', 'tax', 'पुरानी बनाम नई कर व्यवस्था', 'FY 2026-27 का आयकर, सेकंडों में'],
            ['emi-prepayment', 'foreclosure', 'EMI और प्रीपेमेंट की योजना', 'प्रीपेमेंट से कितना ब्याज बचेगा, पहले देखें'],
            ['sip-investments', 'sip', 'देखें आपकी SIP कैसे बढ़ती है', 'SIP, FD, RD, PPF और भी बहुत कुछ'],
            ['expense-tracker', 'expenses-monthly', 'हर रुपये के खर्च पर नज़र', 'मासिक बजट और सालाना रिपोर्ट'],
            ['goal-planner', 'goal-planner', 'लक्ष्य की योजना, महीने दर महीने', 'जानें हर महीने कितना निवेश करना है'],
            ['government-schemes', 'schemes', 'सरकारी योजनाएँ, आसान भाषा में', 'पात्रता, लाभ और आवेदन का तरीका'],
            ['reports', 'export', 'PDF और Excel में रिपोर्ट', 'अपनी गणनाएँ सेव करें या शेयर करें'],
            ['languages-offline', 'settings-language', '6 भाषाओं में, ऑफ़लाइन भी', 'लॉगिन नहीं। आपका वित्तीय डेटा आपके फ़ोन में ही।'],
        ],
    };
    const playClaims = [
        ['FY 2026-27 tax rules'], [], [], [], [], [], ['PDF and Excel export'],
        ['6 languages', 'Works offline', 'No login', 'Your financial data stays on your device'],
    ];
    for (const lang of ['en', 'te', 'hi']) {
        playCopy[lang].forEach(([topic, id, headline, sub], i) => add(`playstore/phone-${lang}`, `phone-${lang}`, topic, 1080, 1920, 'play', {
            lang, channel: `Google Play: phone screenshot ${i + 1} (${lang})`, headline, sub,
            screen: S(id, { lang, crop: PLAY_CROP[lang + ':' + id] ?? PLAY_CROP[id] ?? 0.055 }),
            caption: '', claims: playClaims[i], sources: [SRC.app],
        }));
    }

    // ── A. Feature posts (1080×1350) ──────────────────────────────────────
    const post = (topic, data) => add('social/feature-posts', 'feature-post', topic, 1080, 1350, 'post', {
        channel: 'Instagram / Facebook post', lockupNote: 'Free on Google Play', ...data,
    });
    post('income-tax', {
        eyebrow: 'Income tax · FY 2026-27', headline: 'Old or New Regime? *Know in seconds.*',
        sub: 'Enter your salary and deductions. FinCalix compares both regimes side by side.',
        points: ['FY 2026-27 slabs and rebate', 'Old vs New, side by side', 'Save the result as a PDF'],
        stat: { label: `New Regime tax on a ${F('tax.salary')} salary`, value: F('tax.newRegimeTax') },
        screen: S('tax'), disclaimer: true,
        caption: `Old Regime or New Regime? Put in your salary and deductions and see both, side by side, for FY 2026-27. For estimation only: consult a CA before you file. ${TAGS} #IncomeTax #NewTaxRegime`,
        claims: ['FY 2026-27 tax rules', 'PDF export'], sources: [SRC.app, SRC.slabs],
    });
    post('emi', {
        eyebrow: 'Home loan EMI', headline: 'Know your EMI *before the bank tells you.*',
        sub: 'Loan amount, rate and tenure in. EMI, total interest and the full schedule out.',
        points: ['Month-by-month amortisation', 'Total interest at a glance', 'Car, personal and education loans too'],
        stat: { label: `EMI on ${F('emi.principal')} at ${F('emi.rate')} for ${F('emi.tenure')}`, value: F('emi.emi') },
        screen: S('emi-2'),
        caption: `Before you sign the loan papers, see the EMI, the total interest and every month of the schedule. ${TAGS} #HomeLoan #EMI`,
        claims: [], sources: [SRC.app],
    });
    post('prepayment', {
        eyebrow: 'Prepayment planner', headline: 'Prepay now. *See what you save.*',
        sub: 'Test a part payment on your loan before you make it.',
        points: ['Interest saved, in rupees', 'How much sooner the loan ends', 'With and without prepayment'],
        stat: { label: 'Part payment of ₹5,00,000 after 3 years', value: F('foreclosure.interestSaved'), note: `Interest saved. Loan ends ${F('foreclosure.tenureReduced')}.` },
        screen: S('foreclosure'),
        caption: `Thinking of a part payment on your home loan? See the interest it saves and how much earlier you finish. ${TAGS} #HomeLoan #Prepayment`,
        claims: [], sources: [SRC.app],
    });
    post('sip', {
        eyebrow: 'SIP calculator', headline: 'Small SIP. *Big number.*',
        sub: 'See how a monthly investment can grow, year by year.',
        points: ['Growth chart by year', 'Invested amount vs returns', 'Step-up and goal SIP modes'],
        stat: { label: `${F('sip.monthly')} a month, ${F('sip.years')}, at ${F('sip.rate')}`, value: F('sip.maturity'), note: 'Illustration. Returns are not guaranteed.' },
        screen: S('sip'),
        caption: `What can ${F('sip.monthly')} a month become? Try your own amount, years and expected return. Illustration only: market returns are not guaranteed. ${TAGS} #SIP #MutualFunds`,
        claims: [], sources: [SRC.app],
    });
    post('fd', {
        eyebrow: 'FD calculator', headline: 'Your FD maturity, *to the rupee.*',
        sub: 'Enter the deposit, rate and tenure. See what you get back.',
        points: ['Maturity amount and interest earned', 'Compare compounding options', 'Inflation-adjusted return'],
        stat: { label: `${F('fd.principal')} for ${F('fd.tenure')} at ${F('fd.rate')}`, value: F('fd.maturity') },
        screen: S('fd'),
        caption: `Booking an FD? Check the maturity amount and the interest first. ${TAGS} #FixedDeposit #Savings`,
        claims: [], sources: [SRC.app],
    });
    post('rd', {
        eyebrow: 'RD calculator', headline: 'Save every month. *Watch it add up.*',
        sub: 'A recurring deposit, worked out before you start.',
        points: ['Maturity amount and interest', 'Goal mode: how much to deposit', 'Senior citizen rates'],
        stat: { label: `${F('rd.monthly')} a month for ${F('rd.tenureYears')} at ${F('rd.rate')}`, value: F('rd.maturity') },
        screen: S('rd'),
        caption: `A little every month adds up. See what your RD pays at maturity. ${TAGS} #RecurringDeposit #Savings`,
        claims: [], sources: [SRC.app],
    });
    post('ppf', {
        eyebrow: 'PPF calculator', headline: '15 years of PPF, *one clear timeline.*',
        sub: 'See your balance and the interest for every year.',
        points: ['Year-by-year balance', 'Interest earned each year', 'Deposits up to ₹1.5 lakh a year'],
        stat: { label: `${F('ppf.yearly')} a year for ${F('ppf.years')} at ${F('ppf.rate')}`, value: F('ppf.maturity') },
        screen: S('ppf'),
        caption: `PPF is a 15-year habit. See where it takes you, one year at a time. ${TAGS} #PPF #TaxSaving`,
        claims: [], sources: [SRC.app, SRC.ppfRate, SRC.ppfRules],
    });
    post('hra', {
        eyebrow: 'HRA calculator', headline: 'How much of your HRA is *tax-free?*',
        sub: 'The three-way HRA rule, worked out for you.',
        points: ['All three limits compared', 'Exempt and taxable HRA', 'Metro and non-metro cities'],
        stat: { label: 'Tax-free HRA a month in this example', value: F('hra.exempt') },
        screen: S('hra'), disclaimer: true,
        caption: `Paying rent? See how much of your HRA is exempt under the Old Regime. For estimation only: consult a CA. ${TAGS} #HRA #IncomeTax`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.hra],
    });
    post('gst', {
        eyebrow: 'GST calculator', headline: 'Add or remove GST *in one tap.*',
        sub: 'For bills, quotes and quick checks at the counter.',
        points: ['GST amount and final price', 'Add GST or take it out of a price', 'CGST and SGST split'],
        stat: { label: `${F('gst.base')} + ${F('gst.rate')} GST`, value: F('gst.total') },
        screen: S('gst'),
        caption: `Quick GST maths for bills and quotes: add it, or work backwards from the final price. ${TAGS} #GST #SmallBusiness`,
        claims: [], sources: [SRC.app],
    });
    post('expense-tracker', {
        eyebrow: 'Expense tracker', headline: 'Where did the salary go? *Now you know.*',
        sub: 'Log spends in seconds and see the month at a glance.',
        points: ['Budgets by category', 'Monthly and yearly reports', PRIVACY[0]],
        stat: { label: `Saved in ${F('expenses.month')} (sample data)`, value: F('expenses.savings') },
        screen: S('expenses-monthly'),
        caption: `Log a spend in seconds and see where the month went. ${PRIVACY[0]}. ${TAGS} #ExpenseTracker #Budgeting`,
        claims: [PRIVACY[0]], sources: ['Sample data shown in the app screen'],
    });
    post('yearly-report', {
        eyebrow: 'Yearly report', headline: 'Your whole year, *on one screen.*',
        sub: 'Spot the months and categories that cost you the most.',
        points: ['Month-by-month trend', 'Top spending categories', 'Export to PDF or Excel'],
        screen: S('expenses-yearly'),
        caption: `One screen for the whole year: trends, top categories, and a PDF or Excel copy when you need it. ${TAGS} #Budgeting #YearInReview`,
        claims: ['PDF and Excel export'], sources: ['Sample data shown in the app screen'],
    });
    post('goal-planner', {
        eyebrow: 'Goal planner', headline: 'Name the goal. *Get the monthly number.*',
        sub: 'Education, a home, a holiday: see what to invest each month.',
        points: ['Monthly investment needed', 'Inflation built in', 'Year-by-year projection'],
        stat: { label: `${F('goals.0.name')}: ${F('goals.0.target')} in ${F('goals.0.years')}`, value: `${F('goals.0.monthlyNeeded')} a month`, note: `With ${F('goals.0.inflation')} inflation, at an assumed ${F('goals.0.expectedReturn')}.` },
        screen: S('goal-planner'),
        caption: `A goal without a number is a wish. Put a date and an amount on it and see the monthly figure. ${TAGS} #FinancialGoals #Investing`,
        claims: [], sources: ['Sample goals shown in the app screen'],
    });
    post('smart-planner', {
        eyebrow: 'Smart planner', headline: 'A money check-up, *without the jargon.*',
        sub: 'Enter income, expenses and goals. Get a score and a plan.',
        points: ['Financial score out of 100', '50-30-20 budget split', 'Goal-wise SIP plan'],
        stat: { label: 'Financial score in this example', value: `${F('advisor.financialScore')} / 100` },
        screen: S('advisor'),
        caption: `A quick check-up for your money, in plain language. Estimates only, not financial advice. ${TAGS} #FinancialPlanning`,
        claims: [], sources: [SRC.app],
    });
    post('schemes', {
        eyebrow: 'Government schemes', headline: 'Schemes you may be *missing out on.*',
        sub: `${F('schemes.countShown')} central government schemes in one searchable list.`,
        points: ['Who is eligible', 'What the scheme pays', 'How to apply'],
        screen: S('schemes'),
        caption: `Central government schemes in one list, with eligibility, benefits and how to apply. Always confirm on the official scheme website. ${TAGS} #GovernmentSchemes`,
        claims: [], sources: ['Scheme list in the app (src/data/schemes.ts)'],
    });
    post('scheme-detail', {
        eyebrow: 'Scheme details', headline: 'Every scheme, *in plain words.*',
        sub: 'No circulars to decode. Just what you need to know.',
        points: ['Eligibility checklist', 'Benefits and amounts', 'Documents you need'],
        screen: S('scheme-detail'),
        caption: `Open any scheme and read it in plain words: eligibility, benefits, documents. Always confirm on the official website. ${TAGS} #GovernmentSchemes`,
        claims: [], sources: ['Scheme page in the app (src/data/schemes.ts)'],
    });
    post('world-clock', {
        eyebrow: 'World clock', headline: 'Family abroad? *Check the time first.*',
        sub: 'Your cities, side by side.',
        points: ['Cities across time zones', 'Clean, glanceable view', PRIVACY[3]],
        screen: S('world-clock'),
        caption: `Before you call: a quick look at the time where they are. ${TAGS} #WorldClock`,
        claims: [PRIVACY[3]], sources: ['App screen'],
    });
    post('pdf-excel', {
        eyebrow: 'PDF and Excel', headline: 'Take your numbers *with you.*',
        sub: 'Turn a calculation or a report into a file you can keep.',
        points: ['PDF reports to share', 'Excel sheets for your own analysis', 'Back up and restore your data'],
        screen: S('export-2'),
        caption: `Share a PDF with your CA or keep an Excel copy for yourself. ${TAGS} #Reports`,
        claims: ['PDF and Excel export'], sources: ['App screen'],
    });
    post('languages', {
        eyebrow: '6 languages', headline: 'Money maths in *your language.*',
        sub: 'Use every calculator in the language you think in.',
        points: ['English, हिंदी, తెలుగు', 'தமிழ், ಕನ್ನಡ, മലയാളം', 'Switch any time in Settings'],
        screen: S('settings-language'),
        caption: `English, Hindi, Telugu, Tamil, Kannada and Malayalam: switch any time in Settings. ${TAGS} #Vernacular #Bharat`,
        claims: ['6 languages'], sources: ['src/locales: en, hi, te, ta, kn, ml'],
    });
    post('privacy', {
        eyebrow: 'Your data', headline: PRIVACY[0].replace('stays on your device', '*stays on your device*'),
        points: [PRIVACY[1], PRIVACY[2], PRIVACY[3]],
        screen: S('data-privacy'),
        caption: `${PRIVACY.join('. ')}. ${TAGS}`,
        claims: PRIVACY, sources: ['Claims audit of build 22 (PLAY_DATA_SAFETY.md)'],
    });
    post('all-calculators', {
        eyebrow: '45+ calculators', headline: 'One app for *every money question.*',
        sub: 'Loans, tax, investments, savings and daily budgeting.',
        points: ['Search any calculator', 'Indian number format: lakhs and crores', 'Light and dark themes'],
        screen: S('home'),
        caption: `45+ calculators for loans, tax, investments and savings, in one app built for India. ${TAGS} #FinanceApp`,
        claims: ['45+ calculators', 'Light and dark themes'], sources: ['47 calculators in src/data/calculatorList.ts'],
    });

    // ── B. "Did you know" tips (1080×1080) ────────────────────────────────
    const tip = (topic, data) => add('social/tips', 'tip', topic, 1080, 1080, 'tip', {
        channel: 'Instagram / Facebook square', accent: 'gold', ...data,
    });
    tip('zero-tax-12-75-lakh', {
        figure: `${F('tax.zeroTaxNewRegimeTax')} tax`, headline: `on a salary of *${F('tax.zeroTaxSalary')}* in FY 2026-27`,
        sub: 'New Regime: income up to ₹12 lakh is tax-free after the rebate, and salaried people also get a ₹75,000 standard deduction.',
        sourceLine: 'Income-tax Act, 2025 (s.202, s.156, s.19); FinCalix', disclaimer: true,
        caption: `Did you know? Under the New Regime, a salaried person pays zero income tax up to ₹12.75 lakh in FY 2026-27. For estimation only: consult a CA. ${TAGS} #IncomeTax #NewTaxRegime`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.slabs, SRC.rebate, SRC.stdDed],
    });
    tip('standard-deduction', {
        figure: '₹75,000', headline: 'standard deduction in the *New Regime*',
        sub: 'Salaried people and pensioners get it without any proof. In the Old Regime it is ₹50,000.',
        sourceLine: 'Income-tax Act, 2025, section 19', disclaimer: true,
        caption: `The standard deduction is ₹75,000 in the New Regime and ₹50,000 in the Old Regime. For estimation only: consult a CA. ${TAGS} #IncomeTax`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.stdDed],
    });
    tip('ppf-eee', {
        figure: 'EEE', headline: 'PPF is tax-free *three times over*',
        sub: 'Deposits qualify for a deduction in the Old Regime, the interest is tax-free and so is the maturity amount. Current rate: 7.1% a year.',
        sourceLine: 'National Savings Institute; India Post (30 Oct 2026)', disclaimer: true,
        caption: `PPF: deduction on deposits (Old Regime), tax-free interest, tax-free maturity. Rate for Oct to Dec 2026: 7.1%. For estimation only: consult a CA. ${TAGS} #PPF #TaxSaving`,
        claims: [], sources: [SRC.ppfRate, SRC.ppfRules],
    });
    tip('section-123-limit', {
        figure: '₹1.5 lakh', headline: 'is the yearly limit under *Section 123* (earlier 80C)',
        sub: 'PPF, ELSS, EPF, life insurance and home-loan principal all share this one limit. Old Regime only.',
        sourceLine: 'Income-tax Act, 2025, section 123', disclaimer: true,
        caption: `One limit, many options: ₹1.5 lakh a year under Section 123 (earlier 80C), in the Old Regime. For estimation only: consult a CA. ${TAGS} #TaxSaving`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.s123],
    });
    tip('emi-to-income', {
        figure: '40%', headline: 'A common thumb rule for *all your EMIs together*',
        sub: `Many lenders like total EMIs to stay within about 40% of take-home pay. For scale: ${F('emi.principal')} at ${F('emi.rate')} for ${F('emi.tenure')} is an EMI of ${F('emi.emi')}.`,
        sourceLine: 'Lender thumb rule, not an official limit; EMI from FinCalix',
        caption: `A thumb rule many lenders use: keep all your EMIs within about 40% of take-home pay. Not an official limit. ${TAGS} #HomeLoan #EMI`,
        claims: [], sources: [SRC.thumb, SRC.app],
    });
    tip('sip-compounding', {
        figure: F('sip.maturity'), headline: `from *${F('sip.monthly')} a month* for ${F('sip.years')}`,
        sub: `You put in ${F('sip.invested')}. At an assumed ${F('sip.rate')} a year, the rest is growth. Returns are not guaranteed.`,
        sourceLine: 'FinCalix SIP calculator (illustration)',
        caption: `Compounding, in one number. Illustration at an assumed ${F('sip.rate')}: market returns are not guaranteed. ${TAGS} #SIP #Compounding`,
        claims: [], sources: [SRC.app],
    });
    tip('sip-time', {
        figure: F('sipExtra.y25'), headline: 'Time does the *heavy lifting*',
        sub: `${F('sip.monthly')} a month at an assumed ${F('sip.rate')}: ${F('sipExtra.y10')} in 10 years, ${F('sipExtra.y20')} in 20 years, ${F('sipExtra.y25')} in 25 years.`,
        sourceLine: 'FinCalix SIP calculator (illustration; returns are not guaranteed)',
        caption: `Same SIP, more years. Illustration only: returns are not guaranteed. ${TAGS} #SIP #LongTermInvesting`,
        claims: [], sources: [SRC.app],
    });
    tip('prepayment-saving', {
        figure: F('foreclosure.interestSaved'), headline: 'of interest saved by *one part payment*',
        sub: `₹5,00,000 paid after 3 years on a ${F('emi.principal')} loan at ${F('emi.rate')} for ${F('emi.tenure')}: the loan ends ${F('foreclosure.tenureReduced')}. Lenders cannot charge a prepayment fee on floating-rate loans to individuals.`,
        sourceLine: 'FinCalix; RBI (Pre-payment Charges on Loans) Directions, 2025',
        caption: `One part payment can cut a lot of interest. On floating-rate loans to individuals for non-business purposes, RBI rules bar prepayment charges. ${TAGS} #HomeLoan #Prepayment`,
        claims: [], sources: [SRC.app, SRC.rbi],
    });
    tip('health-insurance-deduction', {
        figure: '₹25,000', headline: 'deduction for *health insurance* premiums',
        sub: '₹50,000 if you are a senior citizen. Section 126 (earlier 80D), Old Regime only.',
        sourceLine: 'Income-tax Act, 2025, section 126', disclaimer: true,
        caption: `Health insurance premiums: up to ₹25,000 deduction (₹50,000 for senior citizens) in the Old Regime. For estimation only: consult a CA. ${TAGS} #HealthInsurance #TaxSaving`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.s126],
    });
    tip('hra-exemption', {
        figure: F('hra.exempt'), headline: 'of HRA a month is *tax-free* in this example',
        sub: 'Basic ₹60,000, HRA ₹24,000 and rent ₹22,000 a month in a metro. The exemption is the lowest of three amounts. Old Regime only.',
        sourceLine: 'FinCalix; Income-tax Rules, 2026, Rule 279', disclaimer: true,
        caption: `HRA exemption is the lowest of three amounts. Try your own salary and rent. For estimation only: consult a CA. ${TAGS} #HRA #IncomeTax`,
        claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.hra],
    });

    // ── C. Carousels (3 × 5 slides, 1080×1350) ────────────────────────────
    const slide = (series, n, layout, data) => add('social/carousels', 'carousel', `${series}-${n}`, 1080, 1350, layout, {
        channel: `Instagram / LinkedIn carousel "${series}", slide ${n} of 5`, count: `${n}/5`, ...data,
    });
    const cta = (series, caption) => slide(series, 5, 'center', {
        headline: 'Run *your own numbers* in FinCalix', sub: '45+ calculators. Free. No login.',
        badge: true, url: 'fincalix.com', legal: TRADEMARK, caption,
        claims: ['45+ calculators', 'Free', 'No login'], sources: [SRC.badge],
    });

    const taxCap = `Old Regime or New Regime? A worked example on a ${F('tax.salary')} salary for FY 2026-27. For estimation only: consult a CA. ${TAGS} #IncomeTax #NewTaxRegime`;
    slide('old-vs-new-regime', 1, 'hook', {
        eyebrow: 'Income tax · FY 2026-27', headline: 'Old Regime or New Regime: *which one saves you more?*',
        sub: `A worked example on a ${F('tax.salary')} salary.`, disclaimer: true,
        caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.slabs],
    });
    slide('old-vs-new-regime', 2, 'post', {
        eyebrow: 'Step 1', headline: 'Enter your salary', sub: 'Annual salary and how you are employed. That is all the New Regime needs.',
        points: ['FY 2026-27 slabs built in', '₹75,000 standard deduction applied'], screen: S('tax-2'), disclaimer: true,
        caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.stdDed],
    });
    slide('old-vs-new-regime', 3, 'post', {
        eyebrow: 'Step 2', headline: 'Add your deductions', sub: 'For the Old Regime. This example: ₹1.5 lakh of investments, ₹25,000 health insurance, ₹2 lakh home-loan interest.',
        points: ['Section 123 (earlier 80C)', 'Health insurance, home loan, HRA'], screen: S('tax-3'), disclaimer: true,
        caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.s123, SRC.s126],
    });
    slide('old-vs-new-regime', 4, 'post', {
        eyebrow: 'Step 3', headline: 'Compare *both regimes*', sub: 'Side by side, with the difference worked out.',
        points: [`New Regime: ${F('tax.newRegimeTax')}`, `Old Regime: ${F('tax.oldRegimeTax')}`],
        stat: { label: 'Better for this example', value: F('tax.betterRegime'), note: `Saves ${F('tax.saving')}` }, screen: S('tax'), disclaimer: true,
        caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app],
    });
    cta('old-vs-new-regime', taxCap);

    const loanCap = `Should you prepay your home loan? A worked example on ${F('emi.principal')} at ${F('emi.rate')} for ${F('emi.tenure')}. ${TAGS} #HomeLoan #Prepayment`;
    slide('should-you-prepay', 1, 'hook', {
        eyebrow: 'Home loan', headline: 'Should you *prepay* your home loan?',
        sub: `A worked example: ${F('emi.principal')} at ${F('emi.rate')} for ${F('emi.tenure')}.`,
        caption: loanCap, claims: [], sources: [SRC.app],
    });
    slide('should-you-prepay', 2, 'post', {
        eyebrow: 'Step 1', headline: 'Start with your EMI', sub: 'See what the loan costs if you change nothing.',
        points: [`Total interest: ${F('emi.totalInterest')}`, `Total you repay: ${F('emi.totalPayment')}`],
        stat: { label: 'Monthly EMI', value: F('emi.emi') }, screen: S('emi-2'),
        caption: loanCap, claims: [], sources: [SRC.app],
    });
    slide('should-you-prepay', 3, 'post', {
        eyebrow: 'Step 2', headline: 'See where each EMI goes', sub: 'In the early years most of it is interest. That is why early prepayment works.',
        points: ['Principal and interest, month by month', 'Outstanding balance after every EMI'], screen: S('emi-amortisation'),
        caption: loanCap, claims: [], sources: [SRC.app],
    });
    slide('should-you-prepay', 4, 'post', {
        eyebrow: 'Step 3', headline: 'Test a *part payment*', sub: `₹5,00,000 paid after 3 years. The loan ends ${F('foreclosure.tenureReduced')}.`,
        points: ['No prepayment fee on floating-rate loans to individuals (RBI)'],
        stat: { label: 'Interest saved', value: F('foreclosure.interestSaved') }, screen: S('foreclosure'),
        caption: loanCap, claims: [], sources: [SRC.app, SRC.rbi],
    });
    cta('should-you-prepay', loanCap);

    const sipCap = `How a ${F('sip.monthly')} SIP grows, at an assumed ${F('sip.rate')} a year. Illustration only: returns are not guaranteed. ${TAGS} #SIP #Compounding`;
    slide('how-a-sip-grows', 1, 'hook', {
        eyebrow: 'SIP', headline: `How a *${F('sip.monthly')} SIP* grows`,
        sub: `Month after month, at an assumed ${F('sip.rate')} a year.`,
        caption: sipCap, claims: [], sources: [SRC.app],
    });
    slide('how-a-sip-grows', 2, 'post', {
        eyebrow: 'Step 1', headline: 'Set amount, years and return', sub: 'Three inputs. Change any of them and the result updates.',
        points: [`${F('sip.monthly')} a month`, `${F('sip.years')} at ${F('sip.rate')}`], screen: S('sip-2'),
        caption: sipCap, claims: [], sources: [SRC.app],
    });
    slide('how-a-sip-grows', 3, 'post', {
        eyebrow: 'Step 2', headline: `After *${F('sip.years')}*`, sub: 'What you put in, and what it could become.',
        points: [`You invest ${F('sip.invested')}`, `Growth: ${F('sip.returns')}`],
        stat: { label: 'Estimated value', value: F('sip.maturity'), note: 'Returns are not guaranteed.' }, screen: S('sip'),
        caption: sipCap, claims: [], sources: [SRC.app],
    });
    slide('how-a-sip-grows', 4, 'post', {
        eyebrow: 'Step 3', headline: 'Now give it *more time*', sub: 'The same SIP, left alone for longer.',
        points: [`10 years: ${F('sipExtra.y10')}`, `20 years: ${F('sipExtra.y20')}`],
        stat: { label: '25 years', value: F('sipExtra.y25'), note: 'Returns are not guaranteed.' }, screen: S('sip-3'),
        caption: sipCap, claims: [], sources: [SRC.app],
    });
    cta('how-a-sip-grows', sipCap);

    // ── D. Language posts (1080×1350), each written in its language ───────
    const langCopy = [
        ['en', 'English', 'FinCalix now speaks *your language*', 'Use every calculator in the language you think in.', ['6 Indian languages', 'Switch any time in Settings', 'The same accurate maths']],
        ['hi', 'हिंदी', 'FinCalix अब *आपकी भाषा* में', 'हर कैलकुलेटर उसी भाषा में, जिसमें आप सोचते हैं।', ['6 भारतीय भाषाएँ', 'सेटिंग्स में कभी भी बदलें', 'वही सटीक गणना']],
        ['te', 'తెలుగు', 'FinCalix ఇప్పుడు *మీ భాషలో*', 'ప్రతి కాలిక్యులేటర్ మీకు నచ్చిన భాషలోనే.', ['6 భారతీయ భాషలు', 'సెట్టింగ్‌లలో ఎప్పుడైనా మార్చుకోండి', 'అదే ఖచ్చితమైన లెక్క']],
        ['ta', 'தமிழ்', 'FinCalix இப்போது *உங்கள் மொழியில்*', 'ஒவ்வொரு கால்குலேட்டரும் நீங்கள் விரும்பும் மொழியில்.', ['6 இந்திய மொழிகள்', 'அமைப்புகளில் எப்போதும் மாற்றலாம்', 'அதே துல்லியமான கணக்கு']],
        ['kn', 'ಕನ್ನಡ', 'FinCalix ಈಗ *ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ*', 'ಪ್ರತಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ನಿಮಗೆ ಇಷ್ಟವಾದ ಭಾಷೆಯಲ್ಲೇ.', ['6 ಭಾರತೀಯ ಭಾಷೆಗಳು', 'ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಿ', 'ಅದೇ ನಿಖರ ಲೆಕ್ಕ']],
        ['ml', 'മലയാളം', 'FinCalix ഇപ്പോൾ *നിങ്ങളുടെ ഭാഷയിൽ*', 'ഓരോ കാൽക്കുലേറ്ററും നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഭാഷയിൽ.', ['6 ഇന്ത്യൻ ഭാഷകൾ', 'ക്രമീകരണങ്ങളിൽ എപ്പോൾ വേണമെങ്കിലും മാറ്റാം', 'അതേ കൃത്യമായ കണക്ക്']],
    ];
    for (const [lang, native, headline, sub, points] of langCopy) {
        add('social/languages', 'language', lang, 1080, 1350, 'post', {
            lang, channel: `Instagram / Facebook post (${native})`, eyebrow: native, headline, sub, points,
            screen: S('home', { lang }),
            caption: `${headline.replace(/\*/g, '')} ${sub} ${TAGS} #${native.replace(/\s/g, '')}`,
            claims: ['6 languages'], sources: ['src/locales: en, hi, te, ta, kn, ml'],
        });
    }

    // ── E. Launch and brand ───────────────────────────────────────────────
    add('social/launch', 'launch', 'announcement', 1080, 1350, 'post', {
        channel: 'Instagram / Facebook post', lockupNote: 'Free on Google Play',
        eyebrow: 'Now on Google Play', headline: 'Meet FinCalix. *Money maths, made simple.*',
        sub: '45+ calculators for loans, tax, savings and investments, built for India.',
        points: ['Income tax for FY 2026-27', 'EMI, SIP, PPF, FD and more', 'Free. No login. No ads.'], screen: S('home'),
        caption: `Meet FinCalix: 45+ calculators for loans, tax, savings and investments, built for India. Free on Google Play. ${TAGS} #NewApp #MadeInIndia`,
        claims: ['45+ calculators', 'FY 2026-27 tax rules', 'Free', 'No login', 'No ads'], sources: ['47 calculators in src/data/calculatorList.ts'],
    });
    add('social/launch', 'launch', 'made-in-india', 1080, 1080, 'center', {
        channel: 'Instagram / Facebook square', tricolour: true,
        headline: 'Made in India, *for Indian money decisions*',
        sub: '₹ in lakhs and crores · 6 Indian languages · FY 2026-27 tax rules', url: 'fincalix.com',
        caption: `Built in India for the way India counts: lakhs and crores, six Indian languages, and this year's tax rules. ${TAGS} #MadeInIndia`,
        claims: ['Made in India', '6 languages', 'FY 2026-27 tax rules'], sources: ['"Made in India" statement in the app (dataSafety.footerMade)'],
    });
    add('social/launch', 'launch', 'privacy-offline', 1080, 1350, 'post', {
        channel: 'Instagram / Facebook post',
        eyebrow: 'Your data', headline: PRIVACY[0].replace('stays on your device', '*stays on your device*'),
        points: [PRIVACY[1], PRIVACY[2], PRIVACY[3]], screen: S('data-privacy', { theme: 'light' }),
        caption: `${PRIVACY.join('. ')}. ${TAGS}`,
        claims: PRIVACY, sources: ['Claims audit of build 22 (PLAY_DATA_SAFETY.md)'],
    });
    add('social/launch', 'launch', 'google-play', 1080, 1080, 'center', {
        channel: 'Instagram / Facebook square',
        headline: '45+ finance calculators. *One app.*', sub: 'Available on Google Play',
        badge: true, legal: TRADEMARK, url: 'fincalix.com',
        caption: `FinCalix is available on Google Play. ${TAGS}`,
        claims: ['45+ calculators'], sources: [SRC.badge],
    });
    add('social/launch', 'launch', 'website', 1600, 900, 'wide', {
        channel: 'X / website banner',
        eyebrow: 'On the web', headline: 'See everything *FinCalix* can do',
        sub: 'Guides, calculators and the app link in one place.',
        stat: { label: 'Visit', value: 'fincalix.com' }, screen: S('home', { theme: 'light' }),
        caption: `Everything about FinCalix, in one place: fincalix.com ${TAGS}`,
        claims: [], sources: ['fincalix.com'],
    });

    // ── F. Channel variants ───────────────────────────────────────────────
    const story = (topic, data) => add('social/stories', 'story', topic, 1080, 1920, 'story', { channel: 'Story / Reel cover / WhatsApp status', ...data });
    story('income-tax', { eyebrow: 'Income tax · FY 2026-27', headline: 'Old or New Regime? *Know in seconds.*', sub: 'Both regimes, side by side.', screen: S('tax'), disclaimer: true, caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.slabs] });
    story('emi', { eyebrow: 'Home loan EMI', headline: `${F('emi.principal')} loan. *EMI ${F('emi.emi')}.*`, sub: `${F('emi.rate')} for ${F('emi.tenure')}. Try your own numbers.`, screen: S('emi-2'), caption: loanCap, claims: [], sources: [SRC.app] });
    story('prepayment', { eyebrow: 'Prepayment planner', headline: 'Prepay now. *See what you save.*', sub: `${F('foreclosure.interestSaved')} of interest saved in this example.`, screen: S('foreclosure'), caption: loanCap, claims: [], sources: [SRC.app] });
    story('sip', { eyebrow: 'SIP calculator', headline: `${F('sip.monthly')} a month. *${F('sip.maturity')}.*`, sub: `${F('sip.years')} at an assumed ${F('sip.rate')}. Not guaranteed.`, screen: S('sip'), caption: sipCap, claims: [], sources: [SRC.app] });
    story('ppf', { eyebrow: 'PPF calculator', headline: '15 years of PPF, *one clear timeline.*', sub: `${F('ppf.yearly')} a year becomes ${F('ppf.maturity')}.`, screen: S('ppf'), caption: `PPF, year by year. ${TAGS} #PPF`, claims: [], sources: [SRC.app, SRC.ppfRate] });
    story('expense-tracker', { eyebrow: 'Expense tracker', headline: 'Where did the salary go? *Now you know.*', sub: 'Budgets, categories, monthly reports.', screen: S('expenses-monthly'), caption: `See where the month went. ${TAGS} #Budgeting`, claims: [], sources: ['Sample data shown in the app screen'] });
    story('goal-planner', { eyebrow: 'Goal planner', headline: 'Name the goal. *Get the monthly number.*', sub: 'Education, a home, a holiday.', screen: S('goal-planner'), caption: `Put a number on your goal. ${TAGS} #FinancialGoals`, claims: [], sources: ['Sample goals shown in the app screen'] });
    story('schemes', { eyebrow: 'Government schemes', headline: 'Schemes you may be *missing out on.*', sub: 'Eligibility, benefits, how to apply.', screen: S('schemes'), caption: `Central government schemes in one list. ${TAGS} #GovernmentSchemes`, claims: [], sources: ['Scheme list in the app'] });
    story('languages', { eyebrow: '6 languages', headline: 'Money maths in *your language.*', sub: 'English, हिंदी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം', screen: S('settings-language'), caption: `Six languages, one app. ${TAGS}`, claims: ['6 languages'], sources: ['src/locales'] });
    story('privacy', { eyebrow: 'Your data', headline: PRIVACY[0].replace('stays on your device', '*stays on your device*'), sub: 'No login. No ads. Works offline.', screen: S('data-privacy'), caption: `${PRIVACY.join('. ')}. ${TAGS}`, claims: PRIVACY, sources: ['Claims audit of build 22'] });

    const li = (topic, data) => add('social/linkedin', 'linkedin', topic, 1200, 627, 'wide', { channel: 'LinkedIn', ...data });
    li('income-tax', { eyebrow: 'Income tax · FY 2026-27', headline: 'Old or New Regime? *Compare both in seconds.*', sub: 'Salary and deductions in. Both regimes out, side by side.', screen: S('tax'), disclaimer: true, caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.slabs] });
    li('prepayment', { eyebrow: 'Home loan', headline: 'One part payment. *A much smaller interest bill.*', sub: `₹5,00,000 after 3 years on a ${F('emi.principal')} home loan.`, stat: { label: 'Interest saved', value: F('foreclosure.interestSaved') }, screen: S('foreclosure'), caption: loanCap, claims: [], sources: [SRC.app] });
    li('expense-tracker', { eyebrow: 'Expense tracker', headline: 'Know where the salary went, *every month.*', sub: 'Budgets by category, monthly and yearly reports, PDF and Excel export.', screen: S('expenses-monthly'), caption: `A clear monthly picture of your spending, with PDF and Excel export. ${TAGS} #Budgeting`, claims: ['PDF and Excel export'], sources: ['Sample data shown in the app screen'] });

    const x = (topic, data) => add('social/x', 'x', topic, 1600, 900, 'wide', { channel: 'X / Twitter', ...data });
    x('sip', { eyebrow: 'SIP calculator', headline: `${F('sip.monthly')} a month for ${F('sip.years')}: *${F('sip.maturity')}*`, sub: `At an assumed ${F('sip.rate')} a year. Returns are not guaranteed.`, screen: S('sip'), caption: sipCap, claims: [], sources: [SRC.app] });
    x('zero-tax', { eyebrow: 'Income tax · FY 2026-27', headline: `${F('tax.zeroTaxNewRegimeTax')} tax on a salary of *${F('tax.zeroTaxSalary')}*`, sub: 'New Regime: ₹12 lakh rebate limit plus the ₹75,000 standard deduction.', screen: S('tax-zero'), disclaimer: true, caption: `Zero income tax up to ₹12.75 lakh of salary under the New Regime in FY 2026-27. For estimation only: consult a CA. ${TAGS} #IncomeTax`, claims: ['FY 2026-27 tax rules'], sources: [SRC.app, SRC.slabs, SRC.rebate, SRC.stdDed] });
    x('all-calculators', { eyebrow: '45+ calculators', headline: 'One app for *every money question*', sub: 'No login. No ads. Works offline.', screen: S('calculators'), caption: `45+ calculators. ${PRIVACY.slice(1).join('. ')}. ${TAGS}`, claims: ['45+ calculators', ...PRIVACY.slice(1)], sources: ['47 calculators in src/data/calculatorList.ts'] });

    const yt = (topic, data) => add('social/youtube', 'youtube', topic, 1280, 720, 'wide', { channel: 'YouTube thumbnail', big: true, ...data });
    yt('old-vs-new-regime', { headline: 'Old vs New Regime: *which saves more?*', screen: S('tax'), disclaimer: true, caption: taxCap, claims: ['FY 2026-27 tax rules'], sources: [SRC.app] });
    yt('sip-growth', { headline: `${F('sip.monthly')} SIP → *${F('sip.maturity')}*`, screen: S('sip'), caption: sipCap, claims: [], sources: [SRC.app] });
    yt('prepay-home-loan', { headline: 'Prepay your home loan? *Do the maths first*', screen: S('foreclosure'), caption: loanCap, claims: [], sources: [SRC.app] });

    return items;
}
