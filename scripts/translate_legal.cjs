const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const languages = ['en', 'hi', 'ta', 'te', 'ml', 'kn'];

const translations = {
  about: {
    en: {
      title: "About the App",
      referenceToolTitle: "Reference Tool",
      referenceToolDesc: "This application is designed as a companion tool for Indian citizens to explore government schemes and perform financial projections.",
      dataAccuracyTitle: "Data Accuracy",
      dataAccuracyDesc: "We strive to provide the most accurate and up-to-date information for 2026. However, interest rates and scheme rules change frequently.",
      officialSourcesTitle: "Official Sources",
      officialSourcesDesc: "All calculations and scheme details are based on publicly available data from official portals like india.gov.in, npsc.gov.in, etc.",
      keyResources: "Key Resources",
      madeWithLove: "Made with ❤️ in India"
    },
    hi: {
      title: "ऐप के बारे में",
      referenceToolTitle: "संदर्भ उपकरण",
      referenceToolDesc: "यह एप्लिकेशन भारतीय नागरिकों के लिए सरकारी योजनाओं का पता लगाने और वित्तीय अनुमान लगाने के लिए एक साथी उपकरण के रूप में बनाया गया है।",
      dataAccuracyTitle: "डेटा सटीकता",
      dataAccuracyDesc: "हम 2026 के लिए सबसे सटीक और अद्यतित जानकारी प्रदान करने का प्रयास करते हैं। हालांकि, ब्याज दरें और योजना के नियम अक्सर बदलते रहते हैं।",
      officialSourcesTitle: "आधिकारिक स्रोत",
      officialSourcesDesc: "सभी गणनाएं और योजना विवरण india.gov.in, npsc.gov.in आदि आधिकारिक पोर्टलों से सार्वजनिक रूप से उपलब्ध डेटा पर आधारित हैं।",
      keyResources: "प्रमुख संसाधन",
      madeWithLove: "भारत में ❤️ के साथ निर्मित"
    },
    ta: {
      title: "பயன்பாட்டைப் பற்றி",
      referenceToolTitle: "குறிப்பு கருவி",
      referenceToolDesc: "இந்த பயன்பாடு இந்திய குடிமக்கள் அரசு திட்டங்களை ஆராயவும் மற்றும் நிதி திட்டமிடல்களை மேற்கொள்ளவும் ஒரு துணை கருவியாக வடிவமைக்கப்பட்டுள்ளது.",
      dataAccuracyTitle: "தரவு துல்லியம்",
      dataAccuracyDesc: "2026 ஆம் ஆண்டிற்கான மிகச் சரியான மற்றும் புதுப்பிக்கப்பட்ட தகவல்களை வழங்க நாங்கள் முயற்சிக்கிறோம். இருப்பினும், வட்டி விகிதங்கள் மற்றும் திட்ட விதிகள் அடிக்கடி மாறக்கூடும்.",
      officialSourcesTitle: "அதிகாரப்பூர்வ ஆதாரங்கள்",
      officialSourcesDesc: "அனைத்து கணக்கீடுகள் மற்றும் திட்ட விவரங்கள் india.gov.in, npsc.gov.in போன்ற அதிகாரப்பூர்வ இணையதளங்களில் கிடைக்கும் பொதுத் தரவுகளின் அடிப்படையில் அமைந்தவை.",
      keyResources: "முக்கிய ஆதாரங்கள்",
      madeWithLove: "இந்தியாவில் ❤️ உடன் உருவாக்கப்பட்டது"
    },
    te: {
      title: "యాప్ గురించి",
      referenceToolTitle: "సూచన సాధనం",
      referenceToolDesc: "ఈ అప్లికేషన్ భారతీయ పౌరులు ప్రభుత్వ పథకాలను అన్వేషించడానికి మరియు ఆర్థిక అంచనాలను వేయడానికి ఒక సహచర సాధనంగా రూపొందించబడింది.",
      dataAccuracyTitle: "డేటా ఖచ్చితత్వం",
      dataAccuracyDesc: "మేము 2026 కి అత్యంత ఖచ్చితమైన మరియు తాజా సమాచారాన్ని అందించడానికి ప్రయత్నిస్తాము. అయితే, వడ్డీ రేట్లు మరియు పథకం నియమాలు తరచుగా మారుతుంటాయి.",
      officialSourcesTitle: "అధికారిక మూలాలు",
      officialSourcesDesc: "అన్ని లెక్కలు మరియు పథకం వివరాలు india.gov.in, npsc.gov.in మొదలైన అధికారిక పోర్టల్‌ల నుండి బహిరంగంగా అందుబాటులో ఉన్న డేటా ఆధారంగా ఉంటాయి.",
      keyResources: "ముఖ్య వనరులు",
      madeWithLove: "భారతదేశంలో ❤️ తో తయారు చేయబడింది"
    },
    ml: {
      title: "ആപ്പിനെക്കുറിച്ച്",
      referenceToolTitle: "റഫറൻസ് ടൂൾ",
      referenceToolDesc: "ഇന്ത്യൻ പൗരന്മാർക്ക് സർക്കാർ പദ്ധതികൾ പര്യവേക്ഷണം ചെയ്യാനും സാമ്പത്തിക പദ്ധതികൾ തയ്യാറാക്കാനുമുള്ള ഒരു സഹായ ഉപകരണമായാണ് ഈ ആപ്ലിക്കേഷൻ രൂപകൽപ്പന ചെയ്തിരിക്കുന്നത്.",
      dataAccuracyTitle: "ഡാറ്റയുടെ കൃത്യത",
      dataAccuracyDesc: "2026-ലെ ഏറ്റവും കൃത്യവും കാലികവുമായ വിവരങ്ങൾ നൽകാൻ ഞങ്ങൾ ശ്രമിക്കുന്നു. എങ്കിലും, പലിശ നിരക്കുകളും പദ്ധതി നിയമങ്ങളും ഇടയ്ക്കിടെ മാറിയേക്കാം.",
      officialSourcesTitle: "ഔദ്യോഗിക ഉറവിടങ്ങൾ",
      officialSourcesDesc: "എല്ലാ കണക്കുകൂട്ടലുകളും പദ്ധതി വിവരങ്ങളും india.gov.in, npsc.gov.in തുടങ്ങിയ ഔദ്യോഗിക വെബ്സൈറ്റുകളിൽ നിന്ന് ലഭ്യമായ വിവരങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ളതാണ്.",
      keyResources: "പ്രധാന ഉറവിടങ്ങൾ",
      madeWithLove: "ഇന്ത്യയിൽ ❤️ യോടെ നിർമ്മിച്ചത്"
    },
    kn: {
      title: "ಅಪ್ಲಿಕೇಶನ್ ಬಗ್ಗೆ",
      referenceToolTitle: "ಉಲ್ಲೇಖ ಸಾಧನ",
      referenceToolDesc: "ಈ ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು ಭಾರತೀಯ ನಾಗರಿಕರು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಅನ್ವೇಷಿಸಲು ಮತ್ತು ಆರ್ಥಿಕ ಯೋಜನೆಗಳನ್ನು ಮಾಡಲು ಸಹಾಯ ಮಾಡುವ ಸಾಧನವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ.",
      dataAccuracyTitle: "ಡೇಟಾ ನಿಖರತೆ",
      dataAccuracyDesc: "ನಾವು 2026 ಕ್ಕೆ ಅತ್ಯಂತ ನಿಖರವಾದ ಮತ್ತು ನವೀಕೃತ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಲು ಪ್ರಯತ್ನಿಸುತ್ತೇವೆ. ಆದಾಗ್ಯೂ, ಬಡ್ಡಿ ದರಗಳು ಮತ್ತು ಯೋಜನೆಯ ನಿಯಮಗಳು ಆಗಾಗ್ಗೆ ಬದಲಾಗುತ್ತವೆ.",
      officialSourcesTitle: "ಅಧಿಕೃತ ಮೂಲಗಳು",
      officialSourcesDesc: "ಎಲ್ಲಾ ಲೆಕ್ಕಾಚಾರಗಳು ಮತ್ತು ಯೋಜನೆಯ ವಿವರಗಳು india.gov.in, npsc.gov.in ಮುಂತಾದ ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳಿಂದ ಸಾರ್ವಜನಿಕವಾಗಿ ಲಭ್ಯವಿರುವ ಡೇಟಾವನ್ನು ಆಧರಿಸಿವೆ.",
      keyResources: "ಪ್ರಮುಖ ಸಂಪನ್ಮೂಲಗಳು",
      madeWithLove: "ಭಾರತದಲ್ಲಿ ❤️ ನಿಂದ ಮಾಡಲ್ಪಟ್ಟಿದೆ"
    }
  }
};

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge generated translations
    Object.keys(translations).forEach(namespace => {
      data[namespace] = { ...data[namespace], ...translations[namespace][lang] };
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log(`Updated ${lang}.json successfully.`);
  }
});
