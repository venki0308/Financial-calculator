import fs from 'fs';

const data = {
    en: {
        personalLoanName: "Personal Loan",
        personalLoanDesc: "Calculate EMI and interest for personal loans",
        educationLoanName: "Education Loan",
        educationLoanDesc: "Calculate EMI, interest, and tax benefits for education loans",
        scientificName: "Scientific Calculator",
        scientificDesc: "Advanced mathematical functions and calculations",
        netWorth: "Net Worth",
        updateNetWorth: "Update Net Worth",
        totalAssets: "Total Assets",
        totalLiabilities: "Total Liabilities",
        assets: "Assets",
        liabilities: "Liabilities"
    },
    hi: {
        personalLoanName: "व्यक्तिगत ऋण",
        personalLoanDesc: "व्यक्तिगत ऋण के लिए ईएमआई और ब्याज की गणना करें",
        educationLoanName: "शिक्षा ऋण",
        educationLoanDesc: "शिक्षा ऋण के लिए ईएमआई, ब्याज और कर लाभ की गणना करें",
        scientificName: "वैज्ञानिक कैलकुलेटर",
        scientificDesc: "उन्नत गणितीय कार्य और गणनाएँ",
        netWorth: "कुल संपत्ति",
        updateNetWorth: "नेट वर्थ अपडेट करें",
        totalAssets: "कुल संपत्ति",
        totalLiabilities: "कुल देनदारियां",
        assets: "संपत्ति",
        liabilities: "देनदारियां"
    },
    kn: {
        personalLoanName: "ವೈಯಕ್ತಿಕ ಸಾಲ",
        personalLoanDesc: "ವೈಯಕ್ತಿಕ ಸಾಲಗಳಿಗೆ ಇಎಂಐ ಮತ್ತು ಬಡ್ಡಿಯನ್ನು ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ",
        educationLoanName: "ಶಿಕ್ಷಣ ಸಾಲ",
        educationLoanDesc: "ಶಿಕ್ಷಣ ಸಾಲಗಳಿಗೆ ಇಎಂಐ, ಬಡ್ಡಿ ಮತ್ತು ತೆರಿಗೆ ಪ್ರಯೋಜನಗಳನ್ನು ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ",
        scientificName: "ವೈಜ್ಞಾನಿಕ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        scientificDesc: "ಸುಧಾರಿತ ಗಣಿತ ಕಾರ್ಯಗಳು ಮತ್ತು ಲೆಕ್ಕಾಚಾರಗಳು",
        netWorth: "ನಿವ್ವಳ ಮೌಲ್ಯ",
        updateNetWorth: "ನಿವ್ವಳ ಮೌಲ್ಯ ನವೀಕರಿಸಿ",
        totalAssets: "ಒಟ್ಟು ಆಸ್ತಿಗಳು",
        totalLiabilities: "ಒಟ್ಟು ಹೊಣೆಗಾರಿಕೆಗಳು",
        assets: "ಆಸ್ತಿಗಳು",
        liabilities: "ಹೊಣೆಗಾರಿಕೆಗಳು"
    },
    ml: {
        personalLoanName: "വ്യക്തിഗത വായ്പ",
        personalLoanDesc: "വ്യക്തിഗത വായ്പകൾക്കുള്ള ഇഎംഐയും പലിശയും കണക്കാക്കുക",
        educationLoanName: "വിദ്യാഭ്യാസ വായ്പ",
        educationLoanDesc: "വിദ്യാഭ്യാസ വായ്പകൾക്കുള്ള ഇഎംഐ, പലിശ, നികുതി ആനുകൂല്യങ്ങൾ എന്നിവ കണക്കാക്കുക",
        scientificName: "സയൻ്റിഫിക് കാൽക്കുലേറ്റർ",
        scientificDesc: "വിപുലമായ ഗണിതശാസ്ത്ര പ്രവർത്തനങ്ങളും കണക്കുകൂട്ടലുകളും",
        netWorth: "അറ്റമൂല്യം",
        updateNetWorth: "അറ്റമൂല്യം അപ്ഡേറ്റ് ചെയ്യുക",
        totalAssets: "ആകെ ആസ്തികൾ",
        totalLiabilities: "ആകെ ബാധ്യതകൾ",
        assets: "ആസ്തികൾ",
        liabilities: "ബാധ്യതകൾ"
    },
    ta: {
        personalLoanName: "தனிநபர் கடன்",
        personalLoanDesc: "தனிநபர் கடன்களுக்கான EMI மற்றும் வட்டியை கணக்கிடுங்கள்",
        educationLoanName: "கல்வி கடன்",
        educationLoanDesc: "கல்வி கடன்களுக்கான EMI, வட்டி மற்றும் வரி சலுகைகளை கணக்கிடுங்கள்",
        scientificName: "அறிவியல் கால்குலேட்டர்",
        scientificDesc: "மேம்பட்ட கணித செயல்பாடுகள் மற்றும் கணக்கீடுகள்",
        netWorth: "நிகர மதிப்பு",
        updateNetWorth: "நிகர மதிப்பை புதுப்பிக்கவும்",
        totalAssets: "மொத்த சொத்துக்கள்",
        totalLiabilities: "மொத்த பொறுப்புகள்",
        assets: "சொத்துக்கள்",
        liabilities: "பொறுப்புகள்"
    },
    te: {
        personalLoanName: "వ్యక్తిగత రుణం",
        personalLoanDesc: "వ్యక్తిగత రుణాల కోసం EMI మరియు వడ్డీని లెక్కించండి",
        educationLoanName: "విద్యా రుణం",
        educationLoanDesc: "విద్యా రుణాల కోసం EMI, వడ్డీ మరియు పన్ను ప్రయోజనాలను లెక్కించండి",
        scientificName: "సైంటిఫిక్ కాలిక్యులేటర్",
        scientificDesc: "అధునాతన గణిత విధులు మరియు లెక్కలు",
        netWorth: "నికర విలువ",
        updateNetWorth: "నికర విలువ నవీకరించండి",
        totalAssets: "మొత్తం ఆస్తులు",
        totalLiabilities: "మొత్తం అప్పులు",
        assets: "ఆస్తులు",
        liabilities: "అప్పులు"
    }
};

const langs = Object.keys(data);

for (const lang of langs) {
    const file = `d:/Skills/Financial-calculator/src/locales/${lang}.json`;
    let content = {};
    try {
        content = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${file}`);
        continue;
    }

    if (!content.calculators) content.calculators = {};
    if (!content.calculators.personalLoan) content.calculators.personalLoan = {};
    content.calculators.personalLoan.name = data[lang].personalLoanName;
    content.calculators.personalLoan.desc = data[lang].personalLoanDesc;

    if (!content.calculators.educationLoan) content.calculators.educationLoan = {};
    content.calculators.educationLoan.name = data[lang].educationLoanName;
    content.calculators.educationLoan.desc = data[lang].educationLoanDesc;

    if (!content.calculators.scientific) content.calculators.scientific = {};
    content.calculators.scientific.name = data[lang].scientificName;
    content.calculators.scientific.desc = data[lang].scientificDesc;

    if (!content.expenses) content.expenses = {};
    content.expenses.netWorth = data[lang].netWorth;
    content.expenses.updateNetWorth = data[lang].updateNetWorth;
    content.expenses.totalAssets = data[lang].totalAssets;
    content.expenses.totalLiabilities = data[lang].totalLiabilities;
    content.expenses.assets = data[lang].assets;
    content.expenses.liabilities = data[lang].liabilities;

    fs.writeFileSync(file, JSON.stringify(content, null, 4));
    console.log(`Updated ${lang}.json`);
}
