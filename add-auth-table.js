const fs = require('fs');
const path = require('path');
const dir = 'd:/Skills/Financial-calculator/src/pages';

const calcs = [
    'BreakEvenCalculator', 'CAGRCalculator', 'CompoundInterestCalculator', 'EPFCalculator',
    'FDCalculator', 'GoalSIPCalculator', 'GratuityCalculator', 'HRACalculator',
    'IncomeTaxCalculator', 'KVPCalculator', 'LumpsumCalculator', 'NPSCalculator',
    'NSCCalculator', 'POMISCalculator', 'POTDCalculator', 'PPFCalculator', 'RDCalculator',
    'SCSSCalculator', 'SIPCalculator', 'SSYCalculator', 'SWPCalculator',
    'SalaryHikeCalculator', 'SimpleInterestCalculator', 'StepUpSIPCalculator',
    'EMICalculator'
];

let updated = 0;
calcs.forEach(c => {
    const f = path.join(dir, c + '.tsx');
    let code = fs.readFileSync(f, 'utf-8');

    if (code.includes('AuthorizationTable')) {
        console.log('SKIP:', c);
        return;
    }

    // Add import at the top — after the first import line
    const firstImportEnd = code.indexOf('\n');
    code = code.slice(0, firstImportEnd + 1)
        + "import AuthorizationTable from '../components/AuthorizationTable';\n"
        + code.slice(firstImportEnd + 1);

    // Find the pattern: closing tag area before the last </div></div>); }
    // We want to insert <AuthorizationTable /> before the last </div> block at the end
    // Strategy: find `</div>\n        </div>\n    );\n}` and insert before the 3rd-from-last </div>
    // More reliable: insert before the last `</div>\n        </div>\n    );`
    const closingPattern = /(\s*<\/div>\s*<\/div>\s*\);\s*}\s*)$/;
    const match = code.match(closingPattern);
    if (match) {
        const insertPos = code.lastIndexOf(match[0]);
        code = code.slice(0, insertPos)
            + '\n                <AuthorizationTable />\n'
            + code.slice(insertPos);
    } else {
        // fallback: find last </div> and insert before the 3rd-to-last
        const allDivCloses = [];
        let searchPos = 0;
        while (true) {
            const idx = code.indexOf('</div>', searchPos);
            if (idx === -1) break;
            allDivCloses.push(idx);
            searchPos = idx + 6;
        }
        if (allDivCloses.length >= 3) {
            const insertPos = allDivCloses[allDivCloses.length - 3];
            code = code.slice(0, insertPos)
                + '\n                <AuthorizationTable />\n'
                + code.slice(insertPos);
        } else {
            console.log('WARN: could not find insert point for', c);
            return;
        }
    }

    fs.writeFileSync(f, code);
    updated++;
    console.log('OK:', c);
});

console.log('Updated:', updated, 'files');
