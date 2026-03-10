const fs = require('fs');

const TRANSLATIONS = {
    en: {
        title: "Important Disclaimer",
        welcome: "Welcome to FinCalix — Your Personal Finance Companion.",
        readCarefully: "Before you begin, please read this disclaimer carefully.",
        calcTitle: "Calculators & Tools:",
        calcBullet1: "All calculators (Home Loan, Car Loan, SIP, PPF, FD, Income Tax, Property, and others) provide estimates based on the values you enter.",
        calcBullet2: "Results are for informational and planning purposes only.",
        calcBullet3: "Actual figures may vary based on bank policies, market conditions, tax rule changes, and other factors.",
        expenseTitle: "Expense Tracker:",
        expenseBullet1: "The Expense Tracker is for personal record-keeping only.",
        expenseBullet2: "Financial Health Scores and Smart Insights are rule-based estimates — not professional financial assessments.",
        expenseBullet3: "All data is stored locally on your device. FinCalix does not collect, store, or share your financial data.",
        schemesTitle: "Government Schemes:",
        schemesBullet1: "Scheme information is provided for general awareness only.",
        schemesBullet2: "Eligibility criteria, interest rates, and benefits are subject to change by the government.",
        schemesBullet3: "Always verify details on official government websites before applying.",
        generalTitle: "General:",
        generalBullet1: "Nothing in this app constitutes financial, tax, investment, or legal advice.",
        generalBullet2: "For professional guidance, consult a SEBI-registered advisor, certified financial planner, or chartered accountant.",
        generalBullet3: "FinCalix and its developers are not liable for any financial decisions made using this app.",
        acknowledge: "By continuing, you confirm that you have read, understood, and agreed to this disclaimer.",
        button: "I Understand, Continue"
    },
    hi: {
        title: "महत्वपूर्ण अस्वीकरण",
        welcome: "FinCalix में आपका स्वागत है — आपका व्यक्तिगत वित्त साथी।",
        readCarefully: "शुरू करने से पहले, कृपया इस अस्वीकरण को ध्यान से पढ़ें।",
        calcTitle: "कैलकुलेटर और उपकरण:",
        calcBullet1: "सभी कैलकुलेटर (होम लोन, कार लोन, SIP, PPF, FD, आयकर, प्रॉपर्टी और अन्य) आपके द्वारा दर्ज मूल्यों के आधार पर अनुमान प्रदान करते हैं।",
        calcBullet2: "परिणाम केवल सूचनात्मक और योजना उद्देश्यों के लिए हैं।",
        calcBullet3: "वास्तविक आंकड़े बैंक नीतियों, बाजार स्थितियों, कर नियम परिवर्तनों और अन्य कारकों के आधार पर भिन्न हो सकते हैं।",
        expenseTitle: "खर्च ट्रैकर:",
        expenseBullet1: "खर्च ट्रैकर केवल व्यक्तिगत रिकॉर्ड-रखने के लिए है।",
        expenseBullet2: "वित्तीय स्वास्थ्य स्कोर और स्मार्ट इनसाइट्स नियम-आधारित अनुमान हैं — पेशेवर वित्तीय मूल्यांकन नहीं।",
        expenseBullet3: "सभी डेटा आपके डिवाइस पर स्थानीय रूप से संग्रहीत है। FinCalix आपका वित्तीय डेटा एकत्र, संग्रहीत या साझा नहीं करता।",
        schemesTitle: "सरकारी योजनाएं:",
        schemesBullet1: "योजना की जानकारी केवल सामान्य जागरूकता के लिए प्रदान की गई है।",
        schemesBullet2: "पात्रता मानदंड, ब्याज दरें और लाभ सरकार द्वारा परिवर्तन के अधीन हैं।",
        schemesBullet3: "आवेदन करने से पहले हमेशा आधिकारिक सरकारी वेबसाइटों पर विवरण सत्यापित करें।",
        generalTitle: "सामान्य:",
        generalBullet1: "इस ऐप में कुछ भी वित्तीय, कर, निवेश या कानूनी सलाह नहीं है।",
        generalBullet2: "पेशेवर मार्गदर्शन के लिए, SEBI-पंजीकृत सलाहकार, प्रमाणित वित्तीय योजनाकार या चार्टर्ड अकाउंटेंट से सलाह लें।",
        generalBullet3: "FinCalix और इसके डेवलपर इस ऐप का उपयोग करके किए गए किसी भी वित्तीय निर्णय के लिए उत्तरदायी नहीं हैं।",
        acknowledge: "जारी रखकर, आप पुष्टि करते हैं कि आपने इस अस्वीकरण को पढ़, समझ और सहमति दे दी है।",
        button: "मैं समझता हूँ, जारी रखें"
    },
    te: {
        title: "ముఖ్యమైన నిరాకరణ",
        welcome: "FinCalix కి స్వాగతం — మీ వ్యక్తిగత ఆర్థిక సహచరుడు.",
        readCarefully: "ప్రారంభించడానికి ముందు, దయచేసి ఈ నిరాకరణను జాగ్రత్తగా చదవండి.",
        calcTitle: "కాల్క్యులేటర్లు & సాధనాలు:",
        calcBullet1: "అన్ని కాల్క్యులేటర్లు (హోమ్ లోన్, కార్ లోన్, SIP, PPF, FD, ఆదాయ పన్ను, ఆస్తి మరియు ఇతరాలు) మీరు నమోదు చేసిన విలువల ఆధారంగా అంచనాలను అందిస్తాయి.",
        calcBullet2: "ఫలితాలు సమాచారం మరియు ప్రణాళిక ప్రయోజనాల కోసం మాత్రమే.",
        calcBullet3: "వాస్తవ గణాంకాలు బ్యాంకు విధానాలు, మార్కెట్ పరిస్థితులు, పన్ను నియమ మార్పులు మరియు ఇతర అంశాల ఆధారంగా మారవచ్చు.",
        expenseTitle: "ఖర్చు ట్రాకర్:",
        expenseBullet1: "ఖర్చు ట్రాకర్ వ్యక్తిగత రికార్డ్-కీపింగ్ కోసం మాత్రమే.",
        expenseBullet2: "ఆర్థిక ఆరోగ్య స్కోర్‌లు మరియు స్మార్ట్ ఇన్‌సైట్‌లు నియమ-ఆధారిత అంచనాలు — వృత్తిపరమైన ఆర్థిక అంచనాలు కావు.",
        expenseBullet3: "మొత్తం డేటా మీ పరికరంలో స్థానికంగా నిల్వ చేయబడుతుంది. FinCalix మీ ఆర్థిక డేటాను సేకరించదు, నిల్వ చేయదు లేదా షేర్ చేయదు.",
        schemesTitle: "ప్రభుత్వ పథకాలు:",
        schemesBullet1: "పథక సమాచారం సాధారణ అవగాహన కోసం మాత్రమే అందించబడింది.",
        schemesBullet2: "అర్హత ప్రమాణాలు, వడ్డీ రేట్లు మరియు ప్రయోజనాలు ప్రభుత్వం ద్వారా మారుతూ ఉంటాయి.",
        schemesBullet3: "దరఖాస్తు చేసుకునే ముందు ఎల్లప్పుడూ అధికారిక ప్రభుత్వ వెబ్‌సైట్‌లలో వివరాలను ధృవీకరించండి.",
        generalTitle: "సాధారణ:",
        generalBullet1: "ఈ యాప్‌లో ఏదీ ఆర్థిక, పన్ను, పెట్టుబడి లేదా చట్ట సలహా కాదు.",
        generalBullet2: "వృత్తిపరమైన మార్గదర్శకత్వం కోసం, SEBI-నమోదిత సలహాదారు, ధృవీకరించబడిన ఆర్థిక ప్రణాళికాకర్త లేదా ఛార్టర్డ్ అకౌంటెంట్‌ను సంప్రదించండి.",
        generalBullet3: "FinCalix మరియు దాని డెవలపర్లు ఈ యాప్ ఉపయోగించి తీసుకున్న ఏవైనా ఆర్థిక నిర్ణయాలకు బాధ్యత వహించరు.",
        acknowledge: "కొనసాగించడం ద్వారా, మీరు ఈ నిరాకరణను చదివి, అర్థం చేసుకుని, అంగీకరించారని ధృవీకరిస్తున్నారు.",
        button: "నేను అర్థం చేసుకున్నాను, కొనసాగించండి"
    },
    ta: {
        title: "முக்கியமான மறுப்பு",
        welcome: "FinCalix க்கு வரவேற்கிறோம் — உங்கள் தனிப்பட்ட நிதி துணைவர்.",
        readCarefully: "தொடங்குவதற்கு முன், இந்த மறுப்பைக் கவனமாகப் படிக்கவும்.",
        calcTitle: "கால்குலேட்டர்கள் & கருவிகள்:",
        calcBullet1: "அனைத்து கால்குலேட்டர்களும் (வீட்டுக் கடன், கார் கடன், SIP, PPF, FD, வருமான வரி, சொத்து மற்றும் பிற) நீங்கள் உள்ளிடும் மதிப்புகளின் அடிப்படையில் மதிப்பீடுகளை வழங்குகின்றன.",
        calcBullet2: "முடிவுகள் தகவல் மற்றும் திட்டமிடல் நோக்கங்களுக்காக மட்டுமே.",
        calcBullet3: "உண்மையான புள்ளிவிவரங்கள் வங்கி கொள்கைகள், சந்தை நிலைமைகள், வரி விதி மாற்றங்கள் மற்றும் பிற காரணிகளின் அடிப்படையில் மாறுபடலாம்.",
        expenseTitle: "செலவு கண்காணிப்பான்:",
        expenseBullet1: "செலவு கண்காணிப்பான் தனிப்பட்ட பதிவு வைப்புக்கு மட்டுமே.",
        expenseBullet2: "நிதி ஆரோக்கிய மதிப்பெண்கள் மற்றும் ஸ்மார்ட் நுண்ணறிவுகள் விதி-அடிப்படையிலான மதிப்பீடுகள் — தொழில்முறை நிதி மதிப்பீடுகள் அல்ல.",
        expenseBullet3: "அனைத்து தரவுகளும் உங்கள் சாதனத்தில் உள்ளூரில் சேமிக்கப்படுகின்றன. FinCalix உங்கள் நிதி தரவை சேகரிக்காது, சேமிக்காது அல்லது பகிராது.",
        schemesTitle: "அரசாங்கத் திட்டங்கள்:",
        schemesBullet1: "திட்ட தகவல்கள் பொது விழிப்புணர்வுக்காக மட்டுமே வழங்கப்படுகின்றன.",
        schemesBullet2: "தகுதி அளவுகோல்கள், வட்டி விகிதங்கள் மற்றும் நன்மைகள் அரசாங்கத்தால் மாற்றத்திற்கு உட்பட்டவை.",
        schemesBullet3: "விண்ணப்பிக்கும் முன் எப்போதும் அதிகாரப்பூர்வ அரசாங்க இணையதளங்களில் விவரங்களைச் சரிபார்க்கவும்.",
        generalTitle: "பொது:",
        generalBullet1: "இந்த பயன்பாட்டில் எதுவும் நிதி, வரி, முதலீடு அல்லது சட்ட ஆலோசனை அல்ல.",
        generalBullet2: "தொழில்முறை வழிகாட்டுதலுக்கு, SEBI-பதிவு செய்யப்பட்ட ஆலோசகர், சான்றிதழ் பெற்ற நிதி திட்டமிடுபவர் அல்லது பட்டயக் கணக்காளரை அணுகவும்.",
        generalBullet3: "FinCalix மற்றும் அதன் டெவலப்பர்கள் இந்த பயன்பாட்டைப் பயன்படுத்தி எடுக்கப்பட்ட எந்த நிதி முடிவுகளுக்கும் பொறுப்பேற்க மாட்டார்கள்.",
        acknowledge: "தொடர்வதன் மூலம், இந்த மறுப்பை நீங்கள் படித்து, புரிந்துகொண்டு, ஒப்புக்கொண்டுள்ளீர்கள் என்பதை உறுதிப்படுத்துகிறீர்கள்.",
        button: "புரிந்தது, தொடரவும்"
    },
    kn: {
        title: "ಪ್ರಮುಖ ಹಕ್ಕು ನಿರಾಕರಣೆ",
        welcome: "FinCalix ಗೆ ಸ್ವಾಗತ — ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಹಣಕಾಸು ಸಂಗಾತಿ.",
        readCarefully: "ಪ್ರಾರಂಭಿಸುವ ಮೊದಲು, ದಯವಿಟ್ಟು ಈ ಹಕ್ಕು ನಿರಾಕರಣೆಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಓದಿ.",
        calcTitle: "ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳು & ಸಾಧನಗಳು:",
        calcBullet1: "ಎಲ್ಲಾ ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳು (ಹೋಮ್ ಲೋನ್, ಕಾರ್ ಲೋನ್, SIP, PPF, FD, ಆದಾಯ ತೆರಿಗೆ, ಆಸ್ತಿ ಮತ್ತು ಇತರ) ನೀವು ನಮೂದಿಸಿದ ಮೌಲ್ಯಗಳ ಆಧಾರದ ಮೇಲೆ ಅಂದಾಜುಗಳನ್ನು ಒದಗಿಸುತ್ತವೆ.",
        calcBullet2: "ಫಲಿತಾಂಶಗಳು ಮಾಹಿತಿ ಮತ್ತು ಯೋಜನಾ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮಾತ್ರ.",
        calcBullet3: "ನಿಜವಾದ ಅಂಕಿಅಂಶಗಳು ಬ್ಯಾಂಕ್ ನೀತಿಗಳು, ಮಾರುಕಟ್ಟೆ ಪರಿಸ್ಥಿತಿಗಳು, ತೆರಿಗೆ ನಿಯಮ ಬದಲಾವಣೆಗಳು ಮತ್ತು ಇತರ ಅಂಶಗಳ ಆಧಾರದ ಮೇಲೆ ಬದಲಾಗಬಹುದು.",
        expenseTitle: "ವೆಚ್ಚ ಟ್ರ್ಯಾಕರ್:",
        expenseBullet1: "ವೆಚ್ಚ ಟ್ರ್ಯಾಕರ್ ವೈಯಕ್ತಿಕ ರೆಕಾರ್ಡ್-ಕೀಪಿಂಗ್ ಮಾತ್ರ.",
        expenseBullet2: "ಆರ್ಥಿಕ ಆರೋಗ್ಯ ಅಂಕಗಳು ಮತ್ತು ಸ್ಮಾರ್ಟ್ ಒಳನೋಟಗಳು ನಿಯಮ-ಆಧಾರಿತ ಅಂದಾಜುಗಳು — ವೃತ್ತಿಪರ ಆರ್ಥಿಕ ಮೌಲ್ಯಮಾಪನಗಳಲ್ಲ.",
        expenseBullet3: "ಎಲ್ಲಾ ಡೇಟಾ ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಸ್ಥಳೀಯವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ. FinCalix ನಿಮ್ಮ ಆರ್ಥಿಕ ಡೇಟಾವನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ, ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ ಅಥವಾ ಹಂಚಿಕೊಳ್ಳುವುದಿಲ್ಲ.",
        schemesTitle: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು:",
        schemesBullet1: "ಯೋಜನೆ ಮಾಹಿತಿಯನ್ನು ಸಾಮಾನ್ಯ ಅರಿವಿಗಾಗಿ ಮಾತ್ರ ಒದಗಿಸಲಾಗಿದೆ.",
        schemesBullet2: "ಅರ್ಹತಾ ಮಾನದಂಡಗಳು, ಬಡ್ಡಿ ದರಗಳು ಮತ್ತು ಪ್ರಯೋಜನಗಳು ಸರ್ಕಾರದಿಂದ ಬದಲಾವಣೆಗೆ ಒಳಷಟ್ಟಿರುತ್ತವೆ.",
        schemesBullet3: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಯಾವಾಗಲೂ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ವೆಬ್‌ಸೈಟ್‌ಗಳಲ್ಲಿ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        generalTitle: "ಸಾಮಾನ್ಯ:",
        generalBullet1: "ಈ ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ಏನೂ ಆರ್ಥಿಕ, ತೆರಿಗೆ, ಹೂಡಿಕೆ ಅಥವಾ ಕಾನೂನು ಸಲಹೆಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ.",
        generalBullet2: "ವೃತ್ತಿಪರ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ, SEBI-ನೋಂದಾಯಿತ ಸಲಹೆಗಾರ, ಪ್ರಮಾಣಿತ ಆರ್ಥಿಕ ಯೋಜನಾಕಾರ ಅಥವಾ ಚಾರ್ಟರ್ಡ್ ಅಕೌಂಟೆಂಟ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.",
        generalBullet3: "FinCalix ಮತ್ತು ಅದರ ಡೆವಲಪರ್‌ಗಳು ಈ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸಿ ತೆಗೆದುಕೊಂಡ ಯಾವುದೇ ಆರ್ಥಿಕ ನಿರ್ಧಾರಗಳಿಗೆ ಜವಾಬ್ದಾರರಲ್ಲ.",
        acknowledge: "ಮುಂದುವರಿಯುವ ಮೂಲಕ, ನೀವು ಈ ಹಕ್ಕು ನಿರಾಕರಣೆಯನ್ನು ಓದಿ, ಅರ್ಥಮಾಡಿಕೊಂಡು, ಒಪ್ಪಿಕೊಂಡಿದ್ದೀರಿ ಎಂದು ದೃಢಪಡಿಸುತ್ತೀರಿ.",
        button: "ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡೆ, ಮುಂದುವರಿಸಿ"
    },
    ml: {
        title: "പ്രധാന നിരാകരണം",
        welcome: "FinCalix ലേക്ക് സ്വാഗതം — നിങ്ങളുടെ വ്യക്തിഗത ധനകാര്യ സഹചാരി.",
        readCarefully: "ആരംഭിക്കുന്നതിന് മുമ്പ്, ദയവായി ഈ നിരാകരണം ശ്രദ്ധാപൂർവ്വം വായിക്കുക.",
        calcTitle: "കാൽക്കുലേറ്ററുകൾ & ഉപകരണങ്ങൾ:",
        calcBullet1: "എല്ലാ കാൽക്കുലേറ്ററുകളും (ഹോം ലോൺ, കാർ ലോൺ, SIP, PPF, FD, ആദായ നികുതി, പ്രോപ്പർട്ടി, മറ്റുള്ളവ) നിങ്ങൾ നൽകുന്ന മൂല്യങ്ങളെ അടിസ്ഥാനമാക്കി കണക്കാക്കലുകൾ നൽകുന്നു.",
        calcBullet2: "ഫലങ്ങൾ വിവരദാന, ആസൂത്രണ ആവശ്യങ്ങൾക്ക് മാത്രമുള്ളതാണ്.",
        calcBullet3: "യഥാർത്ഥ കണക്കുകൾ ബാങ്ക് നയങ്ങൾ, വിപണി സാഹചര്യങ്ങൾ, നികുതി നിയമ മാറ്റങ്ങൾ, മറ്റ് ഘടകങ്ങൾ എന്നിവയെ അടിസ്ഥാനമാക്കി വ്യത്യാസപ്പെടാം.",
        expenseTitle: "ചെലവ് ട്രാക്കർ:",
        expenseBullet1: "ചെലവ് ട്രാക്കർ വ്യക്തിഗത രേഖ സൂക്ഷിക്കൽ മാത്രം.",
        expenseBullet2: "ഫിനാൻഷ്യൽ ഹെൽത്ത് സ്കോറുകളും സ്മാർട്ട് ഇൻസൈറ്റുകളും നിയമ-അടിസ്ഥാനത്തിലുള്ള കണക്കാക്കലുകൾ — പ്രൊഫഷണൽ ഫിനാൻഷ്യൽ വിലയിരുത്തലുകൾ അല്ല.",
        expenseBullet3: "എല്ലാ ഡാറ്റയും നിങ്ങളുടെ ഉപകരണത്തിൽ പ്രാദേശികമായി സംഭരിക്കുന്നു. FinCalix നിങ്ങളുടെ സാമ്പത്തിക ഡാറ്റ ശേഖരിക്കുകയോ സംഭരിക്കുകയോ പങ്കിടുകയോ ചെയ്യുന്നില്ല.",
        schemesTitle: "സർക്കാർ പദ്ധതികൾ:",
        schemesBullet1: "പദ്ധതി വിവരങ്ങൾ പൊതു അവബോധത്തിനായി മാത്രം നൽകിയിരിക്കുന്നു.",
        schemesBullet2: "യോഗ്യതാ മാനദണ്ഡങ്ങൾ, പലിശ നിരക്കുകൾ, ആനുകൂല്യങ്ങൾ എന്നിവ സർക്കാരിന്റെ മാറ്റത്തിന് വിധേയമാണ്.",
        schemesBullet3: "അപേക്ഷിക്കുന്നതിന് മുമ്പ് എല്ലായ്പ്പോഴും ഔദ്യോഗിക സർക്കാർ വെബ്സൈറ്റുകളിൽ വിശദാംശങ്ങൾ പരിശോധിക്കുക.",
        generalTitle: "പൊതു:",
        generalBullet1: "ഈ ആപ്പിലെ ഒന്നും സാമ്പത്തിക, നികുതി, നിക്ഷേപ അല്ലെങ്കിൽ നിയമ ഉപദേശം ആയിരിക്കില്ല.",
        generalBullet2: "പ്രൊഫഷണൽ മാർഗ്ഗനിർദ്ദേശത്തിന്, SEBI-രജിസ്റ്റർ ചെയ്ത ഉപദേശകൻ, സർട്ടിഫൈഡ് ഫിനാൻഷ്യൽ പ്ലാനർ, അല്ലെങ്കിൽ ഛാർട്ടേഡ് അക്കൌണ്ടന്റ് എന്നിവരെ സമീപിക്കുക.",
        generalBullet3: "FinCalix ഉം അതിന്റെ ഡെവലപ്പർമാരും ഈ ആപ്പ് ഉപയോഗിച്ച് എടുക്കുന്ന ഏതെങ്കിലും സാമ്പത്തിക തീരുമാനങ്ങൾക്ക് ബാധ്യസ്ഥരല്ല.",
        acknowledge: "തുടരുന്നതിലൂടെ, നിങ്ങൾ ഈ നിരാകരണം വായിച്ച്, മനസ്സിലാക്കി, അംഗീകരിച്ചതായി സ്ഥിരീകരിക്കുന്നു.",
        button: "ഞാൻ മനസ്സിലാക്കി, തുടരുക"
    }
};

const localeDir = 'd:/Skills/Financial-calculator/src/locales';

for (const [lang, globalDisclaimerObj] of Object.entries(TRANSLATIONS)) {
    const filePath = `${localeDir}/${lang}.json`;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Remove old disclaimer keys
        delete data.disclaimer;
        // Add new globalDisclaimer keys
        data.globalDisclaimer = globalDisclaimerObj;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
        console.log(`✅ Updated ${lang}.json`);
    } catch (e) {
        console.error(`❌ Error updating ${lang}.json:`, e.message);
    }
}
console.log('Done!');
