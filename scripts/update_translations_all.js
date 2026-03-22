import fs from 'fs';

const data = {
    en: {
        salaryHike: "Salary Hike",
        ppf: "PPF",
        goalPlanner: "Goal Planner",
        financialAdvisor: "Financial Advisor",
        property: "Property",
        creditCard: "Credit Card"
    },
    hi: {
        salaryHike: "वेतन वृद्धि",
        ppf: "पीपीएफ",
        goalPlanner: "लक्ष्य योजनाकार",
        financialAdvisor: "वित्तीय सलाहकार",
        property: "संपत्ति",
        creditCard: "क्रेडिट कार्ड"
    },
    kn: {
        salaryHike: "ಸಂಬಳ ಹೆಚ್ಚಳ",
        ppf: "ಪಿಪಿಎಫ್",
        goalPlanner: "ಗುರಿ ಯೋಜಕ",
        financialAdvisor: "ಆರ್ಥಿಕ ಸಲಹೆಗಾರ",
        property: "ಆಸ್ತಿ",
        creditCard: "ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್"
    },
    ml: {
        salaryHike: "ശമ്പള വർദ്ധനവ്",
        ppf: "പി.പി.എഫ്",
        goalPlanner: "ലക്ഷ്യ പ്ലാനർ",
        financialAdvisor: "സാമ്പത്തിക ഉപദേശകൻ",
        property: "വസ്തു",
        creditCard: "ക്രെഡിറ്റ് കാർഡ്"
    },
    ta: {
        salaryHike: "சம்பள உயர்வு",
        ppf: "பி.பி.எஃப்",
        goalPlanner: "இலக்கு திட்டமிடுபவர்",
        financialAdvisor: "நிதி ஆலோசகர்",
        property: "சொத்து",
        creditCard: "கிரெடிட் கார்டு"
    },
    te: {
        salaryHike: "జీతం పెంపు",
        ppf: "పీపీఎఫ్",
        goalPlanner: "లక్ష్య ప్రణాళిక",
        financialAdvisor: "ఆర్థిక సలహాదారు",
        property: "ఆస్తి",
        creditCard: "క్రెడిట్ కార్డ్"
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
    if (!content.calculators.salaryHike) content.calculators.salaryHike = {};
    if (!content.calculators.salaryHike.name) content.calculators.salaryHike.name = data[lang].salaryHike;

    if (!content.calculators.ppf) content.calculators.ppf = {};
    if (!content.calculators.ppf.name) content.calculators.ppf.name = data[lang].ppf;

    if (!content.calculators.goalPlanner) content.calculators.goalPlanner = {};
    if (!content.calculators.goalPlanner.name) content.calculators.goalPlanner.name = data[lang].goalPlanner;

    if (!content.calculators.financialAdvisor) content.calculators.financialAdvisor = {};
    if (!content.calculators.financialAdvisor.name) content.calculators.financialAdvisor.name = data[lang].financialAdvisor;

    if (!content.calculators.property) content.calculators.property = {};
    if (!content.calculators.property.name) content.calculators.property.name = data[lang].property;

    if (!content.expenses) content.expenses = {};
    if (!content.expenses.paymentMethods) content.expenses.paymentMethods = {};
    if (!content.expenses.paymentMethods['Credit Card']) content.expenses.paymentMethods['Credit Card'] = data[lang].creditCard;

    // Overwrite existing names just to be extremely sure they're correct
    content.calculators.salaryHike.name = data[lang].salaryHike;
    content.calculators.ppf.name = data[lang].ppf;
    content.calculators.goalPlanner.name = data[lang].goalPlanner;
    content.calculators.financialAdvisor.name = data[lang].financialAdvisor;
    content.calculators.property.name = data[lang].property;
    content.expenses.paymentMethods['Credit Card'] = data[lang].creditCard;

    fs.writeFileSync(file, JSON.stringify(content, null, 4));
    console.log(`Updated ${lang}.json`);
}
