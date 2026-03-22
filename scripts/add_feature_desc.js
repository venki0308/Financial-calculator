import fs from 'fs';
import path from 'path';

const locales = ['en', 'hi', 'kn', 'ml', 'ta', 'te'];

const extraTranslations = {
    'en': {
        ageName: "Age Calculator"
    },
    'hi': {
        ageName: "आयु कैलकुलेटर"
    },
    'kn': {
        ageName: "ವಯಸ್ಸು ಕ್ಯಾಲ್ಕುಲೇಟರ್"
    },
    'ml': {
        ageName: "പ്രായ കാൽക്കുലേറ്റർ"
    },
    'ta': {
        ageName: "வயது கால்குலேட்டர்"
    },
    'te': {
        ageName: "వయస్సు కాలిక్యులేటర్"
    }
};

for (const lang of locales) {
    const filePath = path.join(process.cwd(), `src/locales/${lang}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(fileContent);

            if (!json.calculators) json.calculators = {};
            if (!json.calculators.age) json.calculators.age = {};
            json.calculators.age.name = extraTranslations[lang].ageName;

            fs.writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf8');
            console.log(`Updated ${lang}.json successfully.`);
        } catch (e) {
            console.error(`Error processing ${lang}.json:`, e);
        }
    } else {
        console.warn(`File not found: ${filePath}`);
    }
}
